import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { sendWhatsAppTextMessage, sendWhatsAppTemplateMessage, getMetaConfig } from '../services/metaWhatsAppService.js';

const router = Router();
router.use(authenticate);

// Get all donations (with donor info)
router.get('/', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 50;
    const search = req.query.search as string;

    let whereClause: any = {};
    
    if (search) {
      whereClause = {
        OR: [
          { donationId: { contains: search } },
          { donor: { fullName: { contains: search } } },
          { donor: { donorId: { contains: search } } }
        ]
      };
    }

    const donations = await prisma.donation.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { donationDate: 'desc' },
      include: {
        donor: {
          select: { id: true, fullName: true, donorId: true, mobile: true, stage: true }
        }
      }
    });

    const total = await prisma.donation.count({ where: whereClause });
    res.json({ data: donations, total, skip, take });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Helper: Dispatch WhatsApp receipt (uses approved Meta HSM template in live mode, full text in mock mode)
export async function dispatchWhatsAppReceipt(donation: any, donor: any) {
  if (!donor.mobile || donor.whatsappPermission === 'NOT_ALLOWED') {
    return { sent: false, reason: 'No mobile or permission denied' };
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(donation.amount);

  const dateStr = new Date(donation.donationDate).toLocaleDateString('en-IN');
  const purposeStr = donation.purpose || 'सामान्य मंदिर सेवा (General Temple Seva)';
  const methodStr = donation.paymentMethod || 'UPI';

  const metaConfig = await getMetaConfig();
  const useLiveTemplate = metaConfig.isConfigured && metaConfig.mode !== 'mock';

  let waResult;
  if (useLiveTemplate) {
    waResult = await sendWhatsAppTemplateMessage(
      donor.mobile,
      metaConfig.receiptTemplate || 'iskcon_seva_receipt_hi',
      'hi',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(donor.fullName) },
            { type: 'text', text: String(donation.donationId) },
            { type: 'text', text: String(formattedAmount) },
            { type: 'text', text: String(dateStr) },
            { type: 'text', text: String(purposeStr) },
            { type: 'text', text: String(methodStr) },
          ],
        },
      ],
      donor.id
    );
  } else {
    const receiptMessage = `हरे कृष्ण ${donor.fullName} जी 🙏\n\nइस्कॉन शिरपुर (ISKCON Shirpur) की दिव्य सेवा में आपका आर्थिक सहयोग सप्रेम प्राप्त हुआ।\n\n📜 रसीद संख्या: ${donation.donationId}\n💰 सहयोग राशि: ${formattedAmount}\n📅 दिनांक: ${dateStr}\n🪷 सेवा उद्देश्य: ${purposeStr}\n💳 माध्यम: ${methodStr}\n\nश्री श्री राधा गोपीनाथ एवं श्रील प्रभुपाद जी आपके और आपके परिवार पर अपनी असीम अनुकम्पा व भक्ति रस की वर्षा करें।\n\nसादर,\nइस्कॉन शिरपुर (ISKCON Shirpur)\nसम्पर्क: 9800000000`;
    waResult = await sendWhatsAppTextMessage(donor.mobile, receiptMessage, donor.id);
  }
  
  if (waResult.success) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { receiptSent: true, receiptChannel: 'WHATSAPP' }
    }).catch(() => {});
  }

  return { sent: waResult.success, result: waResult };
}

export async function generateNextDonationId(): Promise<string> {
  const last = await prisma.donation.findFirst({
    orderBy: { donationId: 'desc' },
    select: { donationId: true }
  });
  const lastNum = last?.donationId ? parseInt(last.donationId.replace(/\D/g, ''), 10) || 0 : 0;
  const count = await prisma.donation.count();
  const nextNum = Math.max(lastNum, count) + 1;
  return `DON-${String(nextNum).padStart(6, '0')}`;
}

// Create Donation (Admin only)
router.post('/donor/:donorId', requireAdmin, logAudit('CREATE_DONATION', 'Donation'), async (req: AuthRequest, res) => {
  try {
    const donorId = String(req.params.donorId);
    const { amount, donationDate, paymentMethod, transactionReference, purpose, notes, sendReceiptNow = true } = req.body;

    const numericAmount = typeof amount === 'number' ? amount : Number(amount);
    if (amount === undefined || amount === null || amount === '' || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Donation amount must be greater than 0' });
    }

    if (!paymentMethod || typeof paymentMethod !== 'string' || !paymentMethod.trim()) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    const donor = await prisma.donor.findUnique({
      where: { id: donorId }
    });

    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    const donationId = await generateNextDonationId();

    let newDonation = await prisma.donation.create({
      data: {
        donationId,
        donorId,
        amount: numericAmount,
        donationDate: new Date(donationDate || Date.now()),
        paymentMethod: paymentMethod.trim(),
        transactionReference,
        purpose,
        notes,
        createdBy: req.user!.id
      }
    });

    // Auto update donor stage if first time
    if (donor.stage === 'PROSPECT') {
      await prisma.donor.update({
        where: { id: donorId },
        data: { stage: 'FIRST_TIME' }
      }).catch(() => {});
    }

    // Check global AUTO_RECEIPT_ENABLED setting
    const autoReceiptSetting = await prisma.systemSetting.findUnique({
      where: { key: 'AUTO_RECEIPT_ENABLED' }
    }).catch(() => null);
    const isAutoReceiptEnabled = autoReceiptSetting ? autoReceiptSetting.value === 'true' : true;

    // Automated WhatsApp receipt
    let receiptStatus: { sent: boolean; [k: string]: any } = { sent: false };
    if (sendReceiptNow && isAutoReceiptEnabled) {
      receiptStatus = await dispatchWhatsAppReceipt(newDonation, donor);
      if (receiptStatus.sent) {
        newDonation = { ...newDonation, receiptSent: true, receiptChannel: 'WHATSAPP' };
      }
    }

    res.locals.entityId = newDonation.id;
    res.locals.auditNewData = { amount: numericAmount, donationId, donorId };

    res.status(201).json({
      ...newDonation,
      receiptStatus
    });
  } catch (error) {
    console.error('Failed to create donation:', error);
    res.status(500).json({ error: 'Failed to create donation' });
  }
});

// Manually trigger WhatsApp receipt for an existing donation
router.post('/:id/send-receipt', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const donation = await prisma.donation.findUnique({
      where: { id },
      include: { donor: true }
    });

    if (!donation) return res.status(404).json({ error: 'Donation not found' });

    const result = await dispatchWhatsAppReceipt(donation, donation.donor);
    res.json({ message: 'WhatsApp receipt dispatched', ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispatch receipt' });
  }
});

// Update Donation (Admin only)
router.put('/:id', requireAdmin, logAudit('UPDATE_DONATION', 'Donation'), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const oldDonation = await prisma.donation.findUnique({ where: { id } });
    if (!oldDonation) return res.status(404).json({ error: 'Donation not found' });

    const { amount, donationDate, paymentMethod, transactionReference, purpose, notes, status } = req.body;

    let parsedAmount: number | undefined = undefined;
    if (amount !== undefined) {
      parsedAmount = typeof amount === 'number' ? amount : Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Donation amount must be greater than 0' });
      }
    }

    const updated = await prisma.donation.update({
      where: { id },
      data: {
        amount: parsedAmount,
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
