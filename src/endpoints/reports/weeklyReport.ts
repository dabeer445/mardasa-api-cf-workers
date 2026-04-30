import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, schools } from "../../db";
import { createWhatsAppService } from "../../services/whatsapp";
import { generateWeeklyReport, formatWeeklyReport } from "../../services/reports";

export class WeeklyReport extends OpenAPIRoute {
  schema = {
    tags: ["Reports"],
    summary: "Generate weekly income vs expenses report",
    request: {
      query: z.object({
        endDate: Str({ required: false, description: "End date in YYYY-MM-DD format (defaults to today)" }),
        send: Bool({ required: false, description: "Send report to admin phones via WhatsApp" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the weekly report",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              startDate: Str(),
              endDate: Str(),
              report: z.object({
                totalIncome: z.number(),
                totalExpenses: z.number(),
                netAmount: z.number(),
                paymentCount: z.number(),
                expenseCount: z.number(),
                newStudents: z.number(),
                dailyBreakdown: z.array(z.object({
                  date: Str(),
                  income: z.number(),
                  expenses: z.number(),
                })),
              }),
              message: Str(),
              sent: Bool(),
              sendResult: z.object({
                total: z.number(),
                sent: z.number(),
                failed: z.number(),
              }).optional(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const endDate = data.query.endDate || new Date().toISOString().split('T')[0];
    const shouldSend = data.query.send || false;
    const schoolId = c.get('schoolId')!;

    const db = createDb(c.env.DB);
    const reportData = await generateWeeklyReport(db, endDate, schoolId);
    const message = formatWeeklyReport(reportData);

    let sent = false;
    let sendResult: { total: number; sent: number; failed: number } | undefined;

    if (shouldSend) {
      const schoolRow = await db.select().from(schools).where(eq(schools.id, schoolId)).get();
      const adminPhones: string[] = schoolRow?.adminPhones
        ? JSON.parse(schoolRow.adminPhones)
        : [];

      if (adminPhones.length > 0) {
        const whatsapp = createWhatsAppService(c.env);
        sendResult = await whatsapp.sendToMultiple(adminPhones, message);
        sent = sendResult.sent > 0;
      }
    }

    return {
      success: true,
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      report: {
        totalIncome: reportData.totalIncome,
        totalExpenses: reportData.totalExpenses,
        netAmount: reportData.netAmount,
        paymentCount: reportData.paymentCount,
        expenseCount: reportData.expenseCount,
        newStudents: reportData.newStudents,
        dailyBreakdown: reportData.dailyBreakdown,
      },
      message,
      sent,
      sendResult,
    };
  }
}
