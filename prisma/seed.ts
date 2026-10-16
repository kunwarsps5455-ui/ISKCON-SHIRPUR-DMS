import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Admin & Checker Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const checkerPassword = await bcrypt.hash('checker123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@iskconshirpur.org' },
    update: {},
    create: {
      name: 'Radha Govinda Das (Admin)',
      email: 'admin@iskconshirpur.org',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const checker = await prisma.user.upsert({
    where: { email: 'checker@iskconshirpur.org' },
    update: {},
    create: {
      name: 'Bhakta Amit (Checker)',
      email: 'checker@iskconshirpur.org',
      passwordHash: checkerPassword,
      role: 'CHECKER',
    },
  });

  console.log(`Created users: ${admin.email}, ${checker.email}`);

  // 2. Create Message Templates
  const defaultWaTemplate = await prisma.messageTemplate.findFirst({
    where: { name: 'Default Hindi WhatsApp Birthday Blessing' }
  });

  if (!defaultWaTemplate) {
    await prisma.messageTemplate.create({
      data: {
        name: 'Default Hindi WhatsApp Birthday Blessing',
        language: 'HI',
        channel: 'WHATSAPP',
        message: 'प्रिय {{name}} जी,\n\nहरे कृष्ण! दण्डवत प्रणाम 🙏\n\nश्री श्री राधा गोपीनाथ एवं श्रील प्रभुपाद की असीम कृपा से आपका यह शुभ जन्मदिन सुख, शांति, उत्तम स्वास्थ्य एवं कृष्ण भावनामृत भक्ति रस से परिपूर्ण हो।\n\nइस्कॉन शिरपुर (ISKCON Shirpur) परिवार की ओर से आपको एवं आपके परिवार को जन्मदिन की हार्दिक शुभकामनाएँ एवं आशीर्वाद।\n\nहरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे।\nहरे राम हरे राम राम राम हरे हरे॥',
        isDefault: true,
        createdBy: admin.id,
      }
    });
  }

  // 3. Create Settings
  const settingsData = [
    { key: 'ORG_NAME', value: 'ISKCON Shirpur' },
    { key: 'ORG_DEITY', value: 'श्री श्री राधा गोपीनाथ' },
    { key: 'AUTO_WHATSAPP_ENABLED', value: 'true' },
    { key: 'AUTO_RECEIPT_ENABLED', value: 'true' },
    { key: 'AUTO_SMS_ENABLED', value: 'true' },
    { key: 'AI_ENABLED', value: 'false' },
    { key: 'MESSAGING_TIME', value: '08:00' },
    { key: 'WHATSAPP_MODE', value: 'mock' },
  ];

  for (const s of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value, updatedBy: admin.id }
    });
  }

  // 4. Create Demo Donors across CRM stages
  const todayForDonor = new Date();
  todayForDonor.setFullYear(1976);
  const todayForFamily = new Date();
  todayForFamily.setFullYear(1980);

  const donorsData = [
    {
      name: 'Ramesh Sharma',
      amount: 1500000,
      dob: todayForDonor, // Birthday today!
      mobile: '9822011111',
      stage: 'LIFE_PATRON',
      notes: 'ISKCON Life Patron devotee. Dedicated to Sunday Feast sponsorship.'
    },
    {
      name: 'Gopal Krishna Das',
      amount: 500000,
      dob: new Date('1982-04-15'),
      mobile: '9822022222',
      stage: 'PATRON',
      notes: 'Active patron. Regularly sponsors Gaura Purnima prasadam.'
    },
    {
      name: 'Anita Verma',
      amount: 51000,
      dob: new Date('1990-08-25'),
      mobile: '9822033333',
      stage: 'REGULAR',
      notes: 'Monthly seva donor.'
    },
    {
      name: 'Bhakta Suresh Patil',
      amount: 5100,
      dob: new Date('1995-12-05'),
      mobile: '9822044444',
      stage: 'FIRST_TIME',
      notes: 'First time donor at Janmashtami book stall.'
    },
  ];

  for (let i = 0; i < donorsData.length; i++) {
    const data = donorsData[i];
    const existing = await prisma.donor.findFirst({ where: { mobile: data.mobile } });
    if (existing) {
      if (i === 0) {
        await prisma.donor.update({ where: { id: existing.id }, data: { dob: todayForDonor } });
        await prisma.familyMember.updateMany({ where: { donorId: existing.id }, data: { dob: todayForFamily } });
      }
    } else {
      const donor = await prisma.donor.create({
        data: {
          donorId: `ISK-${String(i + 1).padStart(6, '0')}`,
          fullName: data.name,
          dob: data.dob,
          mobile: data.mobile,
          stage: data.stage,
          preferredChannel: 'WHATSAPP',
          whatsappPermission: 'ALLOWED',
          smsPermission: 'ALLOWED',
          notes: data.notes,
          createdBy: admin.id,
        }
      });

      await prisma.donation.create({
        data: {
          donationId: `DON-${String(i + 1).padStart(6, '0')}`,
          donorId: donor.id,
          amount: data.amount,
          donationDate: new Date(),
          paymentMethod: 'UPI',
          purpose: 'Temple Deity Seva & Annadanam',
          receiptSent: true,
          receiptChannel: 'WHATSAPP',
          createdBy: admin.id,
        }
      });

      // Add a family member
      await prisma.familyMember.create({
        data: {
          donorId: donor.id,
          fullName: `${data.name} (Spouse)`,
          relationship: 'Spouse',
          dob: i === 0 ? todayForFamily : new Date('1988-03-20'),
          mobile: `982200000${i}`,
          whatsappPermission: 'ALLOWED'
        }
      });

      // Add an Interaction log
      await prisma.interaction.create({
        data: {
          donorId: donor.id,
          type: 'TEMPLE_VISIT',
          subject: 'Sunday Feast Mangala Aarti & Darshan',
          notes: 'Devotee attended morning Aarti, received prasadam and offered heartfelt prayers.',
          outcome: 'Interested in sponsoring Janmashtami Abhishek Seva.',
          createdBy: admin.name
        }
      });

      // Add a CRM Follow-up Task
      await prisma.crmTask.create({
        data: {
          donorId: donor.id,
          title: `Janmashtami Seva follow-up with ${data.name}`,
          description: 'Share Janmashtami festival seva sponsorship details via WhatsApp.',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days ahead
          priority: i === 0 ? 'HIGH' : 'MEDIUM',
          status: 'PENDING',
          assignedTo: 'Radha Govinda Das',
          createdBy: admin.name
        }
      });
    }
  }

  console.log('Seed completed successfully with CRM & WhatsApp demo data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
