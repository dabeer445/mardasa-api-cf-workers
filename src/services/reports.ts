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

export async function generateDailyReport(db: D1Database, date: string): Promise<DailyReportData> {
  const { results: payments } = await db.prepare(
    'SELECT * FROM payments WHERE date = ?'
  ).bind(date).all();

  const { results: expenses } = await db.prepare(
    'SELECT * FROM expenses WHERE date = ?'
  ).bind(date).all();

  const totalIncome = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const paymentsByType: Record<string, number> = {};
  payments.forEach((p: any) => {
    paymentsByType[p.fee_type] = (paymentsByType[p.fee_type] || 0) + p.amount;
  });

  const expensesByCategory: Record<string, number> = {};
  expenses.forEach((e: any) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
  });

  return {
    date,
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    paymentCount: payments.length,
    expenseCount: expenses.length,
    paymentsByType,
    expensesByCategory,
  };
}

export async function generateWeeklyReport(db: D1Database, endDate: string): Promise<WeeklyReportData> {
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startDate = start.toISOString().split('T')[0];

  const { results: payments } = await db.prepare(
    'SELECT * FROM payments WHERE date >= ? AND date <= ?'
  ).bind(startDate, endDate).all();

  const { results: expenses } = await db.prepare(
    'SELECT * FROM expenses WHERE date >= ? AND date <= ?'
  ).bind(startDate, endDate).all();

  const { results: newStudents } = await db.prepare(
    'SELECT COUNT(*) as count FROM students WHERE admission_date >= ? AND admission_date <= ?'
  ).bind(startDate, endDate).all();

  const totalIncome = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const dailyBreakdown: { date: string; income: number; expenses: number }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayIncome = payments
      .filter((p: any) => p.date === dateStr)
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const dayExpenses = expenses
      .filter((e: any) => e.date === dateStr)
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    dailyBreakdown.push({ date: dateStr, income: dayIncome, expenses: dayExpenses });
  }

  return {
    startDate,
    endDate,
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    paymentCount: payments.length,
    expenseCount: expenses.length,
    newStudents: (newStudents[0] as any)?.count || 0,
    dailyBreakdown,
  };
}

export async function generateMonthlyReport(db: D1Database, month: string): Promise<MonthlyReportData> {
  const [year, monthNum] = month.split('-');
  const startDate = `${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

  const { results: payments } = await db.prepare(
    'SELECT * FROM payments WHERE date >= ? AND date <= ?'
  ).bind(startDate, endDate).all();

  const { results: expenses } = await db.prepare(
    'SELECT * FROM expenses WHERE date >= ? AND date <= ?'
  ).bind(startDate, endDate).all();

  const { results: newStudents } = await db.prepare(
    'SELECT COUNT(*) as count FROM students WHERE admission_date >= ? AND admission_date <= ?'
  ).bind(startDate, endDate).all();

  const { results: activeStudents } = await db.prepare(
    "SELECT id, monthly_fee FROM students WHERE status = 'Active'"
  ).all();

  const totalIncome = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const expectedFees = activeStudents.reduce((sum: number, s: any) => sum + (s.monthly_fee || 0), 0);
  const monthlyPayments = payments.filter((p: any) => p.fee_type === 'Monthly' && p.month === month);
  const collectedFees = monthlyPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const feeCollectionRate = expectedFees > 0 ? Math.round((collectedFees / expectedFees) * 100) : 0;

  return {
    month,
    startDate,
    endDate,
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    paymentCount: payments.length,
    expenseCount: expenses.length,
    newStudents: (newStudents[0] as any)?.count || 0,
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
