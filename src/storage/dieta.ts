import { supabase } from '../lib/supabase';
import { RegistroDieta } from '../types';

function rowToDieta(row: any): RegistroDieta {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    descripcion: row.descripcion ?? '',
    porcentajeConsumido: row.porcentaje_consumido ?? 100,
    apetito: row.apetito ?? 'bueno',
    liquidosMl: row.liquidos_ml ?? null,
    observaciones: row.observaciones ?? '',
    registradoPor: row.registrado_por ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerDieta(pacienteId: string): Promise<RegistroDieta[]> {
  const { data, error } = await supabase
    .from('registros_dieta')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDieta);
}

export async function guardarDieta(
  r: Omit<RegistroDieta, 'id' | 'createdAt'>
): Promise<RegistroDieta> {
  const { data, error } = await supabase
    .from('registros_dieta')
    .insert({
      paciente_id: r.pacienteId,
      tipo: r.tipo,
      descripcion: r.descripcion,
      porcentaje_consumido: r.porcentajeConsumido,
      apetito: r.apetito,
      liquidos_ml: r.liquidosMl,
      observaciones: r.observaciones,
      registrado_por: r.registradoPor,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToDieta(data);
}

export async function eliminarDieta(id: string): Promise<void> {
  const { error } = await supabase.from('registros_dieta').delete().eq('id', id);
  if (error) throw error;
}
