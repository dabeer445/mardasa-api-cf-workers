import { Bool, OpenAPIRoute, Str, Num } from "chanfana";
import { z } from "zod";
import { type AppContext, mapConfig } from "../../types";
import { createWhatsAppService } from "../../services/whatsapp";
import { generateMonthlyReport, formatMonthlyReport } from "../../services/reports";

export class MonthlyReport extends OpenAPIRoute {
  schema = {
    tags: ["Reports"],
    summary: "Generate monthly income vs expenses report with fee collection status",
    request: {
      query: z.object({
        month: Str({ required: false, description: "Month in YYYY-MM format (defaults to current month)" }),
        send: Bool({ required: false, description: "Send report to admin phones via WhatsApp" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns the monthly report",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              month: Str(),
              report: z.object({
                totalIncome: z.number(),
                totalExpenses: z.number(),
                netAmount: z.number(),
                paymentCount: z.number(),
                expenseCount: z.number(),
                feeCollection: z.object({
                  expected: z.number(),
                  collected: z.number(),
                  pending: z.number(),
                  collectionRate: z.number(),
                }),
                studentStats: z.object({
                  total: z.number(),
                  active: z.number(),
                  newThisMonth: z.number(),
                }),
                paymentsByType: z.record(z.number()),
                topExpenseCategories: z.array(z.object({
                  category: Str(),
                  amount: Num(),
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
    const month = data.query.month || new Date().toISOString().slice(0, 7);
    const shouldSend = data.query.send || false;

    // Get core report data from shared service
    const reportData = await generateMonthlyReport(c.env.DB, month);
    const message = formatMonthlyReport(reportData);

    // Get additional data for detailed API response
    const startDate = reportData.startDate;
    const endDate = reportData.endDate;

    const { results: payments } = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE date >= ? AND date <= ?'
    ).bind(startDate, endDate).all();

    const { results: expenses } = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE date >= ? AND date <= ?'
    ).bind(startDate, endDate).all();

    const { results: students } = await c.env.DB.prepare(
      "SELECT * FROM students WHERE status = 'Active'"
    ).all();

    const { results: totalStudentsResult } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM students'
    ).all();

    // Calculate pending fees
    const pendingFees = reportData.expectedFees - reportData.collectedFees;

    // Group payments by type
    const paymentsByType: Record<string, number> = {};
    payments.forEach((p: any) => {
      paymentsByType[p.fee_type] = (paymentsByType[p.fee_type] || 0) + p.amount;
    });

    // Group expenses by category and get top 5
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach((e: any) => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });
    const topExpenseCategories = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    // Send to admin phones if requested
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
      month,
      report: {
        totalIncome: reportData.totalIncome,
        totalExpenses: reportData.totalExpenses,
        netAmount: reportData.netAmount,
        paymentCount: reportData.paymentCount,
        expenseCount: reportData.expenseCount,
        feeCollection: {
          expected: reportData.expectedFees,
          collected: reportData.collectedFees,
          pending: pendingFees,
          collectionRate: reportData.feeCollectionRate,
        },
        studentStats: {
          total: (totalStudentsResult[0] as any)?.count || 0,
          active: students.length,
          newThisMonth: reportData.newStudents,
        },
        paymentsByType,
        topExpenseCategories,
      },
      message,
      sent,
      sendResult,
    };
  }
}
