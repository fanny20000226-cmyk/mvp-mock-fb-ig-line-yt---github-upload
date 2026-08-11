-- Fix N8N report views for anon-key read-only access.
-- N8N uses SUPABASE_ANON_KEY, so report views must not require table-level RLS access.

create or replace view public.n8n_customers_report
with (security_invoker = false) as
select
  id,
  name,
  phone,
  store_id,
  created_at,
  updated_at
from public.customers;

create or replace view public.n8n_cars_report
with (security_invoker = false) as
select
  id,
  license_plate,
  brand,
  model,
  customer_id,
  store_id,
  updated_at
from public.cars;

create or replace view public.n8n_quotations_report
with (security_invoker = false) as
select
  id,
  order_no,
  customer_id,
  car_id,
  store_id,
  total_amount,
  technician_id,
  status,
  created_at,
  updated_at
from public.quotations;

create or replace view public.n8n_reservations_report
with (security_invoker = false) as
select
  id,
  store_id,
  car_id,
  reserve_datetime,
  project,
  status,
  created_at,
  updated_at
from public.reservations;

create or replace view public.n8n_transaction_record_report
with (security_invoker = false) as
select
  id,
  store_id,
  quotation_id,
  pay_amount,
  pay_time,
  pay_method,
  created_at,
  updated_at
from public.transaction_record;

grant usage on schema public to anon, authenticated, service_role;

grant select on
  public.n8n_customers_report,
  public.n8n_cars_report,
  public.n8n_quotations_report,
  public.n8n_reservations_report,
  public.n8n_transaction_record_report
to anon, authenticated, service_role;

revoke insert, update, delete, truncate on
  public.customers,
  public.cars,
  public.quotations,
  public.reservations,
  public.transaction_record
from anon;
