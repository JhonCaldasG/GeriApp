# SQL — Hogar Geriátrico

Scripts de base de datos para Supabase (PostgreSQL).

## Archivos

| Archivo | Descripción |
|---|---|
| `01_schema_completo.sql` | Crea todas las tablas, índices y políticas RLS desde cero |
| `02_datos_iniciales.sql` | Inserta datos de arranque (usuario admin, horarios de signos) |
| `03_migraciones_adicionales.sql` | Columnas extra para BDs creadas antes del schema completo |
| `inventario_movimientos.sql` | Script original (ya incluido en `01_schema_completo.sql`) |

## Orden de ejecución (BD nueva)

1. `01_schema_completo.sql`
2. `02_datos_iniciales.sql`

## BD existente (actualización)

Ejecutar solo `03_migraciones_adicionales.sql`.

## Tablas

| Tabla | Descripción |
|---|---|
| `hogar_config` | Configuración del establecimiento (fila única) |
| `usuarios` | Personal del hogar (admin, enfermero, aseo) |
| `pacientes` | Residentes del hogar |
| `signos_vitales` | Registros de presión, temperatura, glucosa, etc. |
| `horarios_signos` | Turnos de toma de signos (Mañana/Tarde/Noche) |
| `medicamentos` | Medicamentos asignados a cada paciente |
| `administraciones_medicamento` | Historial de administración de medicamentos |
| `registros_medicos` | Historial clínico (notas, diagnósticos, procedimientos) |
| `notas_evolucion` | Notas de evolución rápida por turno |
| `evaluaciones_clinicas` | Escalas Barthel y Braden |
| `registros_dieta` | Registro de alimentación e hidratación |
| `incidentes` | Caídas, lesiones y otros incidentes |
| `ausencias` | Internaciones y salidas temporales |
| `limpiezas` | Registros de aseo de habitaciones y zonas comunes |
| `actividades` | Actividades recreativas y terapéuticas |
| `inventario` | Stock de insumos (higiene, medicamentos, material médico) |
| `inventario_movimientos` | Historial de entradas y salidas de stock |
| `citas_medicas` | Citas y turnos médicos de los pacientes |
| `lista_espera` | Solicitudes de ingreso pendientes |
| `asistencia` | Control de asistencia del personal |
| `turnos_enfermeria` | Planificación de turnos de enfermería |
| `handover` | Traspaso de turno entre enfermeros |
| `mensajes_internos` | Comunicados internos entre el personal |
| `notificaciones` | Notificaciones push y en-app |
| `incumplimientos` | Infracciones de protocolos (signos/medicamentos) |
| `auditoria` | Log de acciones del sistema |
| `hogar_acceso` | Acceso multi-hogar por usuario (feature futura) |
