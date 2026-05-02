import { Bool, OpenAPIRoute, Num } from "chanfana";
import { z } from "zod";
import { count, sum, isNull } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, schools, students, payments, expenses } from "../../db";

export class AdminStats extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "Cross-school aggregated statistics",
    responses: {
      "200": {
        description: "Platform-wide statistics",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.object({
                totalSchools: Num(),
                totalStudents: Num(),
                totalPayments: Num(),
                totalPaymentsAmount: Num(),
                totalExpenses: Num(),
                totalExpensesAmount: Num(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const db = createDb(c.env.DB);

    const [[schoolCount], [studentCount], [paymentStats], [expenseStats]] = await Promise.all([
      db.select({ total: count() }).from(schools).all(),
      db.select({ total: count() }).from(students).all(),
      db.select({ total: count(), amount: sum(payments.amount) }).from(payments).all(),
      db.select({ total: count(), amount: sum(expenses.amount) }).from(expenses).all(),
    ]);

    return c.json({
      success: true,
      result: {
        totalSchools: schoolCount.total,
        totalStudents: studentCount.total,
        totalPayments: paymentStats.total,
        totalPaymentsAmount: Number(paymentStats.amount ?? 0),
        totalExpenses: expenseStats.total,
        totalExpensesAmount: Number(expenseStats.amount ?? 0),
      },
    });
  }
}
