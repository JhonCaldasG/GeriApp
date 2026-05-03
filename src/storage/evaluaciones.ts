import { supabase } from '../lib/supabase';
import { EvaluacionClinica } from '../types';
import { getHogarId } from './hogar';

function rowToEvaluacion(row: any): EvaluacionClinica {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    puntuacion: row.puntuacion,
    items: row.items ?? {},
    observaciones: row.observaciones ?? '',
    evaluadoPor: row.evaluado_por ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerEvaluaciones(
  pacienteId: string,
  tipo?: 'barthel' | 'braden'
): Promise<EvaluacionClinica[]> {
  let query = supabase
    .from('evaluaciones_clinicas')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (tipo) query = query.eq('tipo', tipo);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToEvaluacion);
}

export async function guardarEvaluacion(
  ev: Omit<EvaluacionClinica, 'id' | 'createdAt'>
): Promise<EvaluacionClinica> {
  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('evaluaciones_clinicas')
    .insert({
      hogar_id: hogarId,
      paciente_id: ev.pacienteId,
      tipo: ev.tipo,
      puntuacion: ev.puntuacion,
      items: ev.items,
      observaciones: ev.observaciones,
      evaluado_por: ev.evaluadoPor,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToEvaluacion(data);
}

export async function eliminarEvaluacion(id: string): Promise<void> {
  const { error } = await supabase.from('evaluaciones_clinicas').delete().eq('id', id);
  if (error) throw error;
}
