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

    const { data: allowed, error: ownerError } = await userClient.rpc('is_store_owner');
    if (ownerError || allowed !== true) {
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

    let actionPayload: { action?: string; authUserId?: string; isBlocked?: boolean } = {};
    try {
      actionPayload = await req.json();
    } catch {
      // Empty body is the normal owner-verification request.
    }

    if (actionPayload.action === 'set_customer_block') {
      if (!actionPayload.authUserId || typeof actionPayload.isBlocked !== 'boolean') {
        return new Response(JSON.stringify({ authorized: true, ok: false, error: 'Mijoz bloklash maʼlumotlari notoʻgʻri.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (actionPayload.authUserId === user.id) {
        return new Response(JSON.stringify({ authorized: true, ok: false, error: 'Owner hisobini shu amal bilan bloklab boʻlmaydi.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error: banError } = await adminClient.auth.admin.updateUserById(actionPayload.authUserId, {
        ban_duration: actionPayload.isBlocked ? '876000h' : 'none',
      });
      if (banError) {
        return new Response(JSON.stringify({ authorized: true, ok: false, error: banError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ authorized: true, ok: true, ownerEmail: user.email }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
