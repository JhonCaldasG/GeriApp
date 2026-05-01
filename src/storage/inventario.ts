import { supabase } from '../lib/supabase';
import { Insumo } from '../types';

// Required Supabase migration:
// ALTER TABLE inventario ADD COLUMN IF NOT EXISTS presentation text;
// ALTER TABLE inventario ADD COLUMN IF NOT EXISTS concentration text;
// ALTER TABLE inventario ADD COLUMN IF NOT EXISTS size text;
// ALTER TABLE inventario ADD COLUMN IF NOT EXISTS package_quantity integer;
// ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS patient_name text;

export interface MovimientoInventario {
  id: string;
  insumoId: string;
  insumoNombre: string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  usuarioNombre?: string;
  patientName?: string;
  createdAt: string;
}

function rowToInsumo(row: any): Insumo {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    stockActual: Number(row.stock_actual),
    stockMinimo: Number(row.stock_minimo),
    unidad: row.unidad,
    presentation: row.presentation ?? undefined,
    concentration: row.concentration ?? undefined,
    size: row.size ?? undefined,
    packageQuantity: row.package_quantity != null ? Number(row.package_quantity) : undefined,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function obtenerInventario(): Promise<Insumo[]> {
  const { data, error } = await supabase.from('inventario').select('*').order('nombre');
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
      presentation: insumo.presentation ?? null,
      concentration: insumo.concentration ?? null,
      size: insumo.size ?? null,
      package_quantity: insumo.packageQuantity ?? null,
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
  if (campos.presentation !== undefined) update.presentation = campos.presentation;
  if (campos.concentration !== undefined) update.concentration = campos.concentration;
  if (campos.size !== undefined) update.size = campos.size;
  if (campos.packageQuantity !== undefined) update.package_quantity = campos.packageQuantity;
  if (campos.observaciones !== undefined) update.observaciones = campos.observaciones;
  const { error } = await supabase.from('inventario').update(update).eq('id', id);
  if (error) throw error;
}

export async function eliminarInsumo(id: string): Promise<void> {
  const { error } = await supabase.from('inventario').delete().eq('id', id);
  if (error) throw error;
}

export async function ajustarStock(
  id: string,
  delta: number,
  usuarioNombre?: string,
  patientName?: string,
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('inventario')
    .select('stock_actual, nombre')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  const stockAntes = Number(data.stock_actual);
  const stockDespues = Math.max(0, stockAntes + delta);
  const { error } = await supabase
    .from('inventario')
    .update({ stock_actual: stockDespues, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  supabase.from('inventario_movimientos').insert({
    insumo_id: id,
    insumo_nombre: data.nombre,
    tipo: delta > 0 ? 'entrada' : 'salida',
    cantidad: Math.abs(delta),
    stock_antes: stockAntes,
    stock_despues: stockDespues,
    usuario_nombre: usuarioNombre ?? null,
    patient_name: patientName ?? null,
  }).then(() => {}).catch(() => {});
}

export async function obtenerMovimientosInsumo(insumoId: string): Promise<MovimientoInventario[]> {
  const { data, error } = await supabase
    .from('inventario_movimientos')
    .select('*')
    .eq('insumo_id', insumoId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []).map(row => ({
    id: row.id,
    insumoId: row.insumo_id,
    insumoNombre: row.insumo_nombre,
    tipo: row.tipo as 'entrada' | 'salida',
    cantidad: Number(row.cantidad),
    stockAntes: Number(row.stock_antes),
    stockDespues: Number(row.stock_despues),
    usuarioNombre: row.usuario_nombre ?? undefined,
    patientName: row.patient_name ?? undefined,
    createdAt: row.created_at,
  }));
}
