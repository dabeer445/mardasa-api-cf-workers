import { Str, Num } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type Env = {
  DB: D1Database;
  WHATSAPP_API_URL?: string;
  WHATSAPP_API_KEY?: string;
  WHATSAPP_SESSION?: string;
};

export type AppContext = Context<{ Bindings: Env }>;

// Zod Schemas for OpenAPI
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
  classId: Str(),
  admissionDate: Str({ example: "2024-01-15" }),
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

// Helper to generate IDs
export const generateId = (prefix: string = ''): string => {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Mappers for DB rows to API responses
export function mapStudent(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    grNumber: row.gr_number,
    name: row.name,
    parentName: row.parent_name,
    phone: row.phone,
    classId: row.class_id,
    admissionDate: row.admission_date,
    monthlyFee: row.monthly_fee,
    status: row.status,
    discount: row.discount,
  };
}

export function mapClass(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    teacherId: row.teacher_id,
  };
}

export function mapTeacher(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
  };
}

export function mapPayment(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    feeType: row.fee_type,
    amount: row.amount,
    date: row.date,
    month: row.month ?? undefined,
    receivedBy: row.received_by,
    timestamp: row.timestamp,
  };
}

export function mapExpense(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    category: row.category,
    amount: row.amount,
    date: row.date,
    notes: row.notes ?? undefined,
    timestamp: row.timestamp,
  };
}

export function mapConfig(row: any) {
  if (!row) {
    return {
      name: 'Madrassa Darul Uloom',
      address: '',
      phone: '',
      adminName: 'Admin',
      adminPhones: [],
      monthlyDueDate: 10,
      annualFeeMonth: '05',
      annualFee: 0,
    };
  }
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    adminName: row.admin_name,
    adminPhones: row.admin_phones ? JSON.parse(row.admin_phones) : [],
    monthlyDueDate: row.monthly_due_date,
    annualFeeMonth: row.annual_fee_month,
    annualFee: row.annual_fee,
  };
}
