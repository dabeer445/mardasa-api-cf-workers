import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { type AppContext, Payment } from "../../types";
import { createDb, payments } from "../../db";

export class PaymentsByStudent extends OpenAPIRoute {
  schema = {
    tags: ["Payments"],
    summary: "Get payments by student ID",
    request: {
      params: z.object({
        studentId: Str({ description: "Student ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns payments for the student",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Payment.array(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { studentId } = data.params;

    const db = createDb(c.env.DB);
    const results = await db
      .select()
      .from(payments)
      .where(eq(payments.studentId, studentId))
      .orderBy(desc(payments.timestamp));

    return {
      success: true,
      result: results,
    };
  }
}
