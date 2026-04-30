import type { Env } from "./types";
import { createDb, schools } from "./db";
import { createWhatsAppService } from "./services/whatsapp";
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  formatDailyReport,
  formatWeeklyReport,
  formatMonthlyReport,
} from "./services/reports";

export async function scheduled(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const db = createDb(env.DB);
  const allSchools = await db.select().from(schools);

  if (allSchools.length === 0) {
    console.log('No schools found, skipping report');
    return;
  }

  const whatsapp = createWhatsAppService(env);
  const now = new Date();
  const today = now.toISOString().split('T')[0]!;
  const dayOfWeek = now.getUTCDay();
  const dayOfMonth = now.getUTCDate();

  for (const school of allSchools) {
    const adminPhones: string[] = school.adminPhones ? JSON.parse(school.adminPhones) : [];
    if (adminPhones.length === 0) continue;

    // Monthly report on 1st of month (for previous month)
    if (dayOfMonth === 1) {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const month = lastMonth.toISOString().slice(0, 7);
      const reportData = await generateMonthlyReport(db, month, school.id);
      const message = formatMonthlyReport(reportData);
      await whatsapp.sendToMultiple(adminPhones, message);
      console.log(`Monthly report sent for ${school.slug} ${month}`);
    }

    // Weekly report on Saturday (day 6)
    if (dayOfWeek === 6) {
      const reportData = await generateWeeklyReport(db, today, school.id);
      const message = formatWeeklyReport(reportData);
      await whatsapp.sendToMultiple(adminPhones, message);
      console.log(`Weekly report sent for ${school.slug} week ending ${today}`);
    }

    // Daily report every day
    const reportData = await generateDailyReport(db, today, school.id);
    const message = formatDailyReport(reportData);
    await whatsapp.sendToMultiple(adminPhones, message);
    console.log(`Daily report sent for ${school.slug} ${today}`);
  }
}
