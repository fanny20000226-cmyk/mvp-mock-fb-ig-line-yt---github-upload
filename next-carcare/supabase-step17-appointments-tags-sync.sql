-- Step 17: appointments + customer tag field for N8N Google Sheets sync
create extension if not exists pgcrypto;

alter table public.customers
  add column if not exists customer_tags text[] not null default '{}'::text[];

create or replace function public.refresh_customer_tag_array(target_customer_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers c
  set customer_tags = coalesce((
    select array_agg(distinct ct.tag_name order by ct.tag_name)
    from public.customer_tags ct
    where ct.customer_id = target_customer_key
       or ct.customer_id = c.id::text
       or lower(ct.customer_id) = lower(coalesce(c.phone, ''))
       or lower(ct.customer_id) = lower(coalesce(c.name, ''))
  ), '{}'::text[]),
  updated_at = now()
  where c.id::text = target_customer_key
     or lower(coalesce(c.phone, '')) = lower(target_customer_key)
     or lower(coalesce(c.name, '')) = lower(target_customer_key);
end;
$$;

create or replace function public.sync_customer_tags_to_customers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.refresh_customer_tag_array(old.customer_id);
    return old;
  end if;

  perform public.refresh_customer_tag_array(new.customer_id);
  return new;
end;
$$;

drop trigger if exists trg_customer_tags_to_customers_insert_update on public.customer_tags;
create trigger trg_customer_tags_to_customers_insert_update
after insert or update on public.customer_tags
for each row execute function public.sync_customer_tags_to_customers();

drop trigger if exists trg_customer_tags_to_customers_delete on public.customer_tags;
create trigger trg_customer_tags_to_customers_delete
after delete on public.customer_tags
for each row execute function public.sync_customer_tags_to_customers();

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  appointment_no text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  license_plate text,
  car_brand text,
  car_model text,
  appoint_date date not null,
  appoint_time text not null,
  service_content text not null,
  status text not null default '待確認'
    check (status in ('待確認', '已到店', '已取消', '已完成')),
  remark text,
  shop_id uuid references public.shops(id) on delete set null,
  store_id uuid references public.shops(id) on delete set null,
  forced_conflict boolean not null default false,
  conflict_note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_shop_date_time
  on public.appointments(coalesce(shop_id, store_id), appoint_date, appoint_time);

create index if not exists idx_appointments_customer
  on public.appointments(customer_id);

create index if not exists idx_appointments_plate_slot
  on public.appointments(license_plate, appoint_date, appoint_time);

create index if not exists idx_customers_customer_tags
  on public.customers using gin (customer_tags);

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;

drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all" on public.appointments
for all
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.active = true
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.active = true
  )
);

drop policy if exists "appointments_same_shop_read" on public.appointments;
create policy "appointments_same_shop_read" on public.appointments
for select
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and (
        u.role = 'admin'
        or u.shop_id = appointments.shop_id
        or u.shop_id = appointments.store_id
      )
  )
);

drop policy if exists "appointments_manager_insert" on public.appointments;
create policy "appointments_manager_insert" on public.appointments
for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin', 'shop_manager', 'vice_manager')
      and (
        u.role = 'admin'
        or u.shop_id = appointments.shop_id
        or u.shop_id = appointments.store_id
      )
  )
);

drop policy if exists "appointments_manager_update" on public.appointments;
create policy "appointments_manager_update" on public.appointments
for update
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin', 'shop_manager', 'vice_manager')
      and (
        u.role = 'admin'
        or u.shop_id = appointments.shop_id
        or u.shop_id = appointments.store_id
      )
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin', 'shop_manager', 'vice_manager')
      and (
        u.role = 'admin'
        or u.shop_id = appointments.shop_id
        or u.shop_id = appointments.store_id
      )
  )
);

drop policy if exists "appointments_manager_delete" on public.appointments;
create policy "appointments_manager_delete" on public.appointments
for delete
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.role in ('admin', 'shop_manager', 'vice_manager')
      and (
        u.role = 'admin'
        or u.shop_id = appointments.shop_id
        or u.shop_id = appointments.store_id
      )
  )
);

-- Supabase Dashboard webhook setup:
-- Table: public.appointments
-- Events: INSERT, UPDATE
-- Method: POST
-- URL: your N8N production webhook URL
-- Payload: full row. The app also calls /api/appointments/sync after manual saves for immediate Google Sheets sync.
