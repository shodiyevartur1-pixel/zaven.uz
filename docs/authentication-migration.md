# Authentication migration notes

## Current authentication boundary

- Customers continue to use Supabase email/password authentication and email confirmation.
- Customer profile access is tied to the verified Auth session (`auth_user_id`), with email matching retained for existing profile migration.
- Store-owner access is separate: the admin UI checks `is_store_owner()`, which checks the signed-in email against `public.owner_allowlist`. Customer authentication changes must not grant admin access.
- The owner setup migration is `supabase/migrations/20261122000012_seed_verified_store_owner.sql`. Before running it in the confirmed Supabase project, replace its placeholder with the verified owner's Auth email. It deliberately refuses to run for an unverified or missing Auth user.

## Later phone/SMS customer sign-in

Do not enable this until the SMS provider and a staging environment are ready.

1. In Supabase Dashboard for the existing project, configure **Authentication → Providers → Phone**, select and configure the SMS provider, and set its required credentials in the dashboard. Never place provider credentials in `VITE_*` variables or browser code.
2. Configure phone OTP limits, abuse protection, and the production and staging redirect URLs in **Authentication → URL Configuration**. Test delivery, rate limits, and account recovery in staging first.
3. Keep email/password sign-in enabled during a transition period. Add a phone sign-in UI that uses Supabase `signInWithOtp({ phone })` and `verifyOtp({ phone, token, type: 'sms' })`; do not treat an unverified phone as an identity.
4. Link a verified phone-auth session to a customer profile by the immutable Auth user ID. Never link accounts by an unverified phone number or silently merge records based only on a phone match. Preserve existing profile IDs, email addresses, addresses, order history, and password recovery during migration.
5. Add a reviewed, idempotent database migration for any new phone fields, uniqueness rules, and backfill. Update customer RLS to authorize only `auth.uid() = customers.auth_user_id`; retain owner access through `is_store_owner()`. Do not replace these policies with broad authenticated access.
6. Link order history to the Auth user ID in a migration and update account queries to use that verified relation. Keep phone and email as contact data rather than authorization keys.
7. Test registration, OTP resend/expiry, refresh/session restoration, logout, profile edits, address edits, account linking, and RLS isolation with separate customer accounts before considering email confirmation changes.
8. Only after the dual-provider flow is verified should product decisions be made about email confirmation. Do not remove confirmation or switch customer providers as part of this preparation.

If owner authentication ever changes, design and review a separate owner-identity migration and owner provisioning flow. Do not derive owner privileges from customer phone/SMS configuration or customer profile fields.
