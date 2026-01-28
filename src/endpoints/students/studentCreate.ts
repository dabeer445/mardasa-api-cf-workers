import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Student, generateId } from "../../types";
import { createDb, students, classes } from "../../db";
import { createNotificationService } from "../../services/notifications";

export class StudentCreate extends OpenAPIRoute {
  schema = {
    tags: ["Students"],
    summary: "Create a new student",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Student.omit({ id: true }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "Returns the created student",
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
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('s');

    const db = createDb(c.env.DB);

    // Validate class exists if provided
    let classResult: { id: string; name: string } | undefined;
    if (body.classId) {
      classResult = await db.select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.id, body.classId)).get();
      if (!classResult) {
        return c.json({ success: false, error: `Class with ID '${body.classId}' not found` }, 400);
      }
    }

    await db.insert(students).values({
      id,
      grNumber: body.grNumber,
      name: body.name,
      parentName: body.parentName,
      phone: body.phone,
      classId: body.classId,
      admissionDate: body.admissionDate,
      monthlyFee: body.monthlyFee,
      status: body.status || 'Active',
      discount: body.discount || 0,
    });

    const student = await db.select().from(students).where(eq(students.id, id)).get();

    // Send welcome notification in background (non-blocking)
    if (student && student.phone) {
      const notifications = createNotificationService(c.env);

      c.executionCtx.waitUntil(
        notifications.trigger('STUDENT_CREATED', {
          student: {
            name: student.name,
            grNumber: student.grNumber,
            parentName: student.parentName,
            phone: student.phone,
            monthlyFee: student.monthlyFee,
          },
          className: classResult?.name,
        })
      );
    }

    return {
      success: true,
      result: student,
    };
  }
}
