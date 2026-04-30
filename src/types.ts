import { Str, Num } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

// Re-export Drizzle types for convenience
export type {
  School as SchoolRow,
  NewSchool,
  User as UserRow,
  NewUser,
  Teacher as TeacherRow,
  NewTeacher,
  Class as ClassRow,
  NewClass,
  Student as StudentRow,
  NewStudent,
  Payment as PaymentRow,
  NewPayment,
  Expense as ExpenseRow,
  NewExpense,
  Config as ConfigRow,
  NewConfig,
} from './db/schema';

export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  JWT_SECRET: string;
  WHATSAPP_API_URL?: string;
  WHATSAPP_API_KEY?: string;
  WHATSAPP_SESSION?: string;
};

export type Variables = {
  schoolId?: number;
  userId: string;
};

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

// Zod Schemas for OpenAPI (required by chanfana)
export const Teacher = z.object({
  id: Str(),
  name: Str({ example: "Ahmad Khan" }),
  phone: Str({ required: false }),
});

export const ClassRoom = z.object({
  id: Str(),
  name: Str({ example: "Hifz Class A" }),
  teacherId: Str(),
});

export const Student = z.object({
  id: Str(),
  grNumber: Str({ example: "GR-001" }),
  name: Str({ example: "Muhammad Ali" }),
  parentName: Str({ example: "Ahmed Ali" }),
  phone: Str({ example: "03001234567" }),
  phone2: Str({ required: false, example: "03009876543" }),
  address: Str({ required: false, example: "123 Main Street, Karachi" }),
  gender: z.enum(["Male", "Female"]).optional(),
  dateOfBirth: Str({ required: false, example: "2010-05-15" }),
  parentCnic: Str({ required: false, example: "42101-1234567-8" }),
  classId: Str(),
  admissionDate: Str({ example: "2024-01-15" }),
  removalDate: Str({ required: false, example: "2025-06-30" }),
  monthlyFee: Num({ example: 2000 }),
  status: z.enum(["Active", "Archived"]).default("Active"),
  discount: Num({ default: 0 }),
});

export const Payment = z.object({
  id: Str(),
  studentId: Str(),
  feeType: z.enum(["Monthly", "Admission", "Annual", "Summer", "Other"]),
  amount: Num({ example: 2000 }),
  date: Str({ example: "2024-05-15" }),
  month: Str({ required: false, example: "2024-05" }),
  receivedBy: Str({ example: "Admin" }),
  timestamp: Num(),
});

export const Expense = z.object({
  id: Str(),
  category: Str({ example: "Utilities" }),
  amount: Num({ example: 5000 }),
  date: Str({ example: "2024-05-15" }),
  notes: Str({ required: false }),
  timestamp: Num(),
});

export const MadrassaConfig = z.object({
  name: Str({ example: "Madrassa Darul Uloom" }),
  address: Str({ required: false }),
  phone: Str({ required: false }),
  adminName: Str({ example: "Admin" }),
  adminPhones: z.array(z.string()).default([]),
  monthlyDueDate: Num({ default: 10 }),
  annualFeeMonth: Str({ default: "05" }),
  annualFee: Num({ default: 0 }),
});

export const School = z.object({
  id: Num(),
  slug: Str({ example: "darul-uloom" }),
  name: Str({ example: "Madrassa Darul Uloom" }),
  logoUrl: Str({ required: false }),
  address: Str({ required: false }),
  phone: Str({ required: false }),
  adminPhones: z.array(z.string()).default([]),
  whatsappSessionId: Str({ required: false }),
  whatsappToken: Str({ required: false }),
  monthlyDueDate: Num({ default: 10 }),
  annualFeeMonth: Str({ default: "05" }),
  annualFee: Num({ default: 0 }),
  subscriptionStatus: z.enum(["trial", "active", "expired", "suspended"]).default("trial"),
  subscriptionExpiresAt: Num({ required: false }),
});

// Helper to generate IDs
export const generateId = (prefix: string = ''): string => {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Config mapper - handles JSON parsing for adminPhones
export function mapConfig(row: any) {
  if (!row) {
    return {
      name: 'Madrassa Darul Uloom',
      address: '',
      phone: '',
      adminName: 'Admin',
      adminPhones: [] as string[],
      monthlyDueDate: 10,
      annualFeeMonth: '05',
      annualFee: 0,
    };
  }
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    adminName: row.adminName ?? row.admin_name,
    adminPhones: typeof row.adminPhones === 'string'
      ? JSON.parse(row.adminPhones)
      : (row.admin_phones ? JSON.parse(row.admin_phones) : []),
    monthlyDueDate: row.monthlyDueDate ?? row.monthly_due_date,
    annualFeeMonth: row.annualFeeMonth ?? row.annual_fee_month,
    annualFee: row.annualFee ?? row.annual_fee,
  };
}

export function mapSchool(row: any) {
  if (!row) {
    return {
      id: '',
      slug: '',
      name: 'Madrassa',
      logoUrl: null as string | null,
      address: '',
      phone: '',
      adminPhones: [] as string[],
      whatsappSessionId: null as string | null,
      whatsappToken: null as string | null,
      monthlyDueDate: 10,
      annualFeeMonth: '05',
      annualFee: 0,
      subscriptionStatus: 'trial' as const,
      subscriptionExpiresAt: null as number | null,
    };
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logoUrl ?? row.logo_url ?? null,
    address: row.address ?? '',
    phone: row.phone ?? '',
    adminPhones: typeof row.adminPhones === 'string'
      ? JSON.parse(row.adminPhones)
      : (row.admin_phones ? JSON.parse(row.admin_phones) : []),
    whatsappSessionId: row.whatsappSessionId ?? row.whatsapp_session_id ?? null,
    whatsappToken: row.whatsappToken ?? row.whatsapp_token ?? null,
    monthlyDueDate: row.monthlyDueDate ?? row.monthly_due_date ?? 10,
    annualFeeMonth: row.annualFeeMonth ?? row.annual_fee_month ?? '05',
    annualFee: row.annualFee ?? row.annual_fee ?? 0,
    subscriptionStatus: row.subscriptionStatus ?? row.subscription_status ?? 'trial',
    subscriptionExpiresAt: row.subscriptionExpiresAt ?? row.subscription_expires_at ?? null,
  };
}

// Dues calculation starts from this date (ignore older records)
export const DUES_START_DATE = '2023-02-01';

// Default config values
export const DEFAULT_CONFIG = {
  name: 'Madrassa Darul Uloom',
  address: '',
  phone: '',
  adminName: 'Admin',
  adminPhones: [] as string[],
  monthlyDueDate: 10,
  annualFeeMonth: '05',
  annualFee: 0,
};

// ========== Response Schemas for Aggregation Endpoints ==========

// Student dues (used in defaulters report)
export const StudentDues = z.object({
  studentId: Str(),
  unpaidMonths: z.array(z.string()),
  monthlyDuesAmount: Num(),
  annualFeeDue: z.boolean(),
  totalDuesAmount: Num(),
  isCurrentlyOverdue: z.boolean(),
});

// Defaulters summary
export const DefaultersSummary = z.object({
  totalDefaulters: Num(),
  totalOutstandingAmount: Num(),
  currentMonthDues: Num(),
  overdueCount: Num(),
  annualDueCount: Num(),
});

// Dashboard stats
export const DashboardStats = z.object({
  activeStudentsCount: Num(),
  totalStudentsCount: Num(),
  todayCollection: Num(),
  todayTransactionCount: Num(),
  totalOutstandingDues: Num(),
  newAdmissionsThisMonth: Num(),
  defaultersCount: Num(),
  calculatedAt: Str(),
});

// Financial summary
export const FinancialIncome = z.object({
  total: Num(),
  byFeeType: z.record(z.number()),
  transactionCount: Num(),
});

export const FinancialExpenses = z.object({
  total: Num(),
  byCategory: z.record(z.number()),
  transactionCount: Num(),
});

export const FinancialSummary = z.object({
  income: FinancialIncome,
  expenses: FinancialExpenses,
  netBalance: Num(),
});

// Dues by class
export const ClassDues = z.object({
  classId: Str(),
  defaultersCount: Num(),
  totalDuesAmount: Num(),
});

// Pending fees
export const PendingFeesSummary = z.object({
  pendingCount: Num(),
  paidCount: Num(),
  progressPercentage: Num(),
});

// Student payment status
export const PaidMonthInfo = z.object({
  paymentId: Str(),
  amount: Num(),
  date: Str(),
});

export const AnnualFeeStatus = z.object({
  paid: z.boolean(),
  paymentId: Str({ required: false }),
  amount: Num({ required: false }),
  date: Str({ required: false }),
});

export const StudentPaymentStatus = z.object({
  year: Num(),
  paidMonths: z.record(PaidMonthInfo),
  unpaidMonths: z.array(z.string()),
  annualFee: AnnualFeeStatus,
  totalPaid: Num(),
  totalDue: Num(),
});
