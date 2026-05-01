import { supabase } from '../lib/supabase';
import { CitaMedica } from '../types';

function rowToCita(row: any): CitaMedica {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    especialidad: row.especialidad,
    medico: row.medico,
    fecha: row.fecha,
    hora: row.hora,
    lugar: row.lugar ?? '',
    observaciones: row.observaciones ?? '',
    estado: row.estado ?? 'pendiente',
    createdAt: row.created_at,
  };
}

export async function obtenerCitas(pacienteId?: string): Promise<CitaMedica[]> {
  let query = supabase.from('citas_medicas').select('*').order('fecha').order('hora');
  if (pacienteId) query = query.eq('paciente_id', pacienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToCita);
}

export async function obtenerCitaPorId(id: string): Promise<CitaMedica | null> {
  const { data, error } = await supabase.from('citas_medicas').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToCita(data) : null;
}

export async function actualizarCita(id: string, campos: Partial<Omit<CitaMedica, 'id' | 'createdAt' | 'pacienteId'>>): Promise<void> {
  const update: any = {};
  if (campos.especialidad !== undefined) update.especialidad = campos.especialidad;
  if (campos.medico !== undefined) update.medico = campos.medico;
  if (campos.fecha !== undefined) update.fecha = campos.fecha;
  if (campos.hora !== undefined) update.hora = campos.hora;
  if (campos.lugar !== undefined) update.lugar = campos.lugar;
  if (campos.observaciones !== undefined) update.observaciones = campos.observaciones;
  if (campos.estado !== undefined) update.estado = campos.estado;
  const { error } = await supabase.from('citas_medicas').update(update).eq('id', id);
  if (error) throw error;
}

export async function guardarCita(cita: Omit<CitaMedica, 'id' | 'createdAt'>): Promise<CitaMedica> {
  const { data, error } = await supabase
    .from('citas_medicas')
    .insert({
      paciente_id: cita.pacienteId,
      especialidad: cita.especialidad,
      medico: cita.medico,
      fecha: cita.fecha,
      hora: cita.hora,
      lugar: cita.lugar,
      observaciones: cita.observaciones ?? '',
      estado: cita.estado,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToCita(data);
}

export async function actualizarEstadoCita(id: string, estado: CitaMedica['estado']): Promise<void> {
  const { error } = await supabase.from('citas_medicas').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function eliminarCita(id: string): Promise<void> {
  const { error } = await supabase.from('citas_medicas').delete().eq('id', id);
  if (error) throw error;
}
