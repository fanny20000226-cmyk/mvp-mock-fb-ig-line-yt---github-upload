-- Fix the enterprise catalog/BI tenant gap left by step19.
-- Additive and idempotent; existing service prices and business records are preserved.

alter table if exists public.service_items
  add column if not exists tenant_id uuid references public.tenants(id);

update public.service_items
set tenant_id = (select id from public.tenants where code = 'PEIWAY')
where tenant_id is null;

create index if not exists idx_service_items_tenant_id
  on public.service_items(tenant_id);

create or replace function public.fill_service_item_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id is null then
    select tenant_id into new.tenant_id
    from public.current_profile()
    limit 1;
  end if;
  return new;
end
$$;

drop trigger if exists fill_service_item_tenant on public.service_items;
create trigger fill_service_item_tenant
before insert on public.service_items
for each row execute function public.fill_service_item_tenant();

alter table public.service_items enable row level security;

drop policy if exists service_items_tenant_read on public.service_items;
create policy service_items_tenant_read
on public.service_items for select to authenticated
using (
  tenant_id in (select tenant_id from public.current_profile())
  and (
    exists(select 1 from public.current_profile() where role = 'admin')
    or shop_id is null
    or shop_id in (select shop_id from public.current_profile())
  )
);

drop policy if exists service_items_management_write on public.service_items;
create policy service_items_management_write
on public.service_items for all to authenticated
using (
  public.is_management()
  and tenant_id in (select tenant_id from public.current_profile())
  and (
    exists(select 1 from public.current_profile() where role = 'admin')
    or shop_id is null
    or shop_id in (select shop_id from public.current_profile())
  )
)
with check (
  public.is_management()
  and tenant_id in (select tenant_id from public.current_profile())
  and (
    exists(select 1 from public.current_profile() where role = 'admin')
    or shop_id is null
    or shop_id in (select shop_id from public.current_profile())
  )
);

drop policy if exists tenant_shop_isolation on public.service_items;
create policy tenant_shop_isolation
on public.service_items as restrictive for all to authenticated
using (
  tenant_id in (select tenant_id from public.current_profile())
  and (
    exists(select 1 from public.current_profile() where role = 'admin')
    or shop_id is null
    or shop_id in (select shop_id from public.current_profile())
  )
)
with check (
  tenant_id in (select tenant_id from public.current_profile())
  and (
    exists(select 1 from public.current_profile() where role = 'admin')
    or shop_id is null
    or shop_id in (select shop_id from public.current_profile())
  )
);

drop trigger if exists audit_service_items on public.service_items;
create trigger audit_service_items
after insert or update or delete on public.service_items
for each row execute function public.capture_audit_log();

notify pgrst, 'reload schema';
