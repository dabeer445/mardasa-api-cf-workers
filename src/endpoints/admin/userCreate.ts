import { Bool, OpenAPIRoute, Str, Num } from "chanfana";
import { z } from "zod";
import { type AppContext, generateId } from "../../types";
import { createDb, users } from "../../db";
import { hashPassword } from "../../utils/password";

export class AdminUserCreate extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "Create a user for a school",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              username: Str({ example: "school_admin" }),
              password: Str({ example: "secure_password" }),
              schoolId: Num({ required: false, description: "Omit for super_admin" }),
              role: z.enum(["admin", "super_admin"]).default("admin"),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "User created",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.object({
                id: Str(),
                username: Str(),
                role: z.enum(["admin", "super_admin"]),
                schoolId: Num({ required: false }),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;

    const db = createDb(c.env.DB);
    const passwordHash = await hashPassword(body.password);

    const [user] = await db
      .insert(users)
      .values({
        id: generateId('usr_'),
        username: body.username,
        passwordHash,
        schoolId: body.schoolId ?? null,
        role: body.role,
      })
      .returning();

    return c.json({
      success: true,
      result: {
        id: user.id,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ?? undefined,
      },
    });
  }
}
