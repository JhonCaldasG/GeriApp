-- ============================================================
-- MIGRACIÓN: infraestructura para delete_hogar
-- Requiere que hogar_config.id sea UUID (schema multi-tenant)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Tabla hogar_history
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hogar_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hogar_id   UUID        NOT NULL,
  nombre     TEXT        NOT NULL,
  slug       TEXT        NOT NULL DEFAULT '',
  estado     TEXT        NOT NULL DEFAULT '',
  fecha_baja TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hogar_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hogar_history_all" ON hogar_history FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. Agregar hogar_id a tablas operativas que no lo tienen
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pacientes         ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE inventario        ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE limpiezas         ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE horarios_signos   ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE lista_espera      ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE asistencia        ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE turnos_enfermeria ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE handover          ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE mensajes_internos ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE notificaciones    ADD COLUMN IF NOT EXISTS hogar_id UUID;
ALTER TABLE auditoria         ADD COLUMN IF NOT EXISTS hogar_id UUID;

-- ─────────────────────────────────────────────────────────────
-- 3. Función delete_hogar
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_hogar(p_hogar_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre TEXT;
  v_slug   TEXT;
  v_estado TEXT;
BEGIN
  SELECT nombre,
         COALESCE(slug, ''),
         COALESCE(estado, '')
    INTO v_nombre, v_slug, v_estado
    FROM hogar_config
   WHERE id = p_hogar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hogar % no encontrado', p_hogar_id;
  END IF;

  INSERT INTO hogar_history (hogar_id, nombre, slug, estado)
  VALUES (p_hogar_id, v_nombre, v_slug, v_estado);

  -- Tabla con ON DELETE SET NULL — borrar explícitamente antes que pacientes
  DELETE FROM limpiezas           WHERE hogar_id = p_hogar_id;

  -- Pacientes: cascadea signos_vitales, medicamentos, administraciones_medicamento,
  -- registros_medicos, notas_evolucion, evaluaciones_clinicas, registros_dieta,
  -- incidentes, ausencias, actividades, citas_medicas, incumplimientos
  DELETE FROM pacientes           WHERE hogar_id = p_hogar_id;

  -- Inventario: cascadea inventario_movimientos
  DELETE FROM inventario          WHERE hogar_id = p_hogar_id;

  -- Tablas sin FK hacia pacientes
  DELETE FROM horarios_signos     WHERE hogar_id = p_hogar_id;
  DELETE FROM lista_espera        WHERE hogar_id = p_hogar_id;
  DELETE FROM asistencia          WHERE hogar_id = p_hogar_id;
  DELETE FROM turnos_enfermeria   WHERE hogar_id = p_hogar_id;
  DELETE FROM handover            WHERE hogar_id = p_hogar_id;
  DELETE FROM mensajes_internos   WHERE hogar_id = p_hogar_id;
  DELETE FROM notificaciones      WHERE hogar_id = p_hogar_id;
  DELETE FROM auditoria           WHERE hogar_id = p_hogar_id;

  -- Usuarios: cascadea hogar_acceso
  DELETE FROM usuarios            WHERE hogar_id = p_hogar_id;

  -- Hogar: al final
  DELETE FROM hogar_config        WHERE id = p_hogar_id;
END;
$$;
