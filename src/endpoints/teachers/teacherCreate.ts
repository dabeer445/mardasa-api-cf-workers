import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Teacher, generateId, mapTeacher } from "../../types";

export class TeacherCreate extends OpenAPIRoute {
  schema = {
    tags: ["Teachers"],
    summary: "Create a new teacher",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Teacher.omit({ id: true }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "Returns the created teacher",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Teacher,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('t');

    await c.env.DB.prepare(`
      INSERT INTO teachers (id, name, phone) VALUES (?, ?, ?)
    `).bind(id, body.name, body.phone ?? null).run();

    const result = await c.env.DB.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapTeacher(result),
    };
  }
}
