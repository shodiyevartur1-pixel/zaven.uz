-- Repairs two dependencies used by Admin Settings and product/category image uploads.
-- Run after 20261112000001_owner_auth_and_rls.sql (which defines is_store_owner()).
begin;

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

drop policy if exists public_read_store_settings on public.store_settings;
create policy public_read_store_settings
  on public.store_settings for select to anon, authenticated using (true);

drop policy if exists owner_update_store_settings on public.store_settings;
create policy owner_update_store_settings
  on public.store_settings for all to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_read_product_images on storage.objects;
create policy public_read_product_images
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists owner_manage_product_images on storage.objects;
create policy owner_manage_product_images
  on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and public.is_store_owner())
  with check (bucket_id = 'product-images' and public.is_store_owner());

commit;

notify pgrst, 'reload schema';
