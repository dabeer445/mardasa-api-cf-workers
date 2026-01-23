import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Payment, mapPayment } from "../../types";

export class PaymentList extends OpenAPIRoute {
  schema = {
    tags: ["Payments"],
    summary: "List payments with pagination and filtering",
    request: {
      query: z.object({
        page: Num({ description: "Page number (1-indexed)", default: 1 }),
        limit: Num({ description: "Items per page", default: 20 }),
        studentId: Str({ required: false, description: "Filter by student ID" }),
        feeType: z.enum(["Monthly", "Admission", "Annual", "Summer", "Other"]).optional().describe("Filter by fee type"),
        month: Str({ required: false, description: "Filter by month (e.g., 2024-05)" }),
        fromDate: Str({ required: false, description: "Filter from date (YYYY-MM-DD)" }),
        toDate: Str({ required: false, description: "Filter to date (YYYY-MM-DD)" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a paginated list of payments",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Payment.array(),
              pagination: z.object({
                page: Num(),
                limit: Num(),
                total: Num(),
                totalPages: Num(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { page, limit, studentId, feeType, month, fromDate, toDate } = data.query;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];

    if (studentId) {
      conditions.push("student_id = ?");
      params.push(studentId);
    }

    if (feeType) {
      conditions.push("fee_type = ?");
      params.push(feeType);
    }

    if (month) {
      conditions.push("month = ?");
      params.push(month);
    }

    if (fromDate) {
      conditions.push("date >= ?");
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push("date <= ?");
      params.push(toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM payments ${whereClause}`;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `SELECT * FROM payments ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    const { results } = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all();

    return {
      success: true,
      result: results.map(mapPayment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
