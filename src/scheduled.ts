import type { Env } from "./types";
import { createDb, schools, teachers, classes, students, payments, expenses, users } from "./db";
import { isNull, isNotNull, lte, eq } from "drizzle-orm";
import { WhatsAppService } from "./services/whatsapp";
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  formatDailyReport,
  formatWeeklyReport,
  formatMonthlyReport,
} from "./services/reports";

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

async function purgeOrphanedLogos(db: ReturnType<typeof createDb>, bucket: R2Bucket) {
  // Include soft-deleted schools — their logos are retained until the school is purged
  const rows = await db.select({ logoUrl: schools.logoUrl }).from(schools);
  const referencedKeys = new Set<string>();
  for (const { logoUrl } of rows) {
    if (!logoUrl) continue;
    const key = logoUrl.split('/assets/logos/')[1];
    if (key) referencedKeys.add(key);
  }

  let cursor: string | undefined;
  let deleted = 0;
  do {
    const listed: R2Objects = await bucket.list({ cursor, limit: 1000 });
    const orphans = listed.objects.filter(o => !referencedKeys.has(o.key)).map(o => o.key);
    if (orphans.length > 0) {
      await Promise.all(orphans.map(key => bucket.delete(key)));
      deleted += orphans.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  if (deleted > 0) console.log(`Purged ${deleted} orphaned logo(s) from R2`);
}

async function purgeExpiredSchools(db: ReturnType<typeof createDb>) {
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS_S;
  const expired = await db
    .select({ id: schools.id })
    .from(schools)
    .where(isNotNull(schools.deletedAt) && lte(schools.deletedAt, cutoff));

  for (const { id } of expired) {
    await db.delete(payments).where(eq(payments.schoolId, id));
    await db.delete(expenses).where(eq(expenses.schoolId, id));
    await db.delete(students).where(eq(students.schoolId, id));
    await db.delete(classes).where(eq(classes.schoolId, id));
    await db.delete(teachers).where(eq(teachers.schoolId, id));
    await db.delete(users).where(eq(users.schoolId, id));
    await db.delete(schools).where(eq(schools.id, id));
    console.log(`Permanently deleted school ${id} (soft-deleted 30+ days ago)`);
  }
}

export async function scheduled(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const db = createDb(env.DB);

  await purgeExpiredSchools(db);

  const allSchools = await db.select().from(schools).where(isNull(schools.deletedAt));

  if (allSchools.length === 0) {
    console.log('No schools found, skipping report');
    return;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0]!;
  const dayOfWeek = now.getUTCDay();
  const dayOfMonth = now.getUTCDate();

  for (const school of allSchools) {
    const adminPhones: string[] = school.adminPhones ? JSON.parse(school.adminPhones) : [];
    if (adminPhones.length === 0) continue;

    if (!school.whatsappSessionId || !school.whatsappToken) {
      console.warn(`Skipping ${school.slug}: no WhatsApp credentials`);
      continue;
    }

    const whatsapp = new WhatsAppService(school.whatsappSessionId, school.whatsappToken);

    // Monthly cleanup + report on 1st of month
    if (dayOfMonth === 1) {
      await purgeOrphanedLogos(db, env.BUCKET);
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
