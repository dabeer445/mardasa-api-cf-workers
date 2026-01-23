import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";

export class TeacherDelete extends OpenAPIRoute {
  schema = {
    tags: ["Teachers"],
    summary: "Delete a teacher",
    request: {
      params: z.object({
        id: Str({ description: "Teacher ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Teacher deleted successfully",
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

    await c.env.DB.prepare('DELETE FROM teachers WHERE id = ?').bind(id).run();
    return {
      success: true,
    };
  }
}
