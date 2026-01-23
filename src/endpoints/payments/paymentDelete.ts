import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";

export class PaymentDelete extends OpenAPIRoute {
  schema = {
    tags: ["Payments"],
    summary: "Delete a payment",
    request: {
      params: z.object({
        id: Str({ description: "Payment ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Payment deleted successfully",
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

    await c.env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(id).run();
    return {
      success: true,
    };
  }
}
