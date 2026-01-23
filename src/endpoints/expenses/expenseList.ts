import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Expense, mapExpense } from "../../types";

export class ExpenseList extends OpenAPIRoute {
  schema = {
    tags: ["Expenses"],
    summary: "List expenses with pagination and filtering",
    request: {
      query: z.object({
        page: Num({ description: "Page number (1-indexed)", default: 1 }),
        limit: Num({ description: "Items per page", default: 20 }),
        category: Str({ required: false, description: "Filter by category" }),
        fromDate: Str({ required: false, description: "Filter from date (YYYY-MM-DD)" }),
        toDate: Str({ required: false, description: "Filter to date (YYYY-MM-DD)" }),
        search: Str({ required: false, description: "Search in notes" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a paginated list of expenses",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Expense.array(),
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
    const { page, limit, category, fromDate, toDate, search } = data.query;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (fromDate) {
      conditions.push("date >= ?");
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push("date <= ?");
      params.push(toDate);
    }

    if (search) {
      conditions.push("notes LIKE ?");
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM expenses ${whereClause}`;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `SELECT * FROM expenses ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    const { results } = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all();

    return {
      success: true,
      result: results.map(mapExpense),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
