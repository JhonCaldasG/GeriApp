import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS, FONT_SIZES, SIGNO_RANGOS } from '../theme';

type SignoKey = keyof typeof SIGNO_RANGOS;

interface SignoBadgeProps {
  label: string;
  valor: string;
  unidad: string;
  signoKey?: SignoKey;
  compact?: boolean;
}

function evaluarEstado(valor: string, signoKey?: SignoKey): 'normal' | 'caution' | 'alert' | 'empty' {
  if (!valor || valor.trim() === '') return 'empty';
  if (!signoKey) return 'normal';
  const num = parseFloat(valor);
  if (isNaN(num)) return 'empty';
  const rangos = SIGNO_RANGOS[signoKey];
  if (num >= rangos.normal[0] && num <= rangos.normal[1]) return 'normal';
  if (num >= rangos.caution[0] && num <= rangos.caution[1]) return 'caution';
  return 'alert';
}

const ESTADO_COLORES = {
  normal: { bg: '#E8F5E9', text: COLORS.success, border: '#A5D6A7' },
  caution: { bg: '#FFF3E0', text: COLORS.warning, border: '#FFCC80' },
  alert: { bg: '#FFEBEE', text: COLORS.danger, border: '#EF9A9A' },
  empty: { bg: '#F5F5F5', text: COLORS.textSecondary, border: COLORS.border },
};

export default function SignoBadge({ label, valor, unidad, signoKey, compact }: SignoBadgeProps) {
  const estado = evaluarEstado(valor, signoKey);
  const colores = ESTADO_COLORES[estado];

  return (
    <View style={[styles.container, { backgroundColor: colores.bg, borderColor: colores.border }, compact && styles.compact]}>
      <Text style={[styles.label, { color: COLORS.textSecondary }]}>{label}</Text>
      <Text style={[styles.valor, { color: colores.text }]}>
        {valor || '—'} <Text style={styles.unidad}>{valor ? unidad : ''}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    minWidth: 90,
    flex: 1,
  },
  compact: {
    padding: 8,
    minWidth: 70,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valor: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  unidad: {
    fontSize: FONT_SIZES.xs,
    fontWeight: 'normal',
  },
});
