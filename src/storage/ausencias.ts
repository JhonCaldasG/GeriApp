import { supabase } from '../lib/supabase';
import { Ausencia } from '../types';

function rowToAusencia(row: any): Ausencia {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    motivo: row.motivo ?? '',
    fechaInicio: row.fecha_inicio,
    horaSalida: row.hora_salida ?? null,
    fechaFin: row.fecha_fin ?? null,
    horaRegreso: row.hora_regreso ?? null,
    destino: row.destino ?? '',
    responsable: row.responsable ?? '',
    observaciones: row.observaciones ?? '',
    firmaFamiliar: row.firma_familiar ?? null,
    createdAt: row.created_at,
  };
}

export async function obtenerAusencias(pacienteId: string): Promise<Ausencia[]> {
  const { data, error } = await supabase
    .from('ausencias')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToAusencia);
}

export async function obtenerAusenciasActivas(): Promise<Ausencia[]> {
  const { data, error } = await supabase
    .from('ausencias')
    .select('*')
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToAusencia);
}

export async function guardarAusencia(
  a: Omit<Ausencia, 'id' | 'createdAt'>
): Promise<Ausencia> {
  const { data, error } = await supabase
    .from('ausencias')
    .insert({
      paciente_id: a.pacienteId,
      tipo: a.tipo,
      motivo: a.motivo,
      fecha_inicio: a.fechaInicio,
      hora_salida: a.horaSalida ?? null,
      fecha_fin: a.fechaFin,
      destino: a.destino,
      responsable: a.responsable,
      observaciones: a.observaciones,
      firma_familiar: a.firmaFamiliar ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToAusencia(data);
}

export async function cerrarAusencia(id: string, fechaFin: string, horaRegreso: string): Promise<void> {
  const { error } = await supabase
    .from('ausencias')
    .update({ fecha_fin: fechaFin, hora_regreso: horaRegreso })
    .eq('id', id);
  if (error) throw error;
}

export async function eliminarAusencia(id: string): Promise<void> {
  const { error } = await supabase.from('ausencias').delete().eq('id', id);
  if (error) throw error;
}
