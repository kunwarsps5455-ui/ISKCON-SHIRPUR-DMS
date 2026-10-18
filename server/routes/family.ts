import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Get all family members (with donor info)
router.get('/', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 50;
    const search = req.query.search as string;

    let whereClause: any = {};
    
    if (search) {
      whereClause = {
        OR: [
          { fullName: { contains: search } },
          { mobile: { contains: search } },
          { donor: { fullName: { contains: search } } }
        ]
      };
    }

    const family = await prisma.familyMember.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        donor: {
          select: { fullName: true, donorId: true }
        }
      }
    });

    const total = await prisma.familyMember.count({ where: whereClause });
    res.json({ data: family, total, skip, take });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Create Family Member (Admin only)
router.post('/donor/:donorId', requireAdmin, logAudit('CREATE_FAMILY_MEMBER', 'FamilyMember'), async (req: AuthRequest, res) => {
  try {
    const donorId = String(req.params.donorId);
    const { fullName, relationship, dob, mobile, email, whatsappPermission, smsPermission, notes } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim() || !relationship || typeof relationship !== 'string' || !relationship.trim()) {
      return res.status(400).json({ error: 'Family member full name and relationship are required' });
    }

    const donorExists = await prisma.donor.findUnique({ where: { id: donorId } });
    if (!donorExists) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    const newFamilyMember = await prisma.familyMember.create({
      data: {
        donorId,
        fullName: fullName.trim(),
        relationship: relationship.trim(),
        dob: dob ? new Date(dob) : null,
        mobile,
        email,
        whatsappPermission: whatsappPermission === 'NOT_ALLOWED' ? 'NOT_ALLOWED' : 'ALLOWED',
        smsPermission: smsPermission || 'UNKNOWN',
        notes
      }
    });

    res.locals.entityId = newFamilyMember.id;
    res.locals.auditNewData = { fullName, relationship, donorId, whatsappPermission: newFamilyMember.whatsappPermission };

    res.status(201).json(newFamilyMember);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

// Update Family Member (Admin only)
router.put('/:id', requireAdmin, logAudit('UPDATE_FAMILY_MEMBER', 'FamilyMember'), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const oldFamilyMember = await prisma.familyMember.findUnique({ where: { id } });
    if (!oldFamilyMember) return res.status(404).json({ error: 'Family member not found' });

    const { fullName, relationship, dob, mobile, email, whatsappPermission, smsPermission, status, notes } = req.body;

    const updated = await prisma.familyMember.update({
      where: { id },
      data: {
        fullName,
        relationship,
        dob: dob ? new Date(dob) : null,
        mobile,
        email,
        ...(whatsappPermission !== undefined && { whatsappPermission }),
        ...(smsPermission !== undefined && { smsPermission }),
        status,
        notes
      }
    });

    res.locals.auditOldData = oldFamilyMember;
    res.locals.auditNewData = updated;

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// Quick 1-click toggle for messaging permission on individual family member
router.patch('/:id/messaging-permission', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { whatsappPermission } = req.body;
    const current = await prisma.familyMember.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Family member not found' });

    const newPermission = whatsappPermission || (current.whatsappPermission === 'ALLOWED' ? 'NOT_ALLOWED' : 'ALLOWED');

    const updated = await prisma.familyMember.update({
      where: { id },
      data: { whatsappPermission: newPermission }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle messaging permission' });
  }
});

// Delete Family Member (Admin only)
router.delete('/:id', requireAdmin, logAudit('DELETE_FAMILY_MEMBER', 'FamilyMember'), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.familyMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Delete any pending birthday messages for this family member
    await prisma.birthdayMessage.deleteMany({
      where: { personId: id }
    }).catch(() => {});

    await prisma.familyMember.delete({ where: { id } });

    res.locals.entityId = id;
    res.locals.auditOldData = {
      fullName: existing.fullName,
      relationship: existing.relationship,
      donorId: existing.donorId
    };

    res.json({ success: true, message: 'Family member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

export default router;
