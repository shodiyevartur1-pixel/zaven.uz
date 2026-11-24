create or replace function public.remove_store_category(source_id text, destination_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_store_owner() then
    raise exception 'Owner authorization required' using errcode = '42501';
  end if;
  if destination_id = source_id then
    raise exception 'Choose a different destination category';
  end if;
  -- Lock in a stable order and prevent new product references during removal.
  perform id from public.categories where id in (source_id, destination_id)
    order by id for update;
  if not exists (select 1 from public.categories where id = source_id) then
    raise exception 'Source category no longer exists';
  end if;
  if destination_id is null then
    if exists (select 1 from public.products where category_id = source_id) then
      raise exception 'Select a destination for existing products';
    end if;
  else
    if not exists (select 1 from public.categories where id = destination_id) then
      raise exception 'Destination category no longer exists';
    end if;
    update public.products set category_id = destination_id, updated_at = now()
      where category_id = source_id;
  end if;
  delete from public.categories where id = source_id;
  if not found then raise exception 'Category removal failed'; end if;
end;
$$;
revoke all on function public.remove_store_category(text,text) from public, anon;
grant execute on function public.remove_store_category(text,text) to authenticated;
