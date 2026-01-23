import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Payment, generateId, mapPayment } from "../../types";
import { createNotificationService } from "../../services/notifications";

export class PaymentCreate extends OpenAPIRoute {
  schema = {
    tags: ["Payments"],
    summary: "Create a new payment",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Payment.omit({ id: true, timestamp: true }).extend({
              timestamp: z.number().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "Returns the created payment",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Payment,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('p');
    const timestamp = body.timestamp ?? Date.now();

    await c.env.DB.prepare(`
      INSERT INTO payments (id, student_id, fee_type, amount, date, month, received_by, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.studentId,
      body.feeType,
      body.amount,
      body.date,
      body.month ?? null,
      body.receivedBy,
      timestamp
    ).run();

    const result = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    const payment = mapPayment(result);

    // Send payment notification in background (non-blocking)
    if (payment) {
      const notifications = createNotificationService(c.env);

      c.executionCtx.waitUntil(
        (async () => {
          // Get student info for notification
          const studentResult = await c.env.DB.prepare(
            'SELECT name, gr_number, phone FROM students WHERE id = ?'
          ).bind(body.studentId).first();

          if (studentResult && studentResult.phone) {
            await notifications.trigger('PAYMENT_RECEIVED', {
              payment: {
                amount: payment.amount,
                feeType: payment.feeType,
                date: payment.date,
                month: payment.month,
              },
              student: {
                name: studentResult.name as string,
                grNumber: studentResult.gr_number as string,
                phone: studentResult.phone as string,
              },
            });
          }
        })()
      );
    }

    return {
      success: true,
      result: payment,
    };
  }
}
