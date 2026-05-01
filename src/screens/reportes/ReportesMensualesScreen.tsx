// src/screens/reportes/ReportesMensualesScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
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

export default function ReportesMensualesScreen() {
  const insets = useSafeAreaInsets();
  const { pacientes } = useApp();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [mesOffset, setMesOffset] = useState(0);
  const [resumen, setResumen] = useState<ResumenMensual | null>(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const ahora = new Date();
  const fechaMes = new Date(ahora.getFullYear(), ahora.getMonth() + mesOffset, 1);
  const mesLabel = fechaMes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const desde = fechaMes.toISOString().slice(0, 7) + '-01';
  const hasta = new Date(fechaMes.getFullYear(), fechaMes.getMonth() + 1, 0).toISOString().slice(0, 10);
  const diasMes = new Date(fechaMes.getFullYear(), fechaMes.getMonth() + 1, 0).getDate();

  const pacientesActivos = pacientes
    .filter(p => !(p as any).fallecido)
    .filter(p => {
      if (!busqueda.trim()) return true;
      return `${p.nombre} ${p.apellido}`.toLowerCase().includes(busqueda.toLowerCase());
    });

  async function cargarResumen(paciente: Paciente) {
    setPacienteSeleccionado(paciente);
    setCargando(true);
    setResumen(null);
    try {
      const [signosRes, medsRes, adminRes, incidentesRes, notasRes, tomasRes] = await Promise.all([
        supabase.from('signos_vitales').select('id, peso, created_at').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('medicamentos').select('id, frecuencia').eq('paciente_id', paciente.id).eq('activo', true),
        supabase.from('administraciones').select('id, medicamento_id').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('incidentes').select('id').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('notas_evolucion').select('id').eq('paciente_id', paciente.id).gte('created_at', desde).lte('created_at', hasta + 'T23:59:59'),
        supabase.from('tomas_signos').select('id').eq('paciente_id', paciente.id),
      ]);

      // Signos esperados = tomas configuradas × días del mes (fallback 3 si no hay tomas)
      const tomasConfigured = tomasRes.data?.length ?? 0;
      const signosEsperados = (tomasConfigured > 0 ? tomasConfigured : 3) * diasMes;

      // Dosis esperadas usando frecuencia real de cada medicamento
      const meds = medsRes.data ?? [];
      const dosisEsperadas = meds.reduce((sum, m) => sum + dosesPerDay(m.frecuencia) * diasMes, 0);
      const dosisRealizadas = adminRes.data?.length ?? 0;
      const adherencia = dosisEsperadas > 0 ? Math.round((dosisRealizadas / dosisEsperadas) * 100) : 100;

      const signos = signosRes.data ?? [];
      const pesosOrdenados = signos
        .filter(s => s.peso)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setResumen({
        signosRegistrados: signos.length,
        signosEsperados,
        adherenciaMeds: Math.min(100, adherencia),
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
    const cumplSignos = resumen.signosEsperados > 0 ? Math.round((resumen.signosRegistrados / resumen.signosEsperados) * 100) : 100;
    try {
      await exportarExcel(`reporte_${pacienteSeleccionado.apellido}_${mesLabel.replace(/\s/g, '_')}`, [{
        nombre: 'Resumen',
        datos: [{
          Paciente: `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`,
          Mes: mesLabel,
          'Signos registrados': resumen.signosRegistrados,
          'Signos esperados': resumen.signosEsperados,
          'Cumplimiento signos (%)': cumplSignos,
          'Dosis administradas': resumen.totalDosis,
          'Dosis esperadas': resumen.dosisEsperadas,
          'Adherencia meds (%)': resumen.adherenciaMeds,
          Incidentes: resumen.incidentes,
          'Notas de evolución': resumen.notasEvolucion,
          'Peso inicio (kg)': resumen.pesoInicio,
          'Peso fin (kg)': resumen.pesoFin,
        }],
      }]);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo exportar.'); }
  }

  function MetricaBar({ valor, maximo, color, label }: { valor: number; maximo: number; color: string; label: string }) {
    const pct = maximo > 0 ? Math.min(1, valor / maximo) : 0;
    return (
      <View style={styles.metricaBar}>
        <View style={styles.metricaBarHeader}>
          <Text style={styles.metricaBarLabel}>{label}</Text>
          <Text style={[styles.metricaBarValor, { color }]}>{valor} / {maximo}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
        </View>
      </View>
    );
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

      {/* Buscador de pacientes */}
      <View style={[styles.buscadorWrapper, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.buscador, { color: colors.textPrimary }]}
          placeholder="Buscar paciente..."
          placeholderTextColor={COLORS.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
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
      {pacientesActivos.length === 0 && busqueda.length > 0 && (
        <Text style={styles.vacio}>Sin resultados para "{busqueda}"</Text>
      )}

      {cargando && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}

      {resumen && pacienteSeleccionado && (
        <View style={[styles.resumenCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.resumenTitulo}>{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido} — {mesLabel}</Text>

          <MetricaBar
            valor={resumen.signosRegistrados}
            maximo={resumen.signosEsperados}
            color={resumen.signosRegistrados >= resumen.signosEsperados * 0.8 ? COLORS.secondary : COLORS.warning}
            label="Signos vitales"
          />
          <MetricaBar
            valor={resumen.totalDosis}
            maximo={resumen.dosisEsperadas}
            color={resumen.adherenciaMeds >= 80 ? COLORS.secondary : COLORS.danger}
            label={`Medicamentos (${resumen.adherenciaMeds}%)`}
          />

          <View style={styles.metricasGrid}>
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

          {isAdmin && (
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportarExcel}>
              <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.secondary} />
              <Text style={styles.exportBtnTexto}>Exportar Excel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  mesSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 14, marginBottom: 12 },
  mesLabel: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, textTransform: 'capitalize' },
  buscadorWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14,
  },
  buscador: { flex: 1, fontSize: FONT_SIZES.sm },
  seccion: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  pacienteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 6, elevation: 1 },
  pacienteItemActivo: { borderWidth: 2, borderColor: COLORS.primary },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  pacienteHab: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 },
  resumenCard: { borderRadius: 14, padding: 16, marginTop: 16, elevation: 2, gap: 12 },
  resumenTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.primary },
  metricaBar: { gap: 4 },
  metricaBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricaBarLabel: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  metricaBarValor: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  barTrack: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  metricasGrid: { flexDirection: 'row', gap: 12 },
  metrica: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: COLORS.background, borderRadius: 10, padding: 12 },
  metricaValor: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  metricaLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },
  pesoRow: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: COLORS.background, borderRadius: 10 },
  pesoLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  pesoValor: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.secondary },
  exportBtnTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.secondary },
});
