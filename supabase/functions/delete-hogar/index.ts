import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { hogar_id } = await req.json();

    if (!hogar_id) {
      return new Response(JSON.stringify({ error: 'hogar_id es requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Obtener auth_ids antes de borrar (se necesitan para limpiar Supabase Auth)
    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('auth_id')
      .eq('hogar_id', hogar_id)
      .not('auth_id', 'is', null);

    // Borrado atómico en Postgres: archiva + borra todas las tablas
    const { error: rpcError } = await supabaseAdmin.rpc('delete_hogar', {
      p_hogar_id: hogar_id,
    });

    if (rpcError) {
      const status = rpcError.message.includes('no encontrado') ? 404 : 500;
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Borrar usuarios de Supabase Auth (fuera de Postgres, no puede ir en el RPC)
    if (usuarios && usuarios.length > 0) {
      for (const u of usuarios) {
        if (u.auth_id) {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(u.auth_id);
          if (error) {
            console.error('[delete-hogar] auth.deleteUser failed for', u.auth_id, error.message);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, hogar_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
