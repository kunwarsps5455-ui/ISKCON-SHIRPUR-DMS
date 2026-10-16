import { prisma } from '../db.js';
import { sendWhatsAppTextMessage, sendWhatsAppTemplateMessage, getMetaConfig } from './metaWhatsAppService.js';

export interface FestivalTemplate {
  id: string;
  name: string;
  hindiName: string;
  templateName: string;
  defaultMessage: string;
  category: string;
  defaultDate: string; // YYYY-MM-DD upcoming Panchang date (configurable in SystemSetting)
}

export const FESTIVAL_TEMPLATES: FestivalTemplate[] = [
  {
    id: 'janmashtami',
    name: 'Sri Krishna Janmashtami',
    hindiName: 'श्री कृष्ण जन्माष्टमी महापर्व',
    templateName: 'iskcon_janmashtami_blessing_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-09-04',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nइस्कॉन शिरपुर (ISKCON Shirpur) की ओर से आपको एवं आपके पूरे परिवार को श्री कृष्ण जन्माष्टमी के पावन महापर्व की अनन्त कोटि शुभकामनाएँ! 🪷\n\nभगवान श्री कृष्ण एवं श्री श्री राधा गोपीनाथ जी आपके जीवन को दिव्य भक्ति, सुख, शांति, उत्तम स्वास्थ्य एवं समृद्धता से परिपूर्ण करें।\n\nहरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे।\nहरे राम हरे राम राम राम हरे हरे॥\n\nसादर,\nइस्कॉन शिरपुर परिवार`
  },
  {
    id: 'radhashtami',
    name: 'Radhashtami',
    hindiName: 'श्री राधारानी प्राकट्योत्सव (राधाष्टमी)',
    templateName: 'iskcon_radhashtami_blessing_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-09-19',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nवृंदावनेश्वरी करुणामयी श्री राधारानी के आविर्भाव दिवस (राधाष्टमी) के पावन अवसर पर इस्कॉन शिरपुर परिवार की ओर से आपको हार्दिक बधाई एवं भक्तिपूर्ण शुभकामनाएँ। 🪷\n\nश्रीमती राधारानी जी की अहैतुकी कृपा से आपके हृदय में कृष्ण प्रेम और निर्मल भक्ति का नित्य प्रकाश बना रहे।\n\nराधे राधे!\nसादर,\nइस्कॉन शिरपुर (ISKCON Shirpur)`
  },
  {
    id: 'gaura_purnima',
    name: 'Gaura Purnima',
    hindiName: 'श्री गौर पूर्णिमा (चैतन्य महाप्रभु प्राकट्योत्सव)',
    templateName: 'iskcon_gaura_purnima_blessing_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-03-03',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nहरिनाम संकीर्तन के प्रवर्तक, परम करुणामय श्री चैतन्य महाप्रभु के आविर्भाव महापर्व 'श्री गौर पूर्णिमा' की आपको सपरिवार हार्दिक शुभकामनाएँ! 🌸\n\nभगवान गौरहरि की कृपा से आपके घर-परिवार में सदैव हरिनाम संकीर्तन और आनंद की गंगा प्रवाहित होती रहे।\n\nगौर प्रेमानंदे हरि हरि बोल!\nसादर,\nइस्कॉन शिरपुर`
  },
  {
    id: 'govardhan_diwali',
    name: 'Govardhan Puja & Diwali',
    hindiName: 'दीपावली एवं श्री गिरिराज गोवर्धन अन्नकूट पूजा',
    templateName: 'iskcon_diwali_govardhan_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-11-08',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nशुभ दीपावली एवं श्री गिरिराज गोवर्धन अन्नकूट पूजा के दिव्य पावन पर्व पर इस्कॉन शिरपुर की ओर से आपको व आपके परिवार को हार्दिक मंगलकामनाएँ! 🪔✨\n\nभगवान श्री गिरिराज धरण एवं श्री श्री राधा गोपीनाथ आपके जीवन से अज्ञान का अंधकार दूर कर कृष्ण भक्ति का दिव्य प्रकाश भरें।\n\nजय गोवर्धन धारी!\nसादर,\nइस्कॉन शिरपुर (ISKCON Shirpur)`
  },
  {
    id: 'ram_navami',
    name: 'Sri Rama Navami',
    hindiName: 'श्री राम नवमी पावन प्राकट्योत्सव',
    templateName: 'iskcon_ram_navami_blessing_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-03-26',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nमर्यादा पुरुषोत्तम प्रभु श्री रामचंद्र जी के पावन अवतरण दिवस 'श्री राम नवमी' के पावन पर्व पर आपको एवं आपके परिवार को हार्दिक शुभकामनाएँ! 🏹\n\nप्रभु श्री राम एवं सीता लक्ष्मण भक्त हनुमान जी की कृपा से आपका जीवन धर्म, सत्य, और सद्भाव से आलोकित रहे।\n\nजय श्री राम!\nसादर,\nइस्कॉन शिरपुर`
  },
  {
    id: 'nrisimha_chaturdashi',
    name: 'Nrisimha Chaturdashi',
    hindiName: 'श्री नृसिंह चतुर्दशी (भगवान नृसिंह प्राकट्योत्सव)',
    templateName: 'iskcon_nrisimha_chaturdashi_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-05-01',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nभक्तवत्सल भगवान श्री नृसिंह देव के प्राकट्य दिवस 'श्री नृसिंह चतुर्दशी' के महापर्व पर आपको हार्दिक शुभकामनाएँ! 🦁🙏\n\nभगवान नृसिंह देव आपके जीवन से सभी भौतिक व आध्यात्मिक विघ्नों का नाश करें और प्रह्लाद महाराज जैसी निष्काम भक्ति का वरदान दें।\n\nजय नृसिंह देव!\nसादर,\nइस्कॉन शिरपुर`
  },
  {
    id: 'gita_jayanti',
    name: 'Gita Jayanti & Mokshada Ekadashi',
    hindiName: 'गीता जयंती एवं मोक्षदा एकादशी',
    templateName: 'iskcon_gita_jayanti_blessing_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-12-20',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nश्रीमद्भगवद्गीता के दिव्य प्राकट्य दिवस 'गीता जयंती' एवं मोक्षदा एकादशी की आपको सपरिवार पावन बधाई! 📖🪷\n\nभगवान श्री कृष्ण द्वारा कुरुक्षेत्र में दिया गया गीता का अमर ज्ञान आपके जीवन को सही दिशा, शांति और भगवत्प्राप्ति की ओर अग्रसर करे।\n\nसादर,\nइस्कॉन शिरपुर (ISKCON Shirpur)`
  },
  {
    id: 'ratha_yatra',
    name: 'Sri Jagannath Ratha Yatra',
    hindiName: 'श्री जगन्नाथ रथ यात्रा महोत्सव',
    templateName: 'iskcon_ratha_yatra_blessing_hi',
    category: 'MAJOR_FESTIVAL',
    defaultDate: '2026-07-16',
    defaultMessage: `हरे कृष्ण {{name}} जी 🙏\n\nविश्व प्रसिद्ध श्री जगन्नाथ रथ यात्रा के पावन एवं अलौकिक अवसर पर इस्कॉन शिरपुर की ओर से आपको हार्दिक शुभकामनाएँ! 🏵️🛞\n\nजगन्नाथ स्वामी नयन पथ गामी भवतु मे। भगवान जगन्नाथ, बलदेव एवं सुभद्रा महारानी आपके जीवन में मंगल और भक्ति का संचार करें।\n\nजय जगन्नाथ!\nसादर,\nइस्कॉन शिरपुर`
  }
];

/**
 * Returns all festival templates enriched with their configured schedule date,
 * auto-send status, and whether they were already auto-dispatched this year.
 */
export async function getEnrichedFestivalTemplates() {
  const currentYear = new Date().getFullYear();
  const allSettings = await prisma.systemSetting.findMany().catch(() => []);
  const settingMap = new Map<string, string>(allSettings.map((s: any) => [s.key, s.value]));

  const globalAutoFestival = settingMap.get('AUTO_FESTIVAL_ENABLED') !== 'false';

  return FESTIVAL_TEMPLATES.map(f => {
    const scheduledDate = settingMap.get(`FESTIVAL_DATE_${f.id}`) || f.defaultDate;
    const autoSendEnabled = settingMap.get(`FESTIVAL_AUTO_${f.id}`) !== 'false' && globalAutoFestival;
    const autoSentAt = settingMap.get(`FESTIVAL_AUTO_SENT_${f.id}_${currentYear}`) || null;

    return {
      ...f,
      scheduledDate,
      autoSendEnabled,
      autoSentAt
    };
  });
}

export async function broadcastFestivalMessage(options: {
  festivalId: string;
  customMessage?: string;
  includeFamilyMembers?: boolean;
  donorCategoryFilter?: string; // 'ALL', 'PLATINUM', 'GOLD', 'SILVER', 'SUDAMA'
  senderUserId?: string;
}) {
  const festival = FESTIVAL_TEMPLATES.find(f => f.id === options.festivalId);
  if (!festival) {
    throw new Error(`Festival template with id '${options.festivalId}' not found`);
  }

  // Check global family messaging setting (acts as master switch)
  const familySetting = await prisma.systemSetting.findUnique({
    where: { key: 'ENABLE_FAMILY_MEMBER_MESSAGES' }
  }).catch(() => null);

  const globalFamilyEnabled = familySetting ? familySetting.value !== 'false' : true;
  const shouldIncludeFamily = globalFamilyEnabled && (
    options.includeFamilyMembers !== undefined ? Boolean(options.includeFamilyMembers) : true
  );

  const metaConfig = await getMetaConfig();
  const useLiveTemplate = metaConfig.isConfigured && metaConfig.mode !== 'mock' && !options.customMessage;

  // Fetch active donors who permit WhatsApp
  const donors = await prisma.donor.findMany({
    where: {
      status: 'ACTIVE',
      whatsappPermission: { not: 'NOT_ALLOWED' },
      mobile: { not: null }
    },
    include: {
      donations: { where: { status: 'VALID' }, select: { amount: true } },
      familyMembers: {
        where: { status: 'ACTIVE', whatsappPermission: { not: 'NOT_ALLOWED' } }
      }
    }
  });

  // Filter donors by category if specified
  const filteredDonors = donors.filter(donor => {
    if (!options.donorCategoryFilter || options.donorCategoryFilter === 'ALL') return true;
    const totalDonation = donor.donations.reduce((sum, d) => sum + d.amount, 0);
    let category = 'SUDAMA';
    if (totalDonation >= 1000000) category = 'PLATINUM';
    else if (totalDonation >= 500000) category = 'GOLD';
    else if (totalDonation >= 100000) category = 'SILVER';
    return category === options.donorCategoryFilter;
  });

  let dispatchedCount = 0;
  let familyCount = 0;
  let failureCount = 0;
  const logs: any[] = [];

  const templateText = options.customMessage || festival.defaultMessage;

  const dispatchBlessing = async (phone: string, firstName: string, donorId: string) => {
    if (useLiveTemplate) {
      return sendWhatsAppTemplateMessage(
        phone,
        festival.templateName,
        'hi',
        [{ type: 'body', parameters: [{ type: 'text', text: firstName }] }],
        donorId
      );
    }
    const personalizedMessage = templateText.replace(/{{name}}/g, firstName);
    return sendWhatsAppTextMessage(phone, personalizedMessage, donorId);
  };

  for (const donor of filteredDonors) {
    if (!donor.mobile) continue;

    const firstName = donor.fullName.split(' ')[0] || donor.fullName;

    try {
      const res = await dispatchBlessing(donor.mobile, firstName, donor.id);
      if (res.success) {
        dispatchedCount++;
        logs.push({
          recipient: donor.fullName,
          phone: donor.mobile,
          type: 'PRIMARY_DONOR',
          status: 'SUCCESS'
        });
      } else {
        failureCount++;
      }
    } catch {
      failureCount++;
    }

    // Process family members if enabled (falls back to primary donor's mobile if family member has no separate mobile)
    if (shouldIncludeFamily && donor.familyMembers && donor.familyMembers.length > 0) {
      for (const fam of donor.familyMembers) {
        const famPhone = fam.mobile || donor.mobile;
        if (!famPhone) continue;

        const famFirstName = fam.fullName.split(' ')[0] || fam.fullName;

        try {
          const res = await dispatchBlessing(famPhone, famFirstName, donor.id);
          if (res.success) {
            familyCount++;
            logs.push({
              recipient: fam.fullName,
              phone: famPhone,
              type: 'FAMILY_MEMBER',
              status: 'SUCCESS'
            });
          } else {
            failureCount++;
          }
        } catch {
          failureCount++;
        }
      }
    }
  }

  return {
    festival: festival.name,
    dispatchedToDonors: dispatchedCount,
    dispatchedToFamily: familyCount,
    totalDispatched: dispatchedCount + familyCount,
    failures: failureCount,
    familyIncluded: shouldIncludeFamily,
    logsSample: logs.slice(0, 10)
  };
}

/**
 * Automatic Zero-Touch Festival Scheduler
 * Runs automatically on startup, every 15 minutes, and daily at 08:00 AM.
 * If today matches a scheduled Hindu festival date, automatically sends WhatsApp
 * blessings to all active permitted donors and permitted family members once per year.
 */
export async function runAutomatedFestivalCheck(forceRun = false) {
  const allSettings = await prisma.systemSetting.findMany().catch(() => []);
  const getSetting = (key: string, def: string) =>
    allSettings.find((s: any) => s.key === key)?.value || def;

  const isAutoWhatsAppEnabled = getSetting('AUTO_WHATSAPP_ENABLED', 'true') !== 'false';
  const isAutoFestivalEnabled = getSetting('AUTO_FESTIVAL_ENABLED', 'true') !== 'false';
  const messagingTime = getSetting('MESSAGING_TIME', '08:00');

  if (!isAutoWhatsAppEnabled || !isAutoFestivalEnabled) {
    return { status: 'DISABLED', festivalsTriggered: [] };
  }

  const now = new Date();
  if (!forceRun && messagingTime) {
    const [schedH, schedM] = messagingTime.split(':').map((n: string) => parseInt(n, 10));
    if (!isNaN(schedH) && !isNaN(schedM)) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const schedMinutes = schedH * 60 + schedM;
      if (nowMinutes < schedMinutes) {
        return { status: 'WAITING_FOR_SCHEDULED_TIME', scheduledTime: messagingTime, festivalsTriggered: [] };
      }
    }
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayIso = `${year}-${month}-${day}`;
  const todayMonthDay = `${month}-${day}`;

  const festivalsTriggered: any[] = [];

  for (const fest of FESTIVAL_TEMPLATES) {
    const perFestEnabled = getSetting(`FESTIVAL_AUTO_${fest.id}`, 'true') !== 'false';
    if (!perFestEnabled) continue;

    const scheduledDate = getSetting(`FESTIVAL_DATE_${fest.id}`, fest.defaultDate);
    // Match either exact YYYY-MM-DD or recurring MM-DD
    const isTodayFestival =
      scheduledDate === todayIso ||
      (scheduledDate.length >= 5 && scheduledDate.slice(-5) === todayMonthDay);

    if (!isTodayFestival) continue;

    const sentLockKey = `FESTIVAL_AUTO_SENT_${fest.id}_${year}`;
    const alreadySent = allSettings.find((s: any) => s.key === sentLockKey)?.value;
    if (alreadySent) {
      continue;
    }

    console.log(`[Festival Auto-Pilot] Today (${todayIso}) is ${fest.name}! Automatically broadcasting blessings to devotees and permitted family members...`);
    const result = await broadcastFestivalMessage({
      festivalId: fest.id,
      donorCategoryFilter: 'ALL'
    });

    await prisma.systemSetting.upsert({
      where: { key: sentLockKey },
      update: { value: new Date().toISOString(), updatedBy: 'system-auto-festival' },
      create: { key: sentLockKey, value: new Date().toISOString(), updatedBy: 'system-auto-festival' }
    }).catch(() => {});

    festivalsTriggered.push({
      festivalId: fest.id,
      festivalName: fest.name,
      ...result
    });
  }

  return {
    status: 'COMPLETED',
    dateChecked: todayIso,
    festivalsTriggered
  };
}
