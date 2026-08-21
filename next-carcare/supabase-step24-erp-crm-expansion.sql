-- PEIWAY ERP + CRM expansion.
-- Additive and idempotent: existing status, PDF, payroll and N8N flows are not replaced.
begin;

create extension if not exists pgcrypto;

-- Existing business records keep their original columns. These fields are overlays used by
-- the enterprise control center and can be removed from the UI without affecting old flows.
alter table if exists public.customers add column if not exists is_test boolean not null default false;
alter table if exists public.customers add column if not exists last_followup_at timestamptz;
alter table if exists public.customers add column if not exists next_followup_at timestamptz;
alter table if exists public.customers add column if not exists deleted_at timestamptz;
alter table if exists public.customers add column if not exists deleted_by uuid references public.users(id);

alter table if exists public.quotations add column if not exists workflow_status text not null default 'draft';
alter table if exists public.quotations add column if not exists is_void boolean not null default false;
alter table if exists public.quotations add column if not exists void_reason text;
alter table if exists public.quotations add column if not exists voided_at timestamptz;
alter table if exists public.quotations add column if not exists voided_by uuid references public.users(id);
alter table if exists public.quotations add column if not exists is_test boolean not null default false;

alter table if exists public.construction_orders add column if not exists workflow_status text not null default 'confirmed';
alter table if exists public.construction_orders add column if not exists inspection_status text not null default 'not_required';
alter table if exists public.construction_orders add column if not exists is_void boolean not null default false;
alter table if exists public.construction_orders add column if not exists void_reason text;
alter table if exists public.construction_orders add column if not exists voided_at timestamptz;
alter table if exists public.construction_orders add column if not exists voided_by uuid references public.users(id);
alter table if exists public.construction_orders add column if not exists is_test boolean not null default false;

-- Compatibility projection: only the new workflow overlay is populated. The legacy status
-- remains untouched, so old pages and reports continue to read their original values.
update public.quotations set workflow_status=case status
  when 'pending' then 'quote_pending' when 'confirmed' then 'confirmed' when 'converted' then 'in_progress'
  when 'in_progress' then 'in_progress' when 'completed' then 'completed' when 'paid' then 'paid'
  when 'void' then 'void' else 'draft' end
where workflow_status='draft' and status is not null;
update public.construction_orders set workflow_status=case status
  when 'pending' then 'confirmed' when 'scheduled' then 'scheduled' when 'working' then 'in_progress'
  when 'finished' then 'completed' when 'ready_pickup' then 'pending_payment' when 'picked_up' then 'delivered'
  when 'cancelled' then 'cancelled' else 'confirmed' end
where workflow_status='confirmed' and status is not null;

alter table if exists public.appointments add column if not exists estimated_hours numeric(8,2) not null default 1;
alter table if exists public.appointments add column if not exists no_show boolean not null default false;
alter table if exists public.appointments add column if not exists is_test boolean not null default false;

do $$ declare t text; begin
  foreach t in array array['payment','transaction_record','salary_records','staff_info','staff_attendance'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I add column if not exists is_test boolean not null default false',t);
    end if;
  end loop;
end $$;

create table if not exists public.customer_timeline_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  customer_id uuid not null references public.customers(id), event_type text not null, title text not null, summary text,
  reference_type text, reference_id text, reference_url text, actor_id uuid references public.users(id), metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(), is_test boolean not null default false,
  sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);
create index if not exists idx_customer_timeline_customer_time on public.customer_timeline_events(customer_id,occurred_at desc);

create table if not exists public.customer_followups (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  customer_id uuid not null references public.customers(id), followup_type text not null check(followup_type in ('completion','maintenance','dormant','complaint','custom')),
  due_at timestamptz not null, assigned_staff_id uuid references public.users(id), contact_status text not null default 'uncontacted' check(contact_status in ('uncontacted','contacted','no_answer','completed','cancelled')),
  customer_reply text, next_followup_at timestamptz, completed_at timestamptz, created_by uuid references public.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), is_test boolean not null default false,
  sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);
create index if not exists idx_customer_followups_due on public.customer_followups(tenant_id,shop_id,contact_status,due_at);

create table if not exists public.order_workflow_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  reference_type text not null check(reference_type in ('quotation','construction_order')), reference_id text not null, order_no text,
  from_status text, to_status text not null, reason text, changed_by uuid references public.users(id), changed_at timestamptz not null default now(),
  is_test boolean not null default false, sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);
create index if not exists idx_order_workflow_reference on public.order_workflow_events(reference_type,reference_id,changed_at desc);

create table if not exists public.construction_inspections (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  construction_order_id uuid not null references public.construction_orders(id), inspector_id uuid not null references public.users(id),
  inspected_at timestamptz not null default now(), result text not null check(result in ('passed','failed')),
  defect_description text, defect_photos jsonb not null default '[]'::jsonb, rework_required boolean not null default false,
  is_test boolean not null default false, sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);

create table if not exists public.work_order_incidents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  construction_order_id uuid references public.construction_orders(id), appointment_id uuid references public.appointments(id),
  incident_type text not null, occurred_at timestamptz not null default now(), discovered_by uuid references public.users(id),
  responsible_staff_id uuid references public.users(id), responsible_employee_no text, description text not null, photos jsonb not null default '[]'::jsonb,
  deduct_amount numeric(12,2) not null default 0 check(deduct_amount >= 0), handled boolean not null default false,
  include_in_payroll boolean not null default false, payroll_settled_at timestamptz, salary_record_id uuid,
  is_test boolean not null default false, sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);
create index if not exists idx_work_order_incidents_staff on public.work_order_incidents(responsible_staff_id,occurred_at desc);

create table if not exists public.order_change_logs (
  id bigint generated always as identity primary key, tenant_id uuid references public.tenants(id), shop_id uuid references public.shops(id),
  reference_type text not null, reference_id text not null, order_no text, field_name text not null,
  before_value jsonb, after_value jsonb, change_reason text, changed_by uuid references public.users(id), changed_at timestamptz not null default now()
);
create index if not exists idx_order_change_reference on public.order_change_logs(reference_type,reference_id,changed_at desc);

create table if not exists public.appointment_capacity_rules (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid not null references public.shops(id),
  weekday smallint not null check(weekday between 0 and 6), start_time time not null, end_time time not null,
  staff_capacity integer not null default 1 check(staff_capacity > 0), max_orders integer not null default 1 check(max_orders > 0), estimated_hours numeric(8,2) not null default 1,
  active boolean not null default true, created_by uuid references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text,
  unique(shop_id,weekday,start_time,end_time)
);

create table if not exists public.appointment_waitlist (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid not null references public.shops(id),
  customer_id uuid references public.customers(id), customer_name text not null, customer_phone text, license_plate text,
  requested_date date not null, requested_time time not null, service_content text, priority integer not null default 100,
  status text not null default 'waiting' check(status in ('waiting','notified','promoted','expired','cancelled')),
  source_appointment_id uuid references public.appointments(id), promoted_appointment_id uuid references public.appointments(id),
  notified_at timestamptz, promoted_at timestamptz, created_by uuid references public.users(id), created_at timestamptz not null default now(),
  is_test boolean not null default false, sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);
create index if not exists idx_waitlist_slot on public.appointment_waitlist(shop_id,requested_date,requested_time,status,priority);

create table if not exists public.daily_closings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid not null references public.shops(id), business_date date not null,
  status text not null default 'open' check(status in ('open','manager_pending','manager_closed','finance_pending','finance_exception','finance_reconciled','completed')),
  order_count integer not null default 0, receivable_amount numeric(14,2) not null default 0, deposit_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0, received_amount numeric(14,2) not null default 0, outstanding_amount numeric(14,2) not null default 0,
  system_cash numeric(14,2) not null default 0, system_transfer numeric(14,2) not null default 0, system_card numeric(14,2) not null default 0, system_other numeric(14,2) not null default 0,
  actual_cash numeric(14,2), actual_transfer numeric(14,2), actual_card numeric(14,2), actual_other numeric(14,2), variance_amount numeric(14,2),
  manager_closed_by uuid references public.users(id), manager_closed_at timestamptz, finance_checked_by uuid references public.users(id), finance_checked_at timestamptz,
  manager_note text, finance_note text, snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_test boolean not null default false, sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text,
  unique(shop_id,business_date)
);
create index if not exists idx_daily_closings_status on public.daily_closings(tenant_id,shop_id,status,business_date desc);

create table if not exists public.reconciliation_issues (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid not null references public.shops(id),
  closing_id uuid not null references public.daily_closings(id), variance_amount numeric(14,2) not null, reason text, resolution text,
  status text not null default 'open' check(status in ('open','investigating','resolved')), created_by uuid references public.users(id), resolved_by uuid references public.users(id),
  created_at timestamptz not null default now(), resolved_at timestamptz, is_test boolean not null default false,
  sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);

create table if not exists public.refund_records (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid not null references public.shops(id),
  reference_type text not null default 'construction_order', reference_id text not null, order_no text,
  refund_type text not null check(refund_type in ('full','partial','deposit')), amount numeric(14,2) not null check(amount > 0),
  refund_method text not null, refund_date date not null, reason text not null, status text not null default 'approval_required' check(status in ('approval_required','approved','executed','rejected','failed')),
  requested_by uuid references public.users(id), approved_by uuid references public.users(id), executed_by uuid references public.users(id), executed_at timestamptz,
  created_at timestamptz not null default now(), is_test boolean not null default false,
  sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);

create table if not exists public.payment_corrections (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid not null references public.shops(id),
  payment_id text not null, before_value jsonb not null, after_value jsonb not null, reason text not null,
  status text not null default 'approval_required' check(status in ('approval_required','approved','executed','rejected','failed')),
  requested_by uuid references public.users(id), approved_by uuid references public.users(id), executed_by uuid references public.users(id), executed_at timestamptz,
  created_at timestamptz not null default now(), is_test boolean not null default false,
  sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  action_type text not null, reference_type text not null, reference_id text not null, request_payload jsonb not null default '{}'::jsonb,
  reason text not null, risk_level text not null default 'high' check(risk_level in ('medium','high','critical')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','executed','failed')),
  requested_by uuid not null references public.users(id), reviewed_by uuid references public.users(id), review_reason text,
  reviewed_at timestamptz, executed_at timestamptz, execution_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_test boolean not null default false, sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);
create index if not exists idx_approval_requests_queue on public.approval_requests(tenant_id,shop_id,status,risk_level,created_at);

create table if not exists public.notification_center (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  notification_type text not null, severity text not null default 'warning' check(severity in ('critical','warning','attention','normal')),
  title text not null, message text not null, visible_roles text[] not null default '{}', target_user_id uuid references public.users(id),
  reference_type text, reference_id text, reference_url text, status text not null default 'unread' check(status in ('unread','read','completed','dismissed')),
  read_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), expires_at timestamptz,
  is_test boolean not null default false, sync_status text not null default 'pending' check(sync_status in ('synced','pending','failed')), last_sync_at timestamptz, sync_error text
);
create index if not exists idx_notification_center_scope on public.notification_center(tenant_id,shop_id,status,severity,created_at desc);

create table if not exists public.backup_operation_logs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), shop_id uuid references public.shops(id),
  operation_type text not null check(operation_type in ('backup','verify','restore')), status text not null,
  backup_job_id uuid references public.backup_jobs(id), requested_by uuid references public.users(id), details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), completed_at timestamptz
);

-- Automatic CRM timeline projection. It observes existing writes without changing their payloads.
create or replace function public.capture_customer_timeline_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare row_j jsonb:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end; customer_text text; customer_uuid uuid;
  tenant_uuid uuid; shop_uuid uuid; event_name text; event_title text; ref_id text; ref_url text;
begin
  customer_text:=coalesce(row_j->>'customer_id',case when tg_table_name='customers' then row_j->>'id' end);
  if customer_text is null or customer_text='' then return case when tg_op='DELETE' then old else new end; end if;
  begin customer_uuid:=customer_text::uuid; exception when invalid_text_representation then return case when tg_op='DELETE' then old else new end; end;
  select c.tenant_id,c.shop_id into tenant_uuid,shop_uuid from public.customers c where c.id=customer_uuid;
  if tenant_uuid is null then return case when tg_op='DELETE' then old else new end; end if;
  event_name:=case tg_table_name when 'customers' then 'customer' when 'cars' then 'vehicle' when 'appointments' then 'appointment' when 'quotations' then 'quotation' when 'construction_orders' then 'construction' when 'payment' then 'payment' else tg_table_name end;
  event_title:=case tg_table_name when 'customers' then '建立／更新客戶' when 'cars' then '綁定／更新車輛' when 'appointments' then '預約異動' when 'quotations' then '報價單異動' when 'construction_orders' then '施工單異動' when 'payment' then '收款紀錄異動' else '資料異動' end;
  ref_id:=coalesce(row_j->>'id',row_j->>'quote_no',row_j->>'order_no',row_j->>'appointment_no');
  ref_url:=case tg_table_name when 'appointments' then '/operations/calendar?appointment='||coalesce(row_j->>'id','') when 'quotations' then '/operations/quotations?quote='||coalesce(row_j->>'id','') when 'construction_orders' then '/operations/orders?order='||coalesce(row_j->>'id','') when 'payment' then '/finance/payments?payment='||coalesce(row_j->>'id','') else '/operations/customers?customer='||customer_uuid::text end;
  insert into public.customer_timeline_events(tenant_id,shop_id,customer_id,event_type,title,summary,reference_type,reference_id,reference_url,actor_id,metadata,is_test)
  values(tenant_uuid,shop_uuid,customer_uuid,event_name,event_title,tg_op||' '||tg_table_name,tg_table_name,ref_id,ref_url,auth.uid(),jsonb_build_object('operation',tg_op),coalesce((row_j->>'is_test')::boolean,false));
  return case when tg_op='DELETE' then old else new end;
end $$;

do $$ declare t text; begin
  foreach t in array array['customers','cars','appointments','quotations','construction_orders','payment'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists crm_timeline_%I on public.%I',t,t);
      execute format('create trigger crm_timeline_%I after insert or update on public.%I for each row execute function public.capture_customer_timeline_event()',t,t);
    end if;
  end loop;
end $$;

-- Critical order fields are projected to an immutable, readable log.
create or replace function public.capture_order_change_log()
returns trigger language plpgsql security definer set search_path=public as $$
declare old_j jsonb:=to_jsonb(old); new_j jsonb:=to_jsonb(new); f text; fields text[]:=array['total_amount','final_amount','discount','discount_amount','service_items','items','assigned_staff_ids','responsible_staff_id','payment_method','pay_method'];
  p record; source_tenant uuid; source_shop uuid; ref_id text; ref_no text;
begin
  select * into p from public.current_profile();
  source_tenant:=coalesce(nullif(new_j->>'tenant_id','')::uuid,p.tenant_id); source_shop:=coalesce(nullif(new_j->>'shop_id','')::uuid,p.shop_id);
  ref_id:=coalesce(new_j->>'id',new_j->>'quote_no',new_j->>'order_no'); ref_no:=coalesce(new_j->>'quote_no',new_j->>'order_no');
  foreach f in array fields loop
    if new_j ? f and new_j->f is distinct from old_j->f then
      insert into public.order_change_logs(tenant_id,shop_id,reference_type,reference_id,order_no,field_name,before_value,after_value,changed_by)
      values(source_tenant,source_shop,tg_table_name,ref_id,ref_no,f,old_j->f,new_j->f,auth.uid());
    end if;
  end loop;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['quotations','construction_orders','payment'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists critical_change_%I on public.%I',t,t);
      execute format('create trigger critical_change_%I after update on public.%I for each row execute function public.capture_order_change_log()',t,t);
    end if;
  end loop;
end $$;

-- Audit every new mutable record. order_change_logs stays append-only and is already a log.
do $$ declare t text; begin
  foreach t in array array['customer_timeline_events','customer_followups','order_workflow_events','construction_inspections','work_order_incidents','appointment_capacity_rules','appointment_waitlist','daily_closings','reconciliation_issues','refund_records','payment_corrections','approval_requests','notification_center','backup_operation_logs'] loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.capture_audit_log()',t,t);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['customer_timeline_events','customer_followups','order_workflow_events','construction_inspections','work_order_incidents','order_change_logs','appointment_capacity_rules','appointment_waitlist','daily_closings','reconciliation_issues','refund_records','payment_corrections','approval_requests','notification_center','backup_operation_logs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists enterprise_scope_read on public.%I',t);
    execute format('create policy enterprise_scope_read on public.%I for select to authenticated using(tenant_id in(select tenant_id from public.current_profile()) and (shop_id is null or shop_id in(select shop_id from public.current_profile()) or exists(select 1 from public.current_profile() where role in (''admin'',''finance'',''hr''))))',t);
    execute format('drop policy if exists enterprise_management_write on public.%I',t);
    execute format('create policy enterprise_management_write on public.%I for insert to authenticated with check(tenant_id in(select tenant_id from public.current_profile()) and exists(select 1 from public.current_profile() p where p.role in (''admin'',''finance'',''hr'',''shop_manager'',''vice_manager'')))',t);
    execute format('drop policy if exists enterprise_management_update on public.%I',t);
    execute format('create policy enterprise_management_update on public.%I for update to authenticated using(tenant_id in(select tenant_id from public.current_profile()) and exists(select 1 from public.current_profile() p where p.role in (''admin'',''finance'',''hr'',''shop_manager'',''vice_manager''))) with check(tenant_id in(select tenant_id from public.current_profile()))',t);
    execute format('revoke delete on public.%I from authenticated',t);
  end loop;
end $$;

-- Read-only business analytics views. Test and voided rows are excluded.
create or replace view public.customer_activity_summary with (security_invoker=true) as
select c.id customer_id,c.tenant_id,c.shop_id,c.name,c.phone,
  (select count(*) from public.quotations q where q.customer_id=c.id and coalesce(q.is_test,false)=false and coalesce(q.is_void,false)=false) consumption_count,
  coalesce((select sum(coalesce(q.final_amount,q.total_amount,0)) from public.quotations q where q.customer_id=c.id and coalesce(q.is_test,false)=false and coalesce(q.is_void,false)=false),0) lifetime_value,
  (select max(q.created_at) from public.quotations q where q.customer_id=c.id and coalesce(q.is_test,false)=false and coalesce(q.is_void,false)=false) last_consumption_at,
  (select count(*) from public.appointments a where a.customer_id=c.id and a.status in ('cancelled','已取消') and coalesce(a.is_test,false)=false) cancellation_count,
  (select count(*) from public.appointments a where a.customer_id=c.id and (a.no_show=true or a.status in ('no_show','未到店')) and coalesce(a.is_test,false)=false) no_show_count
from public.customers c
where coalesce(c.is_test,false)=false and c.deleted_at is null;

grant select on public.customer_activity_summary to authenticated,service_role;

commit;
