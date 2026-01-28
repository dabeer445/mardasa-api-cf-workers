import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Expense } from "../../types";
import { createDb, expenses } from "../../db";
import { createFilter, paginate } from "../../db/utils";

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

    const db = createDb(c.env.DB);

    const filter = createFilter()
      .eq(expenses.category, category)
      .gte(expenses.date, fromDate)
      .lte(expenses.date, toDate)
      .like(expenses.notes, search)
      .build();

    const { data: results, pagination } = await paginate(db, expenses,
      { page, limit },
      { where: filter, orderBy: expenses.timestamp, orderDirection: 'desc' }
    );

    return {
      success: true,
      result: results,
      pagination,
    };
  }
}
