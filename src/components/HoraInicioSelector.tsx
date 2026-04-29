import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS, FONT_SIZES } from '../theme';

type AmPm = 'AM' | 'PM';

const HORAS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // 01..12
const MINUTOS  = ['00', '15', '30', '45'];
const ITEM_H   = 44;
const VISIBLE  = 5;
const PADDING  = ITEM_H * Math.floor(VISIBLE / 2);

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

// ── WheelPicker ───────────────────────────────────────────────────────────────
interface WheelProps {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  width: number;
}

function WheelPicker({ items, selectedIndex, onSelect, width }: WheelProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
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
      <View pointerEvents="none" style={[styles.highlight, { top: ITEM_H * Math.floor(VISIBLE / 2) }]} />
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
              style={styles.item}
              onPress={() => {
                onSelect(i);
                ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.itemTexto, activo && styles.itemTextoActivo]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── HoraInicioSelector ────────────────────────────────────────────────────────
interface Props {
  hora24: string;           // "HH:MM" en 24h — formato interno de almacenamiento
  onChange: (h: string) => void;
}

export default function HoraInicioSelector({ hora24, onChange }: Props) {
  const partes = hora24?.split(':') ?? ['08', '00'];
  const h24    = Math.min(23, Math.max(0, parseInt(partes[0] ?? '8', 10)));
  const mRaw   = partes[1] ?? '00';
  const mIdx   = Math.max(0, MINUTOS.indexOf(mRaw));

  const { h12, ampm } = from24(h24);
  const hIdx = h12 - 1; // HORAS_12[0] = '01' → h12=1

  function onHoraChange(i: number) {
    const h24nuevo = to24(i + 1, ampm);
    onChange(`${String(h24nuevo).padStart(2, '0')}:${MINUTOS[mIdx]}`);
  }

  function onMinChange(i: number) {
    onChange(`${String(to24(h12, ampm)).padStart(2, '0')}:${MINUTOS[i]}`);
  }

  function onAmPmChange(v: AmPm) {
    const h24nuevo = to24(h12, v);
    onChange(`${String(h24nuevo).padStart(2, '0')}:${MINUTOS[mIdx]}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hora de inicio</Text>
      <View style={styles.row}>
        <WheelPicker
          items={HORAS_12}
          selectedIndex={hIdx}
          onSelect={onHoraChange}
          width={70}
        />
        <Text style={styles.sep}>:</Text>
        <WheelPicker
          items={MINUTOS}
          selectedIndex={mIdx}
          onSelect={onMinChange}
          width={70}
        />
      </View>

      {/* Toggle AM / PM */}
      <View style={styles.ampmRow}>
        {(['AM', 'PM'] as AmPm[]).map(v => (
          <TouchableOpacity
            key={v}
            style={[styles.ampmBtn, ampm === v && styles.ampmBtnActivo]}
            onPress={() => onAmPmChange(v)}
          >
            <Text style={[styles.ampmTexto, ampm === v && styles.ampmTextoActivo]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.valor}>
        {HORAS_12[hIdx]}:{MINUTOS[mIdx]} {ampm}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  sep: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginHorizontal: 4 },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemTexto: { fontSize: 18, color: COLORS.textSecondary, fontWeight: '400' },
  itemTextoActivo: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  highlight: {
    position: 'absolute', left: 0, right: 0, height: ITEM_H,
    borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: 'rgba(25,118,210,0.06)', borderRadius: 8,
  },
  ampmRow: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ampmBtn: { paddingHorizontal: 20, paddingVertical: 6, backgroundColor: COLORS.surface },
  ampmBtnActivo: { backgroundColor: COLORS.primary },
  ampmTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  ampmTextoActivo: { color: COLORS.white },
  valor: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
});
