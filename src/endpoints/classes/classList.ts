import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, ClassRoom, mapClass } from "../../types";

export class ClassList extends OpenAPIRoute {
  schema = {
    tags: ["Classes"],
    summary: "List classes with pagination and filtering",
    request: {
      query: z.object({
        page: Num({ description: "Page number (1-indexed)", default: 1 }),
        limit: Num({ description: "Items per page", default: 20 }),
        teacherId: Str({ required: false, description: "Filter by teacher ID" }),
        search: Str({ required: false, description: "Search by name" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a paginated list of classes",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: ClassRoom.array(),
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
    const { page, limit, teacherId, search } = data.query;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];

    if (teacherId) {
      conditions.push("teacher_id = ?");
      params.push(teacherId);
    }

    if (search) {
      conditions.push("name LIKE ?");
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM classes ${whereClause}`;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `SELECT * FROM classes ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const { results } = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all();

    return {
      success: true,
      result: results.map(mapClass),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
