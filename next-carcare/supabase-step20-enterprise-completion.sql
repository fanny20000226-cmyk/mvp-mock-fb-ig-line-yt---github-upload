-- PEIWAY enterprise completion: managed catalogs and protected backup storage.
create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
  brand text not null, model text not null, vehicle_type text, seat_count integer,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,brand,model)
);
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
  role text not null, permission_key text not null, allowed boolean not null default false,
  updated_by uuid references public.users(id), updated_at timestamptz not null default now(), unique(tenant_id,role,permission_key)
);
create table if not exists public.backup_artifacts (
  id uuid primary key default gen_random_uuid(), backup_job_id uuid not null references public.backup_jobs(id) on delete cascade,
  artifact_type text not null, storage_path text not null, checksum text, size_bytes bigint, created_at timestamptz not null default now()
);
alter table public.vehicle_models enable row level security;
alter table public.role_permissions enable row level security;
alter table public.backup_artifacts enable row level security;
create policy vehicle_models_tenant_read on public.vehicle_models for select to authenticated using(tenant_id in(select tenant_id from public.current_profile()));
create policy vehicle_models_management_write on public.vehicle_models for all to authenticated using(public.is_management() and tenant_id in(select tenant_id from public.current_profile())) with check(public.is_management() and tenant_id in(select tenant_id from public.current_profile()));
create policy role_permissions_management_all on public.role_permissions for all to authenticated using(public.is_management() and tenant_id in(select tenant_id from public.current_profile())) with check(public.is_management() and tenant_id in(select tenant_id from public.current_profile()));
create policy backup_artifacts_admin_read on public.backup_artifacts for select to authenticated using(exists(select 1 from public.current_profile() where role='admin'));
insert into storage.buckets(id,name,public) values('system-backups','system-backups',false) on conflict(id) do update set public=false;
drop policy if exists system_backups_admin_read on storage.objects;
create policy system_backups_admin_read on storage.objects for select to authenticated using(bucket_id='system-backups' and exists(select 1 from public.current_profile() where role='admin'));

do $$ declare t text; begin
  foreach t in array array['vehicle_models','role_permissions'] loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.capture_audit_log()',t,t);
  end loop;
end $$;

-- 可視化設定中心的完整預設項目；部署後可直接由後台調整，不必改程式。
insert into public.system_settings(tenant_id,category,setting_key,label,value,description)
select t.id,v.category,v.setting_key,v.label,to_jsonb(v.default_value),v.description
from public.tenants t cross join (values
 ('公司基礎資料','company.name','公司名稱','PEIWAY','PDF 與單據顯示名稱'),
 ('公司基礎資料','company.tax_id','統一編號','','公司統一編號'),
 ('公司基礎資料','company.phone','公司電話','','對外聯絡電話'),
 ('公司基礎資料','company.address','公司地址','','公司登記地址'),
 ('預約與工位','appointment.min_notice_hours','最短預約提前小時','2','預約需提前的小時數'),
 ('預約與工位','appointment.max_days','最遠可預約天數','90','開放預約的未來天數'),
 ('預約與工位','appointment.slot_minutes','時段分鐘數','30','行事曆每格分鐘數'),
 ('預約與工位','appointment.default_capacity','預設工位容量','2','每時段預設可接車數'),
 ('分店營運','business.monday','週一營業時間','09:00-18:00','可由各分店覆寫'),
 ('分店營運','business.tuesday','週二營業時間','09:00-18:00','可由各分店覆寫'),
 ('分店營運','business.wednesday','週三營業時間','09:00-18:00','可由各分店覆寫'),
 ('分店營運','business.thursday','週四營業時間','09:00-18:00','可由各分店覆寫'),
 ('分店營運','business.friday','週五營業時間','09:00-18:00','可由各分店覆寫'),
 ('分店營運','business.saturday','週六營業時間','09:00-18:00','可由各分店覆寫'),
 ('分店營運','business.sunday','週日營業時間','closed','可由各分店覆寫'),
 ('薪資獎金','payroll.overtime_multiplier','加班倍率','1.34','薪資計算參數'),
 ('薪資獎金','payroll.attendance_bonus','全勤獎金','0','薪資計算參數'),
 ('薪資獎金','payroll.leave_hour_deduction','請假每小時扣款','0','薪資計算參數'),
 ('PDF輸出','pdf.logo_url','PDF Logo 網址','','公司 Logo 公開網址'),
 ('全域參數','backup.retention_days','備份保留天數','30','自動清理逾期快照'),
 ('全域參數','backup.enabled','每日自動備份','true','由 Vercel Cron 執行')
) as v(category,setting_key,label,default_value,description)
where not exists(select 1 from public.system_settings s where s.tenant_id=t.id and s.shop_id is null and s.setting_key=v.setting_key);

do $$ declare t text; begin
  foreach t in array array['backup_jobs','restore_requests','system_settings'] loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.capture_audit_log()',t,t);
  end loop;
end $$;
