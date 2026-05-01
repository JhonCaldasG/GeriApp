-- ============================================================
-- HOGAR GERIÁTRICO — DATOS INICIALES
-- Ejecutar después de 01_schema_completo.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Configuración del hogar (fila única)
-- ─────────────────────────────────────────────────────────────
INSERT INTO hogar_config (id, nombre, direccion, telefono, telefono_emergencia, email, ciudad, provincia)
VALUES (1, 'Hogar Geriátrico', '', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Usuarios por defecto
-- ─────────────────────────────────────────────────────────────
INSERT INTO usuarios (nombre, apellido, usuario, password, rol, activo)
VALUES
  ('Administrador', 'General',   'admin',     'admin123', 'admin',     true),
  ('Enfermero',     'Principal', 'enfermero', '1234',     'enfermero', true)
ON CONFLICT (usuario) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Horarios de toma de signos vitales por defecto
-- ─────────────────────────────────────────────────────────────
INSERT INTO horarios_signos (nombre, hora_inicio, hora_fin)
SELECT 'Mañana', '07:00', '09:00'
WHERE NOT EXISTS (SELECT 1 FROM horarios_signos WHERE nombre = 'Mañana');

INSERT INTO horarios_signos (nombre, hora_inicio, hora_fin)
SELECT 'Tarde', '13:00', '15:00'
WHERE NOT EXISTS (SELECT 1 FROM horarios_signos WHERE nombre = 'Tarde');

INSERT INTO horarios_signos (nombre, hora_inicio, hora_fin)
SELECT 'Noche', '20:00', '22:00'
WHERE NOT EXISTS (SELECT 1 FROM horarios_signos WHERE nombre = 'Noche');
