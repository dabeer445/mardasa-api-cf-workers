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
  School,
  mapSchool,
} from "../../types";
import { createDb, students, classes, teachers, payments, expenses, schools } from "../../db";

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
              config: School,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const schoolId = c.get('schoolId')!;
    const db = createDb(c.env.DB);

    const [studentsResult, classesResult, teachersResult, paymentsResult, expensesResult, schoolRow] = await Promise.all([
      db.select().from(students).where(eq(students.schoolId, schoolId)),
      db.select().from(classes).where(eq(classes.schoolId, schoolId)),
      db.select().from(teachers).where(eq(teachers.schoolId, schoolId)),
      db.select().from(payments).where(eq(payments.schoolId, schoolId)),
      db.select().from(expenses).where(eq(expenses.schoolId, schoolId)),
      db.select().from(schools).where(eq(schools.id, schoolId)).get(),
    ]);

    return {
      students: studentsResult,
      classes: classesResult,
      teachers: teachersResult,
      payments: paymentsResult,
      expenses: expensesResult,
      config: mapSchool(schoolRow),
    };
  }
}
