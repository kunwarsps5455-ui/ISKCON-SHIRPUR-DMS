import { prisma } from '../db.js';
import { generateBirthdayMessage } from './aiProvider.js';
import { sendSMS, calculateSMSLength } from './smsProvider.js';

export async function runBirthdayCheck(forceRun = false) {
  console.log(`[Birthday Automation] Starting run at ${new Date().toISOString()}`);

  // Fetch settings
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['AUTO_SMS_ENABLED', 'AI_ENABLED', 'ORG_NAME', 'ORG_DEITY'] } }
  });

  const getSetting = (key: string, def: string) => settings.find(s => s.key === key)?.value || def;

  const isAutoSmsEnabled = getSetting('AUTO_SMS_ENABLED', 'false') === 'true';
  const isAiEnabled = getSetting('AI_ENABLED', 'false') === 'true';
  const orgName = getSetting('ORG_NAME', 'ISKCON Shirpur');
  const deityName = getSetting('ORG_DEITY', 'श्री श्री राधा गोपीनाथ');

  if (!isAutoSmsEnabled && !forceRun) {
    console.log('[Birthday Automation] Auto SMS is disabled. Aborting.');
    return { status: 'DISABLED' };
  }

  // Find default template
  const defaultTemplate = await prisma.messageTemplate.findFirst({
    where: { isDefault: true, active: true }
  });

  const fallbackMessageText = defaultTemplate?.message || 'प्रिय {{name}} जी,\n\nहरे कृष्ण 🙏\n\nISKCON Shirpur परिवार की ओर से आपको जन्मदिन की हार्दिक शुभकामनाएँ।';

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();
  
  // Note: For leap year handling, if today is Mar 1 and it's not a leap year, 
  // we would also need to check for Feb 29 born people.
  // SQLite doesn't easily support extracting month/day directly in Prisma without raw queries
  // We'll fetch all active records with DOB and filter in JS since MVP dataset is manageable.
  // In production with Postgres, we'd use raw SQL for efficiency.
  
  const donors = await prisma.donor.findMany({
    where: { status: 'ACTIVE', dob: { not: null } }
  });

  const familyMembers = await prisma.familyMember.findMany({
    where: { status: 'ACTIVE', dob: { not: null } },
    include: { donor: true }
  });

  const isBirthdayToday = (dob: Date) => {
    const dobMonth = dob.getMonth() + 1;
    const dobDay = dob.getDate();
    
    if (dobMonth === currentMonth && dobDay === currentDay) return true;
    
    // Leap year handling: if born on Feb 29, celebrate on Feb 28 in non-leap years
    const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
    if (!isLeapYear && currentMonth === 2 && currentDay === 28 && dobMonth === 2 && dobDay === 29) {
      return true;
    }
    
    return false;
  };

  const birthdayDonors = donors.filter(d => isBirthdayToday(d.dob!));
  const birthdayFamily = familyMembers.filter(f => isBirthdayToday(f.dob!));

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  const processPerson = async (
    person: any, 
    type: 'DONOR' | 'FAMILY_MEMBER', 
    donorId: string, 
    donorMobile: string | null
  ) => {
    const targetMobile = person.mobile || donorMobile;
    
    if (!targetMobile) {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: No mobile number`);
      skippedCount++;
      return;
    }

    if (person.smsPermission === 'NOT_ALLOWED') {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: SMS Not Allowed`);
      skippedCount++;
      return;
    }

    // Check duplicate guard
    const existing = await prisma.birthdayMessage.findUnique({
      where: {
        personId_birthdayYear_channel: {
          personId: person.id,
          birthdayYear: currentYear,
          channel: 'SMS'
        }
      }
    });

    if (existing && existing.status === 'SENT' && !forceRun) {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: Already sent this year`);
      skippedCount++;
      return;
    }

    // Generate Message
    let finalMessage = fallbackMessageText.replace('{{name}}', person.fullName.split(' ')[0]);
    let usedAi = false;

    if (isAiEnabled) {
      try {
        const aiMessage = await generateBirthdayMessage({
          name: person.fullName.split(' ')[0],
          organization: orgName,
          deity_name: deityName,
          relationship: person.relationship
        });
        if (aiMessage) {
          finalMessage = aiMessage;
          usedAi = true;
        }
      } catch (err) {
        console.error(`[Birthday Automation] AI fallback triggered for ${person.fullName}`);
      }
    }

    // Record Pending Message
    const msgRecord = await prisma.birthdayMessage.upsert({
      where: {
        personId_birthdayYear_channel: {
          personId: person.id,
          birthdayYear: currentYear,
          channel: 'SMS'
        }
      },
      update: {
        message: finalMessage,
        recipient: targetMobile,
        status: 'QUEUED',
        templateId: usedAi ? null : defaultTemplate?.id
      },
      create: {
        personType: type,
        personId: person.id,
        donorId,
        birthdayDate: person.dob,
        birthdayYear: currentYear,
        channel: 'SMS',
        recipient: targetMobile,
        message: finalMessage,
        templateId: usedAi ? null : defaultTemplate?.id,
        status: 'QUEUED',
        createdBy: 'system'
      }
    });

    // Send SMS
    const smsResponse = await sendSMS(targetMobile, finalMessage);

    // Update Status
    await prisma.birthdayMessage.update({
      where: { id: msgRecord.id },
      data: {
        status: smsResponse.status,
        provider: process.env.SMS_PROVIDER || 'unknown',
        providerMessageId: smsResponse.messageId,
        failureReason: smsResponse.error,
        sentAt: smsResponse.success ? new Date() : null
      }
    });

    if (smsResponse.success) sentCount++;
    else failedCount++;
  };

  for (const donor of birthdayDonors) {
    await processPerson(donor, 'DONOR', donor.id, donor.mobile);
  }

  for (const family of birthdayFamily) {
    // Only fallback to donor mobile if there is a policy for it, for now fallback implicitly
    await processPerson(family, 'FAMILY_MEMBER', family.donorId, family.donor.mobile);
  }

  console.log(`[Birthday Automation] Completed. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
  
  return {
    status: 'COMPLETED',
    processed: birthdayDonors.length + birthdayFamily.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount
  };
}
