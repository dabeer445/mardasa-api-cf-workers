import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Expense, generateId } from "../../types";
import { createDb, expenses } from "../../db";

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

    const db = createDb(c.env.DB);

    await db.insert(expenses).values({
      id,
      category: body.category,
      amount: body.amount,
      date: body.date,
      notes: body.notes ?? null,
      timestamp,
    });

    const result = await db.select().from(expenses).where(eq(expenses.id, id)).get();
    return {
      success: true,
      result,
    };
  }
}
