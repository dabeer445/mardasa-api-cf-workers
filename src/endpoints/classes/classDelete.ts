import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, classes } from "../../db";

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

    const db = createDb(c.env.DB);
    await db.delete(classes).where(eq(classes.id, id));

    return {
      success: true,
    };
  }
}
