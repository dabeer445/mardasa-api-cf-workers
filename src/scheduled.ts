import type { Env } from "./types";
import { mapConfig } from "./types";
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
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const config = await env.DB.prepare('SELECT * FROM config WHERE id = 1').first();
  const configData = mapConfig(config);

  if (configData.adminPhones.length === 0) {
    console.log('No admin phones configured, skipping report');
    return;
  }

  const whatsapp = createWhatsAppService(env);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const dayOfWeek = now.getUTCDay();
  const dayOfMonth = now.getUTCDate();

  // Monthly report on 1st of month (for previous month)
  if (dayOfMonth === 1) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = lastMonth.toISOString().slice(0, 7);
    const reportData = await generateMonthlyReport(env.DB, month);
    const message = formatMonthlyReport(reportData);
    await whatsapp.sendToMultiple(configData.adminPhones, message);
    console.log(`Monthly report sent for ${month}`);
    return;
  }

  // Weekly report on Saturday (day 6)
  if (dayOfWeek === 6) {
    const reportData = await generateWeeklyReport(env.DB, today);
    const message = formatWeeklyReport(reportData);
    await whatsapp.sendToMultiple(configData.adminPhones, message);
    console.log(`Weekly report sent for week ending ${today}`);
    return;
  }

  // Daily report every other day
  const reportData = await generateDailyReport(env.DB, today);
  const message = formatDailyReport(reportData);
  await whatsapp.sendToMultiple(configData.adminPhones, message);
  console.log(`Daily report sent for ${today}`);
}
