import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Payment, mapPayment } from "../../types";

export class PaymentUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Payments"],
    summary: "Update a payment",
    request: {
      params: z.object({
        id: Str({ description: "Payment ID" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: Payment.omit({ id: true, timestamp: true }).partial(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the updated payment",
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
    const body = data.body;

    const existing = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Payment not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE payments SET
        student_id = COALESCE(?, student_id),
        fee_type = COALESCE(?, fee_type),
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        month = COALESCE(?, month),
        received_by = COALESCE(?, received_by)
      WHERE id = ?
    `).bind(
      body.studentId ?? null,
      body.feeType ?? null,
      body.amount ?? null,
      body.date ?? null,
      body.month ?? null,
      body.receivedBy ?? null,
      id
    ).run();

    const result = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapPayment(result),
    };
  }
}
