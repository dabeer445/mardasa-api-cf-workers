import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Student, generateId, mapStudent } from "../../types";
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
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('s');

    await c.env.DB.prepare(`
      INSERT INTO students (id, gr_number, name, parent_name, phone, class_id, admission_date, monthly_fee, status, discount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.grNumber,
      body.name,
      body.parentName,
      body.phone,
      body.classId,
      body.admissionDate,
      body.monthlyFee,
      body.status || 'Active',
      body.discount || 0
    ).run();

    const result = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();
    const student = mapStudent(result);

    // Send welcome notification in background (non-blocking)
    if (student && student.phone) {
      const notifications = createNotificationService(c.env);

      // Get class name and send notification without blocking response
      c.executionCtx.waitUntil(
        (async () => {
          let className: string | undefined;
          if (body.classId) {
            const classResult = await c.env.DB.prepare('SELECT name FROM classes WHERE id = ?').bind(body.classId).first();
            className = classResult?.name as string | undefined;
          }

          await notifications.trigger('STUDENT_CREATED', {
            student: {
              name: student.name,
              grNumber: student.grNumber,
              parentName: student.parentName,
              phone: student.phone,
              monthlyFee: student.monthlyFee,
            },
            className,
          });
        })()
      );
    }

    return {
      success: true,
      result: student,
    };
  }
}
