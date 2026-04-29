import { supabase } from '../lib/supabase';
import { RegistroAsistencia } from '../types';

function rowToAsistencia(row: any): RegistroAsistencia {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre,
    usuarioRol: row.usuario_rol ?? '',
    fecha: row.fecha,
    horaEntrada: row.hora_entrada ?? undefined,
    horaSalida: row.hora_salida ?? undefined,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerAsistencia(fecha: string): Promise<RegistroAsistencia[]> {
  const { data, error } = await supabase
    .from('asistencia')
    .select('*')
    .eq('fecha', fecha)
    .order('usuario_nombre');
  if (error) throw error;
  return (data ?? []).map(rowToAsistencia);
}

export async function obtenerAsistenciaRango(desde: string, hasta: string): Promise<RegistroAsistencia[]> {
  const { data, error } = await supabase
    .from('asistencia')
    .select('*')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha')
    .order('usuario_nombre');
  if (error) throw error;
  return (data ?? []).map(rowToAsistencia);
}

export async function registrarEntrada(usuarioId: string, usuarioNombre: string, usuarioRol: string): Promise<RegistroAsistencia> {
  const hoy = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 5);
  const { data: existente } = await supabase
    .from('asistencia')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('fecha', hoy)
    .single();
  if (existente) {
    const { data, error } = await supabase
      .from('asistencia')
      .update({ hora_entrada: hora })
      .eq('id', existente.id)
      .select()
      .single();
    if (error) throw error;
    return rowToAsistencia(data);
  }
  const { data, error } = await supabase
    .from('asistencia')
    .insert({ usuario_id: usuarioId, usuario_nombre: usuarioNombre, usuario_rol: usuarioRol, fecha: hoy, hora_entrada: hora })
    .select()
    .single();
  if (error) throw error;
  return rowToAsistencia(data);
}

export async function registrarSalida(usuarioId: string): Promise<void> {
  const hoy = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 5);
  const { error } = await supabase
    .from('asistencia')
    .update({ hora_salida: hora })
    .eq('usuario_id', usuarioId)
    .eq('fecha', hoy);
  if (error) throw error;
}
