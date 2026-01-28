import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { type AppContext, Student } from "../../types";
import { createDb, students, classes } from "../../db";
import { buildPartialUpdate } from "../../db/utils";

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
      "400": {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              error: Str(),
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

    const db = createDb(c.env.DB);

    const existing = await db.select().from(students).where(eq(students.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }

    // Validate class exists if provided
    if (body.classId) {
      const classResult = await db.select().from(classes).where(eq(classes.id, body.classId)).get();
      if (!classResult) {
        return c.json({ success: false, error: `Class with ID '${body.classId}' not found` }, 400);
      }
    }

    const updates = buildPartialUpdate(body, [
      'grNumber', 'name', 'parentName', 'phone', 'classId',
      'admissionDate', 'monthlyFee', 'status', 'discount'
    ]);

    await db
      .update(students)
      .set({ ...updates, updatedAt: sql`unixepoch()` })
      .where(eq(students.id, id));

    const result = await db.select().from(students).where(eq(students.id, id)).get();
    return {
      success: true,
      result,
    };
  }
}
