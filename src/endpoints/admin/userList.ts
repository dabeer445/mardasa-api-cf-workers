import { Bool, OpenAPIRoute, Str, Num } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../types";
import { createDb, users } from "../../db";

export class AdminUserList extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "List all users",
    responses: {
      "200": {
        description: "List of users",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: z.array(
                z.object({
                  id: Str(),
                  username: Str(),
                  role: z.enum(["admin", "super_admin"]),
                  schoolId: Num({ required: false }),
                })
              ),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const db = createDb(c.env.DB);
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        schoolId: users.schoolId,
      })
      .from(users)
      .all();

    return c.json({
      success: true,
      result: rows.map((u) => ({
        ...u,
        schoolId: u.schoolId ?? undefined,
      })),
    });
  }
}
