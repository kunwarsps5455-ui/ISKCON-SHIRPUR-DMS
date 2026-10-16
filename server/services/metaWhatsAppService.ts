import axios from 'axios';
import { prisma } from '../db.js';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
  error?: string;
  isMock?: boolean;
}

/**
 * Standardize recipient number to WhatsApp international E.164 format without '+'
 * Handles Indian numbers (10 digits -> prefixes 91)
 */
export function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Get Meta Cloud API configuration from environment or database system settings
 */
export async function getMetaConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'META_PHONE_NUMBER_ID',
          'META_ACCESS_TOKEN',
          'META_WABA_ID',
          'META_BIRTHDAY_TEMPLATE',
          'META_RECEIPT_TEMPLATE',
          'WHATSAPP_MODE',
          'META_GRAPH_BASE_URL',
        ],
      },
    },
  }).catch(() => []);

  const getVal = (key: string, envVal?: string) =>
    settings.find((s: any) => s.key === key)?.value || envVal || '';

  const phoneNumberId = getVal('META_PHONE_NUMBER_ID', process.env.META_PHONE_NUMBER_ID);
  const accessToken = getVal('META_ACCESS_TOKEN', process.env.META_ACCESS_TOKEN);
  const wabaId = getVal('META_WABA_ID', process.env.META_WABA_ID);
  const birthdayTemplate = getVal('META_BIRTHDAY_TEMPLATE', process.env.META_BIRTHDAY_TEMPLATE) || 'iskcon_birthday_blessing_hi';
  const receiptTemplate = getVal('META_RECEIPT_TEMPLATE', process.env.META_RECEIPT_TEMPLATE) || 'iskcon_seva_receipt_hi';
  const mode = getVal('WHATSAPP_MODE', process.env.WHATSAPP_MODE || 'mock');
  const apiVersion = process.env.META_API_VERSION || 'v20.0';

  const isConfigured = Boolean(phoneNumberId && accessToken);
  const normalizedMode = !isConfigured ? 'mock' : (mode === 'live' ? 'production' : mode);
  const graphBaseUrl = (getVal('META_GRAPH_BASE_URL', process.env.META_GRAPH_BASE_URL) || 'https://graph.facebook.com').replace(/\/$/, '');

  return {
    phoneNumberId,
    accessToken,
    wabaId,
    birthdayTemplate,
    receiptTemplate,
    mode: normalizedMode,
    apiVersion,
    graphBaseUrl,
    isConfigured,
  };
}

/**
 * Send pre-approved WhatsApp HSM Template Message via Meta Graph API
 */
export async function sendWhatsAppTemplateMessage(
  recipientPhone: string,
  templateName: string,
  languageCode: string = 'hi',
  components: any[] = [],
  donorId?: string
): Promise<WhatsAppSendResult> {
  const config = await getMetaConfig();
  const formattedPhone = formatWhatsAppNumber(recipientPhone);

  if (config.mode === 'mock' || !config.isConfigured) {
    const mockId = `wamid.MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[Meta WhatsApp Mock] Sending template "${templateName}" to ${formattedPhone}`);
    
    // Log to DB
    await logWhatsAppMessage({
      recipientPhone: formattedPhone,
      donorId,
      messageType: 'TEMPLATE',
      templateName,
      content: `[Mock Template: ${templateName}] Language: ${languageCode}`,
      metaMessageId: mockId,
      status: 'SENT',
    });

    return {
      success: true,
      messageId: mockId,
      status: 'SENT',
      isMock: true,
    };
  }

  try {
    const url = `${config.graphBaseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components.length > 0 ? components : undefined,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const metaMessageId = response.data?.messages?.[0]?.id;

    await logWhatsAppMessage({
      recipientPhone: formattedPhone,
      donorId,
      messageType: 'TEMPLATE',
      templateName,
      content: `[Template: ${templateName}] Language: ${languageCode}`,
      metaMessageId,
      status: 'SENT',
    });

    return {
      success: true,
      messageId: metaMessageId,
      status: 'SENT',
    };
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'WhatsApp template delivery failed';
    console.error(`[Meta WhatsApp API Error] Recipient: ${formattedPhone}, Error: ${errorMsg}`);

    await logWhatsAppMessage({
      recipientPhone: formattedPhone,
      donorId,
      messageType: 'TEMPLATE',
      templateName,
      content: `Failed send attempt to ${formattedPhone}`,
      status: 'FAILED',
      errorDetails: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
      status: 'FAILED',
    };
  }
}

/**
 * Send standard custom text message (for customer service windows / manual replies)
 */
export async function sendWhatsAppTextMessage(
  recipientPhone: string,
  bodyText: string,
  donorId?: string
): Promise<WhatsAppSendResult> {
  const config = await getMetaConfig();
  const formattedPhone = formatWhatsAppNumber(recipientPhone);

  if (config.mode === 'mock' || !config.isConfigured) {
    const mockId = `wamid.MOCK_TXT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[Meta WhatsApp Mock] Sending text to ${formattedPhone}: "${bodyText.substring(0, 60)}..."`);

    await logWhatsAppMessage({
      recipientPhone: formattedPhone,
      donorId,
      messageType: 'TEXT',
      content: bodyText,
      metaMessageId: mockId,
      status: 'SENT',
    });

    return {
      success: true,
      messageId: mockId,
      status: 'SENT',
      isMock: true,
    };
  }

  try {
    const url = `${config.graphBaseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: bodyText,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const metaMessageId = response.data?.messages?.[0]?.id;

    await logWhatsAppMessage({
      recipientPhone: formattedPhone,
      donorId,
      messageType: 'TEXT',
      content: bodyText,
      metaMessageId,
      status: 'SENT',
    });

    return {
      success: true,
      messageId: metaMessageId,
      status: 'SENT',
    };
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'WhatsApp message dispatch failed';
    console.error(`[Meta WhatsApp API Error] Recipient: ${formattedPhone}, Error: ${errorMsg}`);

    await logWhatsAppMessage({
      recipientPhone: formattedPhone,
      donorId,
      messageType: 'TEXT',
      content: bodyText,
      status: 'FAILED',
      errorDetails: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
      status: 'FAILED',
    };
  }
}

/**
 * Helper to log WhatsApp messages in database
 */
async function logWhatsAppMessage(data: {
  recipientPhone: string;
  donorId?: string;
  messageType: 'TEMPLATE' | 'TEXT';
  templateName?: string;
  content?: string;
  metaMessageId?: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorDetails?: string;
}) {
  try {
    await prisma.whatsAppLog.create({
      data: {
        recipientPhone: data.recipientPhone,
        donorId: data.donorId,
        messageType: data.messageType,
        templateName: data.templateName,
        content: data.content,
        metaMessageId: data.metaMessageId,
        status: data.status,
        errorDetails: data.errorDetails,
        sentAt: data.status === 'SENT' ? new Date() : null,
      },
    });
  } catch (err) {
    // Graceful fallback if table is still pending migration
    console.warn('[WhatsApp Logger] Notice: Could not write to whatsAppLog table:', (err as any)?.message);
  }
}

/**
 * Handle incoming Meta WhatsApp Webhook status event (delivery receipt / read receipt)
 */
export async function processWebhookStatus(statusUpdate: any) {
  const metaMessageId = statusUpdate.id;
  const status = statusUpdate.status?.toUpperCase(); // sent, delivered, read, failed

  if (!metaMessageId || !status) return;

  try {
    const updateData: any = { status };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'READ') updateData.readAt = new Date();

    await prisma.whatsAppLog.updateMany({
      where: { metaMessageId },
      data: updateData,
    });

    await prisma.birthdayMessage.updateMany({
      where: { providerMessageId: metaMessageId },
      data: {
        status: status === 'DELIVERED' ? 'DELIVERED' : status === 'READ' ? 'DELIVERED' : status,
        deliveredAt: status === 'DELIVERED' || status === 'READ' ? new Date() : undefined,
      },
    });
  } catch (error) {
    console.error('[WhatsApp Webhook Handler Error]', error);
  }
}
