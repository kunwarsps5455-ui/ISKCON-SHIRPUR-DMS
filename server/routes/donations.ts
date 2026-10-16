import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Create Donation (Admin only)
router.post('/donor/:donorId', requireAdmin, logAudit('CREATE_DONATION', 'Donation'), async (req: AuthRequest, res) => {
  try {
    const { donorId } = req.params;
    const { amount, donationDate, paymentMethod, transactionReference, purpose, notes } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Donation amount must be greater than 0' });
    }

    const count = await prisma.donation.count();
    const donationId = `DON-${String(count + 1).padStart(6, '0')}`;

    const newDonation = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          donationId,
          donorId,
          amount: parseFloat(amount),
          donationDate: new Date(donationDate),
          paymentMethod,
          transactionReference,
          purpose,
          notes,
          createdBy: req.user!.id
        }
      });
      return donation;
    });

    res.locals.entityId = newDonation.id;
    res.locals.auditNewData = { amount, donationId, donorId };

    res.status(201).json(newDonation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create donation' });
  }
});

// Update Donation (Admin only)
router.put('/:id', requireAdmin, logAudit('UPDATE_DONATION', 'Donation'), async (req: AuthRequest, res) => {
  try {
    const oldDonation = await prisma.donation.findUnique({ where: { id: req.params.id } });
    if (!oldDonation) return res.status(404).json({ error: 'Donation not found' });

    const { amount, donationDate, paymentMethod, transactionReference, purpose, notes, status } = req.body;

    if (amount && amount <= 0) {
      return res.status(400).json({ error: 'Donation amount must be greater than 0' });
    }

    const updated = await prisma.donation.update({
      where: { id: req.params.id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        donationDate: donationDate ? new Date(donationDate) : undefined,
        paymentMethod,
        transactionReference,
        purpose,
        notes,
        status
      }
    });

    res.locals.auditOldData = oldDonation;
    res.locals.auditNewData = updated;

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update donation' });
  }
});

export default router;
