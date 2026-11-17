-- Durable admin archive, customer moderation, and inquiry replies.
begin;

alter table public.orders
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table public.customers
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_reason text,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table public.inquiries
  add column if not exists reply_message text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by text,
  add column if not exists reply_delivery_method text;

-- No caller-supplied identifiers: this helper only checks the signed-in JWT.
create or replace function public.is_current_caller_blocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null and coalesce(auth.jwt() ->> 'email', '') = '' then false
    else exists (
      select 1
      from public.customers c
      where (c.is_blocked or c.is_deleted)
        and (
          (auth.uid() is not null and c.auth_user_id = auth.uid())
          or (coalesce(auth.jwt() ->> 'email', '') <> ''
              and lower(coalesce(c.email, '')) = lower(auth.jwt() ->> 'email'))
        )
    )
  end;
$$;

revoke all on function public.is_current_caller_blocked() from public;
grant execute on function public.is_current_caller_blocked() to anon, authenticated, service_role;

drop policy if exists "Block banned customers from inserting orders" on public.orders;
create policy "Block banned customers from inserting orders"
  on public.orders
  as restrictive
  for insert
  to anon, authenticated
  with check (not public.is_current_caller_blocked());

commit;
