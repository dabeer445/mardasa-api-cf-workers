import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext, Teacher, generateId } from "../../types";
import { createDb, teachers } from "../../db";

export class TeacherCreate extends OpenAPIRoute {
  schema = {
    tags: ["Teachers"],
    summary: "Create a new teacher",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Teacher.omit({ id: true }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "Returns the created teacher",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: Teacher,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const id = generateId('t');

    const db = createDb(c.env.DB);

    await db.insert(teachers).values({
      id,
      name: body.name,
      phone: body.phone ?? null,
    });

    const result = await db.select().from(teachers).where(eq(teachers.id, id)).get();
    return {
      success: true,
      result,
    };
  }
}
