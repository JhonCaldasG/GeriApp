import { supabase } from '../lib/supabase';
import { Insumo } from '../types';

function rowToInsumo(row: any): Insumo {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    stockActual: Number(row.stock_actual),
    stockMinimo: Number(row.stock_minimo),
    unidad: row.unidad,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function obtenerInventario(): Promise<Insumo[]> {
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return (data ?? []).map(rowToInsumo);
}

export async function guardarInsumo(insumo: Omit<Insumo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Insumo> {
  const { data, error } = await supabase
    .from('inventario')
    .insert({
      nombre: insumo.nombre,
      categoria: insumo.categoria,
      stock_actual: insumo.stockActual,
      stock_minimo: insumo.stockMinimo,
      unidad: insumo.unidad,
      observaciones: insumo.observaciones ?? '',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToInsumo(data);
}

export async function actualizarInsumo(id: string, campos: Partial<Omit<Insumo, 'id' | 'createdAt'>>): Promise<void> {
  const update: any = { updated_at: new Date().toISOString() };
  if (campos.nombre !== undefined) update.nombre = campos.nombre;
  if (campos.categoria !== undefined) update.categoria = campos.categoria;
  if (campos.stockActual !== undefined) update.stock_actual = campos.stockActual;
  if (campos.stockMinimo !== undefined) update.stock_minimo = campos.stockMinimo;
  if (campos.unidad !== undefined) update.unidad = campos.unidad;
  if (campos.observaciones !== undefined) update.observaciones = campos.observaciones;
  const { error } = await supabase.from('inventario').update(update).eq('id', id);
  if (error) throw error;
}

export async function eliminarInsumo(id: string): Promise<void> {
  const { error } = await supabase.from('inventario').delete().eq('id', id);
  if (error) throw error;
}

export async function ajustarStock(id: string, delta: number): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('inventario')
    .select('stock_actual')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  const nuevo = Math.max(0, Number(data.stock_actual) + delta);
  const { error } = await supabase
    .from('inventario')
    .update({ stock_actual: nuevo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
