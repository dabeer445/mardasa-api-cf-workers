import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, School } from "../../types";
import { createDb, schools } from "../../db";
import { mapSchool } from "../../types";

export class AdminSchoolList extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "List all schools",
    responses: {
      "200": {
        description: "List of schools",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.array(School),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(schools).all();
    return c.json({ success: true, result: rows.map(mapSchool) });
  }
}
