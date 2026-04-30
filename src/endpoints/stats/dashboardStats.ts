import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq, and, count, like } from "drizzle-orm";
import {
  type AppContext,
  DashboardStats as DashboardStatsSchema,
  mapSchool,
  DUES_START_DATE,
} from "../../types";
import { createDb, schools, payments, students } from "../../db";
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
    const schoolId = c.get('schoolId')!;
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
      schoolRow,
    ] = await Promise.all([
      // Total students count
      db.select({ count: count() }).from(students).where(eq(students.schoolId, schoolId)),

      // Active students count
      db
        .select({ count: count() })
        .from(students)
        .where(and(eq(students.status, "Active"), eq(students.schoolId, schoolId))),

      // Today's payments
      db
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.date, today), eq(payments.schoolId, schoolId))),

      // New admissions this month
      db
        .select({ count: count() })
        .from(students)
        .where(and(eq(students.schoolId, schoolId), like(students.admissionDate, `${currentMonth}%`))),

      // Active students for dues calculation
      db
        .select({
          id: students.id,
          admissionDate: students.admissionDate,
          monthlyFee: students.monthlyFee,
          discount: students.discount,
        })
        .from(students)
        .where(and(eq(students.status, "Active"), eq(students.schoolId, schoolId))),

      // School config
      db.select().from(schools).where(eq(schools.id, schoolId)).get(),
    ]);

    const relevantPayments = await fetchDuesPayments(db, DUES_START_DATE, c.env.CACHE, schoolId);

    const cfg = mapSchool(schoolRow);

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
