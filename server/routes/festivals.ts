import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import {
  FESTIVAL_TEMPLATES,
  getEnrichedFestivalTemplates,
  broadcastFestivalMessage,
  runAutomatedFestivalCheck
} from '../services/festivalService.js';

const router = Router();
router.use(authenticate);

// List available Major Hindu & ISKCON Festival Templates (with auto-schedule dates & status)
router.get('/templates', async (_req, res) => {
  try {
    const templates = await getEnrichedFestivalTemplates();
    res.json(templates);
  } catch (error) {
    res.json(FESTIVAL_TEMPLATES);
  }
});

// Preview personalized message for a festival
router.post('/preview', (req, res) => {
  const { festivalId, name = 'भक्त' } = req.body;
  const festival = FESTIVAL_TEMPLATES.find(f => f.id === festivalId);
  if (!festival) {
    return res.status(404).json({ error: 'Festival template not found' });
  }

  const sampleMessage = festival.defaultMessage.replace(/{{name}}/g, name);
  res.json({
    festivalId: festival.id,
    name: festival.name,
    hindiName: festival.hindiName,
    templateName: festival.templateName,
    previewMessage: sampleMessage
  });
});

// Update automatic schedule date or auto-send toggle for a festival (Admin only)
router.put('/:id/schedule', requireAdmin, logAudit('UPDATE_FESTIVAL_SCHEDULE', 'Festival'), async (req: AuthRequest, res) => {
  try {
    const festivalId = String(req.params.id);
    const festival = FESTIVAL_TEMPLATES.find(f => f.id === festivalId);
    if (!festival) {
      return res.status(404).json({ error: `Festival template '${festivalId}' not found` });
    }

    const { scheduledDate, autoSendEnabled } = req.body;

    if (scheduledDate !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: `FESTIVAL_DATE_${festivalId}` },
        update: { value: String(scheduledDate), updatedBy: req.user!.id },
        create: { key: `FESTIVAL_DATE_${festivalId}`, value: String(scheduledDate), updatedBy: req.user!.id }
      });
    }

    if (autoSendEnabled !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: `FESTIVAL_AUTO_${festivalId}` },
        update: { value: autoSendEnabled ? 'true' : 'false', updatedBy: req.user!.id },
        create: { key: `FESTIVAL_AUTO_${festivalId}`, value: autoSendEnabled ? 'true' : 'false', updatedBy: req.user!.id }
      });
    }

    // Automatically check if the updated schedule matches today and auto-dispatch if due
    const autoCheckResult = await runAutomatedFestivalCheck(true);
    const updatedTemplates = await getEnrichedFestivalTemplates();
    const updatedFestival = updatedTemplates.find(f => f.id === festivalId);

    res.json({
      message: `Automatic schedule updated for ${festival.name}`,
      festival: updatedFestival,
      autoCheckResult
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update festival schedule' });
  }
});

// Trigger automated festival check now (Admin only)
router.post('/trigger-auto-check', requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const result = await runAutomatedFestivalCheck(true);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run automated festival check' });
  }
});

// Broadcast Festival Blessings via Meta WhatsApp API (Admin only)
router.post('/broadcast', requireAdmin, logAudit('BROADCAST_FESTIVAL', 'Festival'), async (req: AuthRequest, res) => {
  try {
    const { festivalId, customMessage, includeFamilyMembers, donorCategoryFilter } = req.body;

    if (!festivalId) {
      return res.status(400).json({ error: 'festivalId is required' });
    }

    const festivalExists = FESTIVAL_TEMPLATES.some(f => f.id === festivalId);
    if (!festivalExists) {
      return res.status(404).json({ error: `Festival template '${festivalId}' not found` });
    }

    const result = await broadcastFestivalMessage({
      festivalId,
      customMessage,
      includeFamilyMembers,
      donorCategoryFilter,
      senderUserId: req.user!.id
    });

    res.locals.entityId = festivalId;
    res.locals.auditNewData = {
      festivalId,
      totalDispatched: result.totalDispatched,
      familyIncluded: result.familyIncluded
    };

    res.json({
      message: `Festival blessings broadcast completed for ${result.festival}`,
      ...result
    });
  } catch (error: any) {
    console.error('Failed to broadcast festival messages:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch festival broadcast' });
  }
});

export default router;
