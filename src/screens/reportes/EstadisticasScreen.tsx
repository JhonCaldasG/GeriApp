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

      const pacientesActivos = pacientes.filter(p => !(p as any).fallecido).length;
      const diasPeriodo = Math.ceil((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000);
      const medsActivos = (await supabase.from('medicamentos').select('id', { count: 'exact' }).eq('activo', true)).count ?? 0;

      const dosisEsperadas = medsActivos * diasPeriodo;
      const dosisRealizadas = adminRes.count ?? 0;
      const signosRegistrados = signosRes.count ?? 0;
      const signosEsperados = pacientesActivos * diasPeriodo * 3;

      const infraccionesList = infraccionesRes.data ?? [];
      const cerradas = infraccionesList.filter((i: any) => i.requerimiento_estado === 'resuelto').length;

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
            {metrica(`${stats.adherenciaMeds}`, 'Adherencia medicamentos %', stats.adherenciaMeds >= 80 ? COLORS.secondary : COLORS.danger)}
            {metrica(`${stats.cumplimientoSignos}`, 'Cumplimiento signos %', stats.cumplimientoSignos >= 80 ? COLORS.secondary : COLORS.danger)}
            {metrica(stats.totalIncidentes, 'Incidentes', stats.totalIncidentes > 5 ? COLORS.danger : COLORS.warning)}
          </View>

          <Text style={styles.seccion}>Infracciones</Text>
          <View style={styles.grid}>
            {metrica(stats.totalInfracciones, 'Total infracciones', COLORS.warning)}
            {metrica(stats.infracciones_cerradas, 'Cerradas', COLORS.secondary)}
            {metrica(
              stats.totalInfracciones > 0 ? `${Math.round((stats.infracciones_cerradas / stats.totalInfracciones) * 100)}` : '100',
              'Tasa de cierre %',
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
