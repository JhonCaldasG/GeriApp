import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SignoVital } from '../types';
import { COLORS, FONT_SIZES, SIGNO_RANGOS } from '../theme';

// ── config de signos ───────────────────────────────────────────────────────────
type SignoKey = 'presionSistolica' | 'presionDiastolica' | 'frecuenciaCardiaca' | 'temperatura' | 'saturacionOxigeno' | 'glucosa';

const SIGNOS_CONFIG: {
  key: SignoKey;
  label: string;
  unidad: string;
  color: string;
  icono: string;
}[] = [
  { key: 'presionSistolica',   label: 'P/A Sist.',  unidad: 'mmHg', color: '#E53935', icono: 'heart-pulse' },
  { key: 'presionDiastolica',  label: 'P/A Diast.', unidad: 'mmHg', color: '#8E24AA', icono: 'heart-pulse' },
  { key: 'frecuenciaCardiaca', label: 'FC',          unidad: 'lpm',  color: '#E65100', icono: 'heart-flash' },
  { key: 'temperatura',        label: 'Temp.',       unidad: '°C',   color: '#00897B', icono: 'thermometer' },
  { key: 'saturacionOxigeno',  label: 'SpO2',        unidad: '%',    color: '#1E88E5', icono: 'lungs' },
  { key: 'glucosa',            label: 'Glucosa',     unidad: 'mg/dL',color: '#F9A825', icono: 'needle' },
];

// ── chart dimensions ───────────────────────────────────────────────────────────
const CHART_W = 320;
const CHART_H = 130;
const PAD_L = 42;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

function getColor(valor: number, key: SignoKey): string {
  if (!(key in SIGNO_RANGOS)) return COLORS.textSecondary;
  const r = SIGNO_RANGOS[key as keyof typeof SIGNO_RANGOS];
  if (valor >= r.normal[0] && valor <= r.normal[1]) return '#2E7D32';
  if (valor >= r.caution[0] && valor <= r.caution[1]) return '#E65100';
  return '#C62828';
}

interface Props {
  signos: SignoVital[];
}

export default function TendenciasSignosChart({ signos }: Props) {
  const [signoActivo, setSignoActivo] = useState<SignoKey>('presionSistolica');

  const config = SIGNOS_CONFIG.find(s => s.key === signoActivo)!;

  // Tomar los últimos 15 registros con valor para el signo seleccionado
  const puntos = signos
    .filter(s => s[signoActivo] && s[signoActivo].trim() !== '')
    .slice(0, 15)
    .reverse()
    .map(s => ({
      valor: parseFloat(s[signoActivo]),
      fecha: new Date(s.createdAt),
      signo: s,
    }))
    .filter(p => !isNaN(p.valor));

  if (puntos.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.titulo}>Tendencias</Text>
        <SelectorSignos active={signoActivo} onChange={setSignoActivo} />
        <View style={styles.sinDatos}>
          <MaterialCommunityIcons name="chart-line" size={36} color={COLORS.border} />
          <Text style={styles.sinDatosTexto}>Sin datos para "{config.label}"</Text>
        </View>
      </View>
    );
  }

  const valores = puntos.map(p => p.valor);
  const minVal = Math.min(...valores);
  const maxVal = Math.max(...valores);
  const rango = maxVal - minVal || 1;
  const padding = rango * 0.15;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRango = yMax - yMin || 1;

  function toX(i: number) { return PAD_L + (i / Math.max(puntos.length - 1, 1)) * PLOT_W; }
  function toY(v: number) { return PAD_T + PLOT_H - ((v - yMin) / yRango) * PLOT_H; }

  // Build path
  const linePath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.valor)}`).join(' ');

  // Area fill path
  const areaPath = [
    `M ${toX(0)} ${PAD_T + PLOT_H}`,
    ...puntos.map((p, i) => `L ${toX(i)} ${toY(p.valor)}`),
    `L ${toX(puntos.length - 1)} ${PAD_T + PLOT_H}`,
    'Z',
  ].join(' ');

  // Y axis ticks
  const yTicks = [yMin, yMin + yRango * 0.5, yMax];

  // Stats
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
  const ultimo = puntos[puntos.length - 1];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.titulo}>Tendencias</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Último</Text>
            <Text style={[styles.statVal, { color: getColor(ultimo.valor, signoActivo) }]}>
              {ultimo.valor.toFixed(1)} {config.unidad}
            </Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Promedio</Text>
            <Text style={styles.statVal}>{promedio.toFixed(1)} {config.unidad}</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Registros</Text>
            <Text style={styles.statVal}>{puntos.length}</Text>
          </View>
        </View>
      </View>

      <SelectorSignos active={signoActivo} onChange={setSignoActivo} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={Math.max(CHART_W, puntos.length * 36 + PAD_L + PAD_R)} height={CHART_H}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={config.color} stopOpacity="0.25" />
              <Stop offset="1" stopColor={config.color} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Líneas de grid */}
          {yTicks.map((tick, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PAD_L} y1={toY(tick)}
                x2={PAD_L + PLOT_W} y2={toY(tick)}
                stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4"
              />
              <SvgText
                x={PAD_L - 4} y={toY(tick) + 4}
                fontSize="9" fill={COLORS.textSecondary} textAnchor="end"
              >
                {Math.round(tick)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Área */}
          <Path d={areaPath} fill="url(#areaGrad)" />

          {/* Línea */}
          <Path d={linePath} stroke={config.color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Puntos */}
          {puntos.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={toX(i)} cy={toY(p.valor)} r="4" fill={getColor(p.valor, signoActivo)} />
              <Circle cx={toX(i)} cy={toY(p.valor)} r="6" fill="transparent" stroke={getColor(p.valor, signoActivo)} strokeWidth="1.5" />
              {/* Fecha eje X */}
              <SvgText
                x={toX(i)} y={PAD_T + PLOT_H + 14}
                fontSize="8" fill={COLORS.textSecondary} textAnchor="middle"
              >
                {`${p.fecha.getDate()}/${p.fecha.getMonth() + 1}`}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </ScrollView>
    </View>
  );
}

// ── Selector de signo ──────────────────────────────────────────────────────────
function SelectorSignos({ active, onChange }: { active: SignoKey; onChange: (k: SignoKey) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll} contentContainerStyle={styles.selectorContainer}>
      {SIGNOS_CONFIG.map(s => {
        const isActive = s.key === active;
        return (
          <TouchableOpacity
            key={s.key}
            style={[styles.chip, isActive && { backgroundColor: s.color, borderColor: s.color }]}
            onPress={() => onChange(s.key)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name={s.icono as any} size={13} color={isActive ? '#fff' : COLORS.textSecondary} />
            <Text style={[styles.chipTexto, isActive && { color: '#fff' }]}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── estilos ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  statItem: { alignItems: 'center', paddingHorizontal: 8 },
  statDiv: { width: 1, height: 24, backgroundColor: COLORS.border },
  statLabel: { fontSize: 9, color: COLORS.textSecondary },
  statVal: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  selectorScroll: { marginBottom: 10 },
  selectorContainer: { gap: 6, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: COLORS.background,
  },
  chipTexto: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  sinDatos: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  sinDatosTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
});
