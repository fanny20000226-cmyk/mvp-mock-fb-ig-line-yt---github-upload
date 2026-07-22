create table if not exists public.staff_info (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null unique,
  password_hash text not null,
  name text not null,
  shop_id uuid references public.shops(id) on delete set null,
  position text not null default 'worker',
  phone text,
  identity_info text,
  hire_date date,
  resigned boolean not null default false,
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
  add column if not exists created_by uuid references public.users(id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_staff_info_updated_at on public.staff_info;
create trigger set_staff_info_updated_at
before update on public.staff_info
for each row execute function public.set_updated_at();

create table if not exists public.staff_info_modify_request (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_info(id) on delete cascade,
  employee_no text references public.staff_info(employee_no) on delete cascade,
  field_name text not null,
  new_value text not null,
  request_note text,
  requested_at timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  reviewer_id uuid references public.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_staff_info_modify_request_updated_at on public.staff_info_modify_request;
create trigger set_staff_info_modify_request_updated_at
before update on public.staff_info_modify_request
for each row execute function public.set_updated_at();

create table if not exists public.staff_salary (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null references public.staff_info(employee_no) on delete cascade,
  salary_month text not null,
  base_salary numeric(12,2) not null default 0,
  construction_bonus numeric(12,2) not null default 0,
  overtime_pay numeric(12,2) not null default 0,
  late_deduction numeric(12,2) not null default 0,
  leave_deduction numeric(12,2) not null default 0,
  photo_penalty numeric(12,2) not null default 0,
  other_deduction numeric(12,2) not null default 0,
  net_salary numeric(12,2) not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_no, salary_month)
);

drop trigger if exists set_staff_salary_updated_at on public.staff_salary;
create trigger set_staff_salary_updated_at
before update on public.staff_salary
for each row execute function public.set_updated_at();

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null references public.staff_info(employee_no) on delete cascade,
  work_date date not null,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  late_minutes integer not null default 0,
  leave_type text,
  leave_hours numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_staff_attendance_updated_at on public.staff_attendance;
create trigger set_staff_attendance_updated_at
before update on public.staff_attendance
for each row execute function public.set_updated_at();

create table if not exists public.work_photo_remind (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null references public.staff_info(employee_no) on delete cascade,
  construction_order_id uuid references public.construction_orders(id) on delete set null,
  due_at timestamptz not null,
  remind_sent_at timestamptz,
  photo_completed boolean not null default false,
  penalty_applied boolean not null default false,
  penalty_amount numeric(12,2) not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_work_photo_remind_updated_at on public.work_photo_remind;
create trigger set_work_photo_remind_updated_at
before update on public.work_photo_remind
for each row execute function public.set_updated_at();

alter table public.quotations
  add column if not exists responsible_staff_id text references public.staff_info(employee_no) on delete set null;

alter table public.construction_orders
  add column if not exists responsible_staff_id text references public.staff_info(employee_no) on delete set null;

create index if not exists idx_staff_info_shop on public.staff_info(shop_id);
create index if not exists idx_staff_info_employee_no on public.staff_info(employee_no);
create index if not exists idx_staff_modify_staff_status on public.staff_info_modify_request(staff_id, review_status);
create index if not exists idx_staff_salary_employee_month on public.staff_salary(employee_no, salary_month desc);
create index if not exists idx_staff_attendance_employee_date on public.staff_attendance(employee_no, work_date desc);
create index if not exists idx_work_photo_remind_employee_due on public.work_photo_remind(employee_no, due_at desc);

alter table public.staff_info enable row level security;
alter table public.staff_info_modify_request enable row level security;
alter table public.staff_salary enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.work_photo_remind enable row level security;

drop policy if exists "staff info login read" on public.staff_info;
create policy "staff info login read"
on public.staff_info
for select
using (resigned = false);

drop policy if exists "staff info admin hr all" on public.staff_info;
create policy "staff info admin hr all"
on public.staff_info
for all
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and (u.role in ('admin','hr') or (u.shop_id = staff_info.shop_id and u.role in ('shop_manager','vice_manager')))
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and (u.role in ('admin','hr') or (u.shop_id = staff_info.shop_id and u.role in ('shop_manager','vice_manager')))
  )
);

drop policy if exists "staff modify request readable" on public.staff_info_modify_request;
create policy "staff modify request readable"
on public.staff_info_modify_request
for select
using (
  true
);

drop policy if exists "staff modify request insert" on public.staff_info_modify_request;
create policy "staff modify request insert"
on public.staff_info_modify_request
for insert
with check (
  field_name in ('phone','mailing_address','email','emergency_contact','emergency_phone','avatar_url')
);

drop policy if exists "staff modify request hr review" on public.staff_info_modify_request;
create policy "staff modify request hr review"
on public.staff_info_modify_request
for update
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin','hr')
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin','hr')
  )
);

drop policy if exists "staff salary scoped read" on public.staff_salary;
create policy "staff salary scoped read"
on public.staff_salary
for select
using (
  exists (
    select 1 from public.users u
    join public.staff_info s on s.employee_no = staff_salary.employee_no
    where u.id = auth.uid()
      and u.active = true
      and (u.role in ('admin','hr') or (u.shop_id = s.shop_id and u.role in ('shop_manager','vice_manager')))
  )
  or exists (
    select 1 from public.staff_info s
    where s.employee_no = staff_salary.employee_no
      and s.resigned = false
  )
);

drop policy if exists "staff salary admin hr write" on public.staff_salary;
create policy "staff salary admin hr write"
on public.staff_salary
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.active = true and u.role in ('admin','hr')))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.active = true and u.role in ('admin','hr')));

drop policy if exists "staff attendance scoped" on public.staff_attendance;
create policy "staff attendance scoped"
on public.staff_attendance
for all
using (
  exists (
    select 1 from public.users u
    join public.staff_info s on s.employee_no = staff_attendance.employee_no
    where u.id = auth.uid()
      and u.active = true
      and (u.role in ('admin','hr') or (u.shop_id = s.shop_id and u.role in ('shop_manager','vice_manager')))
  )
  or exists (select 1 from public.staff_info s where s.employee_no = staff_attendance.employee_no and s.resigned = false)
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin','hr')
  )
);

drop policy if exists "work photo remind scoped" on public.work_photo_remind;
create policy "work photo remind scoped"
on public.work_photo_remind
for all
using (
  exists (
    select 1 from public.users u
    join public.staff_info s on s.employee_no = work_photo_remind.employee_no
    where u.id = auth.uid()
      and u.active = true
      and (u.role in ('admin','hr') or (u.shop_id = s.shop_id and u.role in ('shop_manager','vice_manager')))
  )
  or exists (select 1 from public.staff_info s where s.employee_no = work_photo_remind.employee_no and s.resigned = false)
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin','hr','shop_manager','vice_manager')
  )
);

drop policy if exists "work photo remind staff complete" on public.work_photo_remind;
create policy "work photo remind staff complete"
on public.work_photo_remind
for update
using (
  exists (
    select 1 from public.staff_info s
    where s.employee_no = work_photo_remind.employee_no
      and s.resigned = false
  )
)
with check (
  exists (
    select 1 from public.staff_info s
    where s.employee_no = work_photo_remind.employee_no
      and s.resigned = false
  )
);

insert into public.staff_info (employee_no, password_hash, name, position, phone, hire_date)
values ('EMP001', 'emp1234', '測試技師', 'technician', '0900000000', current_date)
on conflict (employee_no) do nothing;
