import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { type AppContext, School, mapSchool } from "../../types";
import { createDb, schools } from "../../db";

export class ConfigUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Config"],
    summary: "Update school configuration",
    request: {
      body: {
        content: {
          "application/json": {
            schema: School.omit({ id: true, slug: true, subscriptionStatus: true, subscriptionExpiresAt: true }).partial(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the updated school configuration",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              result: School,
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;
    const schoolId = c.get('schoolId')!;

    const db = createDb(c.env.DB);

    const updates: Record<string, unknown> = { updatedAt: sql`unixepoch()` };
    if (body.name !== undefined)              updates.name = body.name;
    if (body.logoUrl !== undefined)           updates.logoUrl = body.logoUrl;
    if (body.address !== undefined)           updates.address = body.address;
    if (body.phone !== undefined)             updates.phone = body.phone;
    if (body.adminPhones !== undefined)       updates.adminPhones = JSON.stringify(body.adminPhones);
    if (body.whatsappSessionId !== undefined) updates.whatsappSessionId = body.whatsappSessionId;
    if (body.whatsappToken !== undefined)     updates.whatsappToken = body.whatsappToken;
    if (body.monthlyDueDate !== undefined)    updates.monthlyDueDate = body.monthlyDueDate;
    if (body.annualFeeMonth !== undefined)    updates.annualFeeMonth = body.annualFeeMonth;
    if (body.annualFee !== undefined)         updates.annualFee = body.annualFee;

    await db.update(schools).set(updates as any).where(eq(schools.id, schoolId));
    const row = await db.select().from(schools).where(eq(schools.id, schoolId)).get();
    return c.json({ success: true, result: mapSchool(row) });
  }
}
