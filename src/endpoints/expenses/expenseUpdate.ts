import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Expense } from "../../types";
import { createDb, expenses } from "../../db";
import { buildPartialUpdate } from "../../db/utils";

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

    const db = createDb(c.env.DB);

    const existing = await db.select().from(expenses).where(eq(expenses.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Expense not found' }, 404);
    }

    const updates = buildPartialUpdate(body, ['category', 'amount', 'date', 'notes']);

    await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id));

    const result = await db.select().from(expenses).where(eq(expenses.id, id)).get();
    return {
      success: true,
      result,
    };
  }
}
