export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string; // ISO string
  dni: string;
  habitacion: string;
  diagnosticoPrincipal: string;
  alergias: string;
  obraSocial: string;
  eps: string;
  medicoResponsable: string;
  contactoFamiliar: {
    nombre: string;
    telefono: string;
    relacion: string;
  };
  fotoUri?: string;
  riesgoCaida?: boolean;
  dnr?: boolean;
  fallecido?: boolean;
  fechaFallecimiento?: string | null;
  fechaIngreso?: string | null;
  createdAt: string;
}

export interface SignoVital {
  id: string;
  pacienteId: string;
  presionSistolica: string;
  presionDiastolica: string;
  frecuenciaCardiaca: string;
  temperatura: string;
  saturacionOxigeno: string;
  glucosa: string;
  peso: string;
  registradoPor: string;
  editadoPor?: string | null;
  observaciones: string;
  tomaNombre?: string;
  createdAt: string;
}

export interface Medicamento {
  id: string;
  pacienteId: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  horario: string;
  viaAdministracion: string;
  observaciones: string;
  activo: boolean;
  createdAt: string;
}

export interface RegistroMedico {
  id: string;
  pacienteId: string;
  tipo: 'Nota' | 'Diagnóstico' | 'Procedimiento' | 'Alergia' | 'Observación';
  titulo: string;
  descripcion: string;
  registradoPor: string;
  fotoUrls: string[];
  createdAt: string;
}

export interface AdministracionMedicamento {
  id: string;
  medicamentoId: string;
  pacienteId: string;
  medicamentoNombre: string;
  dosis: string;
  firmante: string;
  notas: string;
  numeroDosis?: number;
  totalDiarias?: number | null;
  rechazado?: boolean;
  motivoRechazo?: string;
  createdAt: string;
}

export interface EvaluacionClinica {
  id: string;
  pacienteId: string;
  tipo: 'barthel' | 'braden';
  puntuacion: number;
  items: Record<string, number>;
  observaciones: string;
  evaluadoPor: string;
  createdAt: string;
}

export interface RegistroDieta {
  id: string;
  pacienteId: string;
  tipo: 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'extra';
  descripcion: string;
  porcentajeConsumido: number;
  apetito: 'bueno' | 'regular' | 'malo';
  liquidosMl: number | null;
  observaciones: string;
  registradoPor: string;
  createdAt: string;
}

export interface Incidente {
  id: string;
  pacienteId: string;
  tipo: 'caída' | 'lesión' | 'comportamiento' | 'medicación' | 'otro';
  descripcion: string;
  lugar: string;
  consecuencias: string;
  testigos: string;
  accionesTomadas: string;
  registradoPor: string;
  createdAt: string;
}

export interface Ausencia {
  id: string;
  pacienteId: string;
  tipo: 'internacion' | 'salida_familiar' | 'licencia' | 'otro';
  motivo: string;
  fechaInicio: string;
  horaSalida?: string | null;
  fechaFin: string | null;
  horaRegreso?: string | null;
  destino: string;
  responsable: string;
  observaciones: string;
  firmaFamiliar?: string | null;
  createdAt: string;
}

export interface TomaSigno {
  id: string;
  nombre: string;      // "Mañana", "Tarde", "Noche"
  horaInicio: string;  // "07:00"
  horaFin: string;     // "09:00"
}

export type RolUsuario = 'admin' | 'enfermero' | 'aseo';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  usuario: string;
  password: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoIngreso?: string | null;
}

// Navigation types

export type SignosStackParamList = {
  PacientesSignos: undefined;
  RegistrarSignos: { pacienteId: string; pacienteNombre: string; signoId?: string; tomaInicial?: string; fechaInfraccion?: string };
  HistorialSignos: { pacienteId: string; pacienteNombre: string };
};

export interface LimpiezaRegistro {
  id: string;
  pacienteId?: string | null;
  tipo: 'Habitación' | 'Baño' | 'Zona común' | 'Pasillo' | 'Zona ropas' | 'General' | 'Cocina';
  descripcion: string;
  realizadoPor: string;
  observaciones: string;
  fotoUrls: string[];
  createdAt: string;
}

export type AseoStackParamList = {
  PacientesAseo: undefined;
  ListaLimpiezas: { pacienteId: string; pacienteNombre: string; habitacion: string };
  RegistrarLimpieza: { pacienteId: string; pacienteNombre: string; habitacion: string };
  RegistrarLimpiezaZona: { tipo: LimpiezaRegistro['tipo'] };
};

export type HistorialStackParamList = {
  PacientesHistorial: undefined;
  ListaHistorial: { pacienteId: string; pacienteNombre: string };
  AgregarRegistro: { pacienteId: string; pacienteNombre: string };
  DetalleRegistro: { registroId: string; pacienteNombre: string };
};

export interface ActividadPaciente {
  id: string;
  pacienteId: string;
  tipo: 'Lúdica' | 'Taller' | 'Recreativa' | 'Física' | 'Cultural' | 'Social' | 'Otra';
  nombre: string;
  descripcion: string;
  realizadoPor: string;
  fotoUrls: string[];
  createdAt: string;
}

export type ActividadesStackParamList = {
  PacientesActividades: undefined;
  ListaActividades: { pacienteId: string; pacienteNombre: string };
  RegistrarActividad: { pacienteId: string; pacienteNombre: string };
};

export type RequerimientoEstado = 'pendiente' | 'resuelto' | 'rechazado';

export interface Incumplimiento {
  id: string;
  pacienteId: string;
  tipo: 'signos_vitales' | 'medicamento';
  detalle: string;
  horaFin?: string;
  fecha: string;           // YYYY-MM-DD
  registradoEn: string;
  // Requerimiento de justificación
  requerimientoMotivo?: string;
  requerimientoEstado?: RequerimientoEstado;
  requerimientoFecha?: string;
  requerimientoResueltoEn?: string;
  requerimientoRechazoMotivo?: string;
  requerimientoRechazadoEn?: string;
  requerimientoUsuarioId?: string;
  requerimientoUsuarioNombre?: string;
}

export type NotificacionTipo =
  | 'requerimiento_nuevo'
  | 'requerimiento_aprobado'
  | 'requerimiento_rechazado'
  | 'infraccion_nueva'
  | 'turno_proximo'
  | 'signos_alerta'
  | 'sistema';

export interface Notificacion {
  id: string;
  destinatarioId?: string;
  paraRol?: string;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  leida: boolean;
  datos?: Record<string, any>;
  createdAt: string;
}

export interface TurnoEnfermeria {
  id: string;
  usuarioId: string;
  duracion: '8h' | '12h' | '24h';
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  observaciones: string;
  createdAt: string;
}

export interface SignosSnapshot {
  presionSistolica?: string;
  presionDiastolica?: string;
  frecuenciaCardiaca?: string;
  temperatura?: string;
  saturacionOxigeno?: string;
  glucosa?: string;
  peso?: string;
}

export interface MedSnapshot {
  nombre: string;
  dosis: string;
  hora: string;
}

export interface NotaEvolucion {
  id: string;
  pacienteId: string;
  texto: string;
  usuarioId: string;
  usuarioNombre: string;
  turno?: 'mañana' | 'tarde' | 'noche' | null;
  estadoPaciente?: 'estable' | 'regular' | 'delicado' | 'critico' | null;
  signosAdjuntos?: SignosSnapshot | null;
  medicamentosAdjuntos?: MedSnapshot[] | null;
  createdAt: string;
}

export interface AuditoriaEntry {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalle?: string;
  createdAt: string;
}

export type MedicamentosStackParamList = {
  PacientesMedicamentos: undefined;
  ListaMedicamentos: { pacienteId: string; pacienteNombre: string };
  AgregarMedicamento: { pacienteId: string; pacienteNombre: string };
  HistorialAdministraciones: { pacienteId: string; pacienteNombre: string };
  TimelineMedicamentos: undefined;
};

export type PacientesStackParamList = {
  ListaPacientes: { destino?: 'NotasEnfermeria' } | undefined;
  AgregarPaciente: { pacienteId?: string } | undefined;
  PerfilPaciente: { pacienteId: string };
  NotasEnfermeria: { pacienteId: string; pacienteNombre: string };
  EvaluacionClinica: { pacienteId: string; pacienteNombre: string };
  Dieta: { pacienteId: string; pacienteNombre: string };
  Incidentes: { pacienteId: string; pacienteNombre: string };
  Ausencias: { pacienteId: string; pacienteNombre: string };
};

// ── Inventario ────────────────────────────────────────────────────────────────
export interface Insumo {
  id: string;
  nombre: string;
  categoria: 'higiene' | 'medicamentos' | 'material_medico' | 'limpieza' | 'alimentos';
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Citas médicas ─────────────────────────────────────────────────────────────
export interface CitaMedica {
  id: string;
  pacienteId: string;
  especialidad: string;
  medico: string;
  fecha: string;       // YYYY-MM-DD
  hora: string;        // HH:MM
  lugar: string;
  observaciones?: string;
  estado: 'pendiente' | 'realizada' | 'cancelada';
  createdAt: string;
}

// ── Lista de espera ───────────────────────────────────────────────────────────
export interface SolicitanteIngreso {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string;
  diagnosticoPreliminar?: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoRelacion: string;
  prioridad: 'urgente' | 'normal';
  estado: 'en_espera' | 'admitido' | 'descartado';
  fechaSolicitud: string;
  observaciones?: string;
  createdAt: string;
}

// ── Asistencia ────────────────────────────────────────────────────────────────
export interface RegistroAsistencia {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  fecha: string;         // YYYY-MM-DD
  horaEntrada?: string;  // HH:MM
  horaSalida?: string;   // HH:MM
  observaciones?: string;
  createdAt: string;
}

// ── Handover ──────────────────────────────────────────────────────────────────
export interface NotaHandover {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  turno: 'mañana' | 'tarde' | 'noche';
  fecha: string;                  // YYYY-MM-DD
  novedades: string;
  medicamentosEventos: string;
  pendientesProximoTurno: string;
  createdAt: string;
}

// ── Mensajes internos ─────────────────────────────────────────────────────────
export interface MensajeInterno {
  id: string;
  autorId: string;
  autorNombre: string;
  titulo: string;
  cuerpo: string;
  paraRol: 'todos' | 'enfermero' | 'aseo';
  createdAt: string;
}

// ── Parámetros de navegación nuevos ──────────────────────────────────────────
export type InventarioStackParamList = {
  InventarioList: undefined;
  AgregarInsumo: { insumoId?: string } | undefined;
};

export type CitasStackParamList = {
  CitasList: { pacienteId?: string; pacienteNombre?: string } | undefined;
  AgregarCita: { pacienteId?: string; pacienteNombre?: string } | undefined;
};

export type ListaEsperaStackParamList = {
  ListaEsperaList: undefined;
  AgregarSolicitante: { solicitanteId?: string } | undefined;
};
