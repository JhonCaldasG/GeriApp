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
    const { nombreHogar, nombreAdmin, apellidoAdmin, email, password } = await req.json();

    if (!nombreHogar || !email || !password || !nombreAdmin) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Generar slug único desde el nombre del hogar
    const baseSlug = nombreHogar
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let slug = baseSlug;
    let suffix = 1;
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('hogar_config').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${++suffix}`;
    }

    // 2. Crear hogar
    const { data: hogar, error: hogarError } = await supabaseAdmin
      .from('hogar_config')
      .insert({ nombre: nombreHogar, slug, estado: 'trial' })
      .select()
      .single();
    if (hogarError) throw hogarError;

    // 3. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { hogar_id: hogar.id },
    });
    if (authError) {
      const { error: rb } = await supabaseAdmin.from('hogar_config').delete().eq('id', hogar.id);
      if (rb) console.error('[register-hogar] rollback hogar failed:', rb);
      throw authError;
    }

    // 4. Insertar en tabla usuarios
    const { error: usuarioError } = await supabaseAdmin.from('usuarios').insert({
      auth_id: authData.user.id,
      hogar_id: hogar.id,
      nombre: nombreAdmin,
      apellido: apellidoAdmin ?? '',
      usuario: email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      rol: 'admin',
      activo: true,
    });
    if (usuarioError) {
      const { error: rb1 } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (rb1) console.error('[register-hogar] rollback auth user failed:', rb1);
      const { error: rb2 } = await supabaseAdmin.from('hogar_config').delete().eq('id', hogar.id);
      if (rb2) console.error('[register-hogar] rollback hogar failed:', rb2);
      throw usuarioError;
    }

    // 5. Copiar templates de tomas_signos
    const { data: templates } = await supabaseAdmin
      .from('tomas_signos').select('nombre, hora_inicio, hora_fin').is('hogar_id', null);
    if (templates && templates.length > 0) {
      const { error: templatesError } = await supabaseAdmin.from('tomas_signos').insert(
        templates.map((t: { nombre: string; hora_inicio: string | null; hora_fin: string | null }) => ({
          nombre: t.nombre,
          hora_inicio: t.hora_inicio,
          hora_fin: t.hora_fin,
          hogar_id: hogar.id,
        }))
      );
      if (templatesError) {
        const { error: delUsuarioError } = await supabaseAdmin.from('usuarios').delete().eq('auth_id', authData.user.id);
        if (delUsuarioError) console.error('[register-hogar] rollback usuarios failed:', delUsuarioError);
        const { error: delAuthError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        if (delAuthError) console.error('[register-hogar] rollback auth user failed:', delAuthError);
        const { error: delHogarError } = await supabaseAdmin.from('hogar_config').delete().eq('id', hogar.id);
        if (delHogarError) console.error('[register-hogar] rollback hogar failed:', delHogarError);
        throw templatesError;
      }
    }

    return new Response(JSON.stringify({
      hogar: { id: hogar.id, slug, nombre: nombreHogar },
      userId: authData.user.id,
      email,
    }), {
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
