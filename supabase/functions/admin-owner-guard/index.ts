// =============================================================================
// ZAVEN SUPABASE EDGE FUNCTION: admin-owner-guard
// Verifies on the server that the caller holds a valid Supabase JWT AND that
// their email matches the single store owner allowlist.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const envAllowedOwnerEmail = (
      Deno.env.get('OWNER_ALLOWED_EMAIL') || ''
    ).toLowerCase();

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          authorized: false,
          error: 'Server environment variables are not configured.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          authorized: false,
          error: 'Missing Authorization header.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Verify caller JWT using anon client + caller's Authorization header
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user || !user.email) {
      return new Response(
        JSON.stringify({
          authorized: false,
          error: 'Invalid or expired authentication token.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const callerEmail = user.email.toLowerCase();

    // 2. Check against `public.owner_allowlist` table using service_role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: allowlistRow } = await adminClient
      .from('owner_allowlist')
      .select('email')
      .ilike('email', callerEmail)
      .maybeSingle();

    const isAllowedByTable = Boolean(allowlistRow?.email);
    const isAllowedByEnv =
      Boolean(envAllowedOwnerEmail) && callerEmail === envAllowedOwnerEmail;

    if (!isAllowedByTable && !isAllowedByEnv) {
      return new Response(
        JSON.stringify({
          authorized: false,
          error: 'Account email is not authorized as the store owner.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        authorized: true,
        ownerEmail: user.email,
        verifiedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        authorized: false,
        error: err instanceof Error ? err.message : 'Unexpected server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});