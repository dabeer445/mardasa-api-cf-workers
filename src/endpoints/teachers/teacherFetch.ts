import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Teacher } from "../../types";
import { createDb, teachers } from "../../db";

export class TeacherFetch extends OpenAPIRoute {
  schema = {
    tags: ["Teachers"],
    summary: "Get a teacher by ID",
    request: {
      params: z.object({
        id: Str({ description: "Teacher ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the teacher",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Teacher,
            }),
          },
        },
      },
      "404": {
        description: "Teacher not found",
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
    const result = await db.select().from(teachers).where(eq(teachers.id, id)).get();

    if (!result) {
      return c.json({ success: false, error: 'Teacher not found' }, 404);
    }
    return {
      success: true,
      result,
    };
  }
}
