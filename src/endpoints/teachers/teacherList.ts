import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Teacher } from "../../types";
import { createDb, teachers } from "../../db";
import { createFilter, paginate } from "../../db/utils";

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

    const db = createDb(c.env.DB);

    const filter = createFilter()
      .like(teachers.name, search)
      .build();

    const { data: results, pagination } = await paginate(db, teachers,
      { page, limit },
      { where: filter, orderBy: teachers.createdAt, orderDirection: 'desc' }
    );

    return {
      success: true,
      result: results,
      pagination,
    };
  }
}
