import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { type AppContext, Teacher } from "../../types";
import { createDb, teachers } from "../../db";
import { buildPartialUpdate } from "../../db/utils";

export class TeacherUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Teachers"],
    summary: "Update a teacher",
    request: {
      params: z.object({
        id: Str({ description: "Teacher ID" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: Teacher.omit({ id: true }).partial(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the updated teacher",
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
    const body = data.body;
    const schoolId = c.get('schoolId')!;

    const db = createDb(c.env.DB);

    const existing = await db.select().from(teachers).where(and(eq(teachers.id, id), eq(teachers.schoolId, schoolId))).get();
    if (!existing) {
      return c.json({ success: false, error: 'Teacher not found' }, 404);
    }

    const updates = buildPartialUpdate(body, ['name', 'phone']);

    await db
      .update(teachers)
      .set({ ...updates, updatedAt: sql`unixepoch()` })
      .where(and(eq(teachers.id, id), eq(teachers.schoolId, schoolId)));

    const result = await db.select().from(teachers).where(and(eq(teachers.id, id), eq(teachers.schoolId, schoolId))).get();
    return {
      success: true,
      result,
    };
  }
}
