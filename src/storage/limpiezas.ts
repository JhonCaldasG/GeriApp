import { supabase } from '../lib/supabase';
import { SUPABASE_URL } from '../lib/supabase';
import { LimpiezaRegistro } from '../types';
import { getHogarId } from './hogar';

const BUCKET = 'hogar';

function rowToLimpieza(row: any): LimpiezaRegistro {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    descripcion: row.descripcion ?? '',
    realizadoPor: row.realizado_por ?? '',
    observaciones: row.observaciones ?? '',
    fotoUrls: Array.isArray(row.foto_urls) ? row.foto_urls : [],
    createdAt: row.created_at,
  };
}

function urlToPath(url: string): string | null {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}

async function marcarFotoEliminada(url: string): Promise<void> {
  const path = urlToPath(url);
  if (!path) return;
  const dotIdx = path.lastIndexOf('.');
  const base = dotIdx !== -1 ? path.slice(0, dotIdx) : path;
  const ext = dotIdx !== -1 ? path.slice(dotIdx) : '';
  try {
    await supabase.storage.from(BUCKET).move(path, `${base}_DELETED${ext}`);
  } catch {
    // Si ya fue eliminado o movido, ignorar
  }
}

export async function obtenerLimpiezas(pacienteId?: string): Promise<LimpiezaRegistro[]> {
  let query = supabase.from('limpiezas').select('*').order('created_at', { ascending: false });
  if (pacienteId) query = query.eq('paciente_id', pacienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToLimpieza);
}

export async function guardarLimpieza(l: Omit<LimpiezaRegistro, 'id' | 'createdAt'>): Promise<LimpiezaRegistro> {
  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('limpiezas')
    .insert({
      hogar_id: hogarId,
      paciente_id: l.pacienteId,
      tipo: l.tipo,
      descripcion: l.descripcion,
      realizado_por: l.realizadoPor,
      observaciones: l.observaciones,
      foto_urls: l.fotoUrls ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return rowToLimpieza(data);
}

export async function eliminarLimpieza(id: string, fotoUrls?: string[]): Promise<void> {
  if (fotoUrls && fotoUrls.length > 0) {
    await Promise.allSettled(fotoUrls.map(url => marcarFotoEliminada(url)));
  }
  const { error } = await supabase.from('limpiezas').delete().eq('id', id);
  if (error) throw error;
}

function toSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quitar tildes y diacríticos
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');  // quitar cualquier carácter especial restante
}

/** Ruta base en el bucket hogar para una limpieza de habitación */
export function rutaFotoHabitacion(habitacion: string, tipo: string): string {
  const fecha = new Date().toISOString().slice(0, 10);
  return `limpiezas/habitaciones/${toSlug(habitacion)}/${toSlug(tipo)}/${fecha}`;
}

/** Ruta base en el bucket hogar para una limpieza de zona general */
export function rutaFotoZona(tipo: string): string {
  const fecha = new Date().toISOString().slice(0, 10);
  return `limpiezas/zonas/${toSlug(tipo)}/${fecha}`;
}
