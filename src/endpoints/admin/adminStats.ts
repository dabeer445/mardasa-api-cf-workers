import { Bool, OpenAPIRoute, Num } from "chanfana";
import { z } from "zod";
import { count } from "drizzle-orm";
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
                totalExpenses: Num(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const db = createDb(c.env.DB);

    const [[schoolCount], [studentCount], [paymentCount], [expenseCount]] = await Promise.all([
      db.select({ total: count() }).from(schools).all(),
      db.select({ total: count() }).from(students).all(),
      db.select({ total: count() }).from(payments).all(),
      db.select({ total: count() }).from(expenses).all(),
    ]);

    return c.json({
      success: true,
      result: {
        totalSchools: schoolCount.total,
        totalStudents: studentCount.total,
        totalPayments: paymentCount.total,
        totalExpenses: expenseCount.total,
      },
    });
  }
}
