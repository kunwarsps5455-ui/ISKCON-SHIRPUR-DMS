import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  processWebhookStatus,
  getMetaConfig,
} from '../services/metaWhatsAppService.js';

const router = Router();

// ============================================================================
// META WHATSAPP WEBHOOK ENDPOINTS (Public / Verified by Meta)
// ============================================================================

/**
 * Meta Webhook Verification Handshake
 * Triggered by Meta when configuring the Webhook URL in Meta App Dashboard
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'iskcon_shirpur_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta Webhook] Successfully verified webhook challenge');
    return res.status(200).send(challenge);
  }

  console.warn('[Meta Webhook] Verification failed. Token mismatch.');
  return res.sendStatus(403);
});

/**
 * Meta Webhook Event Receiver
 * Receives delivery receipts, read receipts, and incoming status changes
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value && value.statuses) {
            for (const statusUpdate of value.statuses) {
              await processWebhookStatus(statusUpdate);
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error('[Meta Webhook] Error handling incoming event:', error);
    return res.sendStatus(500);
  }
});

// ============================================================================
// AUTHENTICATED INTERNAL WHATSAPP API ENDPOINTS
// ============================================================================

router.use(authenticate);

/**
 * Send manual custom text WhatsApp message
 */
router.post('/send-text', async (req: AuthRequest, res) => {
  try {
    const { phone, message, donorId } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    const result = await sendWhatsAppTextMessage(phone, message, donorId);
    
    // Also log an interaction in CRM if donorId is present
    if (donorId && result.success) {
      await prisma.interaction.create({
        data: {
          donorId,
          type: 'WHATSAPP_CHAT',
          subject: 'WhatsApp Message Sent',
          notes: message,
          outcome: result.isMock ? 'Sent (Mock Simulation)' : 'Dispatched via Meta WhatsApp API',
          createdBy: req.user!.id
        }
      }).catch(() => {});
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispatch WhatsApp message' });
  }
});

/**
 * Send pre-approved WhatsApp template
 */
router.post('/send-template', async (req: AuthRequest, res) => {
  try {
    const { phone, templateName, language = 'hi', components = [], donorId } = req.body;
    if (!phone || !templateName) {
      return res.status(400).json({ error: 'Phone and templateName are required' });
    }

    const result = await sendWhatsAppTemplateMessage(phone, templateName, language, components, donorId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispatch WhatsApp template' });
  }
});

/**
 * Get recent WhatsApp communication logs
 */
router.get('/logs', async (req, res) => {
  try {
    const take = parseInt(req.query.take as string) || 30;
    const donorId = req.query.donorId as string;

    const where: any = {};
    if (donorId) where.donorId = donorId;

    const logs = await prisma.whatsAppLog.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch WhatsApp logs' });
  }
});

/**
 * Diagnostic test endpoint for admins
 */
router.post('/test-connection', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { testPhone } = req.body;
    const config = await getMetaConfig();

    const sampleText = `हरे कृष्ण! 🙏\n\nयह इस्कॉन शिरपुर (ISKCON Shirpur DMS) मेटा व्हाट्सएप क्लाउड एपीआई का परीक्षण संदेश है।\n\nप्रणाली सुचारू रूप से कार्यरत है। 🪷`;

    const target = testPhone || '9800000000';
    const result = await sendWhatsAppTextMessage(target, sampleText);

    res.json({
      configSummary: {
        mode: config.mode,
        isConfigured: config.isConfigured,
        phoneNumberIdConfigured: Boolean(config.phoneNumberId),
        apiVersion: config.apiVersion,
      },
      testDispatch: result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Meta test failed' });
  }
});

export default router;
