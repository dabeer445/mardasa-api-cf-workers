import { Bool, OpenAPIRoute, Str, Num } from "chanfana";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { type AppContext, StudentPaymentStatus as StudentPaymentStatusSchema, mapConfig } from "../../types";
import { createDb, config, payments, students } from "../../db";
import { getMonthsInRange } from "../../services/duesCalculator";

export class StudentPaymentStatus extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "Get payment status for a specific student and year",
    request: {
      params: z.object({
        id: Str({ description: "Student ID" }),
      }),
      query: z.object({
        year: Str({
          required: false,
          description: "Year in YYYY format. Defaults to current year.",
        }),
      }),
    },
    responses: {
      "200": {
        description: "Returns detailed payment status for the student",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: StudentPaymentStatusSchema,
            }),
          },
        },
      },
      "404": {
        description: "Student not found",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              error: Str(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { id: studentId } = data.params;
    const currentYear = new Date().toISOString().slice(0, 4);
    const year = data.query.year || currentYear;
    const yearNum = parseInt(year, 10);

    const db = createDb(c.env.DB);

    // Fetch student and their payments in parallel
    const [student, studentPayments, configRow] = await Promise.all([
      db.select({
        id: students.id,
        admissionDate: students.admissionDate,
        monthlyFee: students.monthlyFee,
        discount: students.discount,
      }).from(students).where(eq(students.id, studentId)).get(),

      db.select({
        id: payments.id,
        feeType: payments.feeType,
        month: payments.month,
        date: payments.date,
        amount: payments.amount,
      }).from(payments).where(eq(payments.studentId, studentId)),

      db.select().from(config).where(eq(config.id, 1)).get(),
    ]);

    if (!student) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }

    const cfg = mapConfig(configRow);
    const netMonthlyFee = (student.monthlyFee ?? 0) - (student.discount ?? 0);

    // Determine date range for the year
    const admissionYear = parseInt(student.admissionDate.slice(0, 4), 10);
    const today = new Date().toISOString().slice(0, 10);
    const todayYear = parseInt(today.slice(0, 4), 10);

    // Start from January of requested year, or admission date if later
    let startDate: string;
    if (yearNum < admissionYear) {
      // Student wasn't enrolled yet
      startDate = `${year}-01-01`;
    } else if (yearNum === admissionYear) {
      // Use admission date
      startDate = student.admissionDate;
    } else {
      startDate = `${year}-01-01`;
    }

    // End at December of requested year, or today if requested year is current year
    let endDate: string;
    if (yearNum < todayYear) {
      endDate = `${year}-12-31`;
    } else if (yearNum === todayYear) {
      endDate = today;
    } else {
      // Future year - end at December
      endDate = `${year}-12-31`;
    }

    // Get expected months for this year
    const expectedMonths = getMonthsInRange(startDate, endDate)
      .filter(m => m.startsWith(year));

    // Build paid months map
    const paidMonths: Record<string, { paymentId: string; amount: number; date: string }> = {};
    const monthlyPayments = studentPayments.filter(p => p.feeType === 'Monthly' && p.month?.startsWith(year));

    for (const p of monthlyPayments) {
      if (p.month) {
        paidMonths[p.month] = {
          paymentId: p.id,
          amount: p.amount ?? 0,
          date: p.date,
        };
      }
    }

    // Find unpaid months
    const unpaidMonths = expectedMonths.filter(m => !paidMonths[m]);

    // Check annual fee
    const annualPayment = studentPayments.find(
      p => p.feeType === 'Annual' && p.date.startsWith(year)
    );

    const annualFee = annualPayment
      ? {
          paid: true,
          paymentId: annualPayment.id,
          amount: annualPayment.amount ?? 0,
          date: annualPayment.date,
        }
      : { paid: false };

    // Calculate totals
    const totalPaid = Object.values(paidMonths).reduce((sum, p) => sum + p.amount, 0)
      + (annualPayment?.amount ?? 0);

    const totalDue = (unpaidMonths.length * netMonthlyFee)
      + (!annualFee.paid && today.slice(5, 7) >= cfg.annualFeeMonth ? cfg.annualFee : 0);

    return {
      success: true,
      result: {
        year: yearNum,
        paidMonths,
        unpaidMonths,
        annualFee,
        totalPaid,
        totalDue,
      },
    };
  }
}
