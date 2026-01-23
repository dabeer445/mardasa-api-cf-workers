import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Student, mapStudent } from "../../types";

export class StudentFetch extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "Get a student by ID",
    request: {
      params: z.object({
        id: Str({ description: "Student ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the student",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Student,
            }),
          },
        },
      },
      "404": {
        description: "Student not found",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              error: Str(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { id } = data.params;

    const result = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();
    if (!result) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }
    return {
      success: true,
      result: mapStudent(result),
    };
  }
}
