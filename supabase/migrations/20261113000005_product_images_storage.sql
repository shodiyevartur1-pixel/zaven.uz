-- =============================================================================
-- ZAVEN MIGRATION 0005: PUBLIC PRODUCT IMAGES STORAGE BUCKET & OWNER POLICIES
-- Migration: 20261113000005_product_images_storage.sql
-- =============================================================================

begin;

-- 1. Create public-read `product-images` bucket (4 MB limit, JPG/PNG/WEBP only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 4194304,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Public visitors can view product images
drop policy if exists "public_read_product_images" on storage.objects;
create policy "public_read_product_images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- 3. Only the verified single store owner can upload, update, or delete product images
drop policy if exists "owner_manage_product_images" on storage.objects;
create policy "owner_manage_product_images"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'product-images' and public.is_store_owner())
  with check (bucket_id = 'product-images' and public.is_store_owner());

commit;
