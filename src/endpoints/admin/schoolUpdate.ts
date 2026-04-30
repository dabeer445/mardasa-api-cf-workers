import { Bool, OpenAPIRoute, Num, Str } from "chanfana";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { type AppContext, School, mapSchool } from "../../types";
import { createDb, schools } from "../../db";

export class AdminSchoolUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "Update a school",
    request: {
      params: z.object({ id: Num() }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              slug: Str({ required: false }),
              name: Str({ required: false }),
              logoUrl: Str({ required: false }),
              address: Str({ required: false }),
              phone: Str({ required: false }),
              adminPhones: z.array(z.string()).optional(),
              whatsappSessionId: Str({ required: false }),
              whatsappToken: Str({ required: false }),
              monthlyDueDate: Num({ required: false }),
              annualFeeMonth: Str({ required: false }),
              annualFee: Num({ required: false }),
              subscriptionStatus: z.enum(["trial", "active", "expired", "suspended"]).optional(),
              subscriptionExpiresAt: Num({ required: false }),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "School updated",
        content: {
          "application/json": {
            schema: z.object({ success: Bool(), result: School }),
          },
        },
      },
      "404": {
        description: "School not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
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
    const exists = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, id)).get();
    if (!exists) return c.json({ error: 'School not found' }, 404);

    const updates: Record<string, unknown> = { updatedAt: sql`unixepoch()` };
    if (body.slug !== undefined)               updates.slug = body.slug;
    if (body.name !== undefined)               updates.name = body.name;
    if (body.logoUrl !== undefined)            updates.logoUrl = body.logoUrl;
    if (body.address !== undefined)            updates.address = body.address;
    if (body.phone !== undefined)              updates.phone = body.phone;
    if (body.adminPhones !== undefined)        updates.adminPhones = JSON.stringify(body.adminPhones);
    if (body.whatsappSessionId !== undefined)  updates.whatsappSessionId = body.whatsappSessionId;
    if (body.whatsappToken !== undefined)      updates.whatsappToken = body.whatsappToken;
    if (body.monthlyDueDate !== undefined)     updates.monthlyDueDate = body.monthlyDueDate;
    if (body.annualFeeMonth !== undefined)     updates.annualFeeMonth = body.annualFeeMonth;
    if (body.annualFee !== undefined)          updates.annualFee = body.annualFee;
    if (body.subscriptionStatus !== undefined) updates.subscriptionStatus = body.subscriptionStatus;
    if (body.subscriptionExpiresAt !== undefined) updates.subscriptionExpiresAt = body.subscriptionExpiresAt;

    await db.update(schools).set(updates as any).where(eq(schools.id, id));
    const row = await db.select().from(schools).where(eq(schools.id, id)).get();
    return c.json({ success: true, result: mapSchool(row) });
  }
}
