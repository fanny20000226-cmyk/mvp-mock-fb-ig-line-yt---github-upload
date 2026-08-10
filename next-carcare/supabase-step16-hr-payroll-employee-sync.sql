-- Step 16 HR payroll employee sync hardening.
-- Run this in Supabase SQL Editor. It only adds columns/tables/policies and does not delete existing business data.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table if exists public.employees
  add column if not exists employee_no text,
  add column if not exists password_hash text,
  add column if not exists real_name text,
  add column if not exists phone text,
  add column if not exists position text,
  add column if not exists hire_date date,
  add column if not exists status text not null default '在職',
  add column if not exists base_salary numeric(12,2) not null default 0,
  add column if not exists allowance numeric(12,2) not null default 0,
  add column if not exists shop_id uuid references public.shops(id),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists employees_employee_no_unique
on public.employees(employee_no)
where employee_no is not null;

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create table if not exists public.attendance_log (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null,
  log_date date not null,
  type text not null check (type in ('遲到','加班','請假','出勤')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_attendance_log_updated_at on public.attendance_log;
create trigger set_attendance_log_updated_at
before update on public.attendance_log
for each row execute function public.set_updated_at();

alter table public.salary_records
  add column if not exists bonus numeric(12,2) not null default 0,
  add column if not exists deduction numeric(12,2) not null default 0,
  add column if not exists overtime_hour numeric(8,2) not null default 0,
  add column if not exists late_count integer not null default 0,
  add column if not exists deduction_detail text,
  add column if not exists net_pay numeric(12,2) not null default 0,
  add column if not exists is_pdf_generated boolean not null default false;

create index if not exists idx_attendance_log_employee_date on public.attendance_log(employee_no, log_date desc);
create index if not exists idx_salary_records_employee_month_v2 on public.salary_records(employee_no, salary_month desc);

alter table public.employees enable row level security;
alter table public.attendance_log enable row level security;
alter table public.salary_records enable row level security;
alter table public.staff_info enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.staff_info_modify_request enable row level security;

drop policy if exists "salary records scoped read" on public.salary_records;
create policy "salary records scoped read"
on public.salary_records
for select
using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr'))
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('shop_manager','vice_manager') and u.shop_id = salary_records.shop_id)
);

drop policy if exists "attendance scoped read" on public.staff_attendance;
create policy "attendance scoped read"
on public.staff_attendance
for select
using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr'))
  or exists (
    select 1
    from public.users u
    join public.staff_info s on s.employee_no = staff_attendance.employee_no
    where u.id = auth.uid()
      and u.role in ('shop_manager','vice_manager')
      and u.shop_id = s.shop_id
  )
);

drop policy if exists "attendance log scoped read" on public.attendance_log;
create policy "attendance log scoped read"
on public.attendance_log
for select
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')));

drop policy if exists "attendance log admin hr write" on public.attendance_log;
create policy "attendance log admin hr write"
on public.attendance_log
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')));

-- Supabase Database Webhooks setup in Dashboard:
-- 1. Create webhook for public.staff_info INSERT/UPDATE to the N8N Webhook URL.
-- 2. Create webhook for public.salary_records INSERT/UPDATE to the same N8N Webhook URL.
-- 3. Create webhook for public.staff_attendance INSERT/UPDATE, or public.attendance_log INSERT/UPDATE if you use the compatibility table.
-- Payload should include the full row. N8N must upsert by employee_no for staff_info, id for attendance, and id/salary_month+employee_no for salary records.
