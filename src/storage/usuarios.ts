import { supabase } from '../lib/supabase';
import { Usuario } from '../types';

function rowToUsuario(row: any): Usuario {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    usuario: row.usuario,
    password: row.password,
    rol: row.rol,
    activo: row.activo,
    ultimoIngreso: row.ultimo_ingreso ?? null,
  };
}

export async function inicializarUsuarios(): Promise<void> {
  const { data } = await supabase.from('usuarios').select('id').limit(1);
  if (data && data.length > 0) return;

  await supabase.from('usuarios').insert([
    {
      nombre: 'Administrador',
      apellido: 'General',
      usuario: 'admin',
      password: 'admin123',
      rol: 'admin',
      activo: true,
    },
    {
      nombre: 'Enfermero',
      apellido: 'Principal',
      usuario: 'enfermero',
      password: '1234',
      rol: 'enfermero',
      activo: true,
    },
  ]);
}

export async function obtenerUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToUsuario);
}

export async function login(usuario: string, password: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario.trim().toLowerCase())
    .eq('password', password)
    .eq('activo', true)
    .single();
  if (error || !data) return null;

  // Guardar último ingreso en Supabase
  const ahora = new Date().toISOString();
  await supabase.from('usuarios').update({ ultimo_ingreso: ahora }).eq('id', data.id);
  data.ultimo_ingreso = ahora;

  return rowToUsuario(data);
}

export async function guardarUsuario(u: Omit<Usuario, 'id'>): Promise<Usuario> {
  const { data: existe } = await supabase
    .from('usuarios')
    .select('id')
    .eq('usuario', u.usuario.toLowerCase())
    .single();
  if (existe) throw new Error('El nombre de usuario ya existe');

  const { data, error } = await supabase
    .from('usuarios')
    .insert({ ...u, usuario: u.usuario.toLowerCase() })
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
