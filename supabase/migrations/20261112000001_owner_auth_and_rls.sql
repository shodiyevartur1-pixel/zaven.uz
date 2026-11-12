-- =============================================================================
-- ZAVEN SINGLE-STORE E-COMMERCE — OWNER AUTHENTICATION & RLS SECURITY SCHEMA
-- Migration: 20261112000001_owner_auth_and_rls.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. Single-Owner Allowlist Table
-- Only an authenticated Supabase user whose email exists in `public.owner_allowlist`
-- is recognized by PostgreSQL RLS policies as the store owner.
create table if not exists public.owner_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.owner_allowlist enable row level security;

-- Helper function used by all RLS policies to verify the single store owner
create or replace function public.is_store_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.owner_allowlist
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Only the verified owner can read the allowlist row
create policy "owner_can_read_allowlist"
  on public.owner_allowlist
  for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 2. Categories Table
create table if not exists public.categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon_name text not null default 'Home',
  image text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "public_read_active_categories"
  on public.categories
  for select
  to anon, authenticated
  using (is_active = true or public.is_store_owner());

create policy "owner_manage_categories"
  on public.categories
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

-- 3. Products Table
create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  sku text not null unique,
  name text not null,
  category_id text references public.categories(id) on delete set null,
  price bigint not null check (price >= 0),
  sale_price bigint check (sale_price is null or sale_price >= 0),
  cost_price bigint not null default 0 check (cost_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5,
  status text not null default 'active' check (status in ('active', 'out_of_stock', 'hidden', 'archived')),
  short_description text not null default '',
  description text not null default '',
  features jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '[]'::jsonb,
  translations jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  is_new boolean not null default false,
  is_popular boolean not null default false,
  is_recommended boolean not null default false,
  sold_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Public visitors can read only active or out_of_stock products; hidden/archived are owner-only
create policy "public_read_visible_products"
  on public.products
  for select
  to anon, authenticated
  using (status in ('active', 'out_of_stock') or public.is_store_owner());

create policy "owner_manage_products"
  on public.products
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

-- 4. Orders Table (Strictly private to the store owner; anonymous visitors cannot read orders)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  region text not null,
  address text not null,
  customer_note text,
  internal_notes jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal bigint not null check (subtotal >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  coupon_code text,
  delivery_fee bigint not null default 0 check (delivery_fee >= 0),
  total_amount bigint not null check (total_amount >= 0),
  payment_method_id text not null,
  payment_method_label text not null,
  payment_receipt_path text,
  payment_verification_status text not null default 'not_required'
    check (payment_verification_status in ('not_required', 'pending_verification', 'verified', 'rejected')),
  payment_reviewed_by text,
  payment_reviewed_at timestamptz,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Anonymous and regular customers CANNOT read, update, or delete orders directly.
-- Order creation happens through a validated Edge Function or controlled insert policy.
create policy "public_can_insert_order_only"
  on public.orders
  for insert
  to anon, authenticated
  with check (status = 'new');

create policy "owner_full_access_orders"
  on public.orders
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

-- 5. Customers Table (Strictly Owner-Only)
create table if not exists public.customers (
  id text primary key,
  full_name text not null,
  phone text not null,
  email text,
  addresses jsonb not null default '[]'::jsonb,
  order_count integer not null default 0,
  total_spent bigint not null default 0,
  last_order_date timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "owner_only_customers"
  on public.customers
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

-- 6. Customer Inquiries Table
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  subject text not null default '',
  message text not null,
  status text not null default 'unread' check (status in ('unread', 'read', 'replied')),
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

create policy "public_submit_inquiry"
  on public.inquiries
  for insert
  to anon, authenticated
  with check (status = 'unread');

create policy "owner_manage_inquiries"
  on public.inquiries
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

-- 7. Stock Logs, Coupons, Banners & Store Settings
create table if not exists public.stock_logs (
  id text primary key,
  product_id text not null,
  product_name text not null,
  sku text not null,
  previous_stock integer not null,
  new_stock integer not null,
  change_amount integer not null,
  reason text not null,
  updated_by text not null,
  created_at timestamptz not null default now()
);

alter table public.stock_logs enable row level security;

create policy "owner_only_stock_logs"
  on public.stock_logs
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

create policy "public_read_store_settings"
  on public.store_settings
  for select
  to anon, authenticated
  using (true);

create policy "owner_update_store_settings"
  on public.store_settings
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

-- 8. Private Storage Bucket for Payment Receipts (Prepared for Phase 4)
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

create policy "owner_read_all_receipts"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'payment-receipts' and public.is_store_owner());