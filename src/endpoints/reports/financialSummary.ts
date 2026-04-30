import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { type AppContext, FinancialSummary as FinancialSummarySchema } from "../../types";
import { createDb, payments, expenses } from "../../db";

export class FinancialSummary extends OpenAPIRoute {
  schema = {
    tags: ["Reports"],
    summary: "Get financial summary for a date range",
    request: {
      query: z.object({
        startDate: Str({ description: "Start date in YYYY-MM-DD format" }),
        endDate: Str({ description: "End date in YYYY-MM-DD format" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns income and expense summary",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: FinancialSummarySchema,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { startDate, endDate } = data.query;
    const schoolId = c.get('schoolId')!;

    const db = createDb(c.env.DB);

    // Fetch payments and expenses in date range in parallel
    const [periodPayments, periodExpenses] = await Promise.all([
      db.select({
        feeType: payments.feeType,
        amount: payments.amount,
      }).from(payments).where(
        and(eq(payments.schoolId, schoolId), gte(payments.date, startDate), lte(payments.date, endDate))
      ),

      db.select({
        category: expenses.category,
        amount: expenses.amount,
      }).from(expenses).where(
        and(eq(expenses.schoolId, schoolId), gte(expenses.date, startDate), lte(expenses.date, endDate))
      ),
    ]);

    // Aggregate income by fee type
    const byFeeType: Record<string, number> = {};
    let incomeTotal = 0;
    for (const p of periodPayments) {
      const amount = p.amount ?? 0;
      incomeTotal += amount;
      if (p.feeType) {
        byFeeType[p.feeType] = (byFeeType[p.feeType] ?? 0) + amount;
      }
    }

    // Aggregate expenses by category
    const byCategory: Record<string, number> = {};
    let expensesTotal = 0;
    for (const e of periodExpenses) {
      const amount = e.amount ?? 0;
      expensesTotal += amount;
      if (e.category) {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + amount;
      }
    }

    return {
      success: true,
      result: {
        income: {
          total: incomeTotal,
          byFeeType,
          transactionCount: periodPayments.length,
        },
        expenses: {
          total: expensesTotal,
          byCategory,
          transactionCount: periodExpenses.length,
        },
        netBalance: incomeTotal - expensesTotal,
      },
    };
  }
}
