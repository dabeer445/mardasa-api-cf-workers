import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";

export class StudentDelete extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "Delete a student",
    request: {
      params: z.object({
        id: Str({ description: "Student ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Student deleted successfully",
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

    await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
    return {
      success: true,
    };
  }
}
