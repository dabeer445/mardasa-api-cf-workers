import { Bool, OpenAPIRoute, Str, Num } from "chanfana";
import { z } from "zod";
import { type AppContext, School, mapSchool } from "../../types";
import { createDb, schools } from "../../db";

export class AdminSchoolCreate extends OpenAPIRoute {
  schema = {
    tags: ["Admin"],
    summary: "Create a new school",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              slug: Str({ example: "darul-uloom" }),
              name: Str({ example: "Madrassa Darul Uloom" }),
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
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "School created",
        content: {
          "application/json": {
            schema: z.object({ success: Bool(), result: School }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const body = data.body;

    const db = createDb(c.env.DB);
    const [row] = await db
      .insert(schools)
      .values({
        slug: body.slug,
        name: body.name,
        logoUrl: body.logoUrl ?? null,
        address: body.address ?? '',
        phone: body.phone ?? '',
        adminPhones: JSON.stringify(body.adminPhones ?? []),
        whatsappSessionId: body.whatsappSessionId ?? null,
        whatsappToken: body.whatsappToken ?? null,
        monthlyDueDate: body.monthlyDueDate ?? 10,
        annualFeeMonth: (body.annualFeeMonth as any) ?? '05',
        annualFee: body.annualFee ?? 0,
        subscriptionStatus: body.subscriptionStatus ?? 'trial',
      })
      .returning();

    return c.json({ success: true, result: mapSchool(row) });
  }
}
