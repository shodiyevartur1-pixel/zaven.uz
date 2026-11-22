begin;

alter table public.orders
  add column if not exists idempotency_payload_hash text;

alter table public.orders
  drop constraint if exists orders_idempotency_payload_hash_format_check;

alter table public.orders
  add constraint orders_idempotency_payload_hash_format_check
  check (
    idempotency_payload_hash is null
    or idempotency_payload_hash ~ '^[0-9a-f]{64}$'
  );

create index if not exists idx_orders_active_created_at
  on public.orders (created_at desc)
  where is_deleted = false;

create index if not exists idx_orders_customer_email_created_at
  on public.orders (lower(customer_email), created_at desc)
  where customer_email is not null;

create index if not exists idx_orders_customer_phone_created_at
  on public.orders (customer_phone, created_at desc);

create index if not exists idx_products_visible_created_at
  on public.products (status, created_at desc);

create index if not exists idx_customers_created_at
  on public.customers (created_at desc);

create index if not exists idx_stock_logs_created_at
  on public.stock_logs (created_at desc);

create index if not exists idx_inquiries_created_at
  on public.inquiries (created_at desc);

grant insert on public.inquiries to anon, authenticated;

commit;

notify pgrst, 'reload schema';
