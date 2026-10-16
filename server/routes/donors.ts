import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { dispatchWhatsAppReceipt, generateNextDonationId } from './donations.js';

const router = Router();
router.use(authenticate);

export async function generateNextDonorId(): Promise<string> {
  const latest = await prisma.donor.findFirst({
    orderBy: { donorId: 'desc' },
    select: { donorId: true }
  });
  let nextNum = 1;
  if (latest?.donorId) {
    const match = latest.donorId.match(/ISK-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  const totalCount = await prisma.donor.count();
  if (totalCount + 1 > nextNum) nextNum = totalCount + 1;
  return `ISK-${String(nextNum).padStart(6, '0')}`;
}

// Get all donors (with search & filters)
router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const skip = Math.max(0, parseInt(req.query.skip as string) || 0);
    const take = Math.max(1, parseInt(req.query.take as string) || 25);

    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = 'ACTIVE';
    }

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search as string } },
        { donorId: { contains: search as string } },
        { mobile: { contains: search as string } },
      ];
    }

    const donors = await prisma.donor.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        donations: {
          where: { status: 'VALID' },
          select: { amount: true }
        }
      }
    });

    // Calculate total contribution and category dynamically for list view before filtering/pagination
    let allEnrichedDonors = donors.map(donor => {
      const totalDonation = donor.donations.reduce((sum, d) => sum + d.amount, 0);
      let calcCategory = 'SUDAMA';
      if (totalDonation >= 1000000) calcCategory = 'PLATINUM';
      else if (totalDonation >= 500000) calcCategory = 'GOLD';
      else if (totalDonation >= 100000) calcCategory = 'SILVER';

      const { donations, ...rest } = donor;
      return { ...rest, totalDonation, category: calcCategory };
    });

    if (category && category !== 'ALL') {
      allEnrichedDonors = allEnrichedDonors.filter(d => d.category === category);
    }

    const total = allEnrichedDonors.length;
    const enrichedDonors = allEnrichedDonors.slice(skip, skip + take);

    res.json({ data: enrichedDonors, total, skip, take });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

// Get single donor
router.get('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const donor = await prisma.donor.findUnique({
      where: { id },
      include: {
        donations: {
          where: { status: 'VALID' },
          orderBy: { donationDate: 'desc' }
        },
        familyMembers: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    const totalDonation = donor.donations.reduce((sum, d) => sum + d.amount, 0);
    let category = 'SUDAMA';
    if (totalDonation >= 1000000) category = 'PLATINUM';
    else if (totalDonation >= 500000) category = 'GOLD';
    else if (totalDonation >= 100000) category = 'SILVER';

    res.json({ ...donor, totalDonation, category });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donor' });
  }
});

// Create Donor (Admin only)
router.post('/', requireAdmin, logAudit('CREATE_DONOR', 'Donor'), async (req: AuthRequest, res) => {
  try {
    const { 
      fullName, dob, gender, mobile, email, address, city, state, pincode, 
      stage, preferredChannel, whatsappPermission, smsPermission, notes,
      initialAmount, initialPaymentMethod, initialPurpose, initialTransactionRef, sendReceiptNow = true
    } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Donor full name is required' });
    }
    
    const donorId = await generateNextDonorId();

    const newDonor = await prisma.donor.create({
      data: {
        donorId,
        fullName: fullName.trim(),
        dob: dob ? new Date(dob) : null,
        gender,
        mobile,
        email,
        address,
        city,
        state,
        pincode,
        stage: stage || 'REGULAR',
        preferredChannel: preferredChannel || 'WHATSAPP',
        whatsappPermission: whatsappPermission || 'ALLOWED',
        smsPermission: smsPermission || 'UNKNOWN',
        notes,
        createdBy: req.user!.id
      }
    });

    // Optionally record initial donation immediately if amount is provided
    let initialDonationRecord: any = null;
    const parsedAmount = initialAmount ? parseFloat(String(initialAmount)) : 0;

    if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
      const donationId = await generateNextDonationId();

      initialDonationRecord = await prisma.donation.create({
        data: {
          donationId,
          donorId: newDonor.id,
          amount: parsedAmount,
          donationDate: new Date(),
          paymentMethod: initialPaymentMethod || 'UPI',
          transactionReference: initialTransactionRef || null,
          purpose: initialPurpose || 'Temple Deity Seva & Annadanam',
          notes: 'Opening contribution recorded during devotee registration',
          createdBy: req.user!.id
        }
      });

      // Advance stage to FIRST_TIME if prospect
      if (newDonor.stage === 'PROSPECT') {
        await prisma.donor.update({
          where: { id: newDonor.id },
          data: { stage: 'FIRST_TIME' }
        }).catch(() => {});
      }

      const autoReceiptSetting = await prisma.systemSetting.findUnique({ where: { key: 'AUTO_RECEIPT_ENABLED' } });
      const isAutoReceiptGlobalEnabled = autoReceiptSetting ? autoReceiptSetting.value !== 'false' : true;

      // Automatically dispatch WhatsApp seva receipt if permitted and enabled
      if (sendReceiptNow && isAutoReceiptGlobalEnabled && newDonor.mobile && newDonor.whatsappPermission !== 'NOT_ALLOWED') {
        const waResult = await dispatchWhatsAppReceipt(newDonor, initialDonationRecord);
        if (waResult.sent) {
          initialDonationRecord = await prisma.donation.update({
            where: { id: initialDonationRecord.id },
            data: { receiptSent: true, receiptChannel: 'WHATSAPP' }
          }).catch(() => initialDonationRecord);
        }
      }
    }

    res.locals.entityId = newDonor.id;
    res.locals.auditNewData = { fullName, mobile, donorId, initialAmount: parsedAmount };
    
    res.status(201).json({
      ...newDonor,
      initialDonation: initialDonationRecord
    });
  } catch (error) {
    console.error('Failed to create donor:', error);
    res.status(500).json({ error: 'Failed to create donor' });
  }
});

// Update Donor (Admin only)
router.put('/:id', requireAdmin, logAudit('UPDATE_DONOR', 'Donor'), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const oldDonor = await prisma.donor.findUnique({ where: { id } });
    if (!oldDonor) return res.status(404).json({ error: 'Donor not found' });

    const { fullName, dob, gender, mobile, email, address, city, state, pincode, stage, preferredChannel, whatsappPermission, smsPermission, notes } = req.body;

    if (fullName !== undefined && (!fullName || typeof fullName !== 'string' || !fullName.trim())) {
      return res.status(400).json({ error: 'Donor full name cannot be empty' });
    }

    const updated = await prisma.donor.update({
      where: { id },
      data: {
        ...(fullName !== undefined && { fullName: fullName.trim() }),
        dob: dob ? new Date(dob) : null,
        gender,
        mobile,
        email,
        address,
        city,
        state,
        pincode,
        ...(stage !== undefined && { stage }),
        ...(preferredChannel !== undefined && { preferredChannel }),
        ...(whatsappPermission !== undefined && { whatsappPermission }),
        ...(smsPermission !== undefined && { smsPermission }),
        notes
      }
    });

    res.locals.auditOldData = oldDonor;
    res.locals.auditNewData = updated;

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update donor' });
  }
});

export default router;
