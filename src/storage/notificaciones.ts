import { supabase } from '../lib/supabase';
import { Notificacion, NotificacionTipo } from '../types';

function rowToNotificacion(row: any): Notificacion {
  return {
    id: row.id,
    destinatarioId: row.destinatario_id ?? undefined,
    paraRol: row.para_rol ?? undefined,
    tipo: row.tipo as NotificacionTipo,
    titulo: row.titulo,
    mensaje: row.mensaje,
    leida: row.leida,
    datos: row.datos ?? undefined,
    createdAt: row.created_at,
  };
}

export async function obtenerNotificaciones(
  usuarioId: string,
  rol: string,
): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .or(`destinatario_id.eq.${usuarioId},para_rol.eq.${rol}`)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map(rowToNotificacion);
}

export async function crearNotificacion(
  notif: Omit<Notificacion, 'id' | 'leida' | 'createdAt'>,
): Promise<void> {
  const { error } = await supabase.from('notificaciones').insert({
    destinatario_id: notif.destinatarioId ?? null,
    para_rol: notif.paraRol ?? null,
    tipo: notif.tipo,
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    datos: notif.datos ?? null,
  });
  if (error) throw error;
}

export async function marcarLeida(id: string): Promise<void> {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id);
  if (error) throw error;
}

export async function marcarTodasLeidas(
  usuarioId: string,
  rol: string,
): Promise<void> {
  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('destinatario_id', usuarioId)
    .eq('leida', false);
  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('para_rol', rol)
    .eq('leida', false);
}

export async function eliminarNotificacion(id: string): Promise<void> {
  const { error } = await supabase
    .from('notificaciones')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
