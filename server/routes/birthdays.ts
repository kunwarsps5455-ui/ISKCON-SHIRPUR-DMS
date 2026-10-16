import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { runBirthdayCheck } from '../services/birthdayAutomation.js';
import { runAutomatedFestivalCheck } from '../services/festivalService.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Get today's birthdays (and optionally auto-sync any pending birthday/festival wishes)
router.get('/today', async (req, res) => {
  try {
    if (req.query.autoSync === 'true') {
      await runBirthdayCheck(false).catch(() => {});
      await runAutomatedFestivalCheck(false).catch(() => {});
    }

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    
    const [donors, familyMembers, thisYearMessages] = await Promise.all([
      prisma.donor.findMany({ where: { status: 'ACTIVE', dob: { not: null } } }),
      prisma.familyMember.findMany({
        where: { status: 'ACTIVE', dob: { not: null } },
        include: { donor: { select: { fullName: true, mobile: true, donorId: true } } }
      }),
      prisma.birthdayMessage.findMany({
        where: { birthdayYear: currentYear }
      }).catch(() => [])
    ]);

    const msgByPersonId = new Map<string, any>();
    for (const m of thisYearMessages) {
      msgByPersonId.set(m.personId, m);
    }

    const isBirthday = (dob: Date) => dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;

    const bdayDonors = donors
      .filter(d => isBirthday(d.dob!))
      .map(d => {
        const msg = msgByPersonId.get(d.id);
        return {
          ...d,
          type: 'DONOR',
          autoDeliveryStatus: msg?.status || (d.whatsappPermission === 'NOT_ALLOWED' ? 'OPTED_OUT' : 'SCHEDULED'),
          autoSentAt: msg?.sentAt || null
        };
      });

    const bdayFamily = familyMembers
      .filter(f => isBirthday(f.dob!))
      .map(f => {
        const msg = msgByPersonId.get(f.id);
        return {
          ...f,
          mobile: f.mobile || f.donor?.mobile || null,
          donorName: f.donor?.fullName || null,
          type: 'FAMILY_MEMBER',
          autoDeliveryStatus: msg?.status || (f.whatsappPermission === 'NOT_ALLOWED' ? 'OPTED_OUT' : 'SCHEDULED'),
          autoSentAt: msg?.sentAt || null
        };
      });

    res.json([...bdayDonors, ...bdayFamily]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

// Get birthday messages
router.get('/messages', async (_req, res) => {
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
router.post('/trigger-run', requireAdmin, logAudit('TRIGGER_BIRTHDAY_JOB', 'System'), async (_req: AuthRequest, res) => {
  try {
    const result = await runBirthdayCheck(true, false);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger job' });
  }
});

export default router;
