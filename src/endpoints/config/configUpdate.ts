import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, MadrassaConfig, mapConfig } from "../../types";

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

    await c.env.DB.prepare(`
      UPDATE config SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        admin_name = COALESCE(?, admin_name),
        admin_phones = COALESCE(?, admin_phones),
        monthly_due_date = COALESCE(?, monthly_due_date),
        annual_fee_month = COALESCE(?, annual_fee_month),
        annual_fee = COALESCE(?, annual_fee),
        updated_at = unixepoch()
      WHERE id = 1
    `).bind(
      body.name ?? null,
      body.address ?? null,
      body.phone ?? null,
      body.adminName ?? null,
      body.adminPhones ? JSON.stringify(body.adminPhones) : null,
      body.monthlyDueDate ?? null,
      body.annualFeeMonth ?? null,
      body.annualFee ?? null
    ).run();

    const result = await c.env.DB.prepare('SELECT * FROM config WHERE id = 1').first();
    return {
      success: true,
      result: mapConfig(result),
    };
  }
}
