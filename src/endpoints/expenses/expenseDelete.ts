import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, expenses } from "../../db";

export class ExpenseDelete extends OpenAPIRoute {
  schema = {
    tags: ["Expenses"],
    summary: "Delete an expense",
    request: {
      params: z.object({
        id: Str({ description: "Expense ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Expense deleted successfully",
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
    const data = await this.getValidatedData<typeof this.schema>();
    const { id } = data.params;

    const db = createDb(c.env.DB);
    await db.delete(expenses).where(eq(expenses.id, id));

    return {
      success: true,
    };
  }
}
