import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Get templates
router.get('/', async (req, res) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Admin only below
router.use(requireAdmin);

router.post('/', logAudit('CREATE_TEMPLATE', 'MessageTemplate'), async (req: AuthRequest, res) => {
  try {
    const { name, language, channel, message, isDefault, active } = req.body;
    
    // If this is set as default, unset others
    if (isDefault) {
      await prisma.messageTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name,
        language,
        channel,
        message,
        isDefault,
        active,
        createdBy: req.user!.id
      }
    });

    res.locals.entityId = template.id;
    res.locals.auditNewData = { name, isDefault, active };

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.put('/:id', logAudit('UPDATE_TEMPLATE', 'MessageTemplate'), async (req: AuthRequest, res) => {
  try {
    const { name, language, channel, message, isDefault, active } = req.body;
    
    if (isDefault) {
      await prisma.messageTemplate.updateMany({
        where: { id: { not: req.params.id }, isDefault: true },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.messageTemplate.update({
      where: { id: req.params.id },
      data: {
        name,
        language,
        channel,
        message,
        isDefault,
        active,
        updatedBy: req.user!.id
      }
    });

    res.locals.auditNewData = { name, isDefault, active };
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

export default router;
