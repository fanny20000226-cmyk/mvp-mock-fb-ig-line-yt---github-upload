alter table public.quotations
  add column if not exists tax_rate numeric(5,2) default 0.05,
  add column if not exists tax_amount numeric(12,2) default 0,
  add column if not exists amount_before_tax numeric(12,2) default 0,
  add column if not exists receipt_print_count integer not null default 0;

create table if not exists public.receipt_records (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references public.quotations(id) on delete set null,
  store_id uuid references public.shops(id) on delete set null,
  create_time timestamptz not null default now(),
  tax_rate numeric(5,2) not null default 0.05,
  total_tax numeric(12,2) not null default 0,
  amount_before_tax numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  print_user_id uuid references public.users(id) on delete set null,
  receipt_no text not null default ('R' || extract(epoch from now())::bigint::text),
  customer_name text,
  plate_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_receipt_records_store_time
  on public.receipt_records(store_id, create_time desc);

create index if not exists idx_receipt_records_quotation
  on public.receipt_records(quotation_id);

alter table public.receipt_records enable row level security;

drop policy if exists "receipt admin all" on public.receipt_records;
create policy "receipt admin all"
on public.receipt_records
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

drop policy if exists "receipt same shop read" on public.receipt_records;
create policy "receipt same shop read"
on public.receipt_records
for select
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and (
        u.role = 'admin'
        or (u.shop_id = receipt_records.store_id and u.role in ('finance','shop_manager','vice_manager'))
      )
  )
);

drop policy if exists "receipt same shop insert" on public.receipt_records;
create policy "receipt same shop insert"
on public.receipt_records
for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.active = true
      and (
        u.role = 'admin'
        or (u.shop_id = receipt_records.store_id and u.role in ('finance','shop_manager','vice_manager','worker'))
      )
  )
);
