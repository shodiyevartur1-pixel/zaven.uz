begin;

create or replace function public.is_store_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.owner_allowlist as allowlisted
    join auth.users as auth_user
      on auth_user.id = auth.uid()
    where auth_user.email_confirmed_at is not null
      and lower(trim(allowlisted.email)) = lower(trim(auth_user.email))
  );
$$;

revoke all on function public.is_store_owner()
  from public, anon, authenticated;
grant execute on function public.is_store_owner()
  to anon, authenticated, service_role;

drop policy if exists "owner_can_read_allowlist"
  on public.owner_allowlist;
create policy "owner_can_read_allowlist"
  on public.owner_allowlist
  for select
  to authenticated
  using (public.is_store_owner());

create or replace function public.is_verified_customer_profile(
  profile_auth_user_id uuid,
  profile_email text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = auth.uid()
      and auth_user.email_confirmed_at is not null
      and (
        profile_auth_user_id = auth_user.id
        or (
          profile_auth_user_id is null
          and profile_email is not null
          and lower(auth_user.email) = lower(profile_email)
        )
      )
  );
$$;

revoke all on function public.is_verified_customer_profile(uuid, text)
  from public, anon;
grant execute on function public.is_verified_customer_profile(uuid, text)
  to authenticated;

drop policy if exists "verified_customer_select_own_profile"
  on public.customers;
create policy "verified_customer_select_own_profile"
  on public.customers
  for select
  to authenticated
  using (
    public.is_store_owner()
    or public.is_verified_customer_profile(auth_user_id, email)
  );

drop policy if exists "verified_customer_insert_own_profile"
  on public.customers;
create policy "verified_customer_insert_own_profile"
  on public.customers
  for insert
  to authenticated
  with check (
    public.is_store_owner()
    or (
      auth_user_id = auth.uid()
      and public.is_verified_customer_profile(auth_user_id, email)
    )
  );

drop policy if exists "verified_customer_update_own_profile"
  on public.customers;
create policy "verified_customer_update_own_profile"
  on public.customers
  for update
  to authenticated
  using (
    public.is_store_owner()
    or public.is_verified_customer_profile(auth_user_id, email)
  )
  with check (
    public.is_store_owner()
    or (
      auth_user_id = auth.uid()
      and public.is_verified_customer_profile(auth_user_id, email)
    )
  );

commit;
