import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import {
  type AppContext,
  Student,
  ClassRoom,
  Teacher,
  Payment,
  Expense,
  MadrassaConfig,
  mapStudent,
  mapClass,
  mapTeacher,
  mapPayment,
  mapExpense,
  mapConfig,
} from "../../types";

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
    const db = c.env.DB;

    const [students, classes, teachers, payments, expenses, configResult] = await Promise.all([
      db.prepare('SELECT * FROM students').all(),
      db.prepare('SELECT * FROM classes').all(),
      db.prepare('SELECT * FROM teachers').all(),
      db.prepare('SELECT * FROM payments').all(),
      db.prepare('SELECT * FROM expenses').all(),
      db.prepare('SELECT * FROM config WHERE id = 1').first(),
    ]);

    return {
      students: students.results.map(mapStudent),
      classes: classes.results.map(mapClass),
      teachers: teachers.results.map(mapTeacher),
      payments: payments.results.map(mapPayment),
      expenses: expenses.results.map(mapExpense),
      config: mapConfig(configResult),
    };
  }
}
