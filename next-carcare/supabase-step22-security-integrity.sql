-- Step 22: critical write integrity and security guardrails.
-- Run after step21. The migration intentionally stops when historical duplicate
-- quote conversions exist so an administrator can review them before enforcing
-- the unique business rule.

do $$
begin
  if to_regclass('public.construction_orders') is null then
    raise exception 'construction_orders table is missing';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'construction_orders'
      and column_name = 'quotation_id'
  ) then
    raise exception 'construction_orders.quotation_id is missing';
  end if;
  if exists (
    select quotation_id
    from public.construction_orders
    where quotation_id is not null
    group by quotation_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate construction_orders.quotation_id rows found; review duplicates before rerunning step22';
  end if;
end $$;

create unique index if not exists uq_construction_orders_quotation_id
  on public.construction_orders(quotation_id)
  where quotation_id is not null;

comment on index public.uq_construction_orders_quotation_id is
  'Prevents concurrent or repeated conversion of one quotation into multiple work orders.';
