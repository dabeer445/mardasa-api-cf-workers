import type { Env } from '../../types';
import { mapConfig } from '../../types';
import { createWhatsAppService } from '../whatsapp';
import type { NotificationEvent, NotificationData } from './events';
import {
  formatStudentCreated,
  formatPaymentReceived,
  formatFeeReminder,
  formatAnnouncement,
} from './templates';

export interface NotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  message?: string;
}

export class NotificationService {
  private env: Env;
  private madrassaName: string | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  private async getMadrassaName(): Promise<string> {
    if (this.madrassaName) return this.madrassaName;

    const config = await this.env.DB.prepare('SELECT name FROM config WHERE id = 1').first();
    this.madrassaName = config?.name as string || 'Madrassa';
    return this.madrassaName;
  }

  async trigger<E extends NotificationEvent>(
    event: E,
    data: NotificationData[E]
  ): Promise<NotificationResult> {
    const madrassaName = await this.getMadrassaName();
    const whatsapp = createWhatsAppService(this.env);

    let message: string;
    let phones: string[];

    switch (event) {
      case 'STUDENT_CREATED': {
        const d = data as NotificationData['STUDENT_CREATED'];
        message = formatStudentCreated(d, madrassaName);
        phones = [d.student.phone];
        break;
      }

      case 'PAYMENT_RECEIVED': {
        const d = data as NotificationData['PAYMENT_RECEIVED'];
        message = formatPaymentReceived(d, madrassaName);
        phones = [d.student.phone];
        break;
      }

      case 'FEE_REMINDER': {
        const d = data as NotificationData['FEE_REMINDER'];
        message = formatFeeReminder(d, madrassaName);
        phones = [d.student.phone];
        break;
      }

      case 'ANNOUNCEMENT': {
        const d = data as NotificationData['ANNOUNCEMENT'];
        message = formatAnnouncement(d, madrassaName);
        phones = d.phones;
        break;
      }

      default:
        return { success: false, sent: 0, failed: 0, message: 'Unknown event type' };
    }

    if (phones.length === 0) {
      return { success: false, sent: 0, failed: 0, message: 'No phone numbers provided' };
    }

    // Filter out empty phone numbers
    const validPhones = phones.filter(p => p && p.trim() !== '');
    if (validPhones.length === 0) {
      return { success: false, sent: 0, failed: 0, message: 'No valid phone numbers' };
    }

    const result = await whatsapp.sendToMultiple(validPhones, message);

    return {
      success: result.sent > 0,
      sent: result.sent,
      failed: result.failed,
      message,
    };
  }
}

export function createNotificationService(env: Env): NotificationService {
  return new NotificationService(env);
}

export * from './events';
