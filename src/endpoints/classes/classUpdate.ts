import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { type AppContext, ClassRoom } from "../../types";
import { createDb, classes, teachers } from "../../db";
import { buildPartialUpdate } from "../../db/utils";

export class ClassUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Classes"],
    summary: "Update a class",
    request: {
      params: z.object({
        id: Str({ description: "Class ID" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: ClassRoom.omit({ id: true }).partial(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the updated class",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: ClassRoom,
            }),
          },
        },
      },
      "400": {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              error: Str(),
            }),
          },
        },
      },
      "404": {
        description: "Class not found",
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

    const db = createDb(c.env.DB);

    const existing = await db.select().from(classes).where(eq(classes.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Class not found' }, 404);
    }

    // Validate teacher exists if provided
    if (body.teacherId) {
      const teacher = await db.select().from(teachers).where(eq(teachers.id, body.teacherId)).get();
      if (!teacher) {
        return c.json({ success: false, error: `Teacher with ID '${body.teacherId}' not found` }, 400);
      }
    }

    const updates = buildPartialUpdate(body, ['name', 'teacherId']);

    await db
      .update(classes)
      .set({ ...updates, updatedAt: sql`unixepoch()` })
      .where(eq(classes.id, id));

    const result = await db.select().from(classes).where(eq(classes.id, id)).get();
    return {
      success: true,
      result,
    };
  }
}
