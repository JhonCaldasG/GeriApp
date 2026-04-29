import { supabase } from '../lib/supabase';
import { Paciente, SignoVital, Medicamento, RegistroMedico } from '../types';

// ─── MAPPERS ─────────────────────────────────────────────────────────────────

function rowToPaciente(row: any): Paciente {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    fechaNacimiento: row.fecha_nacimiento,
    dni: row.dni ?? '',
    habitacion: row.habitacion ?? '',
    diagnosticoPrincipal: row.diagnostico_principal ?? '',
    alergias: row.alergias ?? '',
    obraSocial: row.obra_social ?? '',
    eps: row.eps ?? '',
    medicoResponsable: row.medico_responsable ?? '',
    contactoFamiliar: row.contacto_familiar ?? { nombre: '', telefono: '', relacion: '' },
    fotoUri: row.foto_uri ?? undefined,
    riesgoCaida: row.riesgo_caida ?? false,
    fallecido: row.fallecido ?? false,
    fechaFallecimiento: row.fecha_fallecimiento ?? null,
    fechaIngreso: row.fecha_ingreso ?? null,
    createdAt: row.created_at,
  };
}

function rowToSigno(row: any): SignoVital {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    presionSistolica: row.presion_sistolica ?? '',
    presionDiastolica: row.presion_diastolica ?? '',
    frecuenciaCardiaca: row.frecuencia_cardiaca ?? '',
    temperatura: row.temperatura ?? '',
    saturacionOxigeno: row.saturacion_oxigeno ?? '',
    glucosa: row.glucosa ?? '',
    peso: row.peso ?? '',
    registradoPor: row.registrado_por ?? '',
    editadoPor: row.editado_por ?? null,
    observaciones: row.observaciones ?? '',
    tomaNombre: row.toma_nombre ?? undefined,
    createdAt: row.created_at,
  };
}

function rowToMedicamento(row: any): Medicamento {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    nombre: row.nombre,
    dosis: row.dosis ?? '',
    frecuencia: row.frecuencia ?? '',
    horario: row.horario ?? '',
    viaAdministracion: row.via_administracion ?? '',
    observaciones: row.observaciones ?? '',
    activo: row.activo ?? true,
    createdAt: row.created_at,
  };
}

function rowToRegistro(row: any): RegistroMedico {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    titulo: row.titulo ?? '',
    descripcion: row.descripcion ?? '',
    registradoPor: row.registrado_por ?? '',
    fotoUrls: row.foto_urls ?? [],
    createdAt: row.created_at,
  };
}

// ─── PACIENTES ───────────────────────────────────────────────────────────────

export async function obtenerPacientes(): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToPaciente);
}

export async function guardarPaciente(paciente: Omit<Paciente, 'id' | 'createdAt'>): Promise<Paciente> {
  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      fecha_nacimiento: paciente.fechaNacimiento,
      dni: paciente.dni,
      habitacion: paciente.habitacion,
      diagnostico_principal: paciente.diagnosticoPrincipal,
      alergias: paciente.alergias,
      obra_social: paciente.obraSocial,
      eps: paciente.eps,
      medico_responsable: paciente.medicoResponsable,
      contacto_familiar: paciente.contactoFamiliar,
      foto_uri: paciente.fotoUri,
      riesgo_caida: paciente.riesgoCaida,
      fallecido: paciente.fallecido ?? false,
      fecha_fallecimiento: paciente.fechaFallecimiento ?? null,
      fecha_ingreso: paciente.fechaIngreso ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToPaciente(data);
}

export async function actualizarPaciente(id: string, datos: Partial<Paciente>): Promise<void> {
  const payload: any = {};
  if (datos.nombre !== undefined) payload.nombre = datos.nombre;
  if (datos.apellido !== undefined) payload.apellido = datos.apellido;
  if (datos.fechaNacimiento !== undefined) payload.fecha_nacimiento = datos.fechaNacimiento;
  if (datos.dni !== undefined) payload.dni = datos.dni;
  if (datos.habitacion !== undefined) payload.habitacion = datos.habitacion;
  if (datos.diagnosticoPrincipal !== undefined) payload.diagnostico_principal = datos.diagnosticoPrincipal;
  if (datos.alergias !== undefined) payload.alergias = datos.alergias;
  if (datos.obraSocial !== undefined) payload.obra_social = datos.obraSocial;
  if (datos.eps !== undefined) payload.eps = datos.eps;
  if (datos.medicoResponsable !== undefined) payload.medico_responsable = datos.medicoResponsable;
  if (datos.contactoFamiliar !== undefined) payload.contacto_familiar = datos.contactoFamiliar;
  if (datos.fotoUri !== undefined) payload.foto_uri = datos.fotoUri;
  if (datos.riesgoCaida !== undefined) payload.riesgo_caida = datos.riesgoCaida;
  if (datos.fallecido !== undefined) payload.fallecido = datos.fallecido;
  if (datos.fechaFallecimiento !== undefined) payload.fecha_fallecimiento = datos.fechaFallecimiento;
  if (datos.fechaIngreso !== undefined) payload.fecha_ingreso = datos.fechaIngreso;

  const { error } = await supabase.from('pacientes').update(payload).eq('id', id);
  if (error) throw error;
}

async function marcarCarpetaEliminada(bucket: string, prefijo: string): Promise<void> {
  const { data } = await supabase.storage.from(bucket).list(prefijo, { limit: 100 });
  if (!data || data.length === 0) return;

  const prefijoDestino = `${prefijo}_DELETED`;
  for (const item of data) {
    if (item.id) {
      // Es un archivo
      await supabase.storage.from(bucket).move(`${prefijo}/${item.name}`, `${prefijoDestino}/${item.name}`);
    } else {
      // Es una subcarpeta, recurrir
      await marcarCarpetaEliminada(bucket, `${prefijo}/${item.name}`);
    }
  }
}

export async function eliminarPaciente(id: string): Promise<void> {
  // Marcar carpetas en Storage con _DELETED antes de borrar el registro
  await Promise.allSettled([
    marcarCarpetaEliminada('pacientes', id),
    marcarCarpetaEliminada('registros', id),
  ]);

  const { error } = await supabase.from('pacientes').delete().eq('id', id);
  if (error) throw error;
}

// ─── SIGNOS VITALES ──────────────────────────────────────────────────────────

export async function obtenerSignos(pacienteId?: string): Promise<SignoVital[]> {
  let query = supabase.from('signos_vitales').select('*').order('created_at', { ascending: false });
  if (pacienteId) query = query.eq('paciente_id', pacienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToSigno);
}

export async function guardarSigno(signo: Omit<SignoVital, 'id' | 'createdAt'>): Promise<SignoVital> {
  const { data, error } = await supabase
    .from('signos_vitales')
    .insert({
      paciente_id: signo.pacienteId,
      presion_sistolica: signo.presionSistolica,
      presion_diastolica: signo.presionDiastolica,
      frecuencia_cardiaca: signo.frecuenciaCardiaca,
      temperatura: signo.temperatura,
      saturacion_oxigeno: signo.saturacionOxigeno,
      glucosa: signo.glucosa,
      peso: signo.peso,
      registrado_por: signo.registradoPor,
      observaciones: signo.observaciones,
      toma_nombre: signo.tomaNombre,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSigno(data);
}

export async function actualizarSigno(id: string, signo: Partial<Omit<SignoVital, 'id' | 'createdAt' | 'pacienteId'>>): Promise<void> {
  const { error } = await supabase
    .from('signos_vitales')
    .update({
      presion_sistolica:   signo.presionSistolica,
      presion_diastolica:  signo.presionDiastolica,
      frecuencia_cardiaca: signo.frecuenciaCardiaca,
      temperatura:         signo.temperatura,
      saturacion_oxigeno:  signo.saturacionOxigeno,
      glucosa:             signo.glucosa,
      peso:                signo.peso,
      editado_por:         signo.editadoPor,   // solo actualiza editado_por, NO registrado_por
      observaciones:       signo.observaciones,
      toma_nombre:         signo.tomaNombre,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function eliminarSigno(id: string): Promise<void> {
  const { error } = await supabase.from('signos_vitales').delete().eq('id', id);
  if (error) throw error;
}

// ─── MEDICAMENTOS ────────────────────────────────────────────────────────────

export async function obtenerMedicamentos(pacienteId?: string): Promise<Medicamento[]> {
  let query = supabase.from('medicamentos').select('*').order('created_at', { ascending: true });
  if (pacienteId) query = query.eq('paciente_id', pacienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToMedicamento);
}

export async function guardarMedicamento(med: Omit<Medicamento, 'id' | 'createdAt'>): Promise<Medicamento> {
  const { data, error } = await supabase
    .from('medicamentos')
    .insert({
      paciente_id: med.pacienteId,
      nombre: med.nombre,
      dosis: med.dosis,
      frecuencia: med.frecuencia,
      horario: med.horario,
      via_administracion: med.viaAdministracion,
      observaciones: med.observaciones,
      activo: med.activo,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToMedicamento(data);
}

export async function actualizarMedicamento(
  id: string,
  datos: Partial<Omit<Medicamento, 'id' | 'createdAt' | 'pacienteId'>>
): Promise<void> {
  const payload: any = {};
  if (datos.nombre !== undefined) payload.nombre = datos.nombre;
  if (datos.dosis !== undefined) payload.dosis = datos.dosis;
  if (datos.frecuencia !== undefined) payload.frecuencia = datos.frecuencia;
  if (datos.horario !== undefined) payload.horario = datos.horario;
  if (datos.viaAdministracion !== undefined) payload.via_administracion = datos.viaAdministracion;
  if (datos.observaciones !== undefined) payload.observaciones = datos.observaciones;
  if (datos.activo !== undefined) payload.activo = datos.activo;

  const { error } = await supabase.from('medicamentos').update(payload).eq('id', id);
  if (error) throw error;
}

export async function eliminarMedicamento(id: string): Promise<void> {
  const { error } = await supabase.from('medicamentos').delete().eq('id', id);
  if (error) throw error;
}

// ─── REGISTROS MÉDICOS ───────────────────────────────────────────────────────

export async function obtenerRegistros(pacienteId?: string): Promise<RegistroMedico[]> {
  let query = supabase.from('registros_medicos').select('*').order('created_at', { ascending: false });
  if (pacienteId) query = query.eq('paciente_id', pacienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToRegistro);
}

export async function guardarRegistro(registro: Omit<RegistroMedico, 'id' | 'createdAt'>): Promise<RegistroMedico> {
  const { data, error } = await supabase
    .from('registros_medicos')
    .insert({
      paciente_id: registro.pacienteId,
      tipo: registro.tipo,
      titulo: registro.titulo,
      descripcion: registro.descripcion,
      registrado_por: registro.registradoPor,
      foto_urls: registro.fotoUrls ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return rowToRegistro(data);
}

export async function eliminarRegistro(id: string, fotoUrls?: string[]): Promise<void> {
  if (fotoUrls && fotoUrls.length > 0) {
    const marker = '/object/public/pacientes/';
    for (const url of fotoUrls) {
      try {
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const storagePath = decodeURIComponent(url.substring(idx + marker.length));
          const lastDot = storagePath.lastIndexOf('.');
          const deletedPath = lastDot !== -1
            ? storagePath.substring(0, lastDot) + '_DELETED' + storagePath.substring(lastDot)
            : storagePath + '_DELETED';
          await supabase.storage.from('pacientes').move(storagePath, deletedPath);
        }
      } catch { /* si falla el rename no bloqueamos el borrado */ }
    }
  }
  const { error } = await supabase.from('registros_medicos').delete().eq('id', id);
  if (error) throw error;
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export function formatearFecha(isoString: string): string {
  const fecha = new Date(isoString);
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatearFechaHora(isoString: string): string {
  const fecha = new Date(isoString);
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function inicialesdePaciente(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}
