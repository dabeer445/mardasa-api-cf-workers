import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Teachers table
export const teachers = sqliteTable('teachers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

// Classes table
export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  teacherId: text('teacher_id').notNull().references(() => teachers.id),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_classes_teacher_id').on(table.teacherId),
]);

// Students table
export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  grNumber: text('gr_number').notNull().unique(),
  name: text('name').notNull(),
  parentName: text('parent_name').notNull(),
  phone: text('phone').notNull(),
  classId: text('class_id').notNull().references(() => classes.id),
  admissionDate: text('admission_date').notNull(),
  monthlyFee: real('monthly_fee').notNull().default(0),
  status: text('status', { enum: ['Active', 'Archived'] }).notNull().default('Active'),
  discount: real('discount').notNull().default(0),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_students_class_id').on(table.classId),
  index('idx_students_status').on(table.status),
]);

// Payments table
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => students.id),
  feeType: text('fee_type', { enum: ['Monthly', 'Admission', 'Annual', 'Summer', 'Other'] }).notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  month: text('month'),
  receivedBy: text('received_by').notNull(),
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_payments_student_id').on(table.studentId),
  index('idx_payments_date').on(table.date),
]);

// Expenses table
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  notes: text('notes'),
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_expenses_date').on(table.date),
]);

// Config table (singleton - always id = 1)
export const config = sqliteTable('config', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().default('Madrassa Darul Uloom'),
  address: text('address').default(''),
  phone: text('phone').default(''),
  adminName: text('admin_name').default('Admin'),
  adminPhones: text('admin_phones').default('[]'), // JSON string array
  monthlyDueDate: integer('monthly_due_date').default(10),
  annualFeeMonth: text('annual_fee_month', { enum: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] }).default('05'),
  annualFee: real('annual_fee').default(0),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

// Type exports for convenience
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
