import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Payment, generateId } from "../../types";
import { createDb, payments, students } from "../../db";
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
      "400": {
        description: "Invalid request",
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
    const body = data.body;
    const id = generateId('p');
    const timestamp = body.timestamp ?? Date.now();

    const db = createDb(c.env.DB);

    // Validate student exists
    const studentResult = await db.select().from(students).where(eq(students.id, body.studentId)).get();
    if (!studentResult) {
      return c.json({ success: false, error: `Student with ID '${body.studentId}' not found` }, 400);
    }

    await db.insert(payments).values({
      id,
      studentId: body.studentId,
      feeType: body.feeType,
      amount: body.amount,
      date: body.date,
      month: body.month ?? null,
      receivedBy: body.receivedBy,
      timestamp,
    });

    const payment = await db.select().from(payments).where(eq(payments.id, id)).get();

    // Send payment notification in background (non-blocking)
    if (payment && studentResult.phone) {
      const notifications = createNotificationService(c.env);

      c.executionCtx.waitUntil(
        notifications.trigger('PAYMENT_RECEIVED', {
          payment: {
            amount: payment.amount,
            feeType: payment.feeType,
            date: payment.date,
            month: payment.month ?? undefined,
          },
          student: {
            name: studentResult.name,
            grNumber: studentResult.grNumber,
            phone: studentResult.phone,
          },
        })
      );
    }

    return {
      success: true,
      result: payment,
    };
  }
}
