-- Multi-tenancy migration
-- Adds schools table (absorbs config), users table, and school_id to all data tables

-- ── New tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY,       -- autoincrement; first school gets id=1
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
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id),   -- NULL for super_admin
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'super_admin')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- ── Migrate existing config into schools (gets id=1 automatically) ───────────

INSERT OR IGNORE INTO schools (
  slug, name, address, phone, admin_phones,
  monthly_due_date, annual_fee_month, annual_fee, subscription_status
)
SELECT
  'default',
  name,
  COALESCE(address, ''),
  COALESCE(phone, ''),
  COALESCE(admin_phones, '[]'),
  COALESCE(monthly_due_date, 10),
  COALESCE(annual_fee_month, '05'),
  COALESCE(annual_fee, 0),
  'active'
FROM config
LIMIT 1;

-- ── Add school_id to all data tables ─────────────────────────────────────────
-- Existing rows get DEFAULT 1 (the migrated school).

ALTER TABLE teachers ADD COLUMN school_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE classes  ADD COLUMN school_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE students ADD COLUMN school_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payments ADD COLUMN school_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE expenses ADD COLUMN school_id INTEGER NOT NULL DEFAULT 1;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_teachers_school  ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school   ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school  ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_school  ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_school  ON expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_users_school     ON users(school_id);

-- Composite index for per-school gr_number queries
-- Note: the original global UNIQUE on gr_number remains; removing it requires
-- table recreation which is deferred to a separate cleanup migration.
CREATE INDEX IF NOT EXISTS idx_students_gr_school ON students(school_id, gr_number);
