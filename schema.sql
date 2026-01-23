-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  gr_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  class_id TEXT NOT NULL,
  admission_date TEXT NOT NULL,
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
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Config table (single row)
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Madrassa Darul Uloom',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  admin_name TEXT DEFAULT 'Admin',
  admin_phones TEXT DEFAULT '[]',
  monthly_due_date INTEGER DEFAULT 10 CHECK (monthly_due_date BETWEEN 1 AND 28),
  annual_fee_month TEXT DEFAULT '05' CHECK (annual_fee_month IN ('01','02','03','04','05','06','07','08','09','10','11','12')),
  annual_fee REAL DEFAULT 0,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Insert default config
INSERT OR IGNORE INTO config (id) VALUES (1);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
