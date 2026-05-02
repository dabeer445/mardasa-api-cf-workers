const API_BASE = 'https://levelfeed.app';

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

export class WhatsAppService {
  constructor(
    private sessionId: string,
    private token: string,
  ) {}

  private formatPhone(phone: string): string {
    let n = phone.replace(/\D/g, '');
    if (n.startsWith('0')) n = '92' + n.slice(1);
    if (!n.startsWith('92')) n = '92' + n;
    return n;
  }

  private async post(payload: object): Promise<Response> {
    return fetch(`${API_BASE}/api/v1/messages?sessionId=${this.sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async send(phone: string, message: string): Promise<SendMessageResult> {
    try {
      const res = await this.post({
        to: this.formatPhone(phone),
        type: 'text',
        text: { body: message },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`WhatsApp send failed: ${res.status} - ${text}`);
        return { success: false, error: `HTTP ${res.status}` };
      }

      const json = (await res.json()) as { status: string; message?: string };
      if (json.status !== 'success') {
        return { success: false, error: json.message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async sendToMultiple(
    phones: string[],
    message: string,
  ): Promise<{ total: number; sent: number; failed: number }> {
    const valid = phones.filter(p => p?.trim());
    if (valid.length === 0) return { total: 0, sent: 0, failed: 0 };

    const payload = valid.map(p => ({
      to: this.formatPhone(p),
      type: 'text',
      text: { body: message },
    }));

    try {
      const res = await this.post(payload);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`WhatsApp batch failed: ${res.status} - ${text}`);
        return { total: valid.length, sent: 0, failed: valid.length };
      }

      const results = (await res.json()) as Array<{ status: string }>;
      const sent = results.filter(r => r.status === 'success').length;
      return { total: valid.length, sent, failed: valid.length - sent };
    } catch (err) {
      console.warn(`WhatsApp batch error: ${err instanceof Error ? err.message : err}`);
      return { total: valid.length, sent: 0, failed: valid.length };
    }
  }
}
