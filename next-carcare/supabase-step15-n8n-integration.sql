create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.n8n_connection_settings (
  id uuid primary key default gen_random_uuid(),
  webhook_url text,
  callback_webhook_url text,
  is_enabled boolean not null default false,
  test_status text,
  last_test_at timestamptz,
  last_test_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_n8n_connection_settings_updated_at on public.n8n_connection_settings;
create trigger set_n8n_connection_settings_updated_at
before update on public.n8n_connection_settings
for each row execute function public.set_updated_at();

create table if not exists public.n8n_callback_logs (
  id uuid primary key default gen_random_uuid(),
  event_no text not null,
  event_type text,
  callback_time timestamptz not null default now(),
  receiver text,
  message_content text,
  callback_status text not null default 'pending',
  error_note text,
  store_id uuid,
  work_order_id text,
  plate text,
  model text,
  n8n_execution_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_n8n_callback_logs_event_no on public.n8n_callback_logs(event_no);
create index if not exists idx_n8n_callback_logs_status_time on public.n8n_callback_logs(callback_status, callback_time desc);

drop trigger if exists set_n8n_callback_logs_updated_at on public.n8n_callback_logs;
create trigger set_n8n_callback_logs_updated_at
before update on public.n8n_callback_logs
for each row execute function public.set_updated_at();

create table if not exists public.n8n_event_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  event_no text not null,
  event_type text not null,
  store_id uuid,
  staff_info jsonb not null default '{}'::jsonb,
  work_order_id text,
  plate text,
  model text,
  content_params jsonb not null default '{}'::jsonb,
  dispatch_status text not null default 'pending',
  response_status integer,
  response_body jsonb not null default '{}'::jsonb,
  error_message text,
  dispatched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_n8n_dispatch_event on public.n8n_event_dispatch_logs(event_no);
create index if not exists idx_n8n_dispatch_type_time on public.n8n_event_dispatch_logs(event_type, dispatched_at desc);

drop trigger if exists set_n8n_event_dispatch_logs_updated_at on public.n8n_event_dispatch_logs;
create trigger set_n8n_event_dispatch_logs_updated_at
before update on public.n8n_event_dispatch_logs
for each row execute function public.set_updated_at();

create table if not exists public.n8n_event_dedup (
  id uuid primary key default gen_random_uuid(),
  dedup_key text not null unique,
  event_no text not null,
  work_order_id text,
  event_type text not null,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.n8n_connection_settings enable row level security;
alter table public.n8n_callback_logs enable row level security;
alter table public.n8n_event_dispatch_logs enable row level security;
alter table public.n8n_event_dedup enable row level security;

drop policy if exists "authenticated manage n8n settings" on public.n8n_connection_settings;
create policy "authenticated manage n8n settings"
on public.n8n_connection_settings
for all to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read n8n callback logs" on public.n8n_callback_logs;
create policy "authenticated read n8n callback logs"
on public.n8n_callback_logs
for select to authenticated
using (true);

drop policy if exists "service role manage n8n callback logs" on public.n8n_callback_logs;
create policy "service role manage n8n callback logs"
on public.n8n_callback_logs
for all to service_role
using (true)
with check (true);

drop policy if exists "authenticated read n8n dispatch logs" on public.n8n_event_dispatch_logs;
create policy "authenticated read n8n dispatch logs"
on public.n8n_event_dispatch_logs
for select to authenticated
using (true);

drop policy if exists "service role manage n8n dispatch logs" on public.n8n_event_dispatch_logs;
create policy "service role manage n8n dispatch logs"
on public.n8n_event_dispatch_logs
for all to service_role
using (true)
with check (true);

drop policy if exists "service role manage n8n dedup" on public.n8n_event_dedup;
create policy "service role manage n8n dedup"
on public.n8n_event_dedup
for all to service_role
using (true)
with check (true);

drop table if exists public.line_notify_settings;
drop table if exists public.line_notify_logs;
