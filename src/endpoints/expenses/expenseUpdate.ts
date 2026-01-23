import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Expense, mapExpense } from "../../types";

export class ExpenseUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Expenses"],
    summary: "Update an expense",
    request: {
      params: z.object({
        id: Str({ description: "Expense ID" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: Expense.omit({ id: true, timestamp: true }).partial(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the updated expense",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Expense,
            }),
          },
        },
      },
      "404": {
        description: "Expense not found",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              error: Str(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { id } = data.params;
    const body = data.body;

    const existing = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Expense not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE expenses SET
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).bind(
      body.category ?? null,
      body.amount ?? null,
      body.date ?? null,
      body.notes ?? null,
      id
    ).run();

    const result = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapExpense(result),
    };
  }
}
