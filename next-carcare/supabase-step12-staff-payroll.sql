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
  add column if not exists change_request_content jsonb default '{}'::jsonb,
  add column if not exists change_request_status text default 'none',
  add column if not exists position text,
  add column if not exists shop_id uuid references public.shops(id),
  add column if not exists base_salary_default numeric(12,2) default 0;

create table if not exists public.staff_info (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null unique,
  password_hash text not null,
  name text not null,
  shop_id uuid references public.shops(id),
  position text not null default 'technician',
  phone text,
  identity_info text,
  id_number text,
  household_address text,
  mailing_address text,
  email text,
  emergency_contact text,
  emergency_phone text,
  bank_account text,
  bank_branch text,
  avatar_url text,
  hire_date date,
  probation_end_date date,
  labor_insurance_status text,
  labor_health_no text,
  contract_end_date date,
  base_salary_default numeric(12,2) not null default 0,
  position_allowance_default numeric(12,2) not null default 0,
  meal_allowance_default numeric(12,2) not null default 0,
  transport_allowance_default numeric(12,2) not null default 0,
  overtime_rate_default numeric(12,2) not null default 0,
  leave_day_rate_default numeric(12,2) not null default 0,
  resigned boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_info
  add column if not exists id_number text,
  add column if not exists household_address text,
  add column if not exists mailing_address text,
  add column if not exists email text,
  add column if not exists emergency_contact text,
  add column if not exists emergency_phone text,
  add column if not exists bank_account text,
  add column if not exists bank_branch text,
  add column if not exists avatar_url text,
  add column if not exists probation_end_date date,
  add column if not exists labor_insurance_status text,
  add column if not exists labor_health_no text,
  add column if not exists contract_end_date date,
  add column if not exists base_salary_default numeric(12,2) not null default 0,
  add column if not exists position_allowance_default numeric(12,2) not null default 0,
  add column if not exists meal_allowance_default numeric(12,2) not null default 0,
  add column if not exists transport_allowance_default numeric(12,2) not null default 0,
  add column if not exists overtime_rate_default numeric(12,2) not null default 0,
  add column if not exists leave_day_rate_default numeric(12,2) not null default 0,
  add column if not exists created_by uuid,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_staff_info_updated_at on public.staff_info;
create trigger set_staff_info_updated_at
before update on public.staff_info
for each row execute function public.set_updated_at();

create table if not exists public.staff_info_modify_request (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff_info(id) on delete cascade,
  employee_no text,
  field_name text not null,
  new_value text not null,
  request_note text,
  requested_at timestamptz not null default now(),
  review_status text not null default 'pending',
  reviewer_id uuid,
  review_note text,
  reviewed_at timestamptz
);

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null references public.staff_info(employee_no) on delete cascade,
  work_date date not null,
  clock_in_at text,
  clock_out_at text,
  late_minutes numeric(8,2) not null default 0,
  leave_type text,
  leave_hours numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_staff_attendance_updated_at on public.staff_attendance;
create trigger set_staff_attendance_updated_at
before update on public.staff_attendance
for each row execute function public.set_updated_at();

create table if not exists public.salary_records (
  id uuid primary key default gen_random_uuid(),
  salary_month text not null,
  employee_no text not null references public.staff_info(employee_no),
  shop_id uuid references public.shops(id),
  shop_name text,
  position text,
  base_salary numeric(12,2) not null default 0,
  position_allowance numeric(12,2) not null default 0,
  meal_allowance numeric(12,2) not null default 0,
  attendance_bonus numeric(12,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  overtime_rate numeric(12,2) not null default 0,
  overtime_pay numeric(12,2) not null default 0,
  transport_allowance numeric(12,2) not null default 0,
  incentive_bonus numeric(12,2) not null default 0,
  dispatch_allowance numeric(12,2) not null default 0,
  unused_leave_pay numeric(12,2) not null default 0,
  mentor_bonus numeric(12,2) not null default 0,
  performance_bonus numeric(12,2) not null default 0,
  sales_bonus numeric(12,2) not null default 0,
  labor_insurance_fee numeric(12,2) not null default 0,
  health_insurance_fee numeric(12,2) not null default 0,
  pension_self_pay numeric(12,2) not null default 0,
  leave_days numeric(8,2) not null default 0,
  leave_day_rate numeric(12,2) not null default 0,
  sick_leave_deduction numeric(12,2) not null default 0,
  advance_payment numeric(12,2) not null default 0,
  kip_penalty numeric(12,2) not null default 0,
  gross_amount numeric(12,2) not null default 0,
  deduction_amount numeric(12,2) not null default 0,
  net_salary numeric(12,2) not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_salary_records_updated_at on public.salary_records;
create trigger set_salary_records_updated_at
before update on public.salary_records
for each row execute function public.set_updated_at();

create index if not exists idx_staff_info_employee_no on public.staff_info(employee_no);
create index if not exists idx_salary_records_employee_month on public.salary_records(employee_no, salary_month desc);
create index if not exists idx_salary_records_shop_month on public.salary_records(shop_id, salary_month desc);
create index if not exists idx_staff_attendance_employee_date on public.staff_attendance(employee_no, work_date desc);

alter table public.staff_info enable row level security;
alter table public.staff_info_modify_request enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.salary_records enable row level security;

drop policy if exists "staff info read own or hr" on public.staff_info;
create policy "staff info read own or hr"
on public.staff_info
for select
using (
  resigned = false
  or
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr'))
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('shop_manager','vice_manager') and u.shop_id = staff_info.shop_id)
);

drop policy if exists "staff info admin hr write" on public.staff_info;
create policy "staff info admin hr write"
on public.staff_info
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')));

drop policy if exists "salary records scoped read" on public.salary_records;
create policy "salary records scoped read"
on public.salary_records
for select
using (
  true
  or
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr'))
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('shop_manager','vice_manager') and u.shop_id = salary_records.shop_id)
);

drop policy if exists "salary records admin hr insert" on public.salary_records;
create policy "salary records admin hr insert"
on public.salary_records
for insert
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')));

drop policy if exists "attendance scoped read" on public.staff_attendance;
create policy "attendance scoped read"
on public.staff_attendance
for select
using (
  true
  or
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

drop policy if exists "attendance admin hr write" on public.staff_attendance;
create policy "attendance admin hr write"
on public.staff_attendance
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')));

drop policy if exists "modify request scoped" on public.staff_info_modify_request;
create policy "modify request scoped"
on public.staff_info_modify_request
for select
using (
  true
  or
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr'))
  or exists (
    select 1
    from public.users u
    join public.staff_info s on s.id = staff_info_modify_request.staff_id
    where u.id = auth.uid()
      and u.role in ('shop_manager','vice_manager')
      and u.shop_id = s.shop_id
  )
);

drop policy if exists "modify request admin hr write" on public.staff_info_modify_request;
create policy "modify request admin hr write"
on public.staff_info_modify_request
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','hr')));

drop policy if exists "modify request staff portal insert" on public.staff_info_modify_request;
create policy "modify request staff portal insert"
on public.staff_info_modify_request
for insert
with check (true);
