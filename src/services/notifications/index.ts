import type { Env } from '../../types';
import { createDb, schools } from '../../db';
import { eq } from 'drizzle-orm';
import { WhatsAppService } from '../whatsapp';
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
  constructor(
    private env: Env,
    private schoolId: number,
  ) {}

  private async getSchoolCredentials() {
    const db = createDb(this.env.DB);
    return db
      .select({
        name: schools.name,
        whatsappSessionId: schools.whatsappSessionId,
        whatsappToken: schools.whatsappToken,
      })
      .from(schools)
      .where(eq(schools.id, this.schoolId))
      .get();
  }

  async trigger<E extends NotificationEvent>(
    event: E,
    data: NotificationData[E],
  ): Promise<NotificationResult> {
    const school = await this.getSchoolCredentials();

    if (!school?.whatsappSessionId || !school?.whatsappToken) {
      console.warn(`School ${this.schoolId} has no WhatsApp credentials, skipping notification`);
      return { success: false, sent: 0, failed: 0, message: 'No WhatsApp credentials' };
    }

    const whatsapp = new WhatsAppService(school.whatsappSessionId, school.whatsappToken);
    const madrassaName = school.name;

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

    const validPhones = phones.filter(p => p?.trim());
    if (validPhones.length === 0) {
      return { success: false, sent: 0, failed: 0, message: 'No valid phone numbers' };
    }

    const result = await whatsapp.sendToMultiple(validPhones, message);
    return { success: result.sent > 0, sent: result.sent, failed: result.failed, message };
  }
}

export function createNotificationService(env: Env, schoolId: number): NotificationService {
  return new NotificationService(env, schoolId);
}

export * from './events';
