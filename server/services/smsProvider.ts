export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'REJECTED';
}

export async function sendSMS(mobile: string, message: string): Promise<SMSResponse> {
  const provider = process.env.SMS_PROVIDER;
  
  if (!provider || provider === 'dummy' || provider === 'not-configured') {
    return {
      success: false,
      error: 'SMS Service Not Configured',
      status: 'FAILED'
    };
  }

  try {
    // Here we would implement integration with real providers (e.g. Textlocal, MSG91, Twilio)
    // For this MVP, we simulate a successful integration if configured with "mock-success"
    if (provider === 'mock-success') {
      return {
        success: true,
        messageId: `MOCK-${Date.now()}`,
        status: 'SENT'
      };
    }
    
    // Fallback failure if unknown provider
    return {
      success: false,
      error: 'Unknown SMS Provider configuration',
      status: 'FAILED'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'SMS send failed',
      status: 'FAILED'
    };
  }
}

export function calculateSMSLength(message: string) {
  const charCount = message.length;
  // Unicode Hindi usually allows 70 chars for 1 part, 134 for 2 parts, etc.
  // Simplified logic for MVP
  const isUnicode = /[^\u0000-\u00ff]/.test(message);
  let parts = 1;
  
  if (isUnicode) {
    if (charCount > 70) parts = Math.ceil(charCount / 67);
  } else {
    if (charCount > 160) parts = Math.ceil(charCount / 153);
  }

  return { characters: charCount, parts };
}
