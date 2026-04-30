import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { type AppContext } from "../../types";
import { createDb, users } from "../../db";
import { verifyPassword } from "../../utils/password";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export class Login extends OpenAPIRoute {
  schema = {
    tags: ["Auth"],
    summary: "Login and receive a JWT token",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              username: Str({ example: "admin" }),
              password: Str({ example: "password" }),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Login successful",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              token: Str(),
              role: z.enum(["admin", "super_admin"]),
            }),
          },
        },
      },
      "401": {
        description: "Invalid credentials",
        content: {
          "application/json": {
            schema: z.object({ error: Str() }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { username, password } = data.body;

    const db = createDb(c.env.DB);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const exp = Math.floor(Date.now() / 1000) + THIRTY_DAYS;
    const payload: Record<string, unknown> = { userId: user.id, role: user.role, exp };
    if (user.schoolId !== null) payload['schoolId'] = user.schoolId;

    const token = await sign(payload, c.env.JWT_SECRET, 'HS256');
    return c.json({ success: true, token, role: user.role });
  }
}
