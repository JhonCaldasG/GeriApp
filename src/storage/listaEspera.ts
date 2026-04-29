import { supabase } from '../lib/supabase';
import { SolicitanteIngreso } from '../types';

function rowToSolicitante(row: any): SolicitanteIngreso {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    fechaNacimiento: row.fecha_nacimiento ?? undefined,
    diagnosticoPreliminar: row.diagnostico_preliminar ?? '',
    contactoNombre: row.contacto_nombre,
    contactoTelefono: row.contacto_telefono,
    contactoRelacion: row.contacto_relacion,
    prioridad: row.prioridad ?? 'normal',
    estado: row.estado ?? 'en_espera',
    fechaSolicitud: row.fecha_solicitud,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerListaEspera(): Promise<SolicitanteIngreso[]> {
  const { data, error } = await supabase
    .from('lista_espera')
    .select('*')
    .order('prioridad')
    .order('fecha_solicitud');
  if (error) throw error;
  return (data ?? []).map(rowToSolicitante);
}

export async function guardarSolicitante(s: Omit<SolicitanteIngreso, 'id' | 'createdAt'>): Promise<SolicitanteIngreso> {
  const { data, error } = await supabase
    .from('lista_espera')
    .insert({
      nombre: s.nombre,
      apellido: s.apellido,
      fecha_nacimiento: s.fechaNacimiento ?? null,
      diagnostico_preliminar: s.diagnosticoPreliminar ?? '',
      contacto_nombre: s.contactoNombre,
      contacto_telefono: s.contactoTelefono,
      contacto_relacion: s.contactoRelacion,
      prioridad: s.prioridad,
      estado: s.estado,
      fecha_solicitud: s.fechaSolicitud,
      observaciones: s.observaciones ?? '',
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSolicitante(data);
}

export async function actualizarEstadoSolicitante(id: string, estado: SolicitanteIngreso['estado']): Promise<void> {
  const { error } = await supabase.from('lista_espera').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function eliminarSolicitante(id: string): Promise<void> {
  const { error } = await supabase.from('lista_espera').delete().eq('id', id);
  if (error) throw error;
}
