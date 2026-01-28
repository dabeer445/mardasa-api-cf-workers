import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, config } from "../../db";
import { createWhatsAppService } from "../../services/whatsapp";
import { generateDailyReport, formatDailyReport } from "../../services/reports";

export class DailyReport extends OpenAPIRoute {
  schema = {
    tags: ["Reports"],
    summary: "Generate daily income vs expenses report",
    request: {
      query: z.object({
        date: Str({ required: false, description: "Date in YYYY-MM-DD format (defaults to today)" }),
        send: Bool({ required: false, description: "Send report to admin phones via WhatsApp" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the daily report",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              date: Str(),
              report: z.object({
                totalIncome: z.number(),
                totalExpenses: z.number(),
                netAmount: z.number(),
                paymentCount: z.number(),
                expenseCount: z.number(),
                paymentsByType: z.record(z.number()),
                expensesByCategory: z.record(z.number()),
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
    const date = data.query.date || new Date().toISOString().split('T')[0];
    const shouldSend = data.query.send || false;

    const db = createDb(c.env.DB);
    const reportData = await generateDailyReport(db, date);
    const message = formatDailyReport(reportData);

    let sent = false;
    let sendResult: { total: number; sent: number; failed: number } | undefined;

    if (shouldSend) {
      const configResult = await db.select().from(config).where(eq(config.id, 1)).get();
      const adminPhones: string[] = configResult?.adminPhones
        ? JSON.parse(configResult.adminPhones)
        : [];
      if (adminPhones.length > 0) {
        const whatsapp = createWhatsAppService(c.env);
        sendResult = await whatsapp.sendToMultiple(adminPhones, message);
        sent = sendResult.sent > 0;
      }
    }

    return {
      success: true,
      date,
      report: {
        totalIncome: reportData.totalIncome,
        totalExpenses: reportData.totalExpenses,
        netAmount: reportData.netAmount,
        paymentCount: reportData.paymentCount,
        expenseCount: reportData.expenseCount,
        paymentsByType: reportData.paymentsByType,
        expensesByCategory: reportData.expensesByCategory,
      },
      message,
      sent,
      sendResult,
    };
  }
}
