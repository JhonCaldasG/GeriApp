// src/screens/turnos/HandoverScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { NotaHandover } from '../../types';
import { obtenerUltimoHandover, guardarHandover } from '../../storage/handover';

const TURNOS: { value: NotaHandover['turno']; label: string; horas: string }[] = [
  { value: 'mañana', label: 'Mañana', horas: '07:00 - 15:00' },
  { value: 'tarde', label: 'Tarde', horas: '15:00 - 23:00' },
  { value: 'noche', label: 'Noche', horas: '23:00 - 07:00' },
];

function turnoActual(): NotaHandover['turno'] {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return 'mañana';
  if (h >= 15 && h < 23) return 'tarde';
  return 'noche';
}

export default function HandoverScreen() {
  const { usuario } = useAuth();
  const { colors } = useAppTheme();
  const [ultimaNota, setUltimaNota] = useState<NotaHandover | null>(null);
  const [modo, setModo] = useState<'ver' | 'editar'>('ver');
  const [turno, setTurno] = useState<NotaHandover['turno']>(turnoActual());
  const [novedades, setNovedades] = useState('');
  const [medicamentosEventos, setMedicamentosEventos] = useState('');
  const [pendientes, setPendientes] = useState('');
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(useCallback(() => {
    obtenerUltimoHandover().then(n => setUltimaNota(n));
  }, []));

  async function handleGuardar() {
    if (!usuario) return;
    setGuardando(true);
    try {
      await guardarHandover({
        usuarioId: usuario.id,
        usuarioNombre: `${usuario.nombre} ${usuario.apellido}`,
        turno,
        fecha: new Date().toISOString().slice(0, 10),
        novedades: novedades.trim(),
        medicamentosEventos: medicamentosEventos.trim(),
        pendientesProximoTurno: pendientes.trim(),
      });
      Alert.alert('Guardado', 'Nota de turno guardada correctamente.');
      setModo('ver');
      obtenerUltimoHandover().then(n => setUltimaNota(n));
    } catch {
      Alert.alert('Error', 'No se pudo guardar la nota.');
    }
    setGuardando(false);
  }

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {ultimaNota && modo === 'ver' && (
        <View style={[styles.notaCard, { backgroundColor: colors.surface }]}>
          <View style={styles.notaHeader}>
            <MaterialCommunityIcons name="transfer" size={20} color={COLORS.primary} />
            <Text style={styles.notaTitulo}>Nota del turno anterior</Text>
          </View>
          <Text style={styles.notaMeta}>
            {ultimaNota.usuarioNombre} · Turno {ultimaNota.turno} · {ultimaNota.fecha}
          </Text>
          {ultimaNota.novedades ? (
            <View style={styles.campoBloque}>
              <Text style={styles.campoLabel}>📍 Novedades</Text>
              <Text style={[styles.campoTexto, { color: colors.textPrimary }]}>{ultimaNota.novedades}</Text>
            </View>
          ) : null}
          {ultimaNota.medicamentosEventos ? (
            <View style={styles.campoBloque}>
              <Text style={styles.campoLabel}>💊 Medicamentos / Eventos</Text>
              <Text style={[styles.campoTexto, { color: colors.textPrimary }]}>{ultimaNota.medicamentosEventos}</Text>
            </View>
          ) : null}
          {ultimaNota.pendientesProximoTurno ? (
            <View style={styles.campoBloque}>
              <Text style={styles.campoLabel}>⚠️ Pendientes para el próximo turno</Text>
              <Text style={[styles.campoTexto, { color: colors.textPrimary }]}>{ultimaNota.pendientesProximoTurno}</Text>
            </View>
          ) : null}
        </View>
      )}

      {modo === 'editar' ? (
        <>
          <Text style={styles.seccion}>Mi nota de turno</Text>
          <View style={styles.turnosRow}>
            {TURNOS.map(t => (
              <View key={t.value} style={[styles.turnoChip, turno === t.value && styles.turnoChipActivo]}>
                <Text style={[styles.turnoChipTexto, turno === t.value && { color: '#fff' }]}>{t.label}</Text>
              </View>
            ))}
          </View>
          <TextInput label="Novedades del turno" value={novedades} onChangeText={setNovedades} mode="outlined" multiline numberOfLines={4} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="¿Qué ocurrió durante tu turno?" />
          <TextInput label="Medicamentos / Eventos a destacar" value={medicamentosEventos} onChangeText={setMedicamentosEventos} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="Rechazos, cambios, dosis especiales..." />
          <TextInput label="Pendientes para el próximo turno" value={pendientes} onChangeText={setPendientes} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="Curas, controles, avisos pendientes..." />
          <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.btnGuardar} contentStyle={{ height: 52 }}>Guardar nota de turno</Button>
          <Button mode="text" onPress={() => setModo('ver')} style={{ marginTop: 4 }}>Cancelar</Button>
        </>
      ) : (
        <Button mode="contained" icon="plus" onPress={() => setModo('editar')} style={[styles.btnGuardar, { marginTop: 16 }]} contentStyle={{ height: 52 }}>Crear nota de mi turno</Button>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  notaCard: { borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, gap: 8 },
  notaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notaTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.primary },
  notaMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  campoBloque: { gap: 2 },
  campoLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  campoTexto: { fontSize: FONT_SIZES.sm, lineHeight: 20 },
  seccion: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  turnosRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  turnoChip: { flex: 1, padding: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  turnoChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  turnoChipTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  input: { marginBottom: 10, backgroundColor: 'transparent' },
  btnGuardar: { backgroundColor: COLORS.primary, borderRadius: 10 },
});
