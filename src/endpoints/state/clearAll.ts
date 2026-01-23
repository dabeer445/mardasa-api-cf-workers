import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";

export class ClearAll extends OpenAPIRoute {
  schema = {
    tags: ["Utility"],
    summary: "Clear all data (dangerous!)",
    responses: {
      "200": {
        description: "All data cleared successfully",
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
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM payments'),
      c.env.DB.prepare('DELETE FROM expenses'),
      c.env.DB.prepare('DELETE FROM students'),
      c.env.DB.prepare('DELETE FROM classes'),
      c.env.DB.prepare('DELETE FROM teachers'),
      c.env.DB.prepare(`UPDATE config SET
        name = 'Madrassa Darul Uloom',
        address = '',
        phone = '',
        admin_name = 'Admin',
        admin_phones = '[]',
        monthly_due_date = 10,
        annual_fee_month = '05',
        annual_fee = 0
        WHERE id = 1`),
    ]);
    return {
      success: true,
    };
  }
}
