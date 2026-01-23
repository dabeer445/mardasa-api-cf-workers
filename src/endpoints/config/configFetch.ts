import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, MadrassaConfig, mapConfig } from "../../types";

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
    const result = await c.env.DB.prepare('SELECT * FROM config WHERE id = 1').first();
    return {
      success: true,
      result: mapConfig(result),
    };
  }
}
