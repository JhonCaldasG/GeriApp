import { supabase } from '../lib/supabase';
import { TurnoEnfermeria } from '../types';
import { getHogarId } from './hogar';

function rowToTurno(row: any): TurnoEnfermeria {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    duracion: row.duracion,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerTurnos(usuarioId?: string): Promise<TurnoEnfermeria[]> {
  let query = supabase
    .from('turnos_enfermeria')
    .select('*')
    .order('fecha_inicio', { ascending: false });
  if (usuarioId) query = query.eq('usuario_id', usuarioId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToTurno);
}

export async function guardarTurno(
  t: Omit<TurnoEnfermeria, 'id' | 'createdAt'>
): Promise<TurnoEnfermeria> {
  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('turnos_enfermeria')
    .insert({
      hogar_id: hogarId,
      usuario_id: t.usuarioId,
      duracion: t.duracion,
      fecha_inicio: t.fechaInicio,
      fecha_fin: t.fechaFin,
      observaciones: t.observaciones,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTurno(data);
}

export async function actualizarTurno(
  id: string,
  cambios: Partial<Omit<TurnoEnfermeria, 'id' | 'createdAt' | 'usuarioId'>>
): Promise<void> {
  const payload: any = {};
  if (cambios.duracion !== undefined) payload.duracion = cambios.duracion;
  if (cambios.fechaInicio !== undefined) payload.fecha_inicio = cambios.fechaInicio;
  if (cambios.fechaFin !== undefined) payload.fecha_fin = cambios.fechaFin;
  if (cambios.observaciones !== undefined) payload.observaciones = cambios.observaciones;
  const { error } = await supabase.from('turnos_enfermeria').update(payload).eq('id', id);
  if (error) throw error;
}

export async function eliminarTurno(id: string): Promise<void> {
  const { error } = await supabase.from('turnos_enfermeria').delete().eq('id', id);
  if (error) throw error;
}
