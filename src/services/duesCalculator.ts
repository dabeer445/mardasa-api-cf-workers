import type { Student, Payment } from '../db/schema';

// Types using Pick from existing Drizzle types
type StudentForDues = Pick<Student, 'id' | 'admissionDate' | 'monthlyFee' | 'discount'>;
type PaymentForDues = Pick<Payment, 'feeType' | 'month' | 'date' | 'amount'>;

interface ConfigForDues {
  monthlyDueDate: number;
  annualFeeMonth: string;
  annualFee: number;
}

export interface StudentDues {
  studentId: string;
  unpaidMonths: string[];
  monthlyDuesAmount: number;
  annualFeeDue: boolean;
  totalDuesAmount: number;
  isCurrentlyOverdue: boolean;
}

/**
 * Get all YYYY-MM months from startDate to endDate (inclusive)
 * If admitted after the 15th of the month, skip that month (fee not due)
 */
export function getMonthsInRange(startDate: string, endDate: string): string[] {
  const months: string[] = [];

  // Parse start date components
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth] = endDate.slice(0, 7).split('-').map(Number);

  let year = startYear;
  let month = startMonth;

  // If admitted after the 15th, skip admission month - start from next month
  if (startDay > 15) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

/**
 * Check if annual fee is due for a given year
 * Annual fee is due if:
 * 1. Current month >= annualFeeMonth (e.g., May = "05")
 * 2. No payment with feeType="Annual" exists where date's year matches
 */
export function isAnnualFeeDue(
  payments: PaymentForDues[],
  year: number,
  annualFeeMonth: string,
  asOfDate: string
): boolean {
  const asOfMonth = asOfDate.slice(5, 7);

  // Not yet time for annual fee this year
  if (asOfMonth < annualFeeMonth) {
    return false;
  }

  // Check if annual payment exists for this year
  const hasAnnualPayment = payments.some(p => {
    if (p.feeType !== 'Annual') return false;
    const paymentYear = parseInt(p.date.slice(0, 4), 10);
    return paymentYear === year;
  });

  return !hasAnnualPayment;
}

/**
 * Calculate dues for a single student
 */
export function calculateStudentDues(
  student: StudentForDues,
  studentPayments: PaymentForDues[],
  config: ConfigForDues,
  asOfDate: string
): StudentDues {
  const { monthlyDueDate, annualFeeMonth, annualFee } = config;
  const netMonthlyFee = (student.monthlyFee ?? 0) - (student.discount ?? 0);

  // Get all months from admission to asOfDate
  const expectedMonths = getMonthsInRange(student.admissionDate, asOfDate);

  // Find paid months (Monthly fee type with matching month field)
  const paidMonthlyMonths = new Set(
    studentPayments
      .filter(p => p.feeType === 'Monthly' && p.month)
      .map(p => p.month as string)
  );

  // Find unpaid months
  // Exclude current month if we're before/on the due date (not yet due)
  const currentMonth = asOfDate.slice(0, 7);
  const currentDay = parseInt(asOfDate.slice(8, 10), 10);
  const unpaidMonths = expectedMonths.filter(m => {
    if (paidMonthlyMonths.has(m)) return false;
    // Current month is not due yet if we're on or before the due date
    if (m === currentMonth && currentDay <= monthlyDueDate) return false;
    return true;
  });

  // Check annual fee
  const asOfYear = parseInt(asOfDate.slice(0, 4), 10);
  const annualFeeDue = isAnnualFeeDue(studentPayments, asOfYear, annualFeeMonth, asOfDate);

  // Calculate total dues
  const monthlyDuesAmount = unpaidMonths.length * netMonthlyFee;
  const totalDuesAmount = monthlyDuesAmount + (annualFeeDue ? annualFee : 0);

  // Check if currently overdue (current month unpaid AND past due date)
  const isCurrentlyOverdue = unpaidMonths.includes(currentMonth) && currentDay > monthlyDueDate;

  return {
    studentId: student.id,
    unpaidMonths,
    monthlyDuesAmount,
    annualFeeDue,
    totalDuesAmount,
    isCurrentlyOverdue,
  };
}

/**
 * Calculate dues for multiple students efficiently
 * Groups payments by studentId first for O(1) lookup
 */
export function calculateAllStudentDues(
  students: StudentForDues[],
  allPayments: (PaymentForDues & { studentId: string })[],
  config: ConfigForDues,
  asOfDate: string
): StudentDues[] {
  // Group payments by student ID
  const paymentsByStudent = new Map<string, PaymentForDues[]>();
  for (const payment of allPayments) {
    const existing = paymentsByStudent.get(payment.studentId) ?? [];
    existing.push(payment);
    paymentsByStudent.set(payment.studentId, existing);
  }

  // Calculate dues for each student
  return students.map(student => {
    const studentPayments = paymentsByStudent.get(student.id) ?? [];
    return calculateStudentDues(student, studentPayments, config, asOfDate);
  });
}

/**
 * Filter to get only students with outstanding dues
 */
export function getDefaulters(allDues: StudentDues[]): StudentDues[] {
  return allDues.filter(d => d.unpaidMonths.length > 0 || d.annualFeeDue);
}

/**
 * Aggregate summary stats from dues list
 */
export function aggregateDuesSummary(dues: StudentDues[]): {
  totalDefaulters: number;
  totalOutstandingAmount: number;
  overdueCount: number;
  annualDueCount: number;
} {
  return {
    totalDefaulters: dues.length,
    totalOutstandingAmount: dues.reduce((sum, d) => sum + d.totalDuesAmount, 0),
    overdueCount: dues.filter(d => d.isCurrentlyOverdue).length,
    annualDueCount: dues.filter(d => d.annualFeeDue).length,
  };
}
