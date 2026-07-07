-- Incremental schema for RBAC + HR + Finance + Operation modules.
-- No Google services. Intended for the project's own SQL database.

CREATE TABLE IF NOT EXISTS admin_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','HR_ADMIN','FINANCE_ADMIN')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_no TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_operation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL,
  actor_id INTEGER,
  actor_username TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  ip_address TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attendance_rule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER,
  rule_name TEXT NOT NULL,
  work_start TEXT NOT NULL,
  work_end TEXT NOT NULL,
  late_grace_minutes INTEGER NOT NULL DEFAULT 0,
  early_leave_grace_minutes INTEGER NOT NULL DEFAULT 0,
  gps_required INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clock_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  clock_type TEXT NOT NULL CHECK(clock_type IN ('CLOCK_IN','CLOCK_OUT','FIELD')),
  clock_time TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  device_id TEXT,
  reason TEXT,
  status TEXT NOT NULL CHECK(status IN ('NORMAL','LATE','EARLY_LEAVE','FIELD_PENDING','REJECTED')),
  audit_status TEXT NOT NULL DEFAULT 'APPROVED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_request (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  reviewer_id INTEGER,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS overtime_request (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  reviewer_id INTEGER,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS punch_correction_request (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  target_date TEXT NOT NULL,
  clock_type TEXT NOT NULL,
  requested_time TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  reviewer_id INTEGER,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS month_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,
  work_days INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  early_leave_count INTEGER NOT NULL DEFAULT 0,
  absence_count INTEGER NOT NULL DEFAULT 0,
  overtime_hours REAL NOT NULL DEFAULT 0,
  leave_hours REAL NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, year_month)
);

CREATE TABLE IF NOT EXISTS finance_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE')),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS finance_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE')),
  category_id INTEGER,
  store TEXT,
  amount REAL NOT NULL,
  payment_method TEXT,
  voucher_url TEXT,
  note TEXT,
  source_module TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,
  base_salary REAL NOT NULL DEFAULT 0,
  overtime_pay REAL NOT NULL DEFAULT 0,
  deduction REAL NOT NULL DEFAULT 0,
  net_salary REAL NOT NULL DEFAULT 0,
  attendance_snapshot_json TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, year_month)
);

CREATE TABLE IF NOT EXISTS finance_approval (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  reviewer_id INTEGER,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS material_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  safe_stock REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS purchase_inbound (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inbound_no TEXT NOT NULL UNIQUE,
  supplier TEXT,
  item_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_transfer_out (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transfer_no TEXT NOT NULL UNIQUE,
  item_id INTEGER NOT NULL,
  from_location TEXT NOT NULL DEFAULT 'HQ',
  to_store TEXT NOT NULL,
  quantity REAL NOT NULL,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_count_sheet (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  count_no TEXT NOT NULL UNIQUE,
  store TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  book_qty REAL NOT NULL,
  actual_qty REAL NOT NULL,
  diff_qty REAL NOT NULL,
  note TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_alert_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  store TEXT NOT NULL,
  safe_qty REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(item_id, store)
);

-- BCrypt hashes below are placeholders. Replace with generated hashes before production use.
INSERT OR IGNORE INTO admin_user(username,password_hash,role) VALUES
('admin_master','$2b$10$REPLACE_WITH_MASTER_HASH','SUPER_ADMIN'),
('hr_manager','$2b$10$REPLACE_WITH_HR_HASH','HR_ADMIN'),
('finance_manager','$2b$10$REPLACE_WITH_FINANCE_HASH','FINANCE_ADMIN');
