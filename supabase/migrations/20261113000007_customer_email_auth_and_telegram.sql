-- =============================================================================
-- ZAVEN MIGRATION 0007: CUSTOMER EMAIL AUTH PROFILE LINKING & OPTIONAL TELEGRAM
-- Migration: 20261113000007_customer_email_auth_and_telegram.sql
-- Layers cleanly after 0001, 0002, 0003, 0005, and 0006 without altering owner RLS.
-- =============================================================================

begin;

-- 1. Add optional customer_telegram column to public.orders
alter table public.orders
  add column if not exists customer_telegram text;

alter table public.orders
  drop constraint if exists orders_customer_telegram_format_check;

alter table public.orders
  add constraint orders_customer_telegram_format_check
  check (
    customer_telegram is null
    or customer_telegram ~ '^@[A-Za-z0-9_]{5,32}$'
  );

comment on column public.orders.customer_telegram is
  'Optional normalized Telegram username (@username) provided by customer at checkout.';

-- 2. Add auth_user_id, email_verified, and telegram_username to public.customers
alter table public.customers
  add column if not exists auth_user_id uuid,
  add column if not exists email_verified boolean not null default false,
  add column if not exists telegram_username text;

create index if not exists idx_customers_auth_user_id
  on public.customers (auth_user_id);

create index if not exists idx_customers_lower_email
  on public.customers (lower(email));

-- 3. Preserve single-owner full access while allowing verified customers to read/update
--    their own customer profile row (never grants access to other customers or admin tables)
drop policy if exists "verified_customer_select_own_profile" on public.customers;
create policy "verified_customer_select_own_profile"
  on public.customers
  for select
  to authenticated
  using (
    public.is_store_owner()
    or (
      auth.uid() is not null
      and (
        auth_user_id = auth.uid()
        or (
          email is not null
          and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      )
    )
  );

drop policy if exists "verified_customer_insert_own_profile" on public.customers;
create policy "verified_customer_insert_own_profile"
  on public.customers
  for insert
  to authenticated
  with check (
    public.is_store_owner()
    or (
      auth.uid() is not null
      and lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "verified_customer_update_own_profile" on public.customers;
create policy "verified_customer_update_own_profile"
  on public.customers
  for update
  to authenticated
  using (
    public.is_store_owner()
    or (
      auth.uid() is not null
      and (
        auth_user_id = auth.uid()
        or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  )
  with check (
    public.is_store_owner()
    or (
      auth.uid() is not null
      and (
        auth_user_id = auth.uid()
        or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  );

-- 4. Allow authenticated customers to read their own orders by matching verified email
--    (Store owner keeps full SELECT/UPDATE/DELETE via existing owner_manage_orders policy)
drop policy if exists "verified_customer_select_own_orders" on public.orders;
create policy "verified_customer_select_own_orders"
  on public.orders
  for select
  to authenticated
  using (
    public.is_store_owner()
    or (
      customer_email is not null
      and lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

commit;
