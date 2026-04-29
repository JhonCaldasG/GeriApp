import { supabase } from '../lib/supabase';
import { NotaHandover } from '../types';

function rowToHandover(row: any): NotaHandover {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre,
    turno: row.turno,
    fecha: row.fecha,
    novedades: row.novedades ?? '',
    medicamentosEventos: row.medicamentos_eventos ?? '',
    pendientesProximoTurno: row.pendientes_proximo_turno ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerUltimoHandover(): Promise<NotaHandover | null> {
  const { data, error } = await supabase
    .from('handover')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return rowToHandover(data);
}

export async function obtenerHandoverPorFechaTurno(fecha: string, turno: string, usuarioId: string): Promise<NotaHandover | null> {
  const { data, error } = await supabase
    .from('handover')
    .select('*')
    .eq('fecha', fecha)
    .eq('turno', turno)
    .eq('usuario_id', usuarioId)
    .single();
  if (error) return null;
  return rowToHandover(data);
}

export async function guardarHandover(nota: Omit<NotaHandover, 'id' | 'createdAt'>): Promise<NotaHandover> {
  const existente = await obtenerHandoverPorFechaTurno(nota.fecha, nota.turno, nota.usuarioId);
  if (existente) {
    const { data, error } = await supabase
      .from('handover')
      .update({
        novedades: nota.novedades,
        medicamentos_eventos: nota.medicamentosEventos,
        pendientes_proximo_turno: nota.pendientesProximoTurno,
      })
      .eq('id', existente.id)
      .select()
      .single();
    if (error) throw error;
    return rowToHandover(data);
  }
  const { data, error } = await supabase
    .from('handover')
    .insert({
      usuario_id: nota.usuarioId,
      usuario_nombre: nota.usuarioNombre,
      turno: nota.turno,
      fecha: nota.fecha,
      novedades: nota.novedades,
      medicamentos_eventos: nota.medicamentosEventos,
      pendientes_proximo_turno: nota.pendientesProximoTurno,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToHandover(data);
}

export async function obtenerHandovers(limite = 10): Promise<NotaHandover[]> {
  const { data, error } = await supabase
    .from('handover')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map(rowToHandover);
}
