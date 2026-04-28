import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq, count, like } from "drizzle-orm";
import {
  type AppContext,
  DashboardStats as DashboardStatsSchema,
  mapConfig,
  DUES_START_DATE,
} from "../../types";
import { createDb, config, payments, students } from "../../db";
import {
  calculateAllStudentDues,
  getDefaulters,
  fetchDuesPayments,
} from "../../services/duesCalculator";

export class DashboardStats extends OpenAPIRoute {
  schema = {
    tags: ["Stats"],
    summary: "Get dashboard statistics with server-side calculations",
    responses: {
      "200": {
        description: "Returns dashboard statistics",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: DashboardStatsSchema,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const db = createDb(c.env.DB);
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    // Fetch independent data in parallel
    const [
      totalStudentsResult,
      activeStudentsResult,
      todayPayments,
      newAdmissionsResult,
      activeStudentsForDues,
      configRow,
    ] = await Promise.all([
      // Total students count
      db.select({ count: count() }).from(students),

      // Active students count
      db
        .select({ count: count() })
        .from(students)
        .where(eq(students.status, "Active")),

      // Today's payments
      db
        .select({
          amount: payments.amount,
        })
        .from(payments)
        .where(eq(payments.date, today)),

      // New admissions this month
      db
        .select({ count: count() })
        .from(students)
        .where(like(students.admissionDate, `${currentMonth}%`)),

      // Active students for dues calculation
      db
        .select({
          id: students.id,
          admissionDate: students.admissionDate,
          monthlyFee: students.monthlyFee,
          discount: students.discount,
        })
        .from(students)
        .where(eq(students.status, "Active")),

      // Config
      db.select().from(config).where(eq(config.id, 1)).get(),
    ]);

    const relevantPayments = await fetchDuesPayments(db, DUES_START_DATE, c.env.CACHE);

    const cfg = mapConfig(configRow);

    // Calculate today's collection
    const todayCollection = todayPayments.reduce(
      (sum, p) => sum + (p.amount ?? 0),
      0,
    );
    const todayTransactionCount = todayPayments.length;

    // For dues calculation, start from DUES_START_DATE at earliest
    const studentsWithAdjustedDates = activeStudentsForDues.map((s) => ({
      ...s,
      admissionDate:
        s.admissionDate < DUES_START_DATE ? DUES_START_DATE : s.admissionDate,
    }));

    // Calculate dues for all active students
    const allDues = calculateAllStudentDues(
      studentsWithAdjustedDates,
      relevantPayments,
      {
        monthlyDueDate: cfg.monthlyDueDate,
        annualFeeMonth: cfg.annualFeeMonth,
        annualFee: cfg.annualFee,
      },
      today,
    );

    // Get defaulters
    const defaulters = getDefaulters(allDues);
    const totalOutstandingDues = defaulters.reduce(
      (sum, d) => sum + d.totalDuesAmount,
      0,
    );

    return {
      success: true,
      result: {
        activeStudentsCount: activeStudentsResult[0]?.count ?? 0,
        totalStudentsCount: totalStudentsResult[0]?.count ?? 0,
        todayCollection,
        todayTransactionCount,
        totalOutstandingDues,
        newAdmissionsThisMonth: newAdmissionsResult[0]?.count ?? 0,
        defaultersCount: defaulters.length,
        calculatedAt: new Date().toISOString(),
      },
    };
  }
}
