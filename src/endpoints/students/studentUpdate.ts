import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { type AppContext, Student } from "../../types";
import { createDb, students, classes } from "../../db";
import { buildPartialUpdate } from "../../db/utils";
import { invalidateDuesCache } from "../../services/duesCalculator";

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
    const schoolId = c.get('schoolId')!;

    const db = createDb(c.env.DB);

    const existing = await db.select().from(students).where(and(eq(students.id, id), eq(students.schoolId, schoolId))).get();
    if (!existing) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }

    // Validate class exists if provided
    if (body.classId) {
      const classResult = await db.select().from(classes).where(and(eq(classes.id, body.classId), eq(classes.schoolId, schoolId))).get();
      if (!classResult) {
        return c.json({ success: false, error: `Class with ID '${body.classId}' not found` }, 400);
      }
    }

    const updates = buildPartialUpdate(body, [
      'grNumber', 'name', 'parentName', 'phone', 'phone2', 'address',
      'gender', 'dateOfBirth', 'parentCnic', 'classId', 'admissionDate',
      'removalDate', 'monthlyFee', 'status', 'discount'
    ]);

    await db
      .update(students)
      .set({ ...updates, updatedAt: sql`unixepoch()` })
      .where(and(eq(students.id, id), eq(students.schoolId, schoolId)));

    const result = await db.select().from(students).where(and(eq(students.id, id), eq(students.schoolId, schoolId))).get();

    // Invalidate dues cache if status changed (affects active student list)
    if (body.status) {
      c.executionCtx.waitUntil(invalidateDuesCache(c.env.CACHE, schoolId));
    }

    return {
      success: true,
      result,
    };
  }
}
