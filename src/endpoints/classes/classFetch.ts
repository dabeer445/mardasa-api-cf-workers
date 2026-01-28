import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, ClassRoom } from "../../types";
import { createDb, classes } from "../../db";

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

    const db = createDb(c.env.DB);
    const result = await db.select().from(classes).where(eq(classes.id, id)).get();

    if (!result) {
      return c.json({ success: false, error: 'Class not found' }, 404);
    }
    return {
      success: true,
      result,
    };
  }
}
