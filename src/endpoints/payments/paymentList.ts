import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Payment } from "../../types";
import { createDb, payments } from "../../db";
import { createFilter, paginate } from "../../db/utils";

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

    const db = createDb(c.env.DB);

    const filter = createFilter()
      .eq(payments.studentId, studentId)
      .eq(payments.feeType, feeType)
      .eq(payments.month, month)
      .gte(payments.date, fromDate)
      .lte(payments.date, toDate)
      .build();

    const { data: results, pagination } = await paginate(db, payments,
      { page, limit },
      { where: filter, orderBy: payments.timestamp, orderDirection: 'desc' }
    );

    return {
      success: true,
      result: results,
      pagination,
    };
  }
}
