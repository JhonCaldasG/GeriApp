import { supabase } from '../lib/supabase';
import { Incidente } from '../types';
import { getHogarId } from './hogar';

function rowToIncidente(row: any): Incidente {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    descripcion: row.descripcion ?? '',
    lugar: row.lugar ?? '',
    consecuencias: row.consecuencias ?? '',
    testigos: row.testigos ?? '',
    accionesTomadas: row.acciones_tomadas ?? '',
    registradoPor: row.registrado_por ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerIncidentes(pacienteId: string): Promise<Incidente[]> {
  const { data, error } = await supabase
    .from('incidentes')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToIncidente);
}

export async function guardarIncidente(
  inc: Omit<Incidente, 'id' | 'createdAt'>
): Promise<Incidente> {
  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('incidentes')
    .insert({
      hogar_id: hogarId,
      paciente_id: inc.pacienteId,
      tipo: inc.tipo,
      descripcion: inc.descripcion,
      lugar: inc.lugar,
      consecuencias: inc.consecuencias,
      testigos: inc.testigos,
      acciones_tomadas: inc.accionesTomadas,
      registrado_por: inc.registradoPor,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToIncidente(data);
}

export async function eliminarIncidente(id: string): Promise<void> {
  const { error } = await supabase.from('incidentes').delete().eq('id', id);
  if (error) throw error;
}
