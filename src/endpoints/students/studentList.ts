import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Student } from "../../types";
import { createDb, students } from "../../db";
import { createFilter, paginate } from "../../db/utils";

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

    const db = createDb(c.env.DB);

    const filter = createFilter()
      .eq(students.status, status)
      .eq(students.classId, classId)
      .search([students.name, students.grNumber], search)
      .build();

    const { data: results, pagination } = await paginate(db, students,
      { page, limit },
      { where: filter, orderBy: students.createdAt, orderDirection: 'desc' }
    );

    return {
      success: true,
      result: results,
      pagination,
    };
  }
}
