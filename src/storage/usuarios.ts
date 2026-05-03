import { supabase } from '../lib/supabase';
import { Usuario } from '../types';
import { getAuthDomain, getHogarId } from './hogar';

async function toEmail(usuario: string): Promise<string> {
  const domain = await getAuthDomain();
  return `${usuario}@${domain}`;
}

function rowToUsuario(row: any): Usuario {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    usuario: row.usuario,
    rol: row.rol,
    activo: row.activo,
    ultimoIngreso: row.ultimo_ingreso ?? null,
  };
}

export async function obtenerUsuarios(): Promise<Usuario[]> {
  let query = supabase.from('usuarios').select('*').order('nombre', { ascending: true });
  try {
    const hogarId = await getHogarId();
    query = query.eq('hogar_id', hogarId);
  } catch { /* sin sesión activa: devuelve vacío vía RLS */ }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToUsuario);
}

export async function login(usuario: string, password: string): Promise<Usuario | null> {
  const email = await toEmail(usuario.trim().toLowerCase());

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) return null;

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_id', authData.user.id)
    .eq('activo', true)
    .single();

  if (error || !data) {
    await supabase.auth.signOut();
    return null;
  }

  const ahora = new Date().toISOString();
  await supabase.from('usuarios').update({ ultimo_ingreso: ahora }).eq('id', data.id);
  data.ultimo_ingreso = ahora;

  return rowToUsuario(data);
}

export async function guardarUsuario(u: Omit<Usuario, 'id'>, password?: string): Promise<Usuario> {
  const usuarioNorm = u.usuario.toLowerCase();

  const { data: existe } = await supabase
    .from('usuarios')
    .select('id')
    .eq('usuario', usuarioNorm)
    .single();
  if (existe) throw new Error('El nombre de usuario ya existe');

  let authId: string | undefined;
  if (password) {
    const email = await toEmail(usuarioNorm);
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) throw new Error(authError?.message ?? 'Error al crear usuario en Auth');
    authId = authData.user.id;
  }

  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('usuarios')
    .insert({ hogar_id: hogarId, nombre: u.nombre, apellido: u.apellido, usuario: usuarioNorm, rol: u.rol, activo: u.activo, auth_id: authId ?? null })
    .select()
    .single();
  if (error) throw error;
  return rowToUsuario(data);
}

export async function actualizarUsuario(id: string, cambios: Partial<Omit<Usuario, 'id'>>): Promise<void> {
  const payload: any = { ...cambios };
  if (cambios.usuario) payload.usuario = cambios.usuario.toLowerCase();

  const { error } = await supabase.from('usuarios').update(payload).eq('id', id);
  if (error) throw error;
}

export async function eliminarUsuario(id: string): Promise<void> {
  const { data } = await supabase.from('usuarios').select('usuario').eq('id', id).single();
  if (data?.usuario === 'admin') throw new Error('No se puede eliminar el administrador principal');

  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) throw error;
}
