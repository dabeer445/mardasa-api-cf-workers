import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { type AppContext, PendingFeesSummary } from "../../types";
import { createDb, payments, students } from "../../db";

export class PendingFees extends OpenAPIRoute {
  schema = {
    tags: ["Payments"],
    summary: "Get pending fees with paid/unpaid student lists",
    request: {
      query: z.object({
        type: z.enum(["monthly", "annual"]).describe("Fee type to check"),
        month: Str({
          required: false,
          description: "Month in YYYY-MM format (for monthly type, defaults to current month)",
        }),
        year: Str({
          required: false,
          description: "Year in YYYY format (for annual type, defaults to current year)",
        }),
      }),
    },
    responses: {
      "200": {
        description: "Returns lists of pending and paid student IDs",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.object({
                pendingStudentIds: z.array(z.string()),
                paidStudentIds: z.array(z.string()),
              }),
              summary: PendingFeesSummary,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { type } = data.query;

    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    const currentYear = today.slice(0, 4);

    const month = data.query.month || currentMonth;
    const year = data.query.year || currentYear;

    const db = createDb(c.env.DB);

    // Fetch active students first
    const activeStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.status, 'Active'));

    const activeStudentIdsList = activeStudents.map(s => s.id);

    // Fetch only payments for active students (skip archived students' payments)
    const allPayments = activeStudentIdsList.length > 0
      ? await db.select({
          studentId: payments.studentId,
          feeType: payments.feeType,
          month: payments.month,
          date: payments.date,
        }).from(payments).where(
          inArray(payments.studentId, activeStudentIdsList)
        )
      : [];

    const activeStudentIds = new Set(activeStudents.map(s => s.id));
    const paidStudentIds: string[] = [];
    const pendingStudentIds: string[] = [];

    if (type === 'monthly') {
      // Find students who paid for the specified month
      const paidForMonth = new Set(
        allPayments
          .filter(p => p.feeType === 'Monthly' && p.month === month)
          .map(p => p.studentId)
      );

      for (const studentId of activeStudentIds) {
        if (paidForMonth.has(studentId)) {
          paidStudentIds.push(studentId);
        } else {
          pendingStudentIds.push(studentId);
        }
      }
    } else {
      // Annual fee: check if payment with feeType="Annual" exists where date year matches
      const paidAnnual = new Set(
        allPayments
          .filter(p => p.feeType === 'Annual' && p.date.slice(0, 4) === year)
          .map(p => p.studentId)
      );

      for (const studentId of activeStudentIds) {
        if (paidAnnual.has(studentId)) {
          paidStudentIds.push(studentId);
        } else {
          pendingStudentIds.push(studentId);
        }
      }
    }

    const total = paidStudentIds.length + pendingStudentIds.length;
    const progressPercentage = total > 0 ? Math.round((paidStudentIds.length / total) * 100) : 0;

    return {
      success: true,
      result: {
        pendingStudentIds,
        paidStudentIds,
      },
      summary: {
        pendingCount: pendingStudentIds.length,
        paidCount: paidStudentIds.length,
        progressPercentage,
      },
    };
  }
}
