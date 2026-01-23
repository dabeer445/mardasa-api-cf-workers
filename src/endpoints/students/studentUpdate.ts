import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Student, mapStudent } from "../../types";

export class StudentUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "Update a student",
    request: {
      params: z.object({
        id: Str({ description: "Student ID" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: Student.omit({ id: true }).partial(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the updated student",
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
    const body = data.body;

    const existing = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE students SET
        gr_number = COALESCE(?, gr_number),
        name = COALESCE(?, name),
        parent_name = COALESCE(?, parent_name),
        phone = COALESCE(?, phone),
        class_id = COALESCE(?, class_id),
        admission_date = COALESCE(?, admission_date),
        monthly_fee = COALESCE(?, monthly_fee),
        status = COALESCE(?, status),
        discount = COALESCE(?, discount),
        updated_at = unixepoch()
      WHERE id = ?
    `).bind(
      body.grNumber ?? null,
      body.name ?? null,
      body.parentName ?? null,
      body.phone ?? null,
      body.classId ?? null,
      body.admissionDate ?? null,
      body.monthlyFee ?? null,
      body.status ?? null,
      body.discount ?? null,
      id
    ).run();

    const result = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();
    return {
      success: true,
      result: mapStudent(result),
    };
  }
}
