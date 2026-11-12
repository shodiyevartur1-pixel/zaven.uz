-- =============================================================================
-- ZAVEN PHASE 4 MIGRATION: BANK TRANSFER RECEIPTS & TELEGRAM AUDIT COLUMNS
-- Migration: 20261112000002_bank_transfer_receipts.sql
-- =============================================================================

alter table public.orders
  add column if not exists payment_receipt_filename text,
  add column if not exists payment_receipt_mime text,
  add column if not exists payment_receipt_size integer,
  add column if not exists payment_review_note text,
  add column if not exists telegram_notification_status text not null default 'not_configured'
    check (telegram_notification_status in ('not_configured', 'sent', 'failed')),
  add column if not exists telegram_notification_error text;

-- Ensure private `payment-receipts` bucket exists and enforces 5 MB file limit
-- and strict MIME types (JPG, PNG, WEBP, PDF)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Only the verified single store owner can read or delete objects in `payment-receipts`
drop policy if exists "owner_manage_payment_receipts" on storage.objects;
create policy "owner_manage_payment_receipts"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'payment-receipts' and public.is_store_owner())
  with check (bucket_id = 'payment-receipts' and public.is_store_owner());