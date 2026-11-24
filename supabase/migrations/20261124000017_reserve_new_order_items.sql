-- AFTER INSERT runs only for the winning unique order number. Any error
-- rolls back the order, all inventory changes and the corresponding logs.
create function public.reserve_new_order_items()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  line jsonb;
  product public.products%rowtype;
  qty integer;
  unit bigint;
  subtotal bigint := 0;
  config jsonb;
  coupon jsonb;
  coupon_index integer;
  method jsonb;
  tariff jsonb;
  discount bigint := 0;
  fee bigint := 0;
  needs_receipt boolean;
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Buyurtma mahsulotlari topilmadi';
  end if;
  for line in select value from jsonb_array_elements(new.items) order by value->>'productId' loop
    qty := (line->>'quantity')::integer;
    if qty is null or qty <= 0 then raise exception 'Mahsulot soni notoʻgʻri'; end if;
    select * into product from public.products where id = line->>'productId' for update;
    if not found or product.status <> 'active' or product.stock < qty then
      raise exception 'Mahsulot qoldigʻi yetarli emas';
    end if;
    unit := coalesce(product.sale_price, product.price);
    if unit is distinct from (line->>'unitPrice')::bigint
      or unit * qty is distinct from (line->>'totalPrice')::bigint then
      raise exception 'Narx yangilangan. Savatchani yangilang';
    end if;
    subtotal := subtotal + unit * qty;
    update public.products set stock = stock - qty, sold_count = sold_count + qty,
      status = case when stock = qty then 'out_of_stock' else status end, updated_at = now()
      where id = product.id;
    insert into public.stock_logs(id,product_id,product_name,sku,previous_stock,new_stock,
      change_amount,reason,updated_by,created_at)
    values(gen_random_uuid()::text,product.id,product.name,product.sku,product.stock,
      product.stock-qty,-qty,'Buyurtma #' || new.order_number,'Tizim',now());
  end loop;
  -- Coupon counters share the settings row with the admin editor.
  if new.coupon_code is not null then
    select payload into config from public.store_settings where id=1 for update;
    select value, ordinality-1 into coupon, coupon_index
      from jsonb_array_elements(config->'coupons') with ordinality
      where upper(value->>'code')=upper(new.coupon_code) and (value->>'isActive')::boolean;
    if coupon is null or (coupon->>'usedCount')::int >= (coupon->>'usageLimit')::int
      or subtotal < (coupon->>'minOrderAmount')::bigint
      or nullif(coupon->>'expiresAt','')::timestamptz < now() then
      raise exception 'Promokod amal qilmaydi';
    end if;
    discount := case when coupon->>'discountType'='percentage'
      then round(subtotal*(coupon->>'discountValue')::numeric/100)
      else least(subtotal,(coupon->>'discountValue')::bigint) end;
    update public.store_settings set payload=jsonb_set(payload,
      array['coupons',coupon_index::text,'usedCount'],
      to_jsonb((coupon->>'usedCount')::int+1)), updated_at=clock_timestamp() where id=1;
  else
    select payload into config from public.store_settings where id=1;
  end if;
  select value into method from jsonb_array_elements(config->'paymentMethods')
    where value->>'id'=new.payment_method_id and (value->>'isEnabled')::boolean;
  if method is null then raise exception 'Toʻlov usuli faol emas'; end if;
  needs_receipt := coalesce((method->>'requiresReceipt')::boolean,method->>'type'='card_transfer');
  if (needs_receipt and (new.payment_receipt_path is null or new.payment_verification_status <> 'pending_verification'))
    or (not needs_receipt and new.payment_verification_status <> 'not_required') then
    raise exception 'Toʻlov cheki holati notoʻgʻri';
  end if;
  if (config#>>'{delivery,isDeliveryEnabled}')::boolean then
    select value into tariff from (
      select value, ordinality, case
      when strpos(lower(value->>'regionName'),lower(new.region))>0
        or strpos(lower(new.region),lower(value->>'regionName'))>0 then 0
      when lower(new.region)='toshkent shahri' and
        (value->>'id'='reg-tashkent' or lower(value->>'regionName') like '%toshkent sh%') then 1
      when lower(new.region)='toshkent viloyati' and
        (value->>'id'='reg-tashkent-vil' or lower(value->>'regionName') like '%viloyat%') then 1
      when lower(new.region) not in ('toshkent shahri','toshkent viloyati') and
        (value->>'id'='reg-regions' or lower(value->>'regionName') like '%boshqa%') then 1
      else 2 end as priority
      from jsonb_array_elements(config#>'{delivery,regions}') with ordinality
      where (value->>'isEnabled')::boolean
    ) rules where priority < 2 order by priority, ordinality limit 1;
    if tariff is not null and not (coalesce((tariff->>'freeDeliveryThreshold')::bigint,0)>0
      and subtotal-discount >= coalesce((tariff->>'freeDeliveryThreshold')::bigint,0)) then
      fee := (tariff->>'fee')::bigint;
    end if;
  end if;
  if new.discount_amount is distinct from discount or new.delivery_fee is distinct from fee then
    raise exception 'Chegirma yoki yetkazish narxi oʻzgargan';
  end if;
  if subtotal is distinct from new.subtotal or new.discount_amount not between 0 and subtotal
    or new.delivery_fee < 0 or new.total_amount is distinct from subtotal - new.discount_amount + new.delivery_fee then
    raise exception 'Buyurtma summasi oʻzgargan';
  end if;
  return new;
end;
$$;
revoke all on function public.reserve_new_order_items() from public;
create trigger reserve_new_order_items after insert on public.orders
for each row execute function public.reserve_new_order_items();
