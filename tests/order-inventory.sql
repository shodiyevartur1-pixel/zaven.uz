-- Run only in a disposable PostgreSQL database, after the inventory migration.
-- This fixture uses the real order trigger with independent transactions
-- simulated by exception subtransactions for rejected writes.
begin;
insert into public.store_settings(id,payload) values (1,'{"paymentMethods":[{"id":"test","type":"cash","isEnabled":true}]}')
on conflict(id) do update set payload=excluded.payload;
insert into public.products(id,slug,sku,name,price,stock) values
 ('regression-last','regression-last','REGRESSION-LAST','Test',2500,1);
do $$
declare
  payload jsonb := '[{"productId":"regression-last","quantity":1,"unitPrice":2500,"totalPrice":2500}]';
begin
  insert into public.orders(order_number,customer_name,customer_phone,region,address,items,subtotal,delivery_fee,total_amount,payment_method_id,payment_method_label)
  values ('REGRESSION-1','Test','000','Test','Test',payload,2500,0,2500,'test','Test');
  begin
    insert into public.orders select * from public.orders where order_number='REGRESSION-1';
    raise exception 'Expected duplicate rejection';
  exception when unique_violation then null;
  end;
  begin
    insert into public.orders(order_number,customer_name,customer_phone,region,address,items,subtotal,delivery_fee,total_amount,payment_method_id,payment_method_label)
    values ('REGRESSION-2','Test','000','Test','Test',payload,2500,0,2500,'test','Test');
    raise exception 'Expected out of stock';
  exception when raise_exception then
    if sqlerrm <> 'Mahsulot qoldigʻi yetarli emas' then raise; end if;
  end;
  if (select stock from public.products where id='regression-last') <> 0
    or (select count(*) from public.stock_logs where product_id='regression-last') <> 1
    or (select count(*) from public.orders where order_number in ('REGRESSION-1','REGRESSION-2')) <> 1 then
    raise exception 'Inventory, log or order count diverged';
  end if;
end;
$$;
rollback;
