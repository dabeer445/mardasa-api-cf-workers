import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const schools = sqliteTable('schools', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  address: text('address').default(''),
  phone: text('phone').default(''),
  adminPhones: text('admin_phones').default('[]'),
  whatsappSessionId: text('whatsapp_session_id'),
  whatsappToken: text('whatsapp_token'),
  monthlyDueDate: integer('monthly_due_date').default(10),
  annualFeeMonth: text('annual_fee_month', {
    enum: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
  }).default('05'),
  annualFee: real('annual_fee').default(0),
  subscriptionStatus: text('subscription_status', {
    enum: ['trial', 'active', 'expired', 'suspended'],
  }).notNull().default('trial'),
  subscriptionExpiresAt: integer('subscription_expires_at'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  schoolId: integer('school_id').references(() => schools.id),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'super_admin'] }).notNull().default('admin'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

export const teachers = sqliteTable('teachers', {
  id: text('id').primaryKey(),
  schoolId: integer('school_id').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_teachers_school').on(table.schoolId),
]);

export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  schoolId: integer('school_id').notNull(),
  name: text('name').notNull(),
  teacherId: text('teacher_id').notNull().references(() => teachers.id),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_classes_school').on(table.schoolId),
  index('idx_classes_teacher_id').on(table.teacherId),
]);

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  schoolId: integer('school_id').notNull(),
  grNumber: text('gr_number').notNull(),
  name: text('name').notNull(),
  parentName: text('parent_name').notNull(),
  phone: text('phone').notNull(),
  phone2: text('phone2'),
  address: text('address'),
  gender: text('gender', { enum: ['Male', 'Female'] }),
  dateOfBirth: text('date_of_birth'),
  parentCnic: text('parent_cnic'),
  classId: text('class_id').notNull().references(() => classes.id),
  admissionDate: text('admission_date').notNull(),
  removalDate: text('removal_date'),
  monthlyFee: real('monthly_fee').notNull().default(0),
  status: text('status', { enum: ['Active', 'Archived'] }).notNull().default('Active'),
  discount: real('discount').notNull().default(0),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_students_school').on(table.schoolId),
  index('idx_students_class_id').on(table.classId),
  index('idx_students_status').on(table.status),
  uniqueIndex('idx_students_gr_school').on(table.schoolId, table.grNumber),
]);

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  schoolId: integer('school_id').notNull(),
  studentId: text('student_id').notNull().references(() => students.id),
  feeType: text('fee_type', {
    enum: ['Monthly', 'Admission', 'Annual', 'Summer', 'Other'],
  }).notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  month: text('month'),
  receivedBy: text('received_by').notNull(),
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_payments_school').on(table.schoolId),
  index('idx_payments_student_id').on(table.studentId),
  index('idx_payments_date').on(table.date),
]);

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  schoolId: integer('school_id').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  notes: text('notes'),
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => [
  index('idx_expenses_school').on(table.schoolId),
  index('idx_expenses_date').on(table.date),
]);

// config table kept for backward compatibility during Task 3 migration
export const config = sqliteTable('config', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().default('Madrassa Darul Uloom'),
  address: text('address').default(''),
  phone: text('phone').default(''),
  adminName: text('admin_name').default('Admin'),
  adminPhones: text('admin_phones').default('[]'),
  monthlyDueDate: integer('monthly_due_date').default(10),
  annualFeeMonth: text('annual_fee_month', {
    enum: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
  }).default('05'),
  annualFee: real('annual_fee').default(0),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

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
