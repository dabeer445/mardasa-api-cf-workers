import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, students } from "../../db";

export class StudentDelete extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "Delete a student",
    request: {
      params: z.object({
        id: Str({ description: "Student ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Student deleted successfully",
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
    const data = await this.getValidatedData<typeof this.schema>();
    const { id } = data.params;
    const schoolId = c.get('schoolId')!;

    const db = createDb(c.env.DB);
    await db.delete(students).where(and(eq(students.id, id), eq(students.schoolId, schoolId)));

    return {
      success: true,
    };
  }
}
