begin;

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
