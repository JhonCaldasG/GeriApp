import { supabase } from '../lib/supabase';
import { NotaEvolucion } from '../types';

function rowToNota(row: any): NotaEvolucion {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    texto: row.texto,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre,
    turno: row.turno ?? null,
    estadoPaciente: row.estado_paciente ?? null,
    signosAdjuntos: row.signos_adjuntos ?? null,
    medicamentosAdjuntos: row.medicamentos_adjuntos ?? null,
    createdAt: row.created_at,
  };
}

export async function obtenerNotas(pacienteId: string): Promise<NotaEvolucion[]> {
  const { data, error } = await supabase
    .from('notas_evolucion')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNota);
}

export async function guardarNota(nota: Omit<NotaEvolucion, 'id' | 'createdAt'>): Promise<NotaEvolucion> {
  const base = {
    paciente_id: nota.pacienteId,
    texto: nota.texto,
    usuario_id: nota.usuarioId,
    usuario_nombre: nota.usuarioNombre,
  };
  const payload: any = { ...base };
  if (nota.turno) payload.turno = nota.turno;
  if (nota.estadoPaciente) payload.estado_paciente = nota.estadoPaciente;
  if (nota.signosAdjuntos) payload.signos_adjuntos = nota.signosAdjuntos;
  if (nota.medicamentosAdjuntos?.length) payload.medicamentos_adjuntos = nota.medicamentosAdjuntos;

  let result = await supabase.from('notas_evolucion').insert(payload).select().single();

  // Fallback: if extended columns don't exist yet (migration pending), retry with base fields only
  if (result.error) {
    result = await supabase.from('notas_evolucion').insert(base).select().single();
  }

  if (result.error) throw result.error;
  return rowToNota(result.data);
}

export async function eliminarNota(id: string): Promise<void> {
  const { error } = await supabase.from('notas_evolucion').delete().eq('id', id);
  if (error) throw error;
}
