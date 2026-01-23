import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, ClassRoom, mapClass } from "../../types";

export class ClassFetch extends OpenAPIRoute {
  schema = {
    tags: ["Classes"],
    summary: "Get a class by ID",
    request: {
      params: z.object({
        id: Str({ description: "Class ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the class",
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

    const result = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
    if (!result) {
      return c.json({ success: false, error: 'Class not found' }, 404);
    }
    return {
      success: true,
      result: mapClass(result),
    };
  }
}
