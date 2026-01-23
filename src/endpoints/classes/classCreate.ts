import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, ClassRoom, generateId, mapClass } from "../../types";

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
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('c');

    await c.env.DB.prepare(`
      INSERT INTO classes (id, name, teacher_id) VALUES (?, ?, ?)
    `).bind(id, body.name, body.teacherId).run();

    const result = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapClass(result),
    };
  }
}
