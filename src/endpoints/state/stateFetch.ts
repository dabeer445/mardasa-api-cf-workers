import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  type AppContext,
  Student,
  ClassRoom,
  Teacher,
  Payment,
  Expense,
  MadrassaConfig,
  mapConfig,
} from "../../types";
import { createDb, students, classes, teachers, payments, expenses, config } from "../../db";

export class StateFetch extends OpenAPIRoute {
  schema = {
    tags: ["State"],
    summary: "Get full application state",
    responses: {
      "200": {
        description: "Returns the full application state",
        content: {
          "application/json": {
            schema: z.object({
              students: Student.array(),
              classes: ClassRoom.array(),
              teachers: Teacher.array(),
              payments: Payment.array(),
              expenses: Expense.array(),
              config: MadrassaConfig,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const db = createDb(c.env.DB);

    const [studentsResult, classesResult, teachersResult, paymentsResult, expensesResult, configResult] = await Promise.all([
      db.select().from(students),
      db.select().from(classes),
      db.select().from(teachers),
      db.select().from(payments),
      db.select().from(expenses),
      db.select().from(config).where(eq(config.id, 1)).get(),
    ]);

    return {
      students: studentsResult,
      classes: classesResult,
      teachers: teachersResult,
      payments: paymentsResult,
      expenses: expensesResult,
      config: mapConfig(configResult),
    };
  }
}
