-- Step 14: N8N read-only report sync preparation.
-- No Google API/OAuth/Sheets code is added here.
-- Important: Supabase service_role keys bypass RLS by design. Use a dedicated
-- n8n_reader database/API role or an Edge Function that uses this read-only role
-- when you need strict read-only access.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  store_id uuid references public.shops(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.shops(id) on delete set null,
  car_id uuid references public.cars(id) on delete set null,
  reserve_datetime timestamptz,
  project text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transaction_record (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.shops(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  pay_amount numeric(12,2) not null default 0,
  pay_time timestamptz not null default now(),
  pay_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists store_id uuid references public.shops(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.cars
  add column if not exists license_plate text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists store_id uuid references public.shops(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.quotations
  add column if not exists order_no text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists car_id uuid references public.cars(id) on delete set null,
  add column if not exists store_id uuid references public.shops(id) on delete set null,
  add column if not exists technician_id text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.reservations
  add column if not exists store_id uuid references public.shops(id) on delete set null,
  add column if not exists car_id uuid references public.cars(id) on delete set null,
  add column if not exists reserve_datetime timestamptz,
  add column if not exists project text,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.transaction_record
  add column if not exists store_id uuid references public.shops(id) on delete set null,
  add column if not exists quotation_id uuid references public.quotations(id) on delete set null,
  add column if not exists pay_amount numeric(12,2) not null default 0,
  add column if not exists pay_time timestamptz not null default now(),
  add column if not exists pay_method text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers',
    'cars',
    'quotations',
    'reservations',
    'transaction_record'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_%I_updated_at before insert or update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'customer_name'
  ) then
    execute 'update public.customers set name = coalesce(name, customer_name) where name is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'customer_phone'
  ) then
    execute 'update public.customers set phone = coalesce(phone, customer_phone) where phone is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'shop_id'
  ) then
    execute 'update public.customers set store_id = coalesce(store_id, shop_id) where store_id is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'plate_no'
  ) then
    execute 'update public.cars set license_plate = coalesce(license_plate, plate_no) where license_plate is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'shop_id'
  ) then
    execute 'update public.cars set store_id = coalesce(store_id, shop_id) where store_id is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'quote_no'
  ) then
    execute 'update public.quotations set order_no = coalesce(order_no, quote_no) where order_no is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'shop_id'
  ) then
    execute 'update public.quotations set store_id = coalesce(store_id, shop_id) where store_id is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'responsible_staff_id'
  ) then
    execute 'update public.quotations set technician_id = coalesce(technician_id, responsible_staff_id) where technician_id is null';
  end if;
end;
$$;

create index if not exists idx_customers_n8n_store_updated
  on public.customers(store_id, updated_at desc);

create index if not exists idx_cars_n8n_store_updated
  on public.cars(store_id, updated_at desc);

create index if not exists idx_quotations_n8n_store_updated
  on public.quotations(store_id, updated_at desc);

create index if not exists idx_reservations_n8n_store_time
  on public.reservations(store_id, reserve_datetime desc);

create index if not exists idx_transaction_record_n8n_store_pay_time
  on public.transaction_record(store_id, pay_time desc);

create or replace view public.n8n_customers_report
with (security_invoker = true) as
select
  id,
  name,
  phone,
  store_id,
  created_at,
  updated_at
from public.customers;

create or replace view public.n8n_cars_report
with (security_invoker = true) as
select
  id,
  license_plate,
  brand,
  model,
  customer_id,
  store_id,
  updated_at
from public.cars;

create or replace view public.n8n_quotations_report
with (security_invoker = true) as
select
  id,
  order_no,
  customer_id,
  car_id,
  store_id,
  total_amount,
  technician_id,
  status,
  created_at,
  updated_at
from public.quotations;

create or replace view public.n8n_reservations_report
with (security_invoker = true) as
select
  id,
  store_id,
  car_id,
  reserve_datetime,
  project,
  status,
  created_at,
  updated_at
from public.reservations;

create or replace view public.n8n_transaction_record_report
with (security_invoker = true) as
select
  id,
  store_id,
  quotation_id,
  pay_amount,
  pay_time,
  pay_method,
  created_at,
  updated_at
from public.transaction_record;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'n8n_reader') then
    create role n8n_reader nologin;
  end if;
end;
$$;

grant usage on schema public to n8n_reader;
grant select on
  public.n8n_customers_report,
  public.n8n_cars_report,
  public.n8n_quotations_report,
  public.n8n_reservations_report,
  public.n8n_transaction_record_report
to n8n_reader;

revoke insert, update, delete, truncate on
  public.customers,
  public.cars,
  public.quotations,
  public.reservations,
  public.transaction_record
from n8n_reader;

alter table public.customers enable row level security;
alter table public.cars enable row level security;
alter table public.quotations enable row level security;
alter table public.reservations enable row level security;
alter table public.transaction_record enable row level security;

drop policy if exists "n8n_read_customers" on public.customers;
create policy "n8n_read_customers"
on public.customers
for select
to n8n_reader
using (true);

drop policy if exists "n8n_read_cars" on public.cars;
create policy "n8n_read_cars"
on public.cars
for select
to n8n_reader
using (true);

drop policy if exists "n8n_read_quotations" on public.quotations;
create policy "n8n_read_quotations"
on public.quotations
for select
to n8n_reader
using (true);

drop policy if exists "n8n_read_reservations" on public.reservations;
create policy "n8n_read_reservations"
on public.reservations
for select
to n8n_reader
using (true);

drop policy if exists "n8n_read_transaction_record" on public.transaction_record;
create policy "n8n_read_transaction_record"
on public.transaction_record
for select
to n8n_reader
using (true);
