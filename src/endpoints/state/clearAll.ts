import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, students, classes, teachers, payments, expenses, config } from "../../db";

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
    const db = createDb(c.env.DB);

    // Delete all data in correct order (respecting foreign keys)
    await db.delete(payments);
    await db.delete(expenses);
    await db.delete(students);
    await db.delete(classes);
    await db.delete(teachers);

    // Reset config to defaults
    await db
      .update(config)
      .set({
        name: 'Madrassa Darul Uloom',
        address: '',
        phone: '',
        adminName: 'Admin',
        adminPhones: '[]',
        monthlyDueDate: 10,
        annualFeeMonth: '05',
        annualFee: 0,
      })
      .where(eq(config.id, 1));

    return {
      success: true,
    };
  }
}
