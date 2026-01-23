import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";

export class ClassDelete extends OpenAPIRoute {
  schema = {
    tags: ["Classes"],
    summary: "Delete a class",
    request: {
      params: z.object({
        id: Str({ description: "Class ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Class deleted successfully",
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

    await c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();
    return {
      success: true,
    };
  }
}
