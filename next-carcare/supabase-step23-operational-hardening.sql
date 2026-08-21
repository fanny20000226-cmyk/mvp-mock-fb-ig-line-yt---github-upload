begin;

create table if not exists public.user_todo_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  todo_id text not null,
  state text not null check (state in ('done','snoozed','error')),
  snoozed_until timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, todo_id)
);

create index if not exists idx_user_todo_states_scope on public.user_todo_states(tenant_id, shop_id, user_id, updated_at desc);
alter table public.user_todo_states enable row level security;

drop policy if exists user_todo_states_own_or_management on public.user_todo_states;
create policy user_todo_states_own_or_management on public.user_todo_states
for all to authenticated
using (
  user_id = auth.uid()
  or (
    public.is_management()
    and tenant_id in (select tenant_id from public.current_profile())
    and (shop_id is null or shop_id in (select shop_id from public.current_profile()) or exists(select 1 from public.current_profile() where role='admin'))
  )
)
with check (
  user_id = auth.uid()
  and tenant_id in (select tenant_id from public.current_profile())
  and (shop_id is null or shop_id in (select shop_id from public.current_profile()) or exists(select 1 from public.current_profile() where role='admin'))
);

drop trigger if exists audit_user_todo_states on public.user_todo_states;
create trigger audit_user_todo_states
after insert or update or delete on public.user_todo_states
for each row execute function public.capture_audit_log();

commit;
