import { prisma } from '../db.js';
import { generateBirthdayMessage } from './aiProvider.js';
import { sendSMS } from './smsProvider.js';
import { sendWhatsAppTextMessage, sendWhatsAppTemplateMessage, getMetaConfig } from './metaWhatsAppService.js';

export async function runBirthdayCheck(forceRun = false, forceResend = false) {
  console.log(`[Birthday Automation] Starting run at ${new Date().toISOString()}`);

  // Fetch settings
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'AUTO_WHATSAPP_ENABLED',
          'AUTO_SMS_ENABLED',
          'AI_ENABLED',
          'ORG_NAME',
          'ORG_DEITY',
          'META_BIRTHDAY_TEMPLATE',
          'ENABLE_FAMILY_MEMBER_MESSAGES',
          'MESSAGING_TIME'
        ]
      }
    }
  }).catch(() => []);

  const getSetting = (key: string, def: string) => settings.find((s: any) => s.key === key)?.value || def;

  const isAutoWhatsAppEnabled = getSetting('AUTO_WHATSAPP_ENABLED', 'true') === 'true';
  const isAutoSmsEnabled = getSetting('AUTO_SMS_ENABLED', 'true') === 'true';
  const isAiEnabled = getSetting('AI_ENABLED', 'false') === 'true';
  const orgName = getSetting('ORG_NAME', 'ISKCON Shirpur');
  const deityName = getSetting('ORG_DEITY', 'श्री श्री राधा गोपीनाथ');
  const birthdayTemplate = getSetting('META_BIRTHDAY_TEMPLATE', 'iskcon_birthday_blessing_hi');
  const isFamilyMessagingEnabled = getSetting('ENABLE_FAMILY_MEMBER_MESSAGES', 'true') === 'true';
  const messagingTime = getSetting('MESSAGING_TIME', '08:00');

  if (!isAutoWhatsAppEnabled && !isAutoSmsEnabled) {
    console.log('[Birthday Automation] Automated messaging is disabled in settings. Aborting.');
    return { status: 'DISABLED', processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const today = new Date();
  if (!forceRun && messagingTime) {
    const [schedH, schedM] = messagingTime.split(':').map((n: string) => parseInt(n, 10));
    if (!isNaN(schedH) && !isNaN(schedM)) {
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      const schedMinutes = schedH * 60 + schedM;
      if (nowMinutes < schedMinutes) {
        console.log(`[Birthday Automation] Waiting until scheduled time ${messagingTime}.`);
        return {
          status: 'WAITING_FOR_SCHEDULED_TIME',
          scheduledTime: messagingTime,
          processed: 0,
          sent: 0,
          failed: 0,
          skipped: 0
        };
      }
    }
  }

  const metaConfig = await getMetaConfig();

  // Find default template
  const defaultTemplate = await prisma.messageTemplate.findFirst({
    where: { isDefault: true, active: true }
  }).catch(() => null);

  const fallbackMessageText = defaultTemplate?.message || 
    'प्रिय {{name}} जी,\n\nहरे कृष्ण! दण्डवत प्रणाम 🙏\n\nश्री श्री राधा गोपीनाथ एवं श्रील प्रभुपाद की असीम कृपा से आपका यह शुभ जन्मदिन सुख, शांति, उत्तम स्वास्थ्य एवं कृष्ण भावनामृत भक्ति रस से परिपूर्ण हो।\n\nISKCON Shirpur परिवार की ओर से आपको जन्मदिन की हार्दिक शुभकामनाएँ।\n\nहरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे।\nहरे राम हरे राम राम राम हरे हरे॥';

  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();

  const donors = await prisma.donor.findMany({
    where: { status: 'ACTIVE', dob: { not: null } }
  }).catch(() => []);

  // Only query family members if family messaging is enabled in settings
  const familyMembers = isFamilyMessagingEnabled
    ? await prisma.familyMember.findMany({
        where: { 
          status: 'ACTIVE', 
          dob: { not: null },
          whatsappPermission: { not: 'NOT_ALLOWED' }
        },
        include: { donor: true }
      }).catch(() => [])
    : [];

  if (!isFamilyMessagingEnabled) {
    console.log('[Birthday Automation] Devotee family member messaging is disabled in settings. Skipping family members.');
  }

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

  const birthdayDonors = donors.filter((d: any) => d.dob && isBirthdayToday(new Date(d.dob)));
  const birthdayFamily = familyMembers.filter((f: any) => f.dob && isBirthdayToday(new Date(f.dob)));

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

    // Determine channel (WhatsApp preferred by default)
    const channel = (person.preferredChannel || 'WHATSAPP').toUpperCase();

    if (channel === 'WHATSAPP' && !isAutoWhatsAppEnabled) {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: Automated WhatsApp disabled`);
      skippedCount++;
      return;
    }
    if (channel === 'SMS' && !isAutoSmsEnabled) {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: Automated SMS disabled`);
      skippedCount++;
      return;
    }

    if (channel === 'WHATSAPP' && person.whatsappPermission === 'NOT_ALLOWED') {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: WhatsApp permission revoked`);
      skippedCount++;
      return;
    }
    if (channel === 'SMS' && person.smsPermission === 'NOT_ALLOWED') {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: SMS permission revoked`);
      skippedCount++;
      return;
    }

    // Zero-duplicate guard for this calendar year
    const existing = await prisma.birthdayMessage.findUnique({
      where: {
        personId_birthdayYear_channel: {
          personId: person.id,
          birthdayYear: currentYear,
          channel: channel
        }
      }
    }).catch(() => null);

    if (existing && (existing.status === 'SENT' || existing.status === 'DELIVERED') && !forceResend) {
      console.log(`[Birthday Automation] Skipped ${person.fullName}: Already sent via ${channel} this year`);
      skippedCount++;
      return;
    }

    // Generate Message Text
    const firstName = person.fullName.split(' ')[0];
    let finalMessage = fallbackMessageText.replace(/{{name}}/g, firstName);
    let usedAi = false;

    if (isAiEnabled) {
      try {
        const aiMessage = await generateBirthdayMessage({
          name: firstName,
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

    // Create / Upsert Queued Record
    const msgRecord = await prisma.birthdayMessage.upsert({
      where: {
        personId_birthdayYear_channel: {
          personId: person.id,
          birthdayYear: currentYear,
          channel: channel
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
        birthdayDate: person.dob ? new Date(person.dob) : new Date(),
        birthdayYear: currentYear,
        channel: channel,
        recipient: targetMobile,
        message: finalMessage,
        templateId: usedAi ? null : defaultTemplate?.id,
        status: 'QUEUED',
        createdBy: 'system'
      }
    });

    let sendSuccess = false;
    let providerMsgId: string | undefined;
    let failureReason: string | undefined;

    if (channel === 'WHATSAPP') {
      const useLiveTemplate = metaConfig.isConfigured && metaConfig.mode !== 'mock' && !usedAi;
      const waResult = useLiveTemplate
        ? await sendWhatsAppTemplateMessage(
            targetMobile,
            birthdayTemplate,
            'hi',
            [{ type: 'body', parameters: [{ type: 'text', text: firstName }] }],
            donorId
          )
        : await sendWhatsAppTextMessage(targetMobile, finalMessage, donorId);
      sendSuccess = waResult.success;
      providerMsgId = waResult.messageId;
      failureReason = waResult.error;
    } else {
      const smsResult = await sendSMS(targetMobile, finalMessage);
      sendSuccess = smsResult.success;
      providerMsgId = smsResult.messageId;
      failureReason = smsResult.error;
    }

    // Update Status
    await prisma.birthdayMessage.update({
      where: { id: msgRecord.id },
      data: {
        status: sendSuccess ? 'SENT' : 'FAILED',
        provider: channel === 'WHATSAPP' ? 'META_WHATSAPP_CLOUD' : (process.env.SMS_PROVIDER || 'SMS_GATEWAY'),
        providerMessageId: providerMsgId,
        failureReason: failureReason,
        sentAt: sendSuccess ? new Date() : null
      }
    }).catch(e => console.error("Could not update BirthdayMessage status:", e));

    if (sendSuccess) sentCount++;
    else failedCount++;
  };

  for (const donor of birthdayDonors) {
    await processPerson(donor, 'DONOR', donor.id, donor.mobile);
  }

  for (const family of birthdayFamily) {
    await processPerson(family, 'FAMILY_MEMBER', family.donorId, family.donor?.mobile || null);
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
