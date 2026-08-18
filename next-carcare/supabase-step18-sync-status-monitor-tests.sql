do $$ begin
  create type public.sync_status_type as enum ('synced', 'pending', 'failed');
exception when duplicate_object then null; end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['quotations','customers','payment','transaction_record','salary_records','appointments'] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I add column if not exists sync_status public.sync_status_type not null default ''pending''', table_name);
      execute format('alter table public.%I add column if not exists last_sync_at timestamptz null', table_name);
      execute format('alter table public.%I add column if not exists sync_error text null', table_name);
      execute format('alter table public.%I add column if not exists is_test boolean not null default false', table_name);
    end if;
  end loop;
end $$;

alter table if exists public.staff_info add column if not exists is_test boolean not null default false;
alter table if exists public.staff_attendance add column if not exists is_test boolean not null default false;
do $$ begin
  if to_regclass('public.salary_records') is not null then
    create index if not exists idx_salary_records_is_test on public.salary_records(is_test) where is_test = true;
  end if;
  if to_regclass('public.appointments') is not null then
    create index if not exists idx_appointments_is_test on public.appointments(is_test) where is_test = true;
  end if;
end $$;
