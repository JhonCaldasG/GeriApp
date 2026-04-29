# Capa 3 — Reportes y Exportación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar ReportesMensualesScreen, EstadisticasScreen, botones de exportación Excel en pantallas existentes y reporte de cumplimiento normativo.

**Architecture:** Capa puramente aditiva. Una utilidad central `src/utils/exportarExcel.ts` (SheetJS) sirve a todos los módulos. Los reportes leen datos de Supabase directamente con consultas por rango de fechas. No modifica lógica existente.

**Tech Stack:** React Native + Expo, TypeScript, SheetJS (`xlsx`), expo-sharing, expo-file-system.

**Pre-requisito:** Capa 2 implementada y compilando sin errores.

---

## Task 1: Instalar SheetJS (xlsx)

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Instalar**

```bash
cd "D:/Claude_DBA/Proyectos/Apps/hogar-geriatrico"
npm install xlsx
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add xlsx (SheetJS) for Excel export"
```

---

## Task 2: Crear utilidad exportarExcel.ts

**Files:**
- Create: `src/utils/exportarExcel.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
// src/utils/exportarExcel.ts
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ExcelHoja {
  nombre: string;
  datos: Record<string, any>[];
}

export async function exportarExcel(nombre: string, hojas: ExcelHoja[]): Promise<void> {
  const wb = XLSX.utils.book_new();

  hojas.forEach(hoja => {
    const ws = XLSX.utils.json_to_sheet(hoja.datos);
    XLSX.utils.book_append_sheet(wb, ws, hoja.nombre.slice(0, 31)); // Excel: max 31 chars en nombre de hoja
  });

  const bytes = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = FileSystem.documentDirectory + nombre + '.xlsx';

  await FileSystem.writeAsStringAsync(uri, bytes, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const puedeCompartir = await Sharing.isAvailableAsync();
  if (!puedeCompartir) throw new Error('Compartir no disponible en este dispositivo');

  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Exportar ${nombre}`,
    UTI: 'com.microsoft.excel.xlsx',
  });
}
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportarExcel.ts
git commit -m "feat: add exportarExcel utility"
```

---

## Task 3: Agregar botón Export Excel a HistorialSignosScreen

**Files:**
- Modify: `src/screens/signosVitales/HistorialSignosScreen.tsx`

- [ ] **Step 1: Agregar import y botón de exportación**

Agregar al inicio del archivo:
```typescript
import { exportarExcel } from '../../utils/exportarExcel';
import { Alert } from 'react-native'; // si no está ya importado
```

Agregar función de exportación dentro del componente (después de los estados existentes):
```typescript
async function handleExportarExcel() {
  if (signosVitalesFiltrados.length === 0) {
    Alert.alert('Sin datos', 'No hay registros para exportar con el filtro actual.');
    return;
  }
  try {
    await exportarExcel(`signos_${pacienteNombre.replace(/\s/g, '_')}`, [{
      nombre: 'Signos Vitales',
      datos: signosVitalesFiltrados.map(s => ({
        Fecha: s.createdAt.slice(0, 10),
        Hora: s.createdAt.slice(11, 16),
        Toma: s.tomaNombre ?? '',
        'P/A Sistólica': s.presionSistolica,
        'P/A Diastólica': s.presionDiastolica,
        'Frec. Cardíaca': s.frecuenciaCardiaca,
        Temperatura: s.temperatura,
        'SpO2 (%)': s.saturacionOxigeno,
        'Glucosa': s.glucosa,
        'Peso (kg)': s.peso,
        'Registrado por': s.registradoPor,
        Observaciones: s.observaciones,
      })),
    }]);
  } catch (e: any) {
    Alert.alert('Error', e?.message ?? 'No se pudo exportar.');
  }
}
```

Localizar el header o área de acciones de la pantalla y agregar el botón de exportación:
```tsx
<TouchableOpacity
  style={styles.exportBtn}
  onPress={handleExportarExcel}
  activeOpacity={0.75}
>
  <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.secondary} />
  <Text style={styles.exportBtnTexto}>Exportar Excel</Text>
</TouchableOpacity>
```

Agregar estilos:
```typescript
exportBtn: {
  flexDirection: 'row', alignItems: 'center', gap: 6,
  backgroundColor: '#E8F5E9', borderRadius: 10,
  paddingHorizontal: 12, paddingVertical: 8,
  borderWidth: 1, borderColor: COLORS.secondary,
},
exportBtnTexto: {
  fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.secondary,
},
```

> **Nota:** `signosVitalesFiltrados` es el nombre de la variable que contiene los signos con los filtros aplicados. Leer el archivo para confirmar el nombre exacto antes de editar.

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/signosVitales/HistorialSignosScreen.tsx
git commit -m "feat: add Excel export to HistorialSignosScreen"
```

---

## Task 4: Agregar Export Excel a HistorialAdministracionesScreen e InfraccionesScreen

**Files:**
- Modify: `src/screens/medicamentos/HistorialAdministracionesScreen.tsx`
- Modify: `src/screens/infracciones/InfraccionesScreen.tsx`

- [ ] **Step 1: HistorialAdministracionesScreen — agregar import y función**

Agregar import:
```typescript
import { exportarExcel } from '../../utils/exportarExcel';
```

Agregar función:
```typescript
async function handleExportarExcel() {
  if (administracionesFiltradas.length === 0) {
    Alert.alert('Sin datos', 'No hay registros para exportar.');
    return;
  }
  try {
    await exportarExcel(`administraciones_${pacienteNombre.replace(/\s/g, '_')}`, [{
      nombre: 'Administraciones',
      datos: administracionesFiltradas.map(a => ({
        Fecha: a.createdAt.slice(0, 10),
        Hora: a.createdAt.slice(11, 16),
        Medicamento: a.medicamentoNombre,
        Dosis: a.dosis,
        'Firmado por': a.firmante,
        Rechazado: a.rechazado ? 'Sí' : 'No',
        'Motivo rechazo': a.motivoRechazo ?? '',
        Notas: a.notas,
      })),
    }]);
  } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo exportar.'); }
}
```

Agregar botón idéntico al de Task 3.

> **Nota:** Leer `HistorialAdministracionesScreen.tsx` para confirmar el nombre de la variable filtrada.

- [ ] **Step 2: InfraccionesScreen — agregar export**

Agregar import:
```typescript
import { exportarExcel } from '../../utils/exportarExcel';
```

Agregar función:
```typescript
async function handleExportarExcel() {
  try {
    const todos = await obtenerIncumplimientos(90);
    if (todos.length === 0) { Alert.alert('Sin datos', 'No hay infracciones.'); return; }
    await exportarExcel('infracciones', [{
      nombre: 'Infracciones',
      datos: todos.map(i => ({
        Fecha: i.fecha,
        Paciente: i.pacienteId,
        Tipo: i.tipo === 'signos_vitales' ? 'Signos Vitales' : 'Medicamento',
        Detalle: i.detalle,
        Estado: i.requerimientoEstado ?? 'pendiente',
        'Fecha resolución': i.requerimientoResueltoEn?.slice(0, 10) ?? '',
      })),
    }]);
  } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo exportar.'); }
}
```

Agregar botón en el header de InfraccionesScreen.

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/medicamentos/HistorialAdministracionesScreen.tsx src/screens/infracciones/InfraccionesScreen.tsx
git commit -m "feat: add Excel export to administraciones and infracciones"
```

---

## Task 5: Crear ReportesMensualesScreen

**Files:**
- Create: `src/screens/reportes/ReportesMensualesScreen.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
// src/screens/reportes/ReportesMensualesScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { Paciente } from '../../types';
import { supabase } from '../../lib/supabase';
import { exportarExcel } from '../../utils/exportarExcel';

interface ResumenMensual {
  signosRegistrados: number;
  signosEsperados: number;
  adherenciaMeds: number;
  totalDosis: number;
  dosisEsperadas: number;
  incidentes: number;
  notasEvolucion: number;
  pesoInicio: string;
  pesoFin: string;
}

export default function ReportesMensualesScreen() {
  const insets = useSafeAreaInsets();
  const { pacientes } = useApp();
  const { colors } = useAppTheme();
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [mesOffset, setMesOffset] = useState(0); // 0 = mes actual, -1 = mes pasado, etc.
  const [resumen, setResumen] = useState<ResumenMensual | null>(null);
  const [cargando, setCargando] = useState(false);

  const ahora = new Date();
  const fechaMes = new Date(ahora.getFullYear(), ahora.getMonth() + mesOffset, 1);
  const mesLabel = fechaMes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const desde = fechaMes.toISOString().slice(0, 7) + '-01';
  const hasta = new Date(fechaMes.getFullYear(), fechaMes.getMonth() + 1, 0).toISOString().slice(0, 10);

  const pacientesActivos = pacientes.filter(p => !p.fallecido);

  async function cargarResumen(paciente: Paciente) {
    setPacienteSeleccionado(paciente);
    setCargando(true);
    setResumen(null);
    try {
      const [signosRes, medsRes, adminRes, incidentesRes, notasRes] = await Promise.all([
        supabase.from('signos_vitales').select('id, peso, created_at').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('medicamentos').select('id').eq('paciente_id', paciente.id).eq('activo', true),
        supabase.from('administraciones').select('id, created_at').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('incidentes').select('id').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('notas_evolucion').select('id').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
      ]);

      const diasMes = new Date(fechaMes.getFullYear(), fechaMes.getMonth() + 1, 0).getDate();
      const tomasPorDia = 3; // estimado conservador
      const signosEsperados = diasMes * tomasPorDia;
      const dosisEsperadas = diasMes * (medsRes.data?.length ?? 0);
      const dosisRealizadas = adminRes.data?.length ?? 0;
      const adherencia = dosisEsperadas > 0 ? Math.round((dosisRealizadas / dosisEsperadas) * 100) : 100;

      const signos = signosRes.data ?? [];
      const pesosOrdenados = signos
        .filter(s => s.peso)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setResumen({
        signosRegistrados: signos.length,
        signosEsperados,
        adherenciaMeds: adherencia,
        totalDosis: dosisRealizadas,
        dosisEsperadas,
        incidentes: incidentesRes.data?.length ?? 0,
        notasEvolucion: notasRes.data?.length ?? 0,
        pesoInicio: pesosOrdenados[0]?.peso ?? '—',
        pesoFin: pesosOrdenados[pesosOrdenados.length - 1]?.peso ?? '—',
      });
    } catch { Alert.alert('Error', 'No se pudieron cargar los datos.'); }
    setCargando(false);
  }

  async function handleExportarExcel() {
    if (!resumen || !pacienteSeleccionado) return;
    try {
      await exportarExcel(`reporte_${pacienteSeleccionado.apellido}_${mesLabel.replace(/\s/g, '_')}`, [{
        nombre: 'Resumen',
        datos: [{
          Paciente: `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`,
          Mes: mesLabel,
          'Signos registrados': resumen.signosRegistrados,
          'Signos esperados': resumen.signosEsperados,
          'Cumplimiento signos (%)': resumen.signosEsperados > 0 ? Math.round((resumen.signosRegistrados / resumen.signosEsperados) * 100) : 100,
          'Dosis administradas': resumen.totalDosis,
          'Dosis esperadas': resumen.dosisEsperadas,
          'Adherencia meds (%)': resumen.adherenciaMeds,
          Incidentes: resumen.incidentes,
          'Notas de evolución': resumen.notasEvolucion,
          'Peso inicio': resumen.pesoInicio,
          'Peso fin': resumen.pesoFin,
        }],
      }]);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo exportar.'); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>

      {/* Selector de mes */}
      <View style={[styles.mesSelector, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => { setMesOffset(m => m - 1); setResumen(null); }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.mesLabel}>{mesLabel}</Text>
        <TouchableOpacity onPress={() => { if (mesOffset < 0) { setMesOffset(m => m + 1); setResumen(null); } }} style={{ opacity: mesOffset < 0 ? 1 : 0.3 }}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Lista de pacientes */}
      <Text style={styles.seccion}>Seleccioná un paciente</Text>
      {pacientesActivos.map(p => (
        <TouchableOpacity
          key={p.id}
          style={[styles.pacienteItem, { backgroundColor: colors.surface }, pacienteSeleccionado?.id === p.id && styles.pacienteItemActivo]}
          onPress={() => cargarResumen(p)}
          activeOpacity={0.75}
        >
          <Text style={[styles.pacienteNombre, { color: pacienteSeleccionado?.id === p.id ? COLORS.primary : colors.textPrimary }]}>
            {p.apellido}, {p.nombre}
          </Text>
          <Text style={styles.pacienteHab}>Hab. {p.habitacion}</Text>
        </TouchableOpacity>
      ))}

      {/* Resumen */}
      {cargando && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}

      {resumen && pacienteSeleccionado && (
        <View style={[styles.resumenCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.resumenTitulo}>{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido} — {mesLabel}</Text>

          <View style={styles.metricasGrid}>
            <View style={styles.metrica}>
              <Text style={[styles.metricaValor, { color: COLORS.secondary }]}>{resumen.signosRegistrados}</Text>
              <Text style={styles.metricaLabel}>Signos registrados</Text>
            </View>
            <View style={styles.metrica}>
              <Text style={[styles.metricaValor, { color: resumen.adherenciaMeds >= 80 ? COLORS.secondary : COLORS.danger }]}>{resumen.adherenciaMeds}%</Text>
              <Text style={styles.metricaLabel}>Adherencia meds</Text>
            </View>
            <View style={styles.metrica}>
              <Text style={[styles.metricaValor, { color: resumen.incidentes > 0 ? COLORS.warning : COLORS.secondary }]}>{resumen.incidentes}</Text>
              <Text style={styles.metricaLabel}>Incidentes</Text>
            </View>
            <View style={styles.metrica}>
              <Text style={[styles.metricaValor, { color: COLORS.primary }]}>{resumen.notasEvolucion}</Text>
              <Text style={styles.metricaLabel}>Notas evolución</Text>
            </View>
          </View>

          {resumen.pesoInicio !== '—' && (
            <View style={styles.pesoRow}>
              <Text style={styles.pesoLabel}>Peso: </Text>
              <Text style={styles.pesoValor}>{resumen.pesoInicio} kg → {resumen.pesoFin} kg</Text>
            </View>
          )}

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportarExcel}>
            <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.secondary} />
            <Text style={styles.exportBtnTexto}>Exportar Excel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  mesSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 14, marginBottom: 16 },
  mesLabel: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, textTransform: 'capitalize' },
  seccion: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  pacienteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 6, elevation: 1 },
  pacienteItemActivo: { borderWidth: 2, borderColor: COLORS.primary },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  pacienteHab: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  resumenCard: { borderRadius: 14, padding: 16, marginTop: 16, elevation: 2 },
  resumenTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.primary, marginBottom: 14 },
  metricasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  metrica: { width: '46%', alignItems: 'center', gap: 2 },
  metricaValor: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  metricaLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },
  pesoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, padding: 10, backgroundColor: COLORS.background, borderRadius: 10 },
  pesoLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  pesoValor: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.secondary },
  exportBtnTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.secondary },
});
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/reportes/ReportesMensualesScreen.tsx
git commit -m "feat: add ReportesMensualesScreen"
```

---

## Task 6: Crear EstadisticasScreen

**Files:**
- Create: `src/screens/reportes/EstadisticasScreen.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
// src/screens/reportes/EstadisticasScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { supabase } from '../../lib/supabase';
import { exportarExcel } from '../../utils/exportarExcel';

interface EstadisticasHogar {
  adherenciaMeds: number;
  cumplimientoSignos: number;
  totalIncidentes: number;
  pacientesActivos: number;
  totalInfracciones: number;
  infracciones_cerradas: number;
}

const PERIODOS = [
  { label: 'Este mes', meses: 1 },
  { label: 'Mes pasado', meses: 2 },
  { label: 'Últimos 3 meses', meses: 3 },
];

export default function EstadisticasScreen() {
  const insets = useSafeAreaInsets();
  const { pacientes } = useApp();
  const { colors } = useAppTheme();
  const [periodo, setPeriodo] = useState(0);
  const [stats, setStats] = useState<EstadisticasHogar | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const ahora = new Date();
    const mesesAtras = PERIODOS[periodo].meses;
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - (mesesAtras - 1), 1).toISOString().slice(0, 10);
    const hasta = ahora.toISOString().slice(0, 10);

    try {
      const [adminRes, signosRes, incidentesRes, infraccionesRes] = await Promise.all([
        supabase.from('administraciones').select('id', { count: 'exact' }).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('signos_vitales').select('id', { count: 'exact' }).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('incidentes').select('id', { count: 'exact' }).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('incumplimientos').select('requerimiento_estado', { count: 'exact' }).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
      ]);

      const pacientesActivos = pacientes.filter(p => !p.fallecido).length;
      const diasPeriodo = Math.ceil((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000);
      const medsActivos = (await supabase.from('medicamentos').select('id', { count: 'exact' }).eq('activo', true)).count ?? 0;

      const dosisEsperadas = medsActivos * diasPeriodo;
      const dosisRealizadas = adminRes.count ?? 0;
      const signosRegistrados = signosRes.count ?? 0;
      const signosEsperados = pacientesActivos * diasPeriodo * 3;

      const infraccionesList = infraccionesRes.data ?? [];
      const cerradas = infraccionesList.filter(i => i.requerimiento_estado === 'resuelto').length;

      setStats({
        adherenciaMeds: dosisEsperadas > 0 ? Math.round((dosisRealizadas / dosisEsperadas) * 100) : 100,
        cumplimientoSignos: signosEsperados > 0 ? Math.round((signosRegistrados / signosEsperados) * 100) : 100,
        totalIncidentes: incidentesRes.count ?? 0,
        pacientesActivos,
        totalInfracciones: infraccionesRes.count ?? 0,
        infracciones_cerradas: cerradas,
      });
    } catch { Alert.alert('Error', 'No se pudieron cargar las estadísticas.'); }
    setCargando(false);
  }, [periodo, pacientes]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function handleExportarExcel() {
    if (!stats) return;
    try {
      await exportarExcel('estadisticas_hogar', [{
        nombre: 'Estadísticas',
        datos: [{
          Período: PERIODOS[periodo].label,
          'Pacientes activos': stats.pacientesActivos,
          'Adherencia medicamentos (%)': stats.adherenciaMeds,
          'Cumplimiento signos vitales (%)': stats.cumplimientoSignos,
          'Total incidentes': stats.totalIncidentes,
          'Total infracciones': stats.totalInfracciones,
          'Infracciones cerradas': stats.infracciones_cerradas,
          'Tasa cierre infracciones (%)': stats.totalInfracciones > 0 ? Math.round((stats.infracciones_cerradas / stats.totalInfracciones) * 100) : 100,
        }],
      }]);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo exportar.'); }
  }

  const metrica = (valor: number | string, label: string, color: string) => (
    <View style={[styles.metrica, { backgroundColor: colors.surface }]}>
      <Text style={[styles.metricaValor, { color }]}>{valor}{typeof valor === 'number' && label.includes('%') ? '%' : ''}</Text>
      <Text style={styles.metricaLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>

      {/* Selector de período */}
      <View style={[styles.periodosRow, { backgroundColor: colors.surface }]}>
        {PERIODOS.map((p, idx) => (
          <TouchableOpacity key={idx} style={[styles.periodoChip, periodo === idx && styles.periodoChipActivo]} onPress={() => setPeriodo(idx)}>
            <Text style={[styles.periodoTexto, periodo === idx && { color: '#fff' }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {cargando && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />}

      {stats && !cargando && (
        <>
          <Text style={styles.seccion}>Indicadores del Hogar</Text>
          <View style={styles.grid}>
            {metrica(stats.pacientesActivos, 'Pacientes activos', COLORS.primary)}
            {metrica(`${stats.adherenciaMeds}`, 'Adherencia medicamentos', stats.adherenciaMeds >= 80 ? COLORS.secondary : COLORS.danger)}
            {metrica(`${stats.cumplimientoSignos}`, 'Cumplimiento signos', stats.cumplimientoSignos >= 80 ? COLORS.secondary : COLORS.danger)}
            {metrica(stats.totalIncidentes, 'Incidentes', stats.totalIncidentes > 5 ? COLORS.danger : COLORS.warning)}
          </View>

          <Text style={styles.seccion}>Infracciones</Text>
          <View style={styles.grid}>
            {metrica(stats.totalInfracciones, 'Total infracciones', COLORS.warning)}
            {metrica(stats.infracciones_cerradas, 'Cerradas', COLORS.secondary)}
            {metrica(
              stats.totalInfracciones > 0 ? `${Math.round((stats.infracciones_cerradas / stats.totalInfracciones) * 100)}` : '100',
              'Tasa de cierre',
              COLORS.primary,
            )}
          </View>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportarExcel}>
            <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.secondary} />
            <Text style={styles.exportBtnTexto}>Exportar Excel</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  periodosRow: { flexDirection: 'row', gap: 6, borderRadius: 14, padding: 10, marginBottom: 16 },
  periodoChip: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  periodoChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodoTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  seccion: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metrica: { width: '47%', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2 },
  metricaValor: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  metricaLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.secondary, marginTop: 16 },
  exportBtnTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.secondary },
});
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/reportes/EstadisticasScreen.tsx
git commit -m "feat: add EstadisticasScreen"
```

---

## Task 7: Registrar pantallas de reportes en AppNavigator y MasScreen

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/screens/MasScreen.tsx`

- [ ] **Step 1: Agregar imports en AppNavigator.tsx**

```typescript
import ReportesMensualesScreen from '../screens/reportes/ReportesMensualesScreen';
import EstadisticasScreen from '../screens/reportes/EstadisticasScreen';
```

- [ ] **Step 2: Registrar en AppTabs()**

```tsx
{/* Reportes — admin + enfermero */}
{!soloAseo && (
  <Tab.Screen name="ReportesMensuales" component={ReportesMensualesScreen}
    options={{ headerShown: true, ...headerOpts, title: 'Reportes Mensuales', headerLeft: menuLeft }} />
)}

{/* Estadísticas — admin */}
{isAdmin && (
  <Tab.Screen name="Estadisticas" component={EstadisticasScreen}
    options={{ headerShown: true, ...headerOpts, title: 'Estadísticas del Hogar', headerLeft: menuLeft }} />
)}
```

- [ ] **Step 3: Agregar a MODULOS_COMUNES en MasScreen.tsx**

Agregar a `MODULOS_COMUNES`:
```typescript
{ tab: 'ReportesMensuales', label: 'Reportes', icono: 'file-chart', color: '#1565C0', bg: '#E3F2FD', descripcion: 'Reportes mensuales por paciente' },
```

Agregar a `MODULOS_ADMIN`:
```typescript
{ tab: 'Estadisticas', label: 'Estadísticas', icono: 'chart-bar', color: '#2E7D32', bg: '#E8F5E9', descripcion: 'Métricas globales del hogar' },
```

- [ ] **Step 4: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Test manual completo**

Ejecutar `npx expo start` y verificar:
- MasScreen muestra Reportes y Estadísticas
- ReportesMensualesScreen → seleccionar paciente → muestra resumen con métricas
- Botón "Exportar Excel" → abre diálogo de compartir
- EstadisticasScreen → muestra métricas con 3 períodos
- HistorialSignosScreen → botón Excel exporta correctamente
- InfraccionesScreen → botón Excel exporta correctamente

- [ ] **Step 6: Commit final Capa 3**

```bash
git add src/navigation/AppNavigator.tsx src/screens/MasScreen.tsx
git commit -m "feat: register Capa 3 report screens in navigation"
```
