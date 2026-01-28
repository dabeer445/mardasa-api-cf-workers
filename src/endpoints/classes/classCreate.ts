import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, ClassRoom, generateId } from "../../types";
import { createDb, classes, teachers } from "../../db";

export class ClassCreate extends OpenAPIRoute {
  schema = {
    tags: ["Classes"],
    summary: "Create a new class",
    request: {
      body: {
        content: {
          "application/json": {
            schema: ClassRoom.omit({ id: true }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "Returns the created class",
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
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('c');

    const db = createDb(c.env.DB);

    // Validate teacher exists if provided
    if (body.teacherId) {
      const teacher = await db.select().from(teachers).where(eq(teachers.id, body.teacherId)).get();
      if (!teacher) {
        return c.json({ success: false, error: `Teacher with ID '${body.teacherId}' not found` }, 400);
      }
    }

    await db.insert(classes).values({
      id,
      name: body.name,
      teacherId: body.teacherId,
    });

    const result = await db.select().from(classes).where(eq(classes.id, id)).get();
    return {
      success: true,
      result,
    };
  }
}
