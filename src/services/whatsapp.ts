const DEFAULT_API_URL = 'http://130.107.48.143:3000';
const DEFAULT_SESSION = 'default';

export interface WhatsAppConfig {
  apiUrl?: string;
  session?: string;
  apiKey?: string;
  defaultCountryCode?: string;
}

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * WhatsApp API Service
 *
 * Sends messages via WAPI server with typing simulation.
 * Flow: startTyping -> delay -> stopTyping -> sendText
 */
export class WhatsAppService {
  private apiUrl: string;
  private session: string;
  private apiKey: string;
  private defaultCountryCode: string;

  constructor(config: WhatsAppConfig = {}) {
    this.apiUrl = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');
    this.session = config.session || DEFAULT_SESSION;
    this.apiKey = config.apiKey || '';
    this.defaultCountryCode = config.defaultCountryCode || '92';
  }

  /**
   * Convert phone number to WhatsApp chat ID format
   * 03148564326 -> 923148564326@c.us
   */
  private formatChatId(phone: string): string {
    let normalized = phone.replace(/\D/g, '');

    if (normalized.startsWith('0')) {
      normalized = this.defaultCountryCode + normalized.slice(1);
    }

    if (!normalized.startsWith(this.defaultCountryCode)) {
      normalized = this.defaultCountryCode + normalized;
    }

    return `${normalized}@c.us`;
  }

  /**
   * Random delay between min and max milliseconds
   */
  private delay(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make API request
   */
  private async request(endpoint: string, body: object): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/${endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.log(`WhatsApp API error: ${response.status} - ${text}`);
      }

      return response.ok;
    } catch (error) {
      console.log(`WhatsApp API exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  private async startTyping(chatId: string): Promise<boolean> {
    return this.request('api/startTyping', {
      chatId,
      session: this.session,
    });
  }

  private async stopTyping(chatId: string): Promise<boolean> {
    return this.request('api/stopTyping', {
      chatId,
      session: this.session,
    });
  }

  private async sendTextMessage(chatId: string, text: string): Promise<boolean> {
    return this.request('api/sendText', {
      chatId,
      text,
      session: this.session,
    });
  }

  /**
   * Send a WhatsApp message with typing simulation
   */
  async send(phone: string, message: string): Promise<SendMessageResult> {
    const chatId = this.formatChatId(phone);

    try {
      await this.startTyping(chatId);
      await this.delay(2000, 4000); // Shorter delay for reports
      await this.stopTyping(chatId);

      const success = await this.sendTextMessage(chatId, message);

      if (!success) {
        return { success: false, error: 'Failed to send message' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send message to multiple phones
   */
  async sendToMultiple(
    phones: string[],
    message: string
  ): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const phone of phones) {
      const result = await this.send(phone, message);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Small delay between messages
      if (phones.indexOf(phone) < phones.length - 1) {
        await this.delay(1000, 2000);
      }
    }

    return { total: phones.length, sent, failed };
  }
}

/**
 * Create WhatsApp service from environment bindings
 */
export function createWhatsAppService(env: {
  WHATSAPP_API_URL?: string;
  WHATSAPP_API_KEY?: string;
  WHATSAPP_SESSION?: string;
}): WhatsAppService {
  return new WhatsAppService({
    apiUrl: env.WHATSAPP_API_URL,
    apiKey: env.WHATSAPP_API_KEY,
    session: env.WHATSAPP_SESSION,
  });
}
