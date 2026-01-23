import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Student, mapStudent } from "../../types";

export class StudentList extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "List students with pagination and filtering",
    request: {
      query: z.object({
        page: Num({ description: "Page number (1-indexed)", default: 1 }),
        limit: Num({ description: "Items per page", default: 20 }),
        status: z.enum(["Active", "Archived"]).optional().describe("Filter by status"),
        classId: Str({ required: false, description: "Filter by class ID" }),
        search: Str({ required: false, description: "Search by name or GR number" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a paginated list of students",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Student.array(),
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
    const { page, limit, status, classId, search } = data.query;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    if (classId) {
      conditions.push("class_id = ?");
      params.push(classId);
    }

    if (search) {
      conditions.push("(name LIKE ? OR gr_number LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM students ${whereClause}`;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `SELECT * FROM students ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const { results } = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all();

    return {
      success: true,
      result: results.map(mapStudent),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
