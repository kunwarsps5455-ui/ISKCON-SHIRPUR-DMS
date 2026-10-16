import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get Dashboard Summary
router.get('/dashboard', async (_req, res) => {
  try {
    const totalDonors = await prisma.donor.count({ where: { status: 'ACTIVE' } });
    
    // In MVP, we fetch valid donations to sum them up. In prod, we'd use aggregation.
    const allValidDonations = await prisma.donation.findMany({
      where: { status: 'VALID' },
      select: { amount: true, donorId: true }
    });

    const totalDonationsAmount = allValidDonations.reduce((sum, d) => sum + d.amount, 0);

    // Calculate categories
    const donorTotals: Record<string, number> = {};
    allValidDonations.forEach(d => {
      donorTotals[d.donorId] = (donorTotals[d.donorId] || 0) + d.amount;
    });

    let platinum = 0, gold = 0, silver = 0, sudama = 0;
    
    // First, count those with donations
    Object.values(donorTotals).forEach(total => {
      if (total >= 1000000) platinum++;
      else if (total >= 500000) gold++;
      else if (total >= 100000) silver++;
      else sudama++;
    });

    // Add donors with 0 donations to sudama
    const donorsWithDonationsCount = Object.keys(donorTotals).length;
    sudama += (totalDonors - donorsWithDonationsCount);

    const smsSent = await prisma.birthdayMessage.count({ where: { status: 'SENT' } });
    const smsFailed = await prisma.birthdayMessage.count({ where: { status: 'FAILED' } });

    // Compute today's birthdays so Dashboard KPI card is accurate
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const [donorsWithDob, familyWithDob] = await Promise.all([
      prisma.donor.findMany({
        where: { status: 'ACTIVE', dob: { not: null } },
        select: { id: true, fullName: true, mobile: true, dob: true }
      }),
      prisma.familyMember.findMany({
        where: { status: 'ACTIVE', dob: { not: null } },
        select: { id: true, fullName: true, mobile: true, dob: true, relationship: true }
      })
    ]);

    const upcomingBirthdays = [
      ...donorsWithDob.filter(d => d.dob && d.dob.getMonth() === currentMonth && d.dob.getDate() === currentDay).map(d => ({ ...d, type: 'DONOR' })),
      ...familyWithDob.filter(f => f.dob && f.dob.getMonth() === currentMonth && f.dob.getDate() === currentDay).map(f => ({ ...f, type: 'FAMILY' }))
    ];

    res.json({
      totalDonors,
      totalDonationsAmount,
      categories: { platinum, gold, silver, sudama },
      smsStats: { sent: smsSent, failed: smsFailed },
      upcomingBirthdays
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
