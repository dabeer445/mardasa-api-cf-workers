import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, and, gte, inArray } from "drizzle-orm";
import { type AppContext, ClassDues, mapConfig, DUES_START_DATE } from "../../types";
import { createDb, config, payments, students } from "../../db";
import {
  calculateAllStudentDues,
  getDefaulters,
} from "../../services/duesCalculator";

export class DuesByClass extends OpenAPIRoute {
  schema = {
    tags: ["Reports"],
    summary: "Get dues aggregated by class",
    request: {
      query: z.object({
        asOfDate: Str({
          required: false,
          description: "Calculate dues as of this date (YYYY-MM-DD). Defaults to today.",
        }),
      }),
    },
    responses: {
      "200": {
        description: "Returns dues summary grouped by class",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.array(ClassDues),
              summary: z.object({
                totalDues: z.number(),
                totalDefaulters: z.number(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const asOfDate = data.query.asOfDate || new Date().toISOString().slice(0, 10);

    const db = createDb(c.env.DB);

    // Fetch active students and config first
    const [activeStudents, configRow] = await Promise.all([
      db.select({
        id: students.id,
        classId: students.classId,
        admissionDate: students.admissionDate,
        monthlyFee: students.monthlyFee,
        discount: students.discount,
      }).from(students).where(eq(students.status, 'Active')),

      db.select().from(config).where(eq(config.id, 1)).get(),
    ]);

    // Fetch only relevant payments using JOIN (avoids large IN clause):
    // - Only for active students (via JOIN)
    // - Only from DUES_START_DATE onwards (older payments don't affect dues)
    // - Only Monthly and Annual fee types (Admission, Summer, Other don't affect dues calculation)
    const relevantPayments = await db
      .select({
        studentId: payments.studentId,
        feeType: payments.feeType,
        month: payments.month,
        date: payments.date,
        amount: payments.amount,
      })
      .from(payments)
      .innerJoin(students, eq(payments.studentId, students.id))
      .where(
        and(
          eq(students.status, 'Active'),
          gte(payments.date, DUES_START_DATE),
          inArray(payments.feeType, ['Monthly', 'Annual'])
        )
      );

    const cfg = mapConfig(configRow);

    // For dues calculation, start from DUES_START_DATE at earliest
    const studentsWithAdjustedDates = activeStudents.map(s => ({
      ...s,
      admissionDate: s.admissionDate < DUES_START_DATE ? DUES_START_DATE : s.admissionDate,
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
      asOfDate
    );

    // Get only defaulters
    const defaulters = getDefaulters(allDues);

    // Create a map of studentId -> classId
    const studentClassMap = new Map(activeStudents.map(s => [s.id, s.classId]));

    // Group by class
    const classDuesMap = new Map<string, { defaultersCount: number; totalDuesAmount: number }>();

    for (const d of defaulters) {
      const classId = studentClassMap.get(d.studentId);
      if (!classId) continue;

      const existing = classDuesMap.get(classId) ?? { defaultersCount: 0, totalDuesAmount: 0 };
      existing.defaultersCount += 1;
      existing.totalDuesAmount += d.totalDuesAmount;
      classDuesMap.set(classId, existing);
    }

    // Convert to array
    const result = Array.from(classDuesMap.entries()).map(([classId, data]) => ({
      classId,
      defaultersCount: data.defaultersCount,
      totalDuesAmount: data.totalDuesAmount,
    }));

    // Calculate totals
    const totalDues = result.reduce((sum, c) => sum + c.totalDuesAmount, 0);
    const totalDefaulters = result.reduce((sum, c) => sum + c.defaultersCount, 0);

    return {
      success: true,
      result,
      summary: {
        totalDues,
        totalDefaulters,
      },
    };
  }
}
