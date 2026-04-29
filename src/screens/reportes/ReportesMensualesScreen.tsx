// src/screens/reportes/ReportesMensualesScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
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
  const [mesOffset, setMesOffset] = useState(0);
  const [resumen, setResumen] = useState<ResumenMensual | null>(null);
  const [cargando, setCargando] = useState(false);

  const ahora = new Date();
  const fechaMes = new Date(ahora.getFullYear(), ahora.getMonth() + mesOffset, 1);
  const mesLabel = fechaMes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const desde = fechaMes.toISOString().slice(0, 7) + '-01';
  const hasta = new Date(fechaMes.getFullYear(), fechaMes.getMonth() + 1, 0).toISOString().slice(0, 10);

  const pacientesActivos = pacientes.filter(p => !(p as any).fallecido);

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
      const tomasPorDia = 3;
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
      <View style={[styles.mesSelector, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => { setMesOffset(m => m - 1); setResumen(null); }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.mesLabel}>{mesLabel}</Text>
        <TouchableOpacity onPress={() => { if (mesOffset < 0) { setMesOffset(m => m + 1); setResumen(null); } }} style={{ opacity: mesOffset < 0 ? 1 : 0.3 }}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

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
          <Text style={styles.pacienteHab}>Hab. {(p as any).habitacion}</Text>
        </TouchableOpacity>
      ))}

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
