-- ============================================================
-- MIGRACIONES REQUERIDAS PARA LAS NUEVAS FEATURES
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Notas de evolución rápida
CREATE TABLE IF NOT EXISTS notas_evolucion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  usuario_id  TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notas_evolucion_paciente ON notas_evolucion(paciente_id);
ALTER TABLE notas_evolucion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_notas" ON notas_evolucion FOR ALL USING (true) WITH CHECK (true);

-- 2. Log de auditoría
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
CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_auditoria" ON auditoria FOR ALL USING (true) WITH CHECK (true);

-- 3. Evaluaciones clínicas (Barthel / Braden)
CREATE TABLE IF NOT EXISTS evaluaciones_clinicas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('barthel','braden')),
  puntuacion   INTEGER NOT NULL,
  items        JSONB NOT NULL DEFAULT '{}',
  observaciones TEXT NOT NULL DEFAULT '',
  evaluado_por TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_paciente ON evaluaciones_clinicas(paciente_id, tipo);
ALTER TABLE evaluaciones_clinicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_evaluaciones" ON evaluaciones_clinicas FOR ALL USING (true) WITH CHECK (true);

-- 4. Registros de dieta / nutrición
CREATE TABLE IF NOT EXISTS registros_dieta (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id          UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo                 TEXT NOT NULL CHECK (tipo IN ('desayuno','almuerzo','merienda','cena','extra')),
  descripcion          TEXT NOT NULL DEFAULT '',
  porcentaje_consumido INTEGER NOT NULL DEFAULT 100,
  apetito              TEXT NOT NULL DEFAULT 'bueno' CHECK (apetito IN ('bueno','regular','malo')),
  liquidos_ml          INTEGER,
  observaciones        TEXT NOT NULL DEFAULT '',
  registrado_por       TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dieta_paciente ON registros_dieta(paciente_id);
ALTER TABLE registros_dieta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_dieta" ON registros_dieta FOR ALL USING (true) WITH CHECK (true);

-- 5. Incidentes y caídas
CREATE TABLE IF NOT EXISTS incidentes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL DEFAULT 'otro',
  descripcion      TEXT NOT NULL,
  lugar            TEXT NOT NULL DEFAULT '',
  consecuencias    TEXT NOT NULL DEFAULT '',
  testigos         TEXT NOT NULL DEFAULT '',
  acciones_tomadas TEXT NOT NULL DEFAULT '',
  registrado_por   TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidentes_paciente ON incidentes(paciente_id);
ALTER TABLE incidentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_incidentes" ON incidentes FOR ALL USING (true) WITH CHECK (true);

-- 6. Ausencias / internaciones temporales
CREATE TABLE IF NOT EXISTS ausencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL DEFAULT 'internacion',
  motivo      TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE,
  destino      TEXT NOT NULL DEFAULT '',
  responsable  TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ausencias_paciente ON ausencias(paciente_id);
ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ausencias" ON ausencias FOR ALL USING (true) WITH CHECK (true);

-- 7. Agregar campos rechazado/motivo a administraciones
ALTER TABLE administraciones_medicamento
  ADD COLUMN IF NOT EXISTS rechazado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT NOT NULL DEFAULT '';
