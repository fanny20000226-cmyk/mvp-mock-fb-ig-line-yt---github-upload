alter table public.quotations
add column if not exists notify_sent boolean not null default false;

create table if not exists public.notify_logs (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid null references public.quotations(id) on delete set null,
  customer_id uuid null,
  store_id uuid null references public.shops(id) on delete set null,
  customer_phone text not null default '',
  send_content text not null,
  photo_link text null,
  send_time timestamptz not null default now(),
  send_status text not null default '成功',
  auto_remind_date timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid null references public.shops(id) on delete set null,
  template_key text not null,
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, template_key)
);

insert into public.notification_templates (shop_id, template_key, title, content)
values
  (null, 'pickup_first', '初次完工通知', '【PEIWAY汽車美容】您好，您的車輛已施工完畢，可前來取車，施工照片：{圖片連結}，如有問題可致電門市。'),
  (null, 'pickup_second', '逾期二次提醒', '【PEIWAY提醒】您的車輛已完工多日，請盡速至門市牽車，如有需求可預約到店時間。')
on conflict (shop_id, template_key) do nothing;

create index if not exists idx_notify_logs_store_time on public.notify_logs(store_id, send_time desc);
create index if not exists idx_notify_logs_quotation on public.notify_logs(quotation_id);

alter table public.notify_logs enable row level security;
alter table public.notification_templates enable row level security;

drop policy if exists notify_logs_admin_all on public.notify_logs;
drop policy if exists notify_logs_same_shop_select on public.notify_logs;
drop policy if exists notify_logs_same_shop_insert on public.notify_logs;
drop policy if exists notify_templates_admin_manager_all on public.notification_templates;
drop policy if exists notify_templates_same_shop_select on public.notification_templates;

create policy notify_logs_admin_all on public.notify_logs
for all using (
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

create policy notify_logs_same_shop_select on public.notify_logs
for select using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('shop_manager','vice_manager','finance')
      and u.shop_id = notify_logs.store_id
  )
);

create policy notify_logs_same_shop_insert on public.notify_logs
for insert with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('shop_manager','vice_manager')
      and u.shop_id = notify_logs.store_id
  )
);

create policy notify_templates_admin_manager_all on public.notification_templates
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (
        u.role = 'admin'
        or (u.role in ('shop_manager','vice_manager') and (notification_templates.shop_id is null or u.shop_id = notification_templates.shop_id))
      )
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (
        u.role = 'admin'
        or (u.role in ('shop_manager','vice_manager') and (notification_templates.shop_id is null or u.shop_id = notification_templates.shop_id))
      )
  )
);

create policy notify_templates_same_shop_select on public.notification_templates
for select using (
  shop_id is null
  or exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.shop_id = notification_templates.shop_id
  )
);
