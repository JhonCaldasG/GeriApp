-- ============================================================
-- HOGAR GERIÁTRICO — MIGRACIONES ADICIONALES
-- Columnas y ajustes sobre tablas ya existentes.
-- Ejecutar si la BD fue creada antes del schema completo.
-- Todos los comandos son idempotentes (IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- administraciones_medicamento: campos de rechazo
-- ─────────────────────────────────────────────────────────────
ALTER TABLE administraciones_medicamento
  ADD COLUMN IF NOT EXISTS rechazado      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT    NOT NULL DEFAULT '';

-- ─────────────────────────────────────────────────────────────
-- inventario: campos farmacéuticos
-- ─────────────────────────────────────────────────────────────
ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS presentation     TEXT,
  ADD COLUMN IF NOT EXISTS concentration    TEXT,
  ADD COLUMN IF NOT EXISTS size             TEXT,
  ADD COLUMN IF NOT EXISTS package_quantity INTEGER;

-- ─────────────────────────────────────────────────────────────
-- inventario_movimientos: nombre del paciente
-- ─────────────────────────────────────────────────────────────
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- ─────────────────────────────────────────────────────────────
-- notas_evolucion: campos extendidos
-- ─────────────────────────────────────────────────────────────
ALTER TABLE notas_evolucion
  ADD COLUMN IF NOT EXISTS turno                  TEXT CHECK (turno IN ('mañana','tarde','noche')),
  ADD COLUMN IF NOT EXISTS estado_paciente        TEXT CHECK (estado_paciente IN ('estable','regular','delicado','critico')),
  ADD COLUMN IF NOT EXISTS signos_adjuntos        JSONB,
  ADD COLUMN IF NOT EXISTS medicamentos_adjuntos  JSONB;

-- ─────────────────────────────────────────────────────────────
-- ausencias: campos de hora y firma
-- ─────────────────────────────────────────────────────────────
ALTER TABLE ausencias
  ADD COLUMN IF NOT EXISTS hora_salida    TEXT,
  ADD COLUMN IF NOT EXISTS hora_regreso   TEXT,
  ADD COLUMN IF NOT EXISTS firma_familiar TEXT;

-- ─────────────────────────────────────────────────────────────
-- pacientes: campos adicionales
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS dnr                 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallecido           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_fallecimiento DATE,
  ADD COLUMN IF NOT EXISTS fecha_ingreso       DATE;

-- ─────────────────────────────────────────────────────────────
-- signos_vitales: campo editado_por
-- ─────────────────────────────────────────────────────────────
ALTER TABLE signos_vitales
  ADD COLUMN IF NOT EXISTS editado_por TEXT,
  ADD COLUMN IF NOT EXISTS toma_nombre TEXT;
