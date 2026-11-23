begin;

grant select on public.products to authenticated;
grant update (stock, low_stock_threshold, status, updated_at)
  on public.products to authenticated;
grant insert on public.stock_logs to authenticated;

drop policy if exists owner_manage_products on public.products;
create policy owner_manage_products
  on public.products
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

drop policy if exists owner_only_stock_logs on public.stock_logs;
create policy owner_only_stock_logs
  on public.stock_logs
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

create or replace function public.update_product_inventory(
  p_product_id text,
  p_new_stock integer,
  p_low_stock_threshold integer,
  p_reason text default null
)
returns table (
  stock_log_id text,
  product_id text,
  product_name text,
  sku text,
  previous_stock integer,
  new_stock integer,
  low_stock_threshold integer,
  change_amount integer,
  reason text,
  updated_by text,
  status text,
  created_at timestamptz,
  product_updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_name text;
  v_sku text;
  v_previous_stock integer;
  v_previous_status text;
  v_status text;
  v_reason text;
  v_updated_by text;
  v_stock_log_id text;
  v_created_at timestamptz;
  v_product_updated_at timestamptz;
begin
  if not public.is_store_owner() then
    raise exception 'Store owner authorization required'
      using errcode = '42501';
  end if;

  if p_new_stock is null or p_new_stock < 0
    or p_low_stock_threshold is null or p_low_stock_threshold < 1 then
    raise exception 'Stock and minimum threshold must be valid non-negative integers'
      using errcode = '22023';
  end if;

  select product.name, product.sku, product.stock, product.status
    into v_product_name, v_sku, v_previous_stock, v_previous_status
    from public.products as product
    where product.id = p_product_id
    for update;

  if not found then
    raise exception 'Product not found or not accessible'
      using errcode = 'P0002';
  end if;

  v_status := case
    when p_new_stock = 0 and v_previous_status = 'active' then 'out_of_stock'
    when p_new_stock > 0 and v_previous_status = 'out_of_stock' then 'active'
    else v_previous_status
  end;
  v_reason := coalesce(
    nullif(btrim(coalesce(p_reason, '')), ''),
    'Admin tomonidan zaxira yangilandi'
  );
  v_updated_by := coalesce(
    nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''),
    'Store Owner'
  );
  v_created_at := now();

  update public.products as product
    set stock = p_new_stock,
        low_stock_threshold = p_low_stock_threshold,
        status = v_status,
        updated_at = v_created_at
    where product.id = p_product_id
    returning product.updated_at into v_product_updated_at;

  v_stock_log_id := gen_random_uuid()::text;
  insert into public.stock_logs (
    id,
    product_id,
    product_name,
    sku,
    previous_stock,
    new_stock,
    change_amount,
    reason,
    updated_by,
    created_at
  )
  values (
    v_stock_log_id,
    p_product_id,
    v_product_name,
    v_sku,
    v_previous_stock,
    p_new_stock,
    p_new_stock - v_previous_stock,
    v_reason,
    v_updated_by,
    v_created_at
  );

  return query
    select v_stock_log_id,
           p_product_id,
           v_product_name,
           v_sku,
           v_previous_stock,
           p_new_stock,
           p_low_stock_threshold,
           p_new_stock - v_previous_stock,
           v_reason,
           v_updated_by,
           v_status,
           v_created_at,
           v_product_updated_at;
end;
$$;

revoke all on function public.update_product_inventory(text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.update_product_inventory(text, integer, integer, text)
  to authenticated;

commit;

notify pgrst, 'reload schema';
