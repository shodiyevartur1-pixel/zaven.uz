begin;

create table if not exists public.admin_assignments (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  email text not null,
  name text not null default '',
  role text not null default 'admin'
    check (role in ('owner', 'admin', 'order_manager', 'content_manager')),
  permissions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

alter table public.admin_assignments enable row level security;

drop policy if exists owner_manage_admin_assignments on public.admin_assignments;
create policy owner_manage_admin_assignments
  on public.admin_assignments
  for all
  to authenticated
  using (public.is_store_owner())
  with check (public.is_store_owner());

grant select, insert, update, delete on public.admin_assignments to authenticated;

create or replace function public.recalculate_customer_totals(p_customer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone text;
begin
  select lower(coalesce(email, '')), regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
  into v_email, v_phone
  from public.customers
  where id = p_customer_id;

  update public.customers c
  set
    order_count = (
      select count(*)
      from public.orders o
      where coalesce(o.is_deleted, false) = false
        and (
          (o.customer_email is not null and lower(o.customer_email) = v_email)
          or (regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g') = v_phone)
        )
    ),
    total_spent = (
      select coalesce(sum(o.total_amount), 0)
      from public.orders o
      where coalesce(o.is_deleted, false) = false
        and o.status <> 'cancelled'
        and (
          (o.customer_email is not null and lower(o.customer_email) = v_email)
          or (regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g') = v_phone)
        )
    ),
    last_order_date = (
      select max(o.created_at)
      from public.orders o
      where coalesce(o.is_deleted, false) = false
        and (
          (o.customer_email is not null and lower(o.customer_email) = v_email)
          or (regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g') = v_phone)
        )
    )
  where c.id = p_customer_id;
end;
$$;

revoke all on function public.recalculate_customer_totals(text) from public;
grant execute on function public.recalculate_customer_totals(text) to service_role;

commit;
notify pgrst, 'reload schema';
