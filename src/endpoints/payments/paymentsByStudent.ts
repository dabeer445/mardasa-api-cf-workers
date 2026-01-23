import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Payment, mapPayment } from "../../types";

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

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE student_id = ? ORDER BY timestamp DESC'
    ).bind(studentId).all();

    return {
      success: true,
      result: results.map(mapPayment),
    };
  }
}
