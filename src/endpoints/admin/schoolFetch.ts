import { Bool, OpenAPIRoute, Num } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, School, mapSchool } from "../../types";
import { createDb, schools } from "../../db";

export class AdminSchoolFetch extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "Get a school by ID",
    request: {
      params: z.object({ id: Num() }),
    },
    responses: {
      "200": {
        description: "School details",
        content: {
          "application/json": {
            schema: z.object({ success: Bool(), result: School }),
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
    const row = await db
      .select()
      .from(schools)
      .where(eq(schools.id, data.params.id))
      .get();

    if (!row) return c.json({ error: 'School not found' }, 404);
    return c.json({ success: true, result: mapSchool(row) });
  }
}
