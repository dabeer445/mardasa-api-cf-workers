import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Expense } from "../../types";
import { createDb, expenses } from "../../db";

export class ExpenseFetch extends OpenAPIRoute {
  schema = {
    tags: ["Expenses"],
    summary: "Get an expense by ID",
    request: {
      params: z.object({
        id: Str({ description: "Expense ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the expense",
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

    const db = createDb(c.env.DB);
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).get();

    if (!result) {
      return c.json({ success: false, error: 'Expense not found' }, 404);
    }
    return {
      success: true,
      result,
    };
  }
}
