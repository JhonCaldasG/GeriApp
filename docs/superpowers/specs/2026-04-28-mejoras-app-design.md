# Mejoras App Hogar Geriátrico — Design Spec

**Fecha:** 2026-04-28  
**Scope:** Módulos B (Comunicación), C (UX), D (Operativo), E (Reportes), F (Seguridad)  
**Excluido:** Portal familiar, módulos clínicos (Capa A)  
**Estrategia:** Implementación en 3 capas por orden de impacto  
**Backup:** Copiar `hogar-geriatrico/` como `hogar-geriatrico-backup/` antes de iniciar

---

## Capa 1 — UX y Seguridad (C + F)

*Cambios transversales. Se implementan primero porque afectan pantallas existentes en toda la app.*

### Dashboard rediseñado

**Archivo:** `src/screens/DashboardScreen.tsx`

- Banner de cumpleaños: si algún paciente cumple años hoy, mostrar card con fondo naranja al tope del dashboard.
- Banner de críticos: si hay signos vitales en estado `alert`, mostrar card rojo con nombres de pacientes afectados.
- Estadísticas: mantener las 4 cards actuales (pacientes, medicamentos pendientes, signos registrados hoy, críticos) con colores diferenciados por estado.
- Acciones rápidas por rol: fila de botones bajo las estadísticas.
  - Enfermero/aseo: Registrar Signos, Administrar Medicamento, Nota de Turno.
  - Admin: los anteriores + Ver Infracciones, Estadísticas.
- Botón EMERGENCIA: botón rojo full-width al fondo del dashboard. Al tocarlo navega a `EmergenciaScreen`.

### EmergenciaScreen (nueva)

**Archivo:** `src/screens/EmergenciaScreen.tsx`

Pantalla de acceso rápido a protocolos de emergencia. Sin autenticación adicional (accesible desde el dashboard). Tres protocolos con checklist expandible:

- **Caída de paciente:** verificar consciencia, inmovilizar, avisar médico, registrar incidente.
- **Paro cardiorrespiratorio:** llamar emergencias (marcación directa al número guardado en config), iniciar RCP, usar DEA.
- **Incendio/evacuación:** activar alarma, evacuar pacientes por orden de habitación, punto de encuentro.

Cada protocolo muestra el teléfono de emergencia configurado en `ConfiguracionHogarScreen`. Se agrega un campo nuevo `telefonoEmergencia` (ej. 911, SAME) separado del teléfono del hogar.

### Campo DNR en pacientes

**Archivos:** `src/types/index.ts`, `src/screens/pacientes/AgregarPacienteScreen.tsx`, `src/storage/index.ts`, Supabase tabla `pacientes`

- Agregar campo `dnr: boolean` al tipo `Paciente` (default `false`).
- Toggle en AgregarPacienteScreen bajo "Datos médicos".
- Badge rojo `DNR` en `PacienteCard` (visible en todas las listas).
- Badge rojo `DNR` en el header de `PerfilPacienteScreen`.
- Columna `dnr` en tabla Supabase `pacientes`.

### Banner de alergias en pantallas clave

**Archivos:** `src/screens/signosVitales/RegistrarSignosScreen.tsx`, `src/screens/medicamentos/ListaMedicamentosScreen.tsx`

Si el paciente tiene `alergias` con contenido, mostrar un banner amarillo/naranja al tope de estas pantallas con el texto de las alergias. No modal, no interacción — solo visible.

### Modo oscuro

**Archivos:** `src/context/ThemeContext.tsx`, `src/screens/configuracion/ConfiguracionHogarScreen.tsx`

- Agregar `isDarkMode: boolean` y `toggleDarkMode()` al ThemeContext.
- Persistir en AsyncStorage bajo clave `theme_dark_mode`.
- Definir paleta dark en `src/theme/index.ts` (fondos oscuros, textos claros, mismos colores de acento).
- Toggle en ConfiguracionHogarScreen (visible para todos los roles).

### Autenticación biométrica

**Archivos:** `src/screens/auth/LoginScreen.tsx`, `src/context/AuthContext.tsx`, `src/screens/configuracion/ConfiguracionHogarScreen.tsx`

- Nueva dependencia: `expo-local-authentication`.
- Toggle en ConfiguracionHogarScreen: "Usar huella/Face ID". Persiste en AsyncStorage bajo clave `biometric_enabled`.
- En LoginScreen: si biometric_enabled y el dispositivo lo soporta, mostrar botón "Entrar con biometría". Al autenticar con éxito, loguea al último usuario guardado en sesión.
- Fallback: siempre disponible el login con usuario/contraseña.

### Recordatorios de cumpleaños

**Archivos:** `src/screens/DashboardScreen.tsx`, `src/utils/notificacionesPush.ts`

- Al cargar el dashboard, calcular si algún paciente activo cumple años hoy (comparar día y mes de `fechaNacimiento`).
- Si hay coincidencia: mostrar banner en dashboard (implementado arriba) y crear notificación local.
- No requiere backend adicional — cálculo local sobre lista de pacientes ya cargada.

---

## Capa 2 — Operativo y Comunicación (D + B)

*Módulos nuevos. Se agregan sobre la base visual de la Capa 1.*

### Inventario de Insumos

**Archivos nuevos:** `src/screens/inventario/InventarioScreen.tsx`, `src/screens/inventario/AgregarInsumoScreen.tsx`, `src/storage/inventario.ts`  
**Supabase:** tabla `inventario`

Tipo `Insumo`:
```typescript
{
  id: string
  nombre: string
  categoria: 'higiene' | 'medicamentos' | 'material_medico' | 'limpieza' | 'alimentos'
  stockActual: number
  stockMinimo: number
  unidad: string  // "unidades", "cajas", "litros", etc.
  observaciones?: string
  createdAt: string
  updatedAt: string
}
```

- **InventarioScreen:** lista de insumos con filtro por categoría. Cards con color según estado: rojo (stock ≤ mínimo), amarillo (stock ≤ mínimo × 1.5), verde (ok). Resumen en header: N en stock bajo, N total.
- **AgregarInsumoScreen:** formulario CRUD (crear/editar/eliminar). Solo admin puede eliminar.
- **Ajuste de stock:** desde la card, botones `+` / `−` que abren un pequeño modal con campo de cantidad y motivo (ej. "Compra", "Uso", "Vencimiento"). No incrementa de a 1 — siempre pide cantidad explícita.
- **Notificación:** cuando un insumo llega al stock mínimo, crear notificación al admin.
- **Acceso:** todos los roles pueden ver y ajustar stock. Solo admin puede crear/eliminar insumos.
- **Navegación:** nuevo item en el drawer y en `MasScreen`.

### Agenda de Citas Médicas

**Archivos nuevos:** `src/screens/citas/CitasMedicasScreen.tsx`, `src/screens/citas/AgregarCitaScreen.tsx`, `src/storage/citas.ts`  
**Supabase:** tabla `citas_medicas`

Tipo `CitaMedica`:
```typescript
{
  id: string
  pacienteId: string
  especialidad: string
  medico: string
  fecha: string        // ISO date
  hora: string         // "HH:MM"
  lugar: string
  observaciones?: string
  estado: 'pendiente' | 'realizada' | 'cancelada'
  createdAt: string
}
```

- **CitasMedicasScreen:** lista de citas ordenadas por fecha. Tabs: Próximas / Historial. Filtro por paciente. Card muestra: fecha/hora, especialidad, médico, lugar, estado.
- **AgregarCitaScreen:** formulario con selector de paciente, especialidad, médico, DateTimePicker, lugar, observaciones.
- **Recordatorio:** al cargar la app, si hay citas en las próximas 24hs crear notificación.
- **Acceso:** enfermero puede crear/ver. Admin puede además eliminar.
- **Navegación:** accesible desde `PerfilPacienteScreen` (botón "Citas") y desde `MasScreen`.

### Lista de Espera

**Archivos nuevos:** `src/screens/listaEspera/ListaEsperaScreen.tsx`, `src/storage/listaEspera.ts`  
**Supabase:** tabla `lista_espera`

Tipo `SolicitanteIngreso`:
```typescript
{
  id: string
  nombre: string
  apellido: string
  fechaNacimiento?: string
  diagnosticoPreliminar?: string
  contactoNombre: string
  contactoTelefono: string
  contactoRelacion: string
  prioridad: 'urgente' | 'normal'
  estado: 'en_espera' | 'admitido' | 'descartado'
  fechaSolicitud: string
  observaciones?: string
  createdAt: string
}
```

- **ListaEsperaScreen:** lista con filtro por estado. Badge de prioridad urgente en rojo. Al admitir → navega a AgregarPacienteScreen con datos pre-cargados.
- **Acceso:** solo admin.
- **Navegación:** drawer y MasScreen (admin only).

### Control de Asistencia del Personal

**Archivos nuevos:** `src/screens/asistencia/AsistenciaScreen.tsx`, `src/storage/asistencia.ts`  
**Supabase:** tabla `asistencia`

Tipo `RegistroAsistencia`:
```typescript
{
  id: string
  usuarioId: string
  fecha: string       // ISO date
  horaEntrada?: string
  horaSalida?: string
  observaciones?: string
  createdAt: string
}
```

- **AsistenciaScreen:** vista del día actual con todos los usuarios activos. Card por usuario: nombre, rol, estado (presente/ausente), hora de entrada/salida. Botones para registrar entrada y salida manualmente.
- **Historial:** tab con registros pasados filtrable por empleado y rango de fechas.
- **Exportación:** botón para generar PDF mensual de asistencia por empleado.
- **Acceso:** solo admin.
- **Navegación:** drawer (admin only).

### Nota de Entrega de Turno (Handover)

**Archivos nuevos:** `src/screens/turnos/HandoverScreen.tsx`, `src/storage/handover.ts`  
**Supabase:** tabla `handover`

Tipo `NotaHandover`:
```typescript
{
  id: string
  usuarioId: string
  usuarioNombre: string
  turno: 'mañana' | 'tarde' | 'noche'
  fecha: string
  novedades: string        // texto libre
  medicamentosPendientes: string
  pendientesProximoTurno: string
  createdAt: string
}
```

- **HandoverScreen:** al abrir muestra la última nota del turno anterior (solo lectura). Botón "Crear nota de mi turno" abre formulario con 3 campos de texto libre: Novedades, Medicamentos/eventos a destacar, Pendientes para el siguiente turno.
- Una sola nota por usuario por turno por día — si ya existe, permite editarla.
- **Acceso desde:** acciones rápidas del dashboard (botón "Nota de Turno") y desde `TurnosEnfermeriaScreen`.
- **Notificación:** al crear handover, notificar al turno siguiente.

### Mensajes Internos (Tablón)

**Archivos nuevos:** `src/screens/mensajes/MensajesScreen.tsx`, `src/storage/mensajes.ts`  
**Supabase:** tabla `mensajes`

Tipo `Mensaje`:
```typescript
{
  id: string
  autorId: string
  autorNombre: string
  titulo: string
  cuerpo: string
  paraRol: 'todos' | 'enfermero' | 'aseo'
  createdAt: string
}
```

- **MensajesScreen:** lista de mensajes ordenados por fecha. Badge de no leídos en la tab "Más". Los mensajes leídos se marcan en AsyncStorage local (no requiere columna de lectura en BD).
- **Publicar:** solo admin puede publicar. Selector de destinatario (todos / enfermero / aseo).
- **Navegación:** item en `MasScreen` con badge de no leídos.

---

## Capa 3 — Reportes y Exportación (E)

*Depende de que los datos de las capas anteriores estén maduros.*

### Dependencia nueva

Agregar `xlsx` (SheetJS) al proyecto:
```bash
npm install xlsx
```
No tiene dependencias nativas, funciona en React Native sin eject.

### Reporte Mensual por Paciente

**Archivos nuevos:** `src/screens/reportes/ReportesMensualesScreen.tsx`, `src/utils/generarReporteMensual.ts`

- **ReportesMensualesScreen:** selector de paciente + selector de mes/año. Genera resumen:
  - Signos vitales: registrados vs esperados (N días × N tomas), promedio de cada signo, días con anomalías.
  - Medicamentos: dosis administradas vs esperadas (%), rechazos.
  - Incidentes del mes: tipo y fecha.
  - Notas de evolución: cantidad y última.
  - Peso: primero vs último del mes, delta.
- Botones: **Exportar PDF** (usa expo-print, extiende `generarHistoriaClinica.ts`) y **Exportar Excel** (SheetJS, una hoja por sección).
- **Acceso:** admin y enfermero.

### Estadísticas del Hogar

**Archivo nuevo:** `src/screens/reportes/EstadisticasScreen.tsx`

- Métricas globales del mes seleccionado: adherencia a medicamentos (%), signos registrados en horario (%), total incidentes, pacientes activos.
- Filtro: este mes / mes pasado / últimos 3 meses.
- Botón "Exportar PDF" genera reporte del hogar en PDF.
- **Acceso:** solo admin.
- **Navegación:** drawer (admin only) y MasScreen.

### Reporte de Cumplimiento Normativo

**Archivo:** Extiende `EstadisticasScreen.tsx` con sección adicional o pantalla separada `CumplimientoScreen.tsx`

- Datos: infracciones totales del período, tasa de cierre (%), personal con más incumplimientos (top 3), pacientes con más alertas de signos (top 3).
- Solo exportación PDF — no se visualiza en pantalla compleja.
- **Acceso:** solo admin.

### Exportación Excel desde módulos existentes

Agregar botón "Exportar Excel" en:
- `HistorialSignosScreen.tsx` — signos del paciente en rango de fechas.
- `HistorialAdministracionesScreen.tsx` — administraciones del medicamento.
- `InfraccionesScreen.tsx` — listado de infracciones del período.
- `AsistenciaScreen.tsx` — asistencia mensual (nuevo, Capa 2).

Cada exportación usa SheetJS para generar `.xlsx` y `expo-sharing` para compartir.

---

## Navegación — cambios globales

| Pantalla nueva | Dónde aparece | Roles |
|---|---|---|
| EmergenciaScreen | Dashboard (botón rojo) | todos |
| InventarioScreen | Drawer + MasScreen | todos |
| CitasMedicasScreen | PerfilPaciente + MasScreen | todos |
| ListaEsperaScreen | Drawer + MasScreen | admin |
| AsistenciaScreen | Drawer | admin |
| HandoverScreen | Dashboard (acción rápida) + Turnos | todos |
| MensajesScreen | MasScreen (con badge) | todos |
| ReportesMensualesScreen | Drawer + MasScreen | admin + enfermero |
| EstadisticasScreen | Drawer + MasScreen | admin |

---

## Supabase — tablas nuevas

| Tabla | Capa |
|---|---|
| `inventario` | 2 |
| `citas_medicas` | 2 |
| `lista_espera` | 2 |
| `asistencia` | 2 |
| `handover` | 2 |
| `mensajes` | 2 |

Tabla `pacientes` — columna nueva: `dnr boolean default false`.

---

## Dependencias nuevas

| Paquete | Uso | Capa |
|---|---|---|
| `expo-local-authentication` | Biometría | 1 |
| `xlsx` | Exportación Excel | 3 |

---

## Backup

Antes de iniciar cualquier implementación, copiar `Proyectos/Apps/hogar-geriatrico/` completo como `Proyectos/Apps/hogar-geriatrico-backup/` para permitir rollback total.
