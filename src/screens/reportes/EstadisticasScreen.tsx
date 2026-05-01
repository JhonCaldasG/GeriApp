// src/screens/reportes/EstadisticasScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { supabase } from '../../lib/supabase';
import { exportarExcel } from '../../utils/exportarExcel';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface EstadisticasHogar {
  adherenciaMeds: number;
  cumplimientoSignos: number;
  totalIncidentes: number;
  pacientesActivos: number;
  totalInfracciones: number;
  infracciones_cerradas: number;
  dosisEsperadas: number;
  dosisRealizadas: number;
  signosEsperados: number;
  signosRegistrados: number;
}

const PERIODOS = [
  { label: 'Este mes', meses: 1 },
  { label: 'Mes pasado', meses: 2 },
  { label: 'Últimos 3 meses', meses: 3 },
];

function dosesPerDay(frecuencia: string): number {
  const f = frecuencia.toLowerCase().trim();
  if (f.includes('4 hora')) return 6;
  if (f.includes('6 hora')) return 4;
  if (f.includes('8 hora')) return 3;
  if (f.includes('12 hora')) return 2;
  if (f.includes('una vez') || f.includes('diaria')) return 1;
  if (f.includes('dos veces')) return 2;
  if (f.includes('tres veces')) return 3;
  return 1;
}

function BarraProgreso({ valor, maximo, color, label, sublabel }: { valor: number; maximo: number; color: string; label: string; sublabel?: string }) {
  const pct = maximo > 0 ? Math.min(1, valor / maximo) : 1;
  const pctDisplay = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 100;
  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.header}>
        <View>
          <Text style={barStyles.label}>{label}</Text>
          {sublabel && <Text style={barStyles.sublabel}>{sublabel}</Text>}
        </View>
        <Text style={[barStyles.valor, { color }]}>{pctDisplay}%</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={barStyles.detalle}>{valor} / {maximo}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrapper: { gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  sublabel: { fontSize: 10, color: COLORS.textSecondary },
  valor: { fontSize: FONT_SIZES.lg, fontWeight: '800' },
  track: { height: 10, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  detalle: { fontSize: 10, color: COLORS.textSecondary },
});

export default function EstadisticasScreen() {
  const insets = useSafeAreaInsets();
  const { pacientes } = useApp();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const [periodo, setPeriodo] = useState(0);
  const [stats, setStats] = useState<EstadisticasHogar | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const ahora = new Date();
    const mesesAtras = PERIODOS[periodo].meses;
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - (mesesAtras - 1), 1).toISOString().slice(0, 10);
    const hasta = ahora.toISOString().slice(0, 10);
    const diasPeriodo = Math.ceil((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000) + 1;

    try {
      const pacientesActivos = pacientes.filter(p => !(p as any).fallecido);
      const nPacientes = pacientesActivos.length;

      const [adminRes, signosRes, incidentesRes, infraccionesRes, medsRes, tomasRes] = await Promise.all([
        supabase.from('administraciones').select('id', { count: 'exact' }).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('signos_vitales').select('id', { count: 'exact' }).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('incidentes').select('id', { count: 'exact' }).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('incumplimientos').select('requerimiento_estado').gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('medicamentos').select('frecuencia').eq('activo', true),
        supabase.from('tomas_signos').select('paciente_id'),
      ]);

      // Dosis esperadas = suma real por frecuencia de cada medicamento activo
      const medsData = medsRes.data ?? [];
      const dosisEsperadas = medsData.reduce((sum, m) => sum + dosesPerDay(m.frecuencia) * diasPeriodo, 0);
      const dosisRealizadas = adminRes.count ?? 0;

      // Signos esperados = tomas configuradas por paciente × días (fallback 3 por paciente si no hay tomas)
      const tomasData = tomasRes.data ?? [];
      const tomasPorPaciente: Record<string, number> = {};
      for (const t of tomasData) tomasPorPaciente[t.paciente_id] = (tomasPorPaciente[t.paciente_id] ?? 0) + 1;
      const signosEsperados = pacientesActivos.reduce((sum, p) => {
        const tomas = tomasPorPaciente[p.id] ?? 3;
        return sum + tomas * diasPeriodo;
      }, 0);
      const signosRegistrados = signosRes.count ?? 0;

      const infraccionesList = infraccionesRes.data ?? [];
      const cerradas = infraccionesList.filter((i: any) => i.requerimiento_estado === 'resuelto').length;

      setStats({
        adherenciaMeds: dosisEsperadas > 0 ? Math.min(100, Math.round((dosisRealizadas / dosisEsperadas) * 100)) : 100,
        cumplimientoSignos: signosEsperados > 0 ? Math.min(100, Math.round((signosRegistrados / signosEsperados) * 100)) : 100,
        totalIncidentes: incidentesRes.count ?? 0,
        pacientesActivos: nPacientes,
        totalInfracciones: infraccionesList.length,
        infracciones_cerradas: cerradas,
        dosisEsperadas,
        dosisRealizadas,
        signosEsperados,
        signosRegistrados,
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
          'Dosis realizadas': stats.dosisRealizadas,
          'Dosis esperadas': stats.dosisEsperadas,
          'Adherencia medicamentos (%)': stats.adherenciaMeds,
          'Signos registrados': stats.signosRegistrados,
          'Signos esperados': stats.signosEsperados,
          'Cumplimiento signos vitales (%)': stats.cumplimientoSignos,
          'Total incidentes': stats.totalIncidentes,
          'Total infracciones': stats.totalInfracciones,
          'Infracciones cerradas': stats.infracciones_cerradas,
          'Tasa cierre infracciones (%)': stats.totalInfracciones > 0 ? Math.round((stats.infracciones_cerradas / stats.totalInfracciones) * 100) : 100,
        }],
      }]);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo exportar.'); }
  }

  async function handleExportarPDF() {
    if (!stats) return;
    setExportandoPDF(true);
    try {
      const tasaCierre = stats.totalInfracciones > 0 ? Math.round((stats.infracciones_cerradas / stats.totalInfracciones) * 100) : 100;
      const emision = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const html = `
        <!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a2e; }
          h1 { color: #1565C0; font-size: 22px; margin-bottom: 4px; }
          .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #1565C0; color: white; padding: 10px 14px; text-align: left; font-size: 13px; }
          td { padding: 9px 14px; border-bottom: 1px solid #e8e8e8; font-size: 13px; }
          tr:nth-child(even) td { background: #f5f8ff; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .ok { background: #E8F5E9; color: #2E7D32; }
          .warn { background: #FFF3E0; color: #E65100; }
          .bad { background: #FFEBEE; color: #C62828; }
          .footer { font-size: 11px; color: #999; margin-top: 30px; }
        </style></head><body>
        <h1>Estadísticas del Hogar</h1>
        <div class="sub">Período: ${PERIODOS[periodo].label} · Emitido: ${emision}</div>
        <table>
          <tr><th>Indicador</th><th>Valor</th><th>Estado</th></tr>
          <tr><td>Pacientes activos</td><td>${stats.pacientesActivos}</td><td>—</td></tr>
          <tr>
            <td>Adherencia medicamentos<br/><small>${stats.dosisRealizadas} / ${stats.dosisEsperadas} dosis</small></td>
            <td>${stats.adherenciaMeds}%</td>
            <td><span class="badge ${stats.adherenciaMeds >= 80 ? 'ok' : stats.adherenciaMeds >= 60 ? 'warn' : 'bad'}">${stats.adherenciaMeds >= 80 ? 'Buena' : stats.adherenciaMeds >= 60 ? 'Regular' : 'Baja'}</span></td>
          </tr>
          <tr>
            <td>Cumplimiento signos vitales<br/><small>${stats.signosRegistrados} / ${stats.signosEsperados} registros</small></td>
            <td>${stats.cumplimientoSignos}%</td>
            <td><span class="badge ${stats.cumplimientoSignos >= 80 ? 'ok' : stats.cumplimientoSignos >= 60 ? 'warn' : 'bad'}">${stats.cumplimientoSignos >= 80 ? 'Bueno' : stats.cumplimientoSignos >= 60 ? 'Regular' : 'Bajo'}</span></td>
          </tr>
          <tr>
            <td>Incidentes registrados</td>
            <td>${stats.totalIncidentes}</td>
            <td><span class="badge ${stats.totalIncidentes === 0 ? 'ok' : stats.totalIncidentes <= 5 ? 'warn' : 'bad'}">${stats.totalIncidentes === 0 ? 'Sin incidentes' : stats.totalIncidentes <= 5 ? 'Normal' : 'Elevado'}</span></td>
          </tr>
          <tr>
            <td>Infracciones<br/><small>${stats.infracciones_cerradas} cerradas de ${stats.totalInfracciones} totales</small></td>
            <td>${tasaCierre}% cerradas</td>
            <td><span class="badge ${tasaCierre >= 80 ? 'ok' : tasaCierre >= 50 ? 'warn' : 'bad'}">${tasaCierre >= 80 ? 'Bien' : tasaCierre >= 50 ? 'En proceso' : 'Pendiente'}</span></td>
          </tr>
        </table>
        <div class="footer">Generado por el sistema de gestión del hogar geriátrico</div>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      else Alert.alert('PDF generado', 'El archivo se guardó en: ' + uri);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo generar el PDF.'); }
    setExportandoPDF(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
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
          {/* Resumen rápido */}
          <View style={styles.resumenRow}>
            <View style={[styles.resumenCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.resumenNum, { color: COLORS.primary }]}>{stats.pacientesActivos}</Text>
              <Text style={styles.resumenLabel}>Pacientes activos</Text>
            </View>
            <View style={[styles.resumenCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.resumenNum, { color: stats.totalIncidentes > 5 ? COLORS.danger : COLORS.warning }]}>{stats.totalIncidentes}</Text>
              <Text style={styles.resumenLabel}>Incidentes</Text>
            </View>
          </View>

          <Text style={styles.seccion}>Cumplimiento clínico</Text>
          <View style={[styles.barrasCard, { backgroundColor: colors.surface }]}>
            <BarraProgreso
              valor={stats.dosisRealizadas}
              maximo={stats.dosisEsperadas}
              color={stats.adherenciaMeds >= 80 ? COLORS.secondary : stats.adherenciaMeds >= 60 ? COLORS.warning : COLORS.danger}
              label="Adherencia medicamentos"
              sublabel={`${stats.dosisRealizadas} de ${stats.dosisEsperadas} dosis`}
            />
            <View style={styles.separadorBarra} />
            <BarraProgreso
              valor={stats.signosRegistrados}
              maximo={stats.signosEsperados}
              color={stats.cumplimientoSignos >= 80 ? COLORS.secondary : stats.cumplimientoSignos >= 60 ? COLORS.warning : COLORS.danger}
              label="Signos vitales"
              sublabel={`${stats.signosRegistrados} de ${stats.signosEsperados} registros`}
            />
          </View>

          <Text style={styles.seccion}>Infracciones</Text>
          <View style={[styles.barrasCard, { backgroundColor: colors.surface }]}>
            <BarraProgreso
              valor={stats.infracciones_cerradas}
              maximo={stats.totalInfracciones || 1}
              color={stats.totalInfracciones === 0 ? COLORS.secondary : stats.infracciones_cerradas / Math.max(1, stats.totalInfracciones) >= 0.8 ? COLORS.secondary : COLORS.warning}
              label="Tasa de cierre"
              sublabel={`${stats.infracciones_cerradas} cerradas de ${stats.totalInfracciones} totales`}
            />
          </View>

          {isAdmin && (
            <View style={styles.exportBtns}>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#E8F5E9', borderColor: COLORS.secondary }]} onPress={handleExportarExcel}>
                <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.secondary} />
                <Text style={[styles.exportBtnTexto, { color: COLORS.secondary }]}>Exportar Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#FFEBEE', borderColor: COLORS.danger }]} onPress={handleExportarPDF} disabled={exportandoPDF}>
                {exportandoPDF
                  ? <ActivityIndicator size="small" color={COLORS.danger} />
                  : <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.danger} />
                }
                <Text style={[styles.exportBtnTexto, { color: COLORS.danger }]}>Exportar PDF</Text>
              </TouchableOpacity>
            </View>
          )}
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
  resumenRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  resumenCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2 },
  resumenNum: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  seccion: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  barrasCard: { borderRadius: 14, padding: 16, elevation: 2, marginBottom: 16, gap: 14 },
  separadorBarra: { height: 1, backgroundColor: COLORS.border },
  exportBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 14, borderWidth: 1 },
  exportBtnTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
});
