import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, School, mapSchool } from "../../types";
import { createDb, schools } from "../../db";

export class ConfigFetch extends OpenAPIRoute {
  schema = {
    tags: ["Config"],
    summary: "Get school configuration",
    responses: {
      "200": {
        description: "Returns the school configuration",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: School,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const schoolId = c.get('schoolId')!;
    const db = createDb(c.env.DB);
    const row = await db.select().from(schools).where(eq(schools.id, schoolId)).get();
    return c.json({ success: true, result: mapSchool(row) });
  }
}
