import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Teacher, mapTeacher } from "../../types";

export class TeacherList extends OpenAPIRoute {
  schema = {
    tags: ["Teachers"],
    summary: "List teachers with pagination and filtering",
    request: {
      query: z.object({
        page: Num({ description: "Page number (1-indexed)", default: 1 }),
        limit: Num({ description: "Items per page", default: 20 }),
        search: Str({ required: false, description: "Search by name" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a paginated list of teachers",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Teacher.array(),
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
    const { page, limit, search } = data.query;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push("name LIKE ?");
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM teachers ${whereClause}`;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `SELECT * FROM teachers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const { results } = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all();

    return {
      success: true,
      result: results.map(mapTeacher),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
