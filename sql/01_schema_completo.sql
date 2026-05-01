-- ============================================================
-- HOGAR GERIÁTRICO — SCHEMA COMPLETO
-- Base de datos: Supabase (PostgreSQL)
-- Generado: 2026-05-01
--
-- Ejecutar en el SQL Editor de Supabase en el orden indicado.
-- Cada bloque usa CREATE TABLE IF NOT EXISTS para ser idempotente.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. CONFIGURACIÓN DEL HOGAR
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hogar_config (
  id                   INTEGER PRIMARY KEY DEFAULT 1,
  nombre               TEXT    NOT NULL DEFAULT 'Hogar Geriátrico',
  direccion            TEXT    NOT NULL DEFAULT '',
  telefono             TEXT    NOT NULL DEFAULT '',
  telefono_emergencia  TEXT    NOT NULL DEFAULT '',
  email                TEXT    NOT NULL DEFAULT '',
  ciudad               TEXT    NOT NULL DEFAULT '',
  provincia            TEXT    NOT NULL DEFAULT '',
  logo_uri             TEXT,
  CONSTRAINT hogar_config_single_row CHECK (id = 1)
);

ALTER TABLE hogar_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hogar_config_all" ON hogar_config FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. USUARIOS DEL SISTEMA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT    NOT NULL,
  apellido       TEXT    NOT NULL DEFAULT '',
  usuario        TEXT    NOT NULL UNIQUE,
  password       TEXT    NOT NULL,
  rol            TEXT    NOT NULL DEFAULT 'enfermero'
                         CHECK (rol IN ('admin', 'enfermero', 'aseo')),
  activo         BOOLEAN NOT NULL DEFAULT true,
  ultimo_ingreso TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios (usuario);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_all" ON usuarios FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 3. PACIENTES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                TEXT    NOT NULL,
  apellido              TEXT    NOT NULL,
  fecha_nacimiento      DATE    NOT NULL,
  dni                   TEXT    NOT NULL DEFAULT '',
  habitacion            TEXT    NOT NULL DEFAULT '',
  diagnostico_principal TEXT    NOT NULL DEFAULT '',
  alergias              TEXT    NOT NULL DEFAULT '',
  obra_social           TEXT    NOT NULL DEFAULT '',
  eps                   TEXT    NOT NULL DEFAULT '',
  medico_responsable    TEXT    NOT NULL DEFAULT '',
  contacto_familiar     JSONB   NOT NULL DEFAULT '{"nombre":"","telefono":"","relacion":""}',
  foto_uri              TEXT,
  riesgo_caida          BOOLEAN NOT NULL DEFAULT false,
  dnr                   BOOLEAN NOT NULL DEFAULT false,
  fallecido             BOOLEAN NOT NULL DEFAULT false,
  fecha_fallecimiento   DATE,
  fecha_ingreso         DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_apellido ON pacientes (apellido, nombre);
CREATE INDEX IF NOT EXISTS idx_pacientes_habitacion ON pacientes (habitacion);

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pacientes_all" ON pacientes FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 4. SIGNOS VITALES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signos_vitales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  presion_sistolica   TEXT NOT NULL DEFAULT '',
  presion_diastolica  TEXT NOT NULL DEFAULT '',
  frecuencia_cardiaca TEXT NOT NULL DEFAULT '',
  temperatura         TEXT NOT NULL DEFAULT '',
  saturacion_oxigeno  TEXT NOT NULL DEFAULT '',
  glucosa             TEXT NOT NULL DEFAULT '',
  peso                TEXT NOT NULL DEFAULT '',
  registrado_por      TEXT NOT NULL DEFAULT '',
  editado_por         TEXT,
  observaciones       TEXT NOT NULL DEFAULT '',
  toma_nombre         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signos_paciente ON signos_vitales (paciente_id, created_at DESC);

ALTER TABLE signos_vitales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signos_all" ON signos_vitales FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 5. HORARIOS DE TOMA DE SIGNOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horarios_signos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,        -- "Mañana", "Tarde", "Noche"
  hora_inicio TEXT NOT NULL,        -- "07:00"
  hora_fin    TEXT NOT NULL,        -- "09:00"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE horarios_signos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horarios_signos_all" ON horarios_signos FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 6. MEDICAMENTOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicamentos (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         UUID    NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nombre              TEXT    NOT NULL,
  dosis               TEXT    NOT NULL DEFAULT '',
  frecuencia          TEXT    NOT NULL DEFAULT '',
  horario             TEXT    NOT NULL DEFAULT '',
  via_administracion  TEXT    NOT NULL DEFAULT '',
  observaciones       TEXT    NOT NULL DEFAULT '',
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medicamentos_paciente ON medicamentos (paciente_id, activo);

ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicamentos_all" ON medicamentos FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 7. ADMINISTRACIONES DE MEDICAMENTO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS administraciones_medicamento (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id      UUID NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
  paciente_id         UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medicamento_nombre  TEXT NOT NULL DEFAULT '',
  dosis               TEXT NOT NULL DEFAULT '',
  firmante            TEXT NOT NULL DEFAULT '',
  notas               TEXT NOT NULL DEFAULT '',
  numero_dosis        INTEGER,
  total_diarias       INTEGER,
  rechazado           BOOLEAN NOT NULL DEFAULT false,
  motivo_rechazo      TEXT    NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_med_paciente ON administraciones_medicamento (paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_med_medicamento ON administraciones_medicamento (medicamento_id, created_at DESC);

ALTER TABLE administraciones_medicamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_med_all" ON administraciones_medicamento FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 8. REGISTROS MÉDICOS (HISTORIAL CLÍNICO)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_medicos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id    UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL
                 CHECK (tipo IN ('Nota','Diagnóstico','Procedimiento','Alergia','Observación')),
  titulo         TEXT NOT NULL DEFAULT '',
  descripcion    TEXT NOT NULL DEFAULT '',
  registrado_por TEXT NOT NULL DEFAULT '',
  foto_urls      JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registros_paciente ON registros_medicos (paciente_id, created_at DESC);

ALTER TABLE registros_medicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registros_all" ON registros_medicos FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 9. NOTAS DE EVOLUCIÓN
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notas_evolucion (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id             UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  texto                   TEXT NOT NULL,
  usuario_id              TEXT NOT NULL,
  usuario_nombre          TEXT NOT NULL,
  turno                   TEXT CHECK (turno IN ('mañana','tarde','noche')),
  estado_paciente         TEXT CHECK (estado_paciente IN ('estable','regular','delicado','critico')),
  signos_adjuntos         JSONB,
  medicamentos_adjuntos   JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_evolucion_paciente ON notas_evolucion (paciente_id, created_at DESC);

ALTER TABLE notas_evolucion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notas_evolucion_all" ON notas_evolucion FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 10. EVALUACIONES CLÍNICAS (BARTHEL / BRADEN)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluaciones_clinicas (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID    NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo          TEXT    NOT NULL CHECK (tipo IN ('barthel','braden')),
  puntuacion    INTEGER NOT NULL,
  items         JSONB   NOT NULL DEFAULT '{}',
  observaciones TEXT    NOT NULL DEFAULT '',
  evaluado_por  TEXT    NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_paciente ON evaluaciones_clinicas (paciente_id, tipo, created_at DESC);

ALTER TABLE evaluaciones_clinicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evaluaciones_all" ON evaluaciones_clinicas FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 11. REGISTROS DE DIETA / NUTRICIÓN
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_dieta (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id          UUID    NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo                 TEXT    NOT NULL
                       CHECK (tipo IN ('desayuno','almuerzo','merienda','cena','extra')),
  descripcion          TEXT    NOT NULL DEFAULT '',
  porcentaje_consumido INTEGER NOT NULL DEFAULT 100,
  apetito              TEXT    NOT NULL DEFAULT 'bueno'
                       CHECK (apetito IN ('bueno','regular','malo')),
  liquidos_ml          INTEGER,
  observaciones        TEXT    NOT NULL DEFAULT '',
  registrado_por       TEXT    NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dieta_paciente ON registros_dieta (paciente_id, created_at DESC);

ALTER TABLE registros_dieta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dieta_all" ON registros_dieta FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 12. INCIDENTES Y CAÍDAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidentes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL DEFAULT 'otro'
                   CHECK (tipo IN ('caída','lesión','comportamiento','medicación','otro')),
  descripcion      TEXT NOT NULL,
  lugar            TEXT NOT NULL DEFAULT '',
  consecuencias    TEXT NOT NULL DEFAULT '',
  testigos         TEXT NOT NULL DEFAULT '',
  acciones_tomadas TEXT NOT NULL DEFAULT '',
  registrado_por   TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidentes_paciente ON incidentes (paciente_id, created_at DESC);

ALTER TABLE incidentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidentes_all" ON incidentes FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 13. AUSENCIAS / INTERNACIONES TEMPORALES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ausencias (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID  NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo          TEXT  NOT NULL DEFAULT 'internacion'
                CHECK (tipo IN ('internacion','salida_familiar','licencia','otro')),
  motivo        TEXT  NOT NULL,
  fecha_inicio  DATE  NOT NULL,
  hora_salida   TEXT,
  fecha_fin     DATE,
  hora_regreso  TEXT,
  destino       TEXT  NOT NULL DEFAULT '',
  responsable   TEXT  NOT NULL DEFAULT '',
  observaciones TEXT  NOT NULL DEFAULT '',
  firma_familiar TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ausencias_paciente ON ausencias (paciente_id, fecha_inicio DESC);

ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ausencias_all" ON ausencias FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 14. LIMPIEZAS / ASEO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS limpiezas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  tipo          TEXT NOT NULL
                CHECK (tipo IN ('Habitación','Baño','Zona común','Pasillo','Zona ropas','General','Cocina')),
  descripcion   TEXT NOT NULL DEFAULT '',
  realizado_por TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  foto_urls     JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_limpiezas_paciente ON limpiezas (paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_limpiezas_fecha ON limpiezas (created_at DESC);

ALTER TABLE limpiezas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "limpiezas_all" ON limpiezas FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 15. ACTIVIDADES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actividades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL
                CHECK (tipo IN ('Lúdica','Taller','Recreativa','Física','Cultural','Social','Otra')),
  nombre        TEXT NOT NULL,
  descripcion   TEXT NOT NULL DEFAULT '',
  realizado_por TEXT NOT NULL DEFAULT '',
  foto_urls     JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actividades_paciente ON actividades (paciente_id, created_at DESC);

ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actividades_all" ON actividades FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 16. INVENTARIO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventario (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT    NOT NULL,
  categoria        TEXT    NOT NULL
                   CHECK (categoria IN ('higiene','medicamentos','material_medico','limpieza','alimentos')),
  stock_actual     NUMERIC NOT NULL DEFAULT 0,
  stock_minimo     NUMERIC NOT NULL DEFAULT 0,
  unidad           TEXT    NOT NULL DEFAULT 'unidad',
  presentation     TEXT,
  concentration    TEXT,
  size             TEXT,
  package_quantity INTEGER,
  observaciones    TEXT    NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventario_nombre ON inventario (nombre);
CREATE INDEX IF NOT EXISTS idx_inventario_categoria ON inventario (categoria);

ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventario_all" ON inventario FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 17. MOVIMIENTOS DE INVENTARIO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id      UUID    NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
  insumo_nombre  TEXT    NOT NULL,
  tipo           TEXT    NOT NULL CHECK (tipo IN ('entrada','salida')),
  cantidad       NUMERIC NOT NULL CHECK (cantidad > 0),
  stock_antes    NUMERIC NOT NULL,
  stock_despues  NUMERIC NOT NULL,
  usuario_nombre TEXT,
  patient_name   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_insumo ON inventario_movimientos (insumo_id, created_at DESC);

ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_mov_all" ON inventario_movimientos FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 18. CITAS MÉDICAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citas_medicas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  especialidad  TEXT NOT NULL DEFAULT '',
  medico        TEXT NOT NULL DEFAULT '',
  fecha         DATE NOT NULL,
  hora          TEXT NOT NULL DEFAULT '',
  lugar         TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  estado        TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','realizada','cancelada')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas_medicas (paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas_medicas (fecha, estado);

ALTER TABLE citas_medicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "citas_all" ON citas_medicas FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 19. LISTA DE ESPERA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lista_espera (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  TEXT NOT NULL,
  apellido                TEXT NOT NULL,
  fecha_nacimiento        DATE,
  diagnostico_preliminar  TEXT NOT NULL DEFAULT '',
  contacto_nombre         TEXT NOT NULL DEFAULT '',
  contacto_telefono       TEXT NOT NULL DEFAULT '',
  contacto_relacion       TEXT NOT NULL DEFAULT '',
  prioridad               TEXT NOT NULL DEFAULT 'normal'
                          CHECK (prioridad IN ('urgente','normal')),
  estado                  TEXT NOT NULL DEFAULT 'en_espera'
                          CHECK (estado IN ('en_espera','admitido','descartado')),
  fecha_solicitud         DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones           TEXT NOT NULL DEFAULT '',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_estado ON lista_espera (estado, prioridad);

ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lista_espera_all" ON lista_espera FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 20. ASISTENCIA DEL PERSONAL
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asistencia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  usuario_rol    TEXT NOT NULL,
  fecha          DATE NOT NULL,
  hora_entrada   TEXT,
  hora_salida    TEXT,
  observaciones  TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asistencia_usuario ON asistencia (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia (fecha DESC);

ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asistencia_all" ON asistencia FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 21. TURNOS DE ENFERMERÍA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos_enfermeria (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    TEXT NOT NULL,
  duracion      TEXT NOT NULL CHECK (duracion IN ('8h','12h','24h')),
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  observaciones TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_turnos_usuario ON turnos_enfermeria (usuario_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos_enfermeria (fecha_inicio, fecha_fin);

ALTER TABLE turnos_enfermeria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turnos_all" ON turnos_enfermeria FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 22. HANDOVER (TRASPASO DE TURNO)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handover (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id                TEXT NOT NULL,
  usuario_nombre            TEXT NOT NULL,
  turno                     TEXT NOT NULL CHECK (turno IN ('mañana','tarde','noche')),
  fecha                     DATE NOT NULL,
  novedades                 TEXT NOT NULL DEFAULT '',
  medicamentos_eventos      TEXT NOT NULL DEFAULT '',
  pendientes_proximo_turno  TEXT NOT NULL DEFAULT '',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handover_fecha ON handover (fecha DESC, turno);

ALTER TABLE handover ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handover_all" ON handover FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 23. MENSAJES INTERNOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes_internos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id     TEXT NOT NULL,
  autor_nombre TEXT NOT NULL,
  titulo       TEXT NOT NULL,
  cuerpo       TEXT NOT NULL DEFAULT '',
  para_rol     TEXT NOT NULL DEFAULT 'todos'
               CHECK (para_rol IN ('todos','enfermero','aseo')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_fecha ON mensajes_internos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_rol ON mensajes_internos (para_rol);

ALTER TABLE mensajes_internos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensajes_all" ON mensajes_internos FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 24. NOTIFICACIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id TEXT,
  para_rol        TEXT,
  tipo            TEXT    NOT NULL,
  titulo          TEXT    NOT NULL,
  mensaje         TEXT    NOT NULL DEFAULT '',
  leida           BOOLEAN NOT NULL DEFAULT false,
  datos           JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificaciones (destinatario_id, leida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_rol ON notificaciones (para_rol, leida, created_at DESC);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificaciones_all" ON notificaciones FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 25. INCUMPLIMIENTOS / INFRACCIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incumplimientos (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id                  UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo                         TEXT NOT NULL CHECK (tipo IN ('signos_vitales','medicamento')),
  detalle                      TEXT NOT NULL DEFAULT '',
  hora_fin                     TEXT,
  fecha                        DATE NOT NULL,
  registrado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Requerimiento de justificación
  requerimiento_motivo         TEXT,
  requerimiento_estado         TEXT CHECK (requerimiento_estado IN ('pendiente','resuelto','rechazado')),
  requerimiento_fecha          TIMESTAMPTZ,
  requerimiento_resuelto_en    TIMESTAMPTZ,
  requerimiento_rechazo_motivo TEXT,
  requerimiento_rechazado_en   TIMESTAMPTZ,
  requerimiento_usuario_id     TEXT,
  requerimiento_usuario_nombre TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incumplimientos_paciente ON incumplimientos (paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_incumplimientos_fecha ON incumplimientos (fecha DESC);

ALTER TABLE incumplimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incumplimientos_all" ON incumplimientos FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 26. AUDITORÍA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  accion         TEXT NOT NULL,
  entidad        TEXT NOT NULL,
  entidad_id     TEXT,
  detalle        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria (usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria (entidad, entidad_id);

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auditoria_all" ON auditoria FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 27. ACCESO MULTI-HOGAR (hogar_acceso)
-- ─────────────────────────────────────────────────────────────
-- Tabla para soporte de múltiples hogares por usuario (feature futura)
CREATE TABLE IF NOT EXISTS hogar_acceso (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  hogar_id   TEXT NOT NULL,
  rol        TEXT NOT NULL DEFAULT 'enfermero'
             CHECK (rol IN ('admin','enfermero','aseo')),
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, hogar_id)
);

CREATE INDEX IF NOT EXISTS idx_hogar_acceso_usuario ON hogar_acceso (usuario_id);

ALTER TABLE hogar_acceso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hogar_acceso_all" ON hogar_acceso FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- FIN DEL SCHEMA
-- ─────────────────────────────────────────────────────────────
