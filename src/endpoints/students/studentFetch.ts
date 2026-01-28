import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Student } from "../../types";
import { createDb, students } from "../../db";

export class StudentFetch extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "Get a student by ID",
    request: {
      params: z.object({
        id: Str({ description: "Student ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the student",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Student,
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
    const { id } = data.params;

    const db = createDb(c.env.DB);
    const result = await db.select().from(students).where(eq(students.id, id)).get();

    if (!result) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }
    return {
      success: true,
      result,
    };
  }
}
