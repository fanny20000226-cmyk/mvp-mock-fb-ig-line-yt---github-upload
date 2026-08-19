-- PEIWAY enterprise foundation. Additive/idempotent; existing business and N8N payloads stay unchanged.
create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.tenants(code,name) values ('PEIWAY','PEIWAY') on conflict(code) do nothing;

alter table if exists public.shops add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.users add column if not exists tenant_id uuid references public.tenants(id);
update public.shops set tenant_id=(select id from public.tenants where code='PEIWAY') where tenant_id is null;
update public.users set tenant_id=(select id from public.tenants where code='PEIWAY') where tenant_id is null;

do $$ declare t text; begin
  foreach t in array array['customers','cars','quotations','construction_orders','appointments','reservations','payment','transaction_record','employees','staff_info','staff_attendance','attendance_log','salary_records','receipt_records','services'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I add column if not exists tenant_id uuid references public.tenants(id)',t);
      execute format('update public.%I set tenant_id=(select id from public.tenants where code=''PEIWAY'') where tenant_id is null',t);
      execute format('create index if not exists %I on public.%I(tenant_id)','idx_'||t||'_tenant_id',t);
    end if;
  end loop;
end $$;

create or replace function public.current_profile()
returns table(user_id uuid, tenant_id uuid, shop_id uuid, role text)
language sql stable security definer set search_path=public as $$
  select u.id,u.tenant_id,u.shop_id,u.role::text from public.users u where u.id=auth.uid() and u.active=true limit 1
$$;
revoke all on function public.current_profile() from public;
grant execute on function public.current_profile() to authenticated,service_role;

create or replace function public.is_management()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.current_profile() where role in ('admin','shop_manager'))
$$;
grant execute on function public.is_management() to authenticated,service_role;

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  category text not null, setting_key text not null, label text not null, value jsonb not null default '{}'::jsonb,
  description text, active boolean not null default true, updated_by uuid references public.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists uq_system_settings_scope on public.system_settings(tenant_id,coalesce(shop_id,'00000000-0000-0000-0000-000000000000'::uuid),category,setting_key);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, tenant_id uuid, shop_id uuid, actor_id uuid, actor_role text,
  action text not null, table_name text not null, record_id text, old_data jsonb, new_data jsonb,
  changed_fields text[] not null default '{}', request_id text, ip_address inet, created_at timestamptz not null default now()
);
create index if not exists idx_audit_scope_time on public.audit_logs(tenant_id,shop_id,created_at desc);
create index if not exists idx_audit_record on public.audit_logs(table_name,record_id);

create or replace function public.capture_audit_log()
returns trigger language plpgsql security definer set search_path=public as $$
declare old_j jsonb; new_j jsonb; source_j jsonb; p record; changed text[];
begin
  old_j:=case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_j:=case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  source_j:=coalesce(new_j,old_j,'{}'::jsonb); select * into p from public.current_profile();
  if tg_op='UPDATE' then select coalesce(array_agg(k),'{}') into changed from jsonb_object_keys(new_j) k where new_j->k is distinct from old_j->k;
  else changed:=array[]::text[]; end if;
  insert into public.audit_logs(tenant_id,shop_id,actor_id,actor_role,action,table_name,record_id,old_data,new_data,changed_fields)
  values(coalesce(nullif(source_j->>'tenant_id','')::uuid,p.tenant_id),coalesce(nullif(source_j->>'shop_id','')::uuid,p.shop_id),auth.uid(),p.role,tg_op,tg_table_name,
    coalesce(source_j->>'id',source_j->>'quote_no',source_j->>'appointment_no'),old_j,new_j,changed);
  if tg_op='DELETE' then return old; end if; return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['quotations','customers','salary_records','appointments','reservations','payment','transaction_record','receipt_records','construction_orders','users'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists audit_%I on public.%I',t,t);
      execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.capture_audit_log()',t,t);
    end if;
  end loop;
end $$;

create table if not exists public.backup_jobs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  backup_type text not null check(backup_type in ('database','storage','full')), status text not null default 'queued' check(status in ('queued','running','completed','failed')),
  retention_days integer not null default 30 check(retention_days between 1 and 3650), object_count bigint, size_bytes bigint,
  provider_reference text, error_message text, requested_by uuid references public.users(id), started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.restore_requests (
  id uuid primary key default gen_random_uuid(), backup_job_id uuid references public.backup_jobs(id), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  scope text not null, reason text not null, status text not null default 'approval_required' check(status in ('approval_required','approved','running','completed','rejected','failed')),
  requested_by uuid references public.users(id), approved_by uuid references public.users(id), created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.system_notifications (
  id uuid primary key default gen_random_uuid(), tenant_id uuid references public.tenants(id), shop_id uuid references public.shops(id),
  notification_type text not null, severity text not null default 'warning', title text not null, message text not null,
  reference_type text, reference_id text, read_at timestamptz, created_at timestamptz not null default now()
);

alter table if exists public.n8n_connection_settings add column if not exists max_retries integer not null default 3;
alter table if exists public.n8n_connection_settings add column if not exists retry_delay_ms integer not null default 800;
alter table if exists public.n8n_event_dispatch_logs add column if not exists attempt_count integer not null default 1;
alter table if exists public.n8n_event_dispatch_logs add column if not exists error_stack text;
alter table if exists public.n8n_event_dispatch_logs add column if not exists next_retry_at timestamptz;

alter table public.tenants enable row level security; alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security; alter table public.backup_jobs enable row level security; alter table public.restore_requests enable row level security;
alter table public.system_notifications enable row level security;
drop policy if exists tenant_management_read on public.tenants;
create policy tenant_management_read on public.tenants for select to authenticated using(public.is_management() and id in(select tenant_id from public.current_profile()));
drop policy if exists settings_management_all on public.system_settings;
create policy settings_management_all on public.system_settings for all to authenticated using(public.is_management() and tenant_id in(select tenant_id from public.current_profile())) with check(public.is_management() and tenant_id in(select tenant_id from public.current_profile()));
drop policy if exists audit_management_read on public.audit_logs;
create policy audit_management_read on public.audit_logs for select to authenticated using(public.is_management() and tenant_id in(select tenant_id from public.current_profile()));
drop policy if exists backup_management_all on public.backup_jobs;
create policy backup_management_all on public.backup_jobs for all to authenticated using(public.is_management() and tenant_id in(select tenant_id from public.current_profile())) with check(public.is_management() and tenant_id in(select tenant_id from public.current_profile()));
drop policy if exists restore_admin_all on public.restore_requests;
create policy restore_admin_all on public.restore_requests for all to authenticated using(exists(select 1 from public.current_profile() where role='admin')) with check(exists(select 1 from public.current_profile() where role='admin'));
drop policy if exists notification_scoped_read on public.system_notifications;
create policy notification_scoped_read on public.system_notifications for select to authenticated using(tenant_id in(select tenant_id from public.current_profile()) and (shop_id is null or shop_id in(select shop_id from public.current_profile()) or exists(select 1 from public.current_profile() where role='admin')));
revoke insert,update,delete on public.audit_logs from authenticated; grant select on public.audit_logs to authenticated;

-- Restrictive policies are AND-ed with existing business policies, so they add tenant/shop isolation
-- without changing which roles may perform each existing operation.
do $$ declare t text; has_shop boolean; predicate text; begin
  foreach t in array array['customers','cars','quotations','construction_orders','appointments','reservations','payment','transaction_record','employees','staff_info','staff_attendance','attendance_log','salary_records','receipt_records','services'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      select exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='shop_id') into has_shop;
      predicate := 'tenant_id in (select tenant_id from public.current_profile())';
      if has_shop then predicate := predicate || ' and (exists(select 1 from public.current_profile() where role=''admin'') or shop_id is null or shop_id in(select shop_id from public.current_profile()))'; end if;
      execute format('drop policy if exists tenant_shop_isolation on public.%I',t);
      execute format('create policy tenant_shop_isolation on public.%I as restrictive for all to authenticated using(%s) with check(%s)',t,predicate,predicate);
    end if;
  end loop;
end $$;

do $$ begin
  if to_regclass('public.n8n_connection_settings') is not null then
    drop policy if exists "authenticated manage n8n settings" on public.n8n_connection_settings;
    drop policy if exists "management manage n8n settings" on public.n8n_connection_settings;
    create policy "management manage n8n settings" on public.n8n_connection_settings for all to authenticated using(public.is_management()) with check(public.is_management());
  end if;
  if to_regclass('public.n8n_callback_logs') is not null then
    drop policy if exists "authenticated read n8n callback logs" on public.n8n_callback_logs;
    drop policy if exists "management read n8n callback logs" on public.n8n_callback_logs;
    create policy "management read n8n callback logs" on public.n8n_callback_logs for select to authenticated using(public.is_management());
  end if;
  if to_regclass('public.n8n_event_dispatch_logs') is not null then
    drop policy if exists "authenticated read n8n dispatch logs" on public.n8n_event_dispatch_logs;
    drop policy if exists "management read n8n dispatch logs" on public.n8n_event_dispatch_logs;
    create policy "management read n8n dispatch logs" on public.n8n_event_dispatch_logs for select to authenticated using(public.is_management());
  end if;
end $$;

drop policy if exists car_images_select on storage.objects; drop policy if exists car_images_insert on storage.objects;
drop policy if exists car_images_update on storage.objects; drop policy if exists car_images_delete on storage.objects;
create policy car_images_select on storage.objects for select to authenticated using(bucket_id='car-images' and (exists(select 1 from public.current_profile() where role='admin') or (storage.foldername(name))[1] in(select shop_id::text from public.current_profile())));
create policy car_images_insert on storage.objects for insert to authenticated with check(bucket_id='car-images' and (exists(select 1 from public.current_profile() where role='admin') or (storage.foldername(name))[1] in(select shop_id::text from public.current_profile())));
create policy car_images_update on storage.objects for update to authenticated using(bucket_id='car-images' and (exists(select 1 from public.current_profile() where role='admin') or (storage.foldername(name))[1] in(select shop_id::text from public.current_profile()))) with check(bucket_id='car-images');
create policy car_images_delete on storage.objects for delete to authenticated using(bucket_id='car-images' and (exists(select 1 from public.current_profile() where role='admin') or (storage.foldername(name))[1] in(select shop_id::text from public.current_profile())));
