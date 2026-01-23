import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Expense, mapExpense } from "../../types";

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

    const result = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first();
    if (!result) {
      return c.json({ success: false, error: 'Expense not found' }, 404);
    }
    return {
      success: true,
      result: mapExpense(result),
    };
  }
}
