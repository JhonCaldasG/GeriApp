import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES } from '../theme';

interface Props {
  hora24: string;
  onChange: (h: string) => void;
}

const PRESETS = [
  { label: 'Madrugada', hora: '06:00' },
  { label: 'Mañana',    hora: '08:00' },
  { label: 'Mediodía',  hora: '12:00' },
  { label: 'Tarde',     hora: '16:00' },
  { label: 'Noche',     hora: '20:00' },
  { label: 'Dormir',    hora: '22:00' },
];

function horaToDate(hora24: string): Date {
  const [h, m] = hora24.split(':').map(Number);
  const d = new Date();
  d.setHours(isNaN(h) ? 8 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

function dateToHora24(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDisplay(hora24: string): string {
  const [h, m] = hora24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
}

export default function HoraInicioSelector({ hora24, onChange }: Props) {
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const date = horaToDate(hora24);

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setMostrarPicker(false);
    if (selected) onChange(dateToHora24(selected));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hora de inicio</Text>

      {/* Presets */}
      <View style={styles.presetsRow}>
        {PRESETS.map(p => {
          const activo = hora24 === p.hora;
          return (
            <TouchableOpacity
              key={p.hora}
              style={[styles.preset, activo && styles.presetActivo]}
              onPress={() => onChange(p.hora)}
            >
              <Text style={[styles.presetHora, activo && styles.presetTextoActivo]}>{p.hora}</Text>
              <Text style={[styles.presetLabel, activo && styles.presetTextoActivo]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* iOS: spinner inline siempre visible */}
      {Platform.OS === 'ios' && (
        <DateTimePicker
          value={date}
          mode="time"
          display="spinner"
          onChange={handleChange}
          locale="es-AR"
          style={styles.iosPicker}
          textColor={COLORS.textPrimary}
        />
      )}

      {/* Android: botón que abre el modal nativo */}
      {Platform.OS === 'android' && (
        <>
          <TouchableOpacity style={styles.androidBtn} onPress={() => setMostrarPicker(true)}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
            <Text style={styles.androidHora}>{formatDisplay(hora24)}</Text>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {mostrarPicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={handleChange}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.background, padding: 14, marginBottom: 12, gap: 12,
  },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, minWidth: 66,
  },
  presetActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  presetHora: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  presetLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  presetTextoActivo: { color: '#fff' },
  iosPicker: { height: 140, marginHorizontal: -6 },
  androidBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  androidHora: { flex: 1, fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary },
});
