-- Step 23: calendar staff assignment and staff mistake deductions.
-- This migration is additive and can be run repeatedly.
create extension if not exists pgcrypto;

do $$ begin
  create type public.sync_status_type as enum ('synced', 'pending', 'failed');
exception when duplicate_object then null; end $$;

alter table if exists public.appointments
  add column if not exists assign_staff_ids text[] not null default '{}'::text[],
  add column if not exists schedule_type text not null default 'evaluation',
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.appointments
    add constraint appointments_schedule_type_check
    check (schedule_type in ('evaluation', 'construction', 'reminder'));
exception when duplicate_object then null; end $$;

create index if not exists idx_appointments_assign_staff_ids
  on public.appointments using gin (assign_staff_ids);

create table if not exists public.staff_mistake_record (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  appointment_no text not null,
  employee_no text not null references public.staff_info(employee_no) on delete restrict,
  staff_id uuid references public.staff_info(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  mistake_type text not null,
  description text not null,
  deduct_amount numeric(12,2) not null default 0 check (deduct_amount >= 0),
  occurred_at timestamptz not null default now(),
  is_settled boolean not null default false,
  settled_salary_id uuid references public.salary_records(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  sync_status public.sync_status_type not null default 'pending',
  last_sync_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.salary_records
  add column if not exists mistake_deduction numeric(12,2) not null default 0;

create index if not exists idx_staff_mistake_employee_settled
  on public.staff_mistake_record(employee_no, is_settled, occurred_at desc);
create index if not exists idx_staff_mistake_appointment
  on public.staff_mistake_record(appointment_id, occurred_at desc);
create index if not exists idx_staff_mistake_shop
  on public.staff_mistake_record(shop_id, occurred_at desc);

drop trigger if exists set_staff_mistake_updated_at on public.staff_mistake_record;
create trigger set_staff_mistake_updated_at
before update on public.staff_mistake_record
for each row execute function public.set_updated_at();

alter table public.staff_mistake_record enable row level security;

-- The existing employee portal uses an employee-number session and applies the
-- employee_no filter in the client, matching the current salary/attendance policy.
drop policy if exists "staff mistake employee portal read" on public.staff_mistake_record;
create policy "staff mistake employee portal read" on public.staff_mistake_record
for select using (true);

drop policy if exists "staff mistake scoped read" on public.staff_mistake_record;
create policy "staff mistake scoped read" on public.staff_mistake_record
for select using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and (
        u.role in ('admin', 'hr')
        or (u.role in ('shop_manager', 'vice_manager') and u.shop_id = staff_mistake_record.shop_id)
      )
  )
);

drop policy if exists "staff mistake manager insert" on public.staff_mistake_record;
create policy "staff mistake manager insert" on public.staff_mistake_record
for insert with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin', 'hr', 'shop_manager', 'vice_manager')
      and (u.role in ('admin', 'hr') or u.shop_id = staff_mistake_record.shop_id)
  )
);

drop policy if exists "staff mistake hr update" on public.staff_mistake_record;
create policy "staff mistake hr update" on public.staff_mistake_record
for update using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.active = true and u.role in ('admin', 'hr'))
)
with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.active = true and u.role in ('admin', 'hr'))
);

-- Optional monitor log table for installations that do not have one yet.
create table if not exists public.system_monitor_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  reference_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- N8N must receive only system events. No LINE API/token is stored in this app.
-- Add public.staff_mistake_record INSERT/UPDATE to the existing Supabase webhook
-- or use the application endpoint /api/appointments/mistakes for immediate sync.
