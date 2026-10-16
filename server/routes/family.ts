import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Create Family Member (Admin only)
router.post('/donor/:donorId', requireAdmin, logAudit('CREATE_FAMILY_MEMBER', 'FamilyMember'), async (req: AuthRequest, res) => {
  try {
    const { donorId } = req.params;
    const { fullName, relationship, dob, mobile, email, smsPermission, notes } = req.body;

    const newFamilyMember = await prisma.familyMember.create({
      data: {
        donorId,
        fullName,
        relationship,
        dob: dob ? new Date(dob) : null,
        mobile,
        email,
        smsPermission: smsPermission || 'UNKNOWN',
        notes
      }
    });

    res.locals.entityId = newFamilyMember.id;
    res.locals.auditNewData = { fullName, relationship, donorId };

    res.status(201).json(newFamilyMember);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

// Update Family Member (Admin only)
router.put('/:id', requireAdmin, logAudit('UPDATE_FAMILY_MEMBER', 'FamilyMember'), async (req: AuthRequest, res) => {
  try {
    const oldFamilyMember = await prisma.familyMember.findUnique({ where: { id: req.params.id } });
    if (!oldFamilyMember) return res.status(404).json({ error: 'Family member not found' });

    const { fullName, relationship, dob, mobile, email, smsPermission, status, notes } = req.body;

    const updated = await prisma.familyMember.update({
      where: { id: req.params.id },
      data: {
        fullName,
        relationship,
        dob: dob ? new Date(dob) : null,
        mobile,
        email,
        smsPermission,
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

export default router;
