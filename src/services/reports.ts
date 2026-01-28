import { eq, and, gte, lte, count } from 'drizzle-orm';
import { type Database, payments, expenses, students } from '../db';

export interface DailyReportData {
  date: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  paymentCount: number;
  expenseCount: number;
  paymentsByType: Record<string, number>;
  expensesByCategory: Record<string, number>;
}

export interface WeeklyReportData {
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  paymentCount: number;
  expenseCount: number;
  newStudents: number;
  dailyBreakdown: { date: string; income: number; expenses: number }[];
}

export interface MonthlyReportData {
  month: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  paymentCount: number;
  expenseCount: number;
  newStudents: number;
  expectedFees: number;
  collectedFees: number;
  feeCollectionRate: number;
}

export async function generateDailyReport(db: Database, date: string): Promise<DailyReportData> {
  const paymentResults = await db.select().from(payments).where(eq(payments.date, date));
  const expenseResults = await db.select().from(expenses).where(eq(expenses.date, date));

  const totalIncome = paymentResults.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpensesAmount = expenseResults.reduce((sum, e) => sum + (e.amount || 0), 0);

  const paymentsByType: Record<string, number> = {};
  paymentResults.forEach((p) => {
    if (p.feeType) {
      paymentsByType[p.feeType] = (paymentsByType[p.feeType] || 0) + (p.amount || 0);
    }
  });

  const expensesByCategory: Record<string, number> = {};
  expenseResults.forEach((e) => {
    if (e.category) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (e.amount || 0);
    }
  });

  return {
    date,
    totalIncome,
    totalExpenses: totalExpensesAmount,
    netAmount: totalIncome - totalExpensesAmount,
    paymentCount: paymentResults.length,
    expenseCount: expenseResults.length,
    paymentsByType,
    expensesByCategory,
  };
}

export async function generateWeeklyReport(db: Database, endDate: string): Promise<WeeklyReportData> {
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startDate = start.toISOString().split('T')[0];

  const paymentResults = await db.select().from(payments).where(
    and(gte(payments.date, startDate), lte(payments.date, endDate))
  );

  const expenseResults = await db.select().from(expenses).where(
    and(gte(expenses.date, startDate), lte(expenses.date, endDate))
  );

  const newStudentsResult = await db.select({ count: count() }).from(students).where(
    and(gte(students.admissionDate, startDate), lte(students.admissionDate, endDate))
  );

  const totalIncome = paymentResults.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpensesAmount = expenseResults.reduce((sum, e) => sum + (e.amount || 0), 0);

  const dailyBreakdown: { date: string; income: number; expenses: number }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayIncome = paymentResults
      .filter((p) => p.date === dateStr)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const dayExpenses = expenseResults
      .filter((e) => e.date === dateStr)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    dailyBreakdown.push({ date: dateStr, income: dayIncome, expenses: dayExpenses });
  }

  return {
    startDate,
    endDate,
    totalIncome,
    totalExpenses: totalExpensesAmount,
    netAmount: totalIncome - totalExpensesAmount,
    paymentCount: paymentResults.length,
    expenseCount: expenseResults.length,
    newStudents: newStudentsResult[0]?.count || 0,
    dailyBreakdown,
  };
}

export async function generateMonthlyReport(db: Database, month: string): Promise<MonthlyReportData> {
  const [year, monthNum] = month.split('-');
  const startDate = `${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

  const paymentResults = await db.select().from(payments).where(
    and(gte(payments.date, startDate), lte(payments.date, endDate))
  );

  const expenseResults = await db.select().from(expenses).where(
    and(gte(expenses.date, startDate), lte(expenses.date, endDate))
  );

  const newStudentsResult = await db.select({ count: count() }).from(students).where(
    and(gte(students.admissionDate, startDate), lte(students.admissionDate, endDate))
  );

  const activeStudentsList = await db.select({
    id: students.id,
    monthlyFee: students.monthlyFee,
  }).from(students).where(eq(students.status, 'Active'));

  const totalIncome = paymentResults.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpensesAmount = expenseResults.reduce((sum, e) => sum + (e.amount || 0), 0);

  const expectedFees = activeStudentsList.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
  const monthlyPayments = paymentResults.filter((p) => p.feeType === 'Monthly' && p.month === month);
  const collectedFees = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const feeCollectionRate = expectedFees > 0 ? Math.round((collectedFees / expectedFees) * 100) : 0;

  return {
    month,
    startDate,
    endDate,
    totalIncome,
    totalExpenses: totalExpensesAmount,
    netAmount: totalIncome - totalExpensesAmount,
    paymentCount: paymentResults.length,
    expenseCount: expenseResults.length,
    newStudents: newStudentsResult[0]?.count || 0,
    expectedFees,
    collectedFees,
    feeCollectionRate,
  };
}

export function formatDailyReport(data: DailyReportData): string {
  const lines: string[] = [
    `📊 *Daily Report - ${data.date}*`,
    '',
    `💰 *Income:* Rs. ${data.totalIncome.toLocaleString()}`,
    `💸 *Expenses:* Rs. ${data.totalExpenses.toLocaleString()}`,
    `📈 *Net:* Rs. ${data.netAmount.toLocaleString()}`,
    '',
  ];

  if (data.paymentCount > 0) {
    lines.push(`*Payments (${data.paymentCount}):*`);
    for (const [type, amount] of Object.entries(data.paymentsByType)) {
      lines.push(`  • ${type}: Rs. ${amount.toLocaleString()}`);
    }
    lines.push('');
  }

  if (data.expenseCount > 0) {
    lines.push(`*Expenses (${data.expenseCount}):*`);
    for (const [category, amount] of Object.entries(data.expensesByCategory)) {
      lines.push(`  • ${category}: Rs. ${amount.toLocaleString()}`);
    }
  }

  if (data.paymentCount === 0 && data.expenseCount === 0) {
    lines.push('_No transactions recorded_');
  }

  return lines.join('\n');
}

export function formatWeeklyReport(data: WeeklyReportData): string {
  const lines: string[] = [
    `📊 *Weekly Report*`,
    `📅 ${data.startDate} to ${data.endDate}`,
    '',
    `💰 *Total Income:* Rs. ${data.totalIncome.toLocaleString()}`,
    `💸 *Total Expenses:* Rs. ${data.totalExpenses.toLocaleString()}`,
    `📈 *Net Amount:* Rs. ${data.netAmount.toLocaleString()}`,
    '',
    `📝 *Transactions:* ${data.paymentCount} payments, ${data.expenseCount} expenses`,
    `👨‍🎓 *New Students:* ${data.newStudents}`,
    '',
    '*Daily Breakdown:*',
  ];

  for (const day of data.dailyBreakdown) {
    const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
    lines.push(`  ${dayName}: +${day.income.toLocaleString()} / -${day.expenses.toLocaleString()}`);
  }

  return lines.join('\n');
}

export function formatMonthlyReport(data: MonthlyReportData): string {
  const monthName = new Date(data.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const lines: string[] = [
    `📊 *Monthly Report - ${monthName}*`,
    '',
    `💰 *Total Income:* Rs. ${data.totalIncome.toLocaleString()}`,
    `💸 *Total Expenses:* Rs. ${data.totalExpenses.toLocaleString()}`,
    `📈 *Net Amount:* Rs. ${data.netAmount.toLocaleString()}`,
    '',
    `📝 *Transactions:* ${data.paymentCount} payments, ${data.expenseCount} expenses`,
    `👨‍🎓 *New Students:* ${data.newStudents}`,
    '',
    '*Fee Collection:*',
    `  Expected: Rs. ${data.expectedFees.toLocaleString()}`,
    `  Collected: Rs. ${data.collectedFees.toLocaleString()}`,
    `  Rate: ${data.feeCollectionRate}%`,
  ];

  return lines.join('\n');
}
