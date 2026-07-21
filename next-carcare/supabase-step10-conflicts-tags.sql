-- Step 10: reservation conflict guard + customer tags
create extension if not exists pgcrypto;

alter table public.construction_orders
  add column if not exists store_id uuid references public.shops(id) on delete set null,
  add column if not exists reserve_start timestamptz,
  add column if not exists reserve_end timestamptz,
  add column if not exists conflict_override boolean not null default false,
  add column if not exists conflict_note text;

update public.construction_orders
set store_id = shop_id
where store_id is null and shop_id is not null;

create index if not exists idx_construction_orders_reserve_window
  on public.construction_orders(store_id, reserve_start, reserve_end);

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  shop_id uuid references public.shops(id) on delete set null,
  tag_name text not null,
  tag_color text not null default '#ffc107',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_tags_unique unique (shop_id, customer_id, tag_name)
);

create index if not exists idx_customer_tags_customer on public.customer_tags(customer_id);
create index if not exists idx_customer_tags_shop_name on public.customer_tags(shop_id, tag_name);

drop trigger if exists trg_customer_tags_updated_at on public.customer_tags;
create trigger trg_customer_tags_updated_at
before update on public.customer_tags
for each row execute function public.set_updated_at();

alter table public.customer_tags enable row level security;

drop policy if exists "customer_tags_admin_all" on public.customer_tags;
create policy "customer_tags_admin_all" on public.customer_tags
for all
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

drop policy if exists "customer_tags_same_shop_read" on public.customer_tags;
create policy "customer_tags_same_shop_read" on public.customer_tags
for select
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.role = 'admin' or u.shop_id = customer_tags.shop_id)
  )
);

drop policy if exists "customer_tags_staff_write" on public.customer_tags;
create policy "customer_tags_staff_write" on public.customer_tags
for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('admin', 'shop_manager', 'vice_manager', 'finance', 'hr')
      and (u.role = 'admin' or u.shop_id = customer_tags.shop_id)
  )
);

drop policy if exists "customer_tags_manager_delete" on public.customer_tags;
create policy "customer_tags_manager_delete" on public.customer_tags
for delete
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('admin', 'shop_manager', 'vice_manager')
      and (u.role = 'admin' or u.shop_id = customer_tags.shop_id)
  )
);
