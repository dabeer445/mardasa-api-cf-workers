import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { type AppContext, MadrassaConfig, mapConfig } from "../../types";
import { createDb, config } from "../../db";
import { buildPartialUpdate } from "../../db/utils";

export class ConfigUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Config"],
    summary: "Update madrassa configuration",
    request: {
      body: {
        content: {
          "application/json": {
            schema: MadrassaConfig.partial(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the updated configuration",
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
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;

    const db = createDb(c.env.DB);

    // Build partial update with allowed fields
    const updates = buildPartialUpdate(body, [
      'name', 'address', 'phone', 'adminName', 'adminPhones',
      'monthlyDueDate', 'annualFeeMonth', 'annualFee'
    ]);

    // Convert adminPhones array to JSON string if provided
    const dbUpdates: Record<string, any> = { ...updates };
    if (updates.adminPhones !== undefined) {
      dbUpdates.adminPhones = JSON.stringify(updates.adminPhones);
    }

    await db
      .update(config)
      .set({
        ...dbUpdates,
        updatedAt: sql`unixepoch()`,
      })
      .where(eq(config.id, 1));

    const result = await db.select().from(config).where(eq(config.id, 1)).get();
    return {
      success: true,
      result: mapConfig(result),
    };
  }
}
