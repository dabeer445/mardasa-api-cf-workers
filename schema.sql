-- Schools table (replaces config; one row per school, autoincrement id)
CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  admin_phones TEXT DEFAULT '[]',
  whatsapp_session_id TEXT,
  whatsapp_token TEXT,
  monthly_due_date INTEGER DEFAULT 10,
  annual_fee_month TEXT DEFAULT '05'
    CHECK (annual_fee_month IN ('01','02','03','04','05','06','07','08','09','10','11','12')),
  annual_fee REAL DEFAULT 0,
  subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'suspended')),
  subscription_expires_at INTEGER,
  deleted_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Users table (school admins + super admins)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'super_admin')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  phone TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  gr_number TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone2 TEXT,
  address TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  date_of_birth TEXT,
  parent_cnic TEXT,
  class_id TEXT NOT NULL,
  admission_date TEXT NOT NULL,
  removal_date TEXT,
  monthly_fee REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  discount REAL NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  student_id TEXT NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('Monthly', 'Admission', 'Annual', 'Summer', 'Other')),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  month TEXT,
  received_by TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teachers_school    ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school     ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_school    ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id  ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status    ON students(status);
CREATE INDEX IF NOT EXISTS idx_payments_school    ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date      ON payments(date);
CREATE INDEX IF NOT EXISTS idx_expenses_school    ON expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_users_school       ON users(school_id);

-- gr_number unique per school (not globally)
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_gr_school ON students(school_id, gr_number);
