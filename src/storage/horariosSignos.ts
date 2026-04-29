import { supabase } from '../lib/supabase';
import { TomaSigno } from '../types';

type HorariosMap = { [pacienteId: string]: TomaSigno[] };

function rowToToma(row: any): TomaSigno {
  return {
    id: row.id,
    nombre: row.nombre,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
  };
}

export async function obtenerHorarios(pacienteId: string): Promise<TomaSigno[]> {
  const { data, error } = await supabase
    .from('tomas_signos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('hora_inicio', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToToma);
}

export async function obtenerTodosHorarios(): Promise<HorariosMap> {
  const { data, error } = await supabase
    .from('tomas_signos')
    .select('*')
    .order('hora_inicio', { ascending: true });
  if (error) throw error;

  const map: HorariosMap = {};
  for (const row of data ?? []) {
    if (!map[row.paciente_id]) map[row.paciente_id] = [];
    map[row.paciente_id].push(rowToToma(row));
  }
  return map;
}

export async function guardarToma(pacienteId: string, toma: Omit<TomaSigno, 'id'>): Promise<TomaSigno> {
  const { data, error } = await supabase
    .from('tomas_signos')
    .insert({
      paciente_id: pacienteId,
      nombre: toma.nombre,
      hora_inicio: toma.horaInicio,
      hora_fin: toma.horaFin,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToToma(data);
}

export async function eliminarToma(pacienteId: string, tomaId: string): Promise<void> {
  const { error } = await supabase
    .from('tomas_signos')
    .delete()
    .eq('id', tomaId)
    .eq('paciente_id', pacienteId);
  if (error) throw error;
}
