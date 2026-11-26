begin;

-- Admin product CRUD needs table privileges as well as the existing RLS policy.
-- RLS remains enabled and owner_manage_products continues to authorize only
-- authenticated store owners through public.is_store_owner().
grant select, insert, update, delete on table public.products to authenticated;

commit;

notify pgrst, 'reload schema';
