import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";

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

    await c.env.DB.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
    return {
      success: true,
    };
  }
}
