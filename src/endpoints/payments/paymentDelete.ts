import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, payments } from "../../db";

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

    const db = createDb(c.env.DB);
    await db.delete(payments).where(eq(payments.id, id));

    return {
      success: true,
    };
  }
}
