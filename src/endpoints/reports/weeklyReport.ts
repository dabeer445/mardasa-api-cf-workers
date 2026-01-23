import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, mapConfig } from "../../types";
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

    const reportData = await generateWeeklyReport(c.env.DB, endDate);
    const message = formatWeeklyReport(reportData);

    let sent = false;
    let sendResult: { total: number; sent: number; failed: number } | undefined;

    if (shouldSend) {
      const config = await c.env.DB.prepare('SELECT * FROM config WHERE id = 1').first();
      const configData = mapConfig(config);

      if (configData.adminPhones.length > 0) {
        const whatsapp = createWhatsAppService(c.env);
        sendResult = await whatsapp.sendToMultiple(configData.adminPhones, message);
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
