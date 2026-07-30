create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.system_test_runs (
  id uuid primary key default gen_random_uuid(),
  run_no text not null unique,
  mode text not null default 'manual',
  status text not null default 'running',
  n8n_status text not null default 'not_run',
  n8n_event_no text,
  n8n_response jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  report jsonb not null default '[]'::jsonb,
  test_payload jsonb not null default '{}'::jsonb,
  cleanup_report jsonb not null default '[]'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_system_test_runs_started_at
on public.system_test_runs(started_at desc);

create index if not exists idx_system_test_runs_status
on public.system_test_runs(status, n8n_status);

drop trigger if exists set_system_test_runs_updated_at on public.system_test_runs;
create trigger set_system_test_runs_updated_at
before update on public.system_test_runs
for each row execute function public.set_updated_at();

alter table public.system_test_runs enable row level security;

drop policy if exists "authenticated read system test runs" on public.system_test_runs;
create policy "authenticated read system test runs"
on public.system_test_runs
for select to authenticated
using (true);

drop policy if exists "service role manage system test runs" on public.system_test_runs;
create policy "service role manage system test runs"
on public.system_test_runs
for all to service_role
using (true)
with check (true);
