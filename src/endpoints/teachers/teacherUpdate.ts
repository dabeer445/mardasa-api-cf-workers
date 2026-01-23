import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Teacher, mapTeacher } from "../../types";

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

    const existing = await c.env.DB.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Teacher not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE teachers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = unixepoch()
      WHERE id = ?
    `).bind(body.name ?? null, body.phone ?? null, id).run();

    const result = await c.env.DB.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapTeacher(result),
    };
  }
}
