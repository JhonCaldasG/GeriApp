import { supabase } from '../lib/supabase';
import { AuditoriaEntry } from '../types';
import { getHogarId } from './hogar';

function rowToEntry(row: any): AuditoriaEntry {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre,
    accion: row.accion,
    entidad: row.entidad,
    entidadId: row.entidad_id ?? undefined,
    detalle: row.detalle ?? undefined,
    createdAt: row.created_at,
  };
}

export async function registrarAuditoria(
  entry: Omit<AuditoriaEntry, 'id' | 'createdAt'>
): Promise<void> {
  // Fire-and-forget — no bloquea el flujo principal
  getHogarId().then(hogarId => {
    supabase
      .from('auditoria')
      .insert({
        hogar_id: hogarId,
        usuario_id: entry.usuarioId,
        usuario_nombre: entry.usuarioNombre,
        accion: entry.accion,
        entidad: entry.entidad,
        entidad_id: entry.entidadId ?? null,
        detalle: entry.detalle ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn('[auditoria]', error.message);
      });
  }).catch(err => console.warn('[auditoria]', err));
}

export async function obtenerAuditoria(limite = 100): Promise<AuditoriaEntry[]> {
  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}
