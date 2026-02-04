import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, and, gte, inArray } from "drizzle-orm";
import { type AppContext, StudentDues, DefaultersSummary, mapConfig, DUES_START_DATE } from "../../types";
import { createDb, config, payments, students } from "../../db";
import {
  calculateAllStudentDues,
  getDefaulters,
  aggregateDuesSummary,
} from "../../services/duesCalculator";

export class DefaultersReport extends OpenAPIRoute {
  schema = {
    tags: ["Reports"],
    summary: "Get defaulters report with server-side dues calculation",
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
        description: "Returns list of students with outstanding dues",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.array(StudentDues),
              summary: DefaultersSummary,
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

    // Filter to only defaulters (students with unpaid months or annual fee due)
    const defaulters = getDefaulters(allDues);

    // Aggregate summary
    const summary = aggregateDuesSummary(defaulters);

    return {
      success: true,
      result: defaulters,
      summary,
    };
  }
}
