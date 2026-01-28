import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Payment } from "../../types";
import { createDb, payments, students } from "../../db";
import { buildPartialUpdate } from "../../db/utils";

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

    const db = createDb(c.env.DB);

    const existing = await db.select().from(payments).where(eq(payments.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Payment not found' }, 404);
    }

    // Validate student exists if updating studentId
    if (body.studentId) {
      const student = await db.select().from(students).where(eq(students.id, body.studentId)).get();
      if (!student) {
        return c.json({ success: false, error: `Student with ID '${body.studentId}' not found` }, 400);
      }
    }

    const updates = buildPartialUpdate(body, [
      'studentId', 'feeType', 'amount', 'date', 'month', 'receivedBy'
    ]);

    await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id));

    const result = await db.select().from(payments).where(eq(payments.id, id)).get();
    return {
      success: true,
      result,
    };
  }
}
