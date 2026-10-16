import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Get all donors (with search & filters)
router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 25;

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
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        donations: {
          where: { status: 'VALID' },
          select: { amount: true }
        }
      }
    });

    const total = await prisma.donor.count({ where: whereClause });

    // Calculate total contribution and category dynamically for list view
    const enrichedDonors = donors.map(donor => {
      const totalDonation = donor.donations.reduce((sum, d) => sum + d.amount, 0);
      let calcCategory = 'SUDAMA';
      if (totalDonation >= 1000000) calcCategory = 'PLATINUM';
      else if (totalDonation >= 500000) calcCategory = 'GOLD';
      else if (totalDonation >= 100000) calcCategory = 'SILVER';

      // Remove donations array to save bandwidth if not needed
      const { donations, ...rest } = donor;
      return { ...rest, totalDonation, category: calcCategory };
    });

    res.json({ data: enrichedDonors, total, skip, take });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

// Get single donor
router.get('/:id', async (req, res) => {
  try {
    const donor = await prisma.donor.findUnique({
      where: { id: req.params.id },
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
    const { fullName, dob, gender, mobile, email, address, city, state, pincode, smsPermission, notes } = req.body;
    
    // Generate Donor ID
    const count = await prisma.donor.count();
    const donorId = `ISK-${String(count + 1).padStart(6, '0')}`;

    const newDonor = await prisma.donor.create({
      data: {
        donorId,
        fullName,
        dob: dob ? new Date(dob) : null,
        gender,
        mobile,
        email,
        address,
        city,
        state,
        pincode,
        smsPermission: smsPermission || 'UNKNOWN',
        notes,
        createdBy: req.user!.id
      }
    });

    res.locals.entityId = newDonor.id;
    res.locals.auditNewData = { fullName, mobile, donorId };
    
    res.status(201).json(newDonor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create donor' });
  }
});

// Update Donor (Admin only)
router.put('/:id', requireAdmin, logAudit('UPDATE_DONOR', 'Donor'), async (req: AuthRequest, res) => {
  try {
    const oldDonor = await prisma.donor.findUnique({ where: { id: req.params.id } });
    if (!oldDonor) return res.status(404).json({ error: 'Donor not found' });

    const { fullName, dob, gender, mobile, email, address, city, state, pincode, smsPermission, notes } = req.body;

    const updated = await prisma.donor.update({
      where: { id: req.params.id },
      data: {
        fullName,
        dob: dob ? new Date(dob) : null,
        gender,
        mobile,
        email,
        address,
        city,
        state,
        pincode,
        smsPermission,
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
