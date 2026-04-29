import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, Modal, ScrollView, TouchableOpacity,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TomaSigno } from '../types';
import { useApp } from '../context/AppContext';
import { COLORS, FONT_SIZES } from '../theme';
import { useEliminar } from '../hooks/useEliminar';
import FeedbackEliminar from './FeedbackEliminar';

interface Props {
  visible: boolean;
  pacienteId: string;
  pacienteNombre: string;
  onDismiss: () => void;
}

type AmPm = 'AM' | 'PM';

const NOMBRES_SUGERIDOS = ['Mañana', 'Mediodía', 'Tarde', 'Noche'];
const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HORAS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const ITEM_H = 44;
const VISIBLE = 5;
const PADDING = ITEM_H * Math.floor(VISIBLE / 2);

function pad(n: number) { return String(n).padStart(2, '0'); }

function to24(h12: number, ampm: AmPm): number {
  if (ampm === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

function from24(h24: number): { h12: number; ampm: AmPm } {
  if (h24 === 0)  return { h12: 12, ampm: 'AM' };
  if (h24 < 12)  return { h12: h24, ampm: 'AM' };
  if (h24 === 12) return { h12: 12, ampm: 'PM' };
  return { h12: h24 - 12, ampm: 'PM' };
}

function horaAMin24(h12: number, ampm: AmPm, minIdx: number): number {
  return to24(h12, ampm) * 60 + MINUTOS[minIdx];
}

// Sugerencias en formato 24h → se convierten al montar
function sugerirHorario(nombre: string): { hi24: number; hf24: number } | null {
  switch (nombre) {
    case 'Mañana':   return { hi24: 7,  hf24: 9  };
    case 'Mediodía': return { hi24: 12, hf24: 14 };
    case 'Tarde':    return { hi24: 14, hf24: 17 };
    case 'Noche':    return { hi24: 20, hf24: 22 };
    default:         return null;
  }
}

// ── Carrusel vertical ──────────────────────────────────────────────────────────
interface WheelProps {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  width: number;
}

function WheelPicker({ items, selectedIndex, onSelect, width }: WheelProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: true });
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      onSelect(Math.max(0, Math.min(items.length - 1, idx)));
    },
    [items.length, onSelect]
  );

  return (
    <View style={{ width, height: ITEM_H * VISIBLE, position: 'relative' }}>
      <View pointerEvents="none" style={[styles.wheelHighlight, { top: ITEM_H * Math.floor(VISIBLE / 2) }]} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {items.map((item, i) => {
          const activo = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              style={styles.wheelItem}
              onPress={() => {
                onSelect(i);
                ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.wheelTexto, activo && styles.wheelTextoActivo]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Selector de tiempo 12h ─────────────────────────────────────────────────────
interface TimeSelectorProps {
  label: string;
  h12: number;       // 1-12
  ampm: AmPm;
  minIdx: number;    // índice en MINUTOS
  lockedAmPm?: AmPm; // cuando está definido, el toggle AM/PM queda bloqueado
  onH12Change: (h: number) => void;
  onAmPmChange: (v: AmPm) => void;
  onMinChange: (i: number) => void;
}

function TimeSelector({ label, h12, ampm, minIdx, lockedAmPm, onH12Change, onAmPmChange, onMinChange }: TimeSelectorProps) {
  const horasStr = HORAS_12.map(h => pad(h));        // ['01'..'12']
  const minsStr  = MINUTOS.map(m => pad(m));
  const bloqueado = lockedAmPm !== undefined;

  return (
    <View style={styles.timeSelectorBox}>
      <Text style={styles.timeSelectorLabel}>{label}</Text>

      {/* Carruseles */}
      <View style={styles.timeSelectorRow}>
        <WheelPicker
          items={horasStr}
          selectedIndex={h12 - 1}           // h12=1 → index 0
          onSelect={i => onH12Change(i + 1)} // index 0 → h12=1
          width={58}
        />
        <Text style={styles.timeSep}>:</Text>
        <WheelPicker
          items={minsStr}
          selectedIndex={minIdx}
          onSelect={onMinChange}
          width={54}
        />
      </View>

      {/* Toggle AM / PM */}
      <View style={[styles.ampmRow, bloqueado && styles.ampmRowBloqueado]}>
        {(['AM', 'PM'] as AmPm[]).map(v => {
          const isActive = ampm === v;
          const isInactiva = bloqueado && !isActive;
          return (
            <TouchableOpacity
              key={v}
              style={[
                styles.ampmBtn,
                isActive && styles.ampmBtnActivo,
                isInactiva && styles.ampmBtnInactiva,
              ]}
              onPress={() => !bloqueado && onAmPmChange(v)}
              disabled={bloqueado}
              activeOpacity={bloqueado ? 1 : 0.7}
            >
              <Text style={[
                styles.ampmTexto,
                isActive && styles.ampmTextoActivo,
                isInactiva && styles.ampmTextoInactiva,
              ]}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Valor resultante */}
      <Text style={styles.timeValor}>
        {pad(h12)}:{pad(MINUTOS[minIdx])} {ampm}
      </Text>
    </View>
  );
}

function ampmParaNombre(nombre: string): AmPm | undefined {
  if (nombre === 'Mañana') return 'AM';
  if (nombre === 'Mediodía' || nombre === 'Tarde' || nombre === 'Noche') return 'PM';
  return undefined;
}

// ── Modal principal ────────────────────────────────────────────────────────────
export default function HorariosSignosModal({ visible, pacienteId, pacienteNombre, onDismiss }: Props) {
  const { horarios, guardarTomaHorario, eliminarTomaHorario } = useApp();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const tomas: TomaSigno[] = [...(horarios[pacienteId] ?? [])].sort((a, b) =>
    a.horaInicio.localeCompare(b.horaInicio)
  );

  const [nombre, setNombre] = useState('');
  const [inicioH12, setInicioH12] = useState(7);
  const [inicioAmPm, setInicioAmPm] = useState<AmPm>('AM');
  const [inicioM, setInicioM] = useState(0);
  const [finH12, setFinH12] = useState(9);
  const [finAmPm, setFinAmPm] = useState<AmPm>('AM');
  const [finM, setFinM] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  useEffect(() => {
    if (visible) {
      setNombre('');
      setInicioH12(7); setInicioAmPm('AM'); setInicioM(0);
      setFinH12(9);   setFinAmPm('AM');    setFinM(0);
      setIntentoGuardar(false);
    }
  }, [visible]);

  function seleccionarNombre(n: string) {
    const nuevo = nombre === n ? '' : n;
    setNombre(nuevo);
    if (nuevo) {
      const sug = sugerirHorario(nuevo);
      if (sug) {
        const ini = from24(sug.hi24);
        const fin = from24(sug.hf24);
        setInicioH12(ini.h12); setInicioAmPm(ini.ampm); setInicioM(0);
        setFinH12(fin.h12);   setFinAmPm(fin.ampm);    setFinM(0);
      }
    }
  }

  const ampmBloqueado = ampmParaNombre(nombre);

  const inicioMin = horaAMin24(inicioH12, inicioAmPm, inicioM);
  const finMin    = horaAMin24(finH12, finAmPm, finM);
  const errorOrden = finMin <= inicioMin;

  async function handleAgregar() {
    setIntentoGuardar(true);
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Ingrese un nombre para la toma.');
      return;
    }
    if (errorOrden) {
      Alert.alert('Horario inválido', 'La hora fin debe ser posterior a la hora inicio.');
      return;
    }
    const hi24 = to24(inicioH12, inicioAmPm);
    const hf24 = to24(finH12, finAmPm);
    setGuardando(true);
    await guardarTomaHorario(pacienteId, {
      nombre: nombre.trim(),
      horaInicio: `${pad(hi24)}:${pad(MINUTOS[inicioM])}`,
      horaFin:    `${pad(hf24)}:${pad(MINUTOS[finM])}`,
    });
    setNombre('');
    setInicioH12(7); setInicioAmPm('AM'); setInicioM(0);
    setFinH12(9);   setFinAmPm('AM');    setFinM(0);
    setIntentoGuardar(false);
    setGuardando(false);
  }

  function confirmarEliminar(toma: TomaSigno) {
    ejecutarEliminacion('Eliminar toma', `¿Eliminar "${toma.nombre}"?`, async () => {
      await eliminarTomaHorario(pacienteId, toma.id);
    });
  }

  // Mostrar hora guardada (24h) como 12h en la lista
  function formatear12h(hora24: string): string {
    const [h, m] = hora24.split(':').map(Number);
    const { h12, ampm } = from24(h);
    return `${pad(h12)}:${pad(m)} ${ampm}`;
  }

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcono}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Horarios de Signos</Text>
              <Text style={styles.subtitulo}>{pacienteNombre}</Text>
            </View>
            <TouchableOpacity onPress={onDismiss}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Tomas configuradas */}
            {tomas.length === 0 ? (
              <View style={styles.vacia}>
                <MaterialCommunityIcons name="clock-alert-outline" size={36} color={COLORS.border} />
                <Text style={styles.vaciaTexto}>Sin horarios configurados</Text>
              </View>
            ) : (
              tomas.map(t => (
                <View key={t.id} style={styles.tomaCard}>
                  <View style={styles.tomaIcono}>
                    <MaterialCommunityIcons name="clock-check" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tomaNombre}>{t.nombre}</Text>
                    <Text style={styles.tomaHora}>
                      {formatear12h(t.horaInicio)} — {formatear12h(t.horaFin)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => confirmarEliminar(t)} style={styles.eliminarBtn}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Separador */}
            <View style={styles.separador}>
              <View style={styles.separadorLinea} />
              <Text style={styles.separadorTexto}>Agregar nueva toma</Text>
              <View style={styles.separadorLinea} />
            </View>

            {/* Chips de nombres */}
            <View style={styles.sugeridos}>
              {NOMBRES_SUGERIDOS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chipSugerido, nombre === s && styles.chipSugeridoActivo]}
                  onPress={() => seleccionarNombre(s)}
                >
                  <Text style={[styles.chipTexto, nombre === s && styles.chipTextoActivo]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="Nombre de la toma *"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Mañana, Tarde..."
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            {/* Carruseles */}
            <View style={[styles.timeRow, intentoGuardar && errorOrden && styles.timeRowError]}>
              <TimeSelector
                label="Inicio"
                h12={inicioH12} ampm={inicioAmPm} minIdx={inicioM}
                lockedAmPm={ampmBloqueado}
                onH12Change={setInicioH12}
                onAmPmChange={setInicioAmPm}
                onMinChange={setInicioM}
              />
              <View style={styles.timeDivider}>
                <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textSecondary} />
              </View>
              <TimeSelector
                label="Fin"
                h12={finH12} ampm={finAmPm} minIdx={finM}
                lockedAmPm={ampmBloqueado}
                onH12Change={setFinH12}
                onAmPmChange={setFinAmPm}
                onMinChange={setFinM}
              />
            </View>
            {intentoGuardar && errorOrden && (
              <Text style={styles.errorTexto}>La hora fin debe ser posterior a la hora inicio</Text>
            )}

            <Button
              mode="contained"
              onPress={handleAgregar}
              loading={guardando}
              style={styles.botonAgregar}
              icon="plus"
            >
              Agregar Toma
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>

    <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, maxHeight: '92%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcono: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  vacia: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  vaciaTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  tomaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 10,
    padding: 12, marginBottom: 8, gap: 12,
  },
  tomaIcono: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  tomaNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  tomaHora: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  eliminarBtn: { padding: 4 },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 },
  separadorLinea: { flex: 1, height: 1, backgroundColor: COLORS.border },
  separadorTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  sugeridos: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chipSugerido: {
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surface,
  },
  chipSugeridoActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  chipTextoActivo: { color: COLORS.white, fontWeight: '600' },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },

  // Fila de dos selectores
  timeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 12, paddingHorizontal: 8,
    marginBottom: 4, gap: 4,
  },
  timeRowError: { borderColor: COLORS.danger, backgroundColor: '#FFF5F5' },
  timeDivider: { paddingHorizontal: 2 },

  // TimeSelector
  timeSelectorBox: { flex: 1, alignItems: 'center', gap: 6 },
  timeSelectorLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  timeSelectorRow: { flexDirection: 'row', alignItems: 'center' },
  timeSep: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginHorizontal: 2 },

  // AM/PM toggle
  ampmRow: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  ampmRowBloqueado: { borderColor: COLORS.border, opacity: 0.85 },
  ampmBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: COLORS.surface,
  },
  ampmBtnActivo: { backgroundColor: COLORS.primary },
  ampmBtnInactiva: { backgroundColor: COLORS.background },
  ampmTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  ampmTextoActivo: { color: COLORS.white },
  ampmTextoInactiva: { color: COLORS.border },

  timeValor: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },

  // WheelPicker
  wheelHighlight: {
    position: 'absolute', left: 0, right: 0, height: ITEM_H,
    borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: 'rgba(25, 118, 210, 0.06)', borderRadius: 8,
  },
  wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelTexto: { fontSize: 18, color: COLORS.textSecondary, fontWeight: '400' },
  wheelTextoActivo: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },

  errorTexto: { fontSize: FONT_SIZES.xs, color: COLORS.danger, marginBottom: 8, textAlign: 'center' },
  botonAgregar: { backgroundColor: COLORS.primary, marginTop: 12 },
});
