import { supabase } from '../lib/supabase';
import { Incumplimiento } from '../types';
import { crearNotificacion } from './notificaciones';
import { getHogarId } from './hogar';

function rowToIncumplimiento(row: any): Incumplimiento {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    detalle: row.detalle,
    horaFin: row.hora_fin ?? undefined,
    fecha: row.fecha,
    registradoEn: row.registrado_en,
    requerimientoMotivo: row.requerimiento_motivo ?? undefined,
    requerimientoEstado: row.requerimiento_estado ?? undefined,
    requerimientoFecha: row.requerimiento_fecha ?? undefined,
    requerimientoResueltoEn: row.requerimiento_resuelto_en ?? undefined,
    requerimientoRechazoMotivo: row.requerimiento_rechazo_motivo ?? undefined,
    requerimientoRechazadoEn: row.requerimiento_rechazado_en ?? undefined,
    requerimientoUsuarioId: row.requerimiento_usuario_id ?? undefined,
    requerimientoUsuarioNombre: row.requerimiento_usuario_nombre ?? undefined,
  };
}

export async function obtenerIncumplimientos(dias = 30): Promise<Incumplimiento[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const { data, error } = await supabase
    .from('incumplimientos')
    .select('*')
    .gte('fecha', desde.toISOString().slice(0, 10))
    .order('fecha', { ascending: false })
    .order('registrado_en', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToIncumplimiento);
}

export async function registrarIncumplimiento(
  inc: Omit<Incumplimiento, 'id' | 'registradoEn' | 'requerimientoMotivo' | 'requerimientoEstado' | 'requerimientoFecha' | 'requerimientoResueltoEn'>
): Promise<void> {
  const hogarId = await getHogarId();
  const { error } = await supabase
    .from('incumplimientos')
    .insert({
      hogar_id: hogarId,
      paciente_id: inc.pacienteId,
      tipo: inc.tipo,
      detalle: inc.detalle,
      hora_fin: inc.horaFin ?? null,
      fecha: inc.fecha,
    });
  if (error && !error.message.includes('duplicate') && !error.code?.includes('23505')) {
    throw error;
  }
}

export async function enviarRequerimiento(
  id: string,
  motivo: string,
  usuarioId?: string,
  usuarioNombre?: string,
  pacienteNombre?: string,
  detalle?: string,
): Promise<void> {
  // Update principal (campos que siempre existen)
  const { error } = await supabase
    .from('incumplimientos')
    .update({
      requerimiento_motivo: motivo.trim(),
      requerimiento_estado: 'pendiente',
      requerimiento_fecha: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;

  // Update de columnas de tracking de usuario (pueden no existir aún en la BD)
  if (usuarioId || usuarioNombre) {
    try {
      await supabase
        .from('incumplimientos')
        .update({
          requerimiento_usuario_id: usuarioId ?? null,
          requerimiento_usuario_nombre: usuarioNombre ?? null,
        })
        .eq('id', id);
    } catch { /* columnas opcionales */ }
  }

  // Notificar a todos los admins
  try {
    const resumen = [pacienteNombre, detalle].filter(Boolean).join(' — ');
    await crearNotificacion({
      paraRol: 'admin',
      tipo: 'requerimiento_nuevo',
      titulo: 'Nuevo requerimiento de justificación',
      mensaje: `${usuarioNombre ?? 'Un enfermero'} solicita justificación${resumen ? ` para ${resumen}` : ''}.`,
      datos: { incumplimientoId: id },
    });
  } catch { /* no interrumpir el flujo principal */ }
}

export async function resolverRequerimiento(
  id: string,
  incumplimiento?: Incumplimiento,
  pacienteNombre?: string,
): Promise<void> {
  const { error } = await supabase
    .from('incumplimientos')
    .update({
      requerimiento_estado: 'resuelto',
      requerimiento_resuelto_en: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;

  // Notificar al enfermero que envió el requerimiento
  try {
    const destinatarioId = incumplimiento?.requerimientoUsuarioId;
    if (destinatarioId) {
      const resumen = [pacienteNombre, incumplimiento?.detalle].filter(Boolean).join(' — ');
      await crearNotificacion({
        destinatarioId,
        tipo: 'requerimiento_aprobado',
        titulo: 'Requerimiento aprobado ✓',
        mensaje: `Tu solicitud${resumen ? ` para ${resumen}` : ''} fue aprobada. Ya puedes registrar el dato.`,
        datos: { incumplimientoId: id },
      });
    }
  } catch { /* no interrumpir el flujo principal */ }
}

export async function rechazarRequerimiento(
  id: string,
  motivo: string,
  incumplimiento?: Incumplimiento,
  pacienteNombre?: string,
): Promise<void> {
  const { error } = await supabase
    .from('incumplimientos')
    .update({
      requerimiento_estado: 'rechazado',
      requerimiento_rechazo_motivo: motivo.trim(),
      requerimiento_rechazado_en: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;

  // Notificar al enfermero que envió el requerimiento
  try {
    const destinatarioId = incumplimiento?.requerimientoUsuarioId;
    if (destinatarioId) {
      const resumen = [pacienteNombre, incumplimiento?.detalle].filter(Boolean).join(' — ');
      await crearNotificacion({
        destinatarioId,
        tipo: 'requerimiento_rechazado',
        titulo: 'Requerimiento rechazado',
        mensaje: `Tu solicitud${resumen ? ` para ${resumen}` : ''} fue rechazada. Motivo: ${motivo.trim()}`,
        datos: { incumplimientoId: id },
      });
    }
  } catch { /* no interrumpir el flujo principal */ }
}

/** Devuelve IDs de incumplimientos cuyo dato ya fue registrado en la BD (con o sin flujo de justificación) */
export async function obtenerCompletadosIds(incs: Incumplimiento[]): Promise<Set<string>> {
  // Incluye resueltos (aprobados por admin) Y sin justificar (registrados tarde, sin workflow)
  const resueltos = incs.filter(i => i.requerimientoEstado === 'resuelto' || !i.requerimientoEstado);
  if (resueltos.length === 0) return new Set();

  const completados = new Set<string>();
  const hoy = new Date().toISOString().slice(0, 10);

  await Promise.all(resueltos.map(async inc => {
    if (inc.tipo === 'signos_vitales') {
      const { data } = await supabase
        .from('signos_vitales')
        .select('id')
        .eq('paciente_id', inc.pacienteId)
        .eq('toma_nombre', inc.detalle)
        .gte('created_at', `${inc.fecha}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
        .limit(1);
      if (data && data.length > 0) completados.add(inc.id);
    } else if (inc.tipo === 'medicamento') {
      const { data } = await supabase
        .from('administraciones_medicamentos')
        .select('id')
        .eq('paciente_id', inc.pacienteId)
        .ilike('medicamento_nombre', inc.detalle)
        .gte('created_at', `${inc.fecha}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
        .limit(1);
      if (data && data.length > 0) completados.add(inc.id);
    }
  }));

  return completados;
}

export async function eliminarIncumplimiento(id: string): Promise<void> {
  const { error } = await supabase.from('incumplimientos').delete().eq('id', id);
  if (error) throw error;
}
