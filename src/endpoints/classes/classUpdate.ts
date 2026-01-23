import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, ClassRoom, mapClass } from "../../types";

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

    const existing = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Class not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE classes SET
        name = COALESCE(?, name),
        teacher_id = COALESCE(?, teacher_id),
        updated_at = unixepoch()
      WHERE id = ?
    `).bind(body.name ?? null, body.teacherId ?? null, id).run();

    const result = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapClass(result),
    };
  }
}
