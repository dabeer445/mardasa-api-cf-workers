import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, ClassRoom } from "../../types";
import { createDb, classes } from "../../db";
import { createFilter, paginate } from "../../db/utils";

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

    const db = createDb(c.env.DB);

    const filter = createFilter()
      .eq(classes.teacherId, teacherId)
      .like(classes.name, search)
      .build();

    const { data: results, pagination } = await paginate(db, classes,
      { page, limit },
      { where: filter, orderBy: classes.createdAt, orderDirection: 'desc' }
    );

    return {
      success: true,
      result: results,
      pagination,
    };
  }
}
