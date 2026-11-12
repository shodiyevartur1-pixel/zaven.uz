import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
const configuredOwnerEmail = (
  import.meta.env.VITE_OWNER_EMAIL?.trim() || ''
).toLowerCase();

/**
 * True only when the owner has supplied valid Supabase project credentials in `.env.local`
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project')
);

/**
 * True ONLY during local `vite` development (`import.meta.env.DEV === true`)
 * AND when `VITE_ENABLE_DEV_DEMO_AUTH` is not explicitly set to `"false"`.
 * In production builds (`npm run build`), `import.meta.env.PROD` is true and this is ALWAYS false.
 */
export const isDevDemoAuthAllowed =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_DEV_DEMO_AUTH !== 'false';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getConfiguredOwnerEmail(): string {
  return configuredOwnerEmail;
}