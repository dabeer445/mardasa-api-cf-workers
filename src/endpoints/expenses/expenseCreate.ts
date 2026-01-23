import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Expense, generateId, mapExpense } from "../../types";

export class ExpenseCreate extends OpenAPIRoute {
  schema = {
    tags: ["Expenses"],
    summary: "Create a new expense",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Expense.omit({ id: true, timestamp: true }).extend({
              timestamp: z.number().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "Returns the created expense",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Expense,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('e');
    const timestamp = body.timestamp ?? Date.now();

    await c.env.DB.prepare(`
      INSERT INTO expenses (id, category, amount, date, notes, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, body.category, body.amount, body.date, body.notes ?? null, timestamp).run();

    const result = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapExpense(result),
    };
  }
}
