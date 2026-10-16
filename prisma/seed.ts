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
      name: 'Demo Admin',
      email: 'admin@iskconshirpur.org',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const checker = await prisma.user.upsert({
    where: { email: 'checker@iskconshirpur.org' },
    update: {},
    create: {
      name: 'Demo Checker',
      email: 'checker@iskconshirpur.org',
      passwordHash: checkerPassword,
      role: 'CHECKER',
    },
  });

  console.log(`Created users: ${admin.email}, ${checker.email}`);

  // 2. Create Message Templates
  await prisma.messageTemplate.create({
    data: {
      name: 'Default Hindi Birthday Wish',
      language: 'HI',
      channel: 'SMS',
      message: 'प्रिय {{name}} जी,\n\nहरे कृष्ण 🙏\n\nश्री श्री राधा गोपीनाथ की कृपा से आपका जन्मदिन सुख, शांति, उत्तम स्वास्थ्य और आध्यात्मिक आनंद से परिपूर्ण हो।\n\nISKCON Shirpur परिवार की ओर से आपको जन्मदिन की हार्दिक शुभकामनाएँ।\n\nहरे कृष्ण 🙏',
      isDefault: true,
      createdBy: admin.id,
    }
  });

  // 3. Create Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'ORG_NAME', value: 'ISKCON Shirpur', updatedBy: admin.id },
      { key: 'ORG_DEITY', value: 'श्री श्री राधा गोपीनाथ', updatedBy: admin.id },
      { key: 'AUTO_SMS_ENABLED', value: 'true', updatedBy: admin.id },
      { key: 'AI_ENABLED', value: 'false', updatedBy: admin.id },
      { key: 'SMS_TIME', value: '08:00', updatedBy: admin.id },
    ],
    skipDuplicates: true
  });

  // 4. Create Demo Donors (Sudama, Silver, Gold, Platinum)
  const donorsData = [
    { name: 'Sudama Das', amount: 50000, dob: new Date('1990-05-10') }, // Sudama
    { name: 'Silver Chaitanya Das', amount: 200000, dob: new Date() }, // Silver, birthday today!
    { name: 'Gold Nityananda Das', amount: 600000, dob: new Date('1985-08-20') }, // Gold
    { name: 'Platinum Prabhupada Das', amount: 1500000, dob: new Date('1975-12-05') }, // Platinum
  ];

  for (let i = 0; i < donorsData.length; i++) {
    const data = donorsData[i];
    const donor = await prisma.donor.create({
      data: {
        donorId: `ISK-${String(i + 1).padStart(6, '0')}`,
        fullName: data.name,
        dob: data.dob,
        mobile: `980000000${i}`,
        smsPermission: 'ALLOWED',
        createdBy: admin.id,
      }
    });

    await prisma.donation.create({
      data: {
        donationId: `DON-${String(i + 1).padStart(6, '0')}`,
        donorId: donor.id,
        amount: data.amount,
        donationDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        createdBy: admin.id,
      }
    });
    
    // Add family member
    await prisma.familyMember.create({
      data: {
        donorId: donor.id,
        fullName: `${data.name} Wife`,
        relationship: 'Spouse',
        dob: new Date('1992-01-01'),
        mobile: `970000000${i}`,
        smsPermission: 'ALLOWED'
      }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
