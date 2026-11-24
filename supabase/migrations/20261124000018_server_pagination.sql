create or replace function public.catalog_page(
  category text, term text, locale text, min_price numeric, max_price numeric,
  discounted boolean, new_only boolean, in_stock boolean, sort_key text,
  page_start integer, page_size integer
) returns jsonb language sql stable security invoker set search_path = '' as $$
  with matches as (
    select p.*,
      coalesce(p.sale_price,p.price) as effective_price,
      case when p.sale_price > 0 and p.sale_price < p.price
        then round((p.price-p.sale_price)::numeric * 100 / p.price) else 0 end as discount
    from public.products p
    where p.status in ('active','out_of_stock')
      and (category is null or p.category_id = category)
      and (coalesce(term,'') = '' or
        strpos(lower(p.name), lower(term)) > 0 or
        strpos(lower(p.sku), lower(term)) > 0 or
        strpos(lower(p.short_description), lower(term)) > 0 or
        strpos(lower(p.translations #>> array[locale,'name']), lower(term)) > 0 or
        strpos(lower(p.translations #>> array[locale,'shortDescription']), lower(term)) > 0)
      and (min_price is null or coalesce(p.sale_price,p.price) >= min_price)
      and (max_price is null or coalesce(p.sale_price,p.price) <= max_price)
      and (not discounted or (p.sale_price > 0 and p.sale_price < p.price))
      and (not new_only or p.is_new)
      and (not in_stock or (p.status = 'active' and p.stock > 0))
  ), page as (
    select m.* from matches m
    order by case when sort_key='price_asc' then effective_price end asc,
      case when sort_key='price_desc' then effective_price end desc,
      case when sort_key='discount' then discount end desc,
      case when sort_key not in ('newest','price_asc','price_desc','discount') then sold_count end desc,
      created_at desc, id asc
    offset greatest(page_start,0) limit least(greatest(page_size,1),100)
  )
  select jsonb_build_object('total',(select count(*) from matches),
    'rows',coalesce((select jsonb_agg(to_jsonb(page) - array['cost_price','effective_price','discount']) from page),'[]'::jsonb));
$$;

create or replace function public.admin_order_page(
  archived boolean, wanted_status text, wanted_payment text, term text, page_start integer
) returns setof public.orders language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_store_owner() then
    raise exception 'Owner authorization required' using errcode = '42501';
  end if;
  return query select o.* from public.orders o
    where o.is_deleted = archived
      and (wanted_status = 'all' or o.status = wanted_status)
      and (wanted_payment = 'all' or o.payment_verification_status = wanted_payment)
      and (coalesce(term,'') = '' or strpos(lower(o.order_number),lower(term)) > 0
        or strpos(lower(o.customer_name),lower(term)) > 0
        or strpos(lower(o.customer_phone),lower(term)) > 0
        or strpos(lower(o.customer_email),lower(term)) > 0
        or strpos(lower(o.customer_telegram),lower(term)) > 0)
    order by o.created_at desc, o.id desc
    offset greatest(page_start,0) limit 26;
end;
$$;
revoke all on function public.catalog_page(text,text,text,numeric,numeric,boolean,boolean,boolean,text,integer,integer) from public;
grant execute on function public.catalog_page(text,text,text,numeric,numeric,boolean,boolean,boolean,text,integer,integer) to anon, authenticated;
revoke all on function public.admin_order_page(boolean,text,text,text,integer) from public, anon;
grant execute on function public.admin_order_page(boolean,text,text,text,integer) to authenticated;
