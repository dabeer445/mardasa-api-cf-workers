import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, MadrassaConfig, mapConfig } from "../../types";
import { createDb, config } from "../../db";

export class ConfigFetch extends OpenAPIRoute {
  schema = {
    tags: ["Config"],
    summary: "Get madrassa configuration",
    responses: {
      "200": {
        description: "Returns the configuration",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: MadrassaConfig,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const db = createDb(c.env.DB);
    const result = await db.select().from(config).where(eq(config.id, 1)).get();
    return {
      success: true,
      result: mapConfig(result),
    };
  }
}
