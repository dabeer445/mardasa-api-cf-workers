import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, students, classes, teachers, payments, expenses } from "../../db";

export class ClearAll extends OpenAPIRoute {
  schema = {
    tags: ["Utility"],
    summary: "Clear all data (dangerous!)",
    responses: {
      "200": {
        description: "All data cleared successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const schoolId = c.get('schoolId')!;
    const db = createDb(c.env.DB);

    // Delete school's data in correct order (respecting foreign keys)
    await db.delete(payments).where(eq(payments.schoolId, schoolId));
    await db.delete(expenses).where(eq(expenses.schoolId, schoolId));
    await db.delete(students).where(eq(students.schoolId, schoolId));
    await db.delete(classes).where(eq(classes.schoolId, schoolId));
    await db.delete(teachers).where(eq(teachers.schoolId, schoolId));

    return {
      success: true,
    };
  }
}
