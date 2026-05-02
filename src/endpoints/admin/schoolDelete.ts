import { OpenAPIRoute, Num } from "chanfana";
import { z } from "zod";
import { eq, isNull, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, schools } from "../../db";

export class AdminSchoolDelete extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "Soft-delete a school (permanently removed after 30 days)",
    request: {
      params: z.object({ id: Num() }),
    },
    responses: {
      "200": {
        description: "School scheduled for deletion",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
      "404": {
        description: "School not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const db = createDb(c.env.DB);

    const school = await db
      .select({ id: schools.id })
      .from(schools)
      .where(and(eq(schools.id, data.params.id), isNull(schools.deletedAt)))
      .get();

    if (!school) return c.json({ error: 'School not found' }, 404);

    await db
      .update(schools)
      .set({ deletedAt: sql`(unixepoch())` })
      .where(eq(schools.id, data.params.id));

    return c.json({ success: true });
  }
}
