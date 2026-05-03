import { supabase } from '../lib/supabase';
import { ActividadPaciente } from '../types';
import { getHogarId } from './hogar';

function rowToActividad(row: any): ActividadPaciente {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    realizadoPor: row.realizado_por ?? '',
    fotoUrls: row.foto_urls ?? [],
    createdAt: row.created_at,
  };
}

export function rutaFotoActividad(pacienteId: string, index: number): string {
  const fecha = new Date().toISOString().slice(0, 10);
  const ts = Date.now();
  return `${pacienteId}/actividades/${fecha}_${ts}_${index}.jpg`;
}

export async function obtenerActividades(pacienteId?: string): Promise<ActividadPaciente[]> {
  let query = supabase
    .from('actividades_pacientes')
    .select('*')
    .order('created_at', { ascending: false });
  if (pacienteId) query = query.eq('paciente_id', pacienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToActividad);
}

export async function guardarActividad(
  act: Omit<ActividadPaciente, 'id' | 'createdAt'>
): Promise<ActividadPaciente> {
  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('actividades_pacientes')
    .insert({
      hogar_id: hogarId,
      paciente_id: act.pacienteId,
      tipo: act.tipo,
      nombre: act.nombre,
      descripcion: act.descripcion,
      realizado_por: act.realizadoPor,
      foto_urls: act.fotoUrls ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return rowToActividad(data);
}

export async function eliminarActividad(id: string): Promise<void> {
  const { error } = await supabase.from('actividades_pacientes').delete().eq('id', id);
  if (error) throw error;
}
