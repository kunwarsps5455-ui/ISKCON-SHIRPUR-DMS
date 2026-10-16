import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { runBirthdayCheck } from '../services/birthdayAutomation.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Get today's birthdays
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    // In production with postgres, use raw SQL. For MVP, filter in memory.
    const donors = await prisma.donor.findMany({ where: { status: 'ACTIVE', dob: { not: null } } });
    const familyMembers = await prisma.familyMember.findMany({ where: { status: 'ACTIVE', dob: { not: null } } });

    const isBirthday = (dob: Date) => dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;

    const bdayDonors = donors.filter(d => isBirthday(d.dob!)).map(d => ({ ...d, type: 'DONOR' }));
    const bdayFamily = familyMembers.filter(f => isBirthday(f.dob!)).map(f => ({ ...f, type: 'FAMILY_MEMBER' }));

    res.json([...bdayDonors, ...bdayFamily]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

// Get birthday messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.birthdayMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Trigger manual run (Admin only)
router.post('/trigger-run', requireAdmin, logAudit('TRIGGER_BIRTHDAY_JOB', 'System'), async (req: AuthRequest, res) => {
  try {
    const result = await runBirthdayCheck(true);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger job' });
  }
});

export default router;
