import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Payment } from "../../types";
import { createDb, payments } from "../../db";

export class PaymentFetch extends OpenAPIRoute {
  schema = {
    tags: ["Payments"],
    summary: "Get a payment by ID",
    request: {
      params: z.object({
        id: Str({ description: "Payment ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the payment",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Payment,
            }),
          },
        },
      },
      "404": {
        description: "Payment not found",
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
    const result = await db.select().from(payments).where(eq(payments.id, id)).get();

    if (!result) {
      return c.json({ success: false, error: 'Payment not found' }, 404);
    }
    return {
      success: true,
      result,
    };
  }
}
