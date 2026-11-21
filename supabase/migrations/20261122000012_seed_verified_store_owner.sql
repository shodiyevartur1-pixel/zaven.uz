-- Add only the explicitly verified Supabase Auth owner to the RLS allowlist.
-- Replace the placeholder before running this migration in Supabase SQL Editor.
begin;

do $$
declare
  v_owner_email text := lower(trim('REPLACE_WITH_VERIFIED_OWNER_EMAIL'));
  v_verified_email text;
begin
  if v_owner_email = 'replace_with_verified_owner_email' then
    raise exception 'Replace the owner email placeholder before running this migration';
  end if;

  select lower(email)
    into v_verified_email
    from auth.users
   where lower(email) = v_owner_email
     and email_confirmed_at is not null;

  if v_verified_email is null then
    raise exception 'The supplied owner email is not a verified Supabase Auth user';
  end if;

  insert into public.owner_allowlist (email)
  values (v_verified_email)
  on conflict (email) do nothing;
end
$$;

commit;
