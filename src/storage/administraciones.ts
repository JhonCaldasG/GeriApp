import { supabase } from '../lib/supabase';
import { AdministracionMedicamento } from '../types';
import { getHogarId } from './hogar';

function rowToAdministracion(row: any): AdministracionMedicamento {
  return {
    id: row.id,
    medicamentoId: row.medicamento_id,
    pacienteId: row.paciente_id,
    medicamentoNombre: row.medicamento_nombre ?? '',
    dosis: row.dosis ?? '',
    firmante: row.firmante ?? '',
    notas: row.notas ?? '',
    numeroDosis: row.numero_dosis ?? undefined,
    totalDiarias: row.total_diarias ?? null,
    rechazado: row.rechazado ?? false,
    motivoRechazo: row.motivo_rechazo ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerAdministraciones(medicamentoId?: string): Promise<AdministracionMedicamento[]> {
  let query = supabase
    .from('administraciones_medicamento')
    .select('*')
    .order('created_at', { ascending: false });
  if (medicamentoId) query = query.eq('medicamento_id', medicamentoId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToAdministracion);
}

export async function actualizarAdministracion(
  id: string,
  datos: Partial<Pick<AdministracionMedicamento, 'firmante' | 'notas' | 'dosis' | 'createdAt'>>
): Promise<void> {
  const payload: any = {};
  if (datos.firmante !== undefined) payload.firmante = datos.firmante;
  if (datos.notas !== undefined) payload.notas = datos.notas;
  if (datos.dosis !== undefined) payload.dosis = datos.dosis;

  const { error } = await supabase.from('administraciones_medicamento').update(payload).eq('id', id);
  if (error) throw error;
}

export async function eliminarAdministracion(id: string): Promise<void> {
  const { error } = await supabase.from('administraciones_medicamento').delete().eq('id', id);
  if (error) throw error;
}

export async function registrarAdministracion(
  a: Omit<AdministracionMedicamento, 'id' | 'createdAt'>
): Promise<AdministracionMedicamento> {
  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('administraciones_medicamento')
    .insert({
      hogar_id: hogarId,
      medicamento_id: a.medicamentoId,
      paciente_id: a.pacienteId,
      medicamento_nombre: a.medicamentoNombre,
      dosis: a.dosis,
      firmante: a.firmante,
      notas: a.notas,
      numero_dosis: a.numeroDosis,
      total_diarias: a.totalDiarias,
      rechazado: a.rechazado ?? false,
      motivo_rechazo: a.motivoRechazo ?? '',
    })
    .select()
    .single();
  if (error) throw error;
  return rowToAdministracion(data);
}
