// src/screens/citas/AgregarCitaScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { guardarCita, actualizarCita, obtenerCitaPorId } from '../../storage/citas';

export default function AgregarCitaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { pacientes } = useApp();
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const pacienteIdInicial = route.params?.pacienteId as string | undefined;
  const citaId = route.params?.citaId as string | undefined;
  const esEdicion = !!citaId;

  const [cargandoCita, setCargandoCita] = useState(esEdicion);
  const [pacienteId, setPacienteId] = useState(pacienteIdInicial ?? '');
  const [especialidad, setEspecialidad] = useState('');
  const [medico, setMedico] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hora, setHora] = useState('09:00');
  const [lugar, setLugar] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!esEdicion) return;
    obtenerCitaPorId(citaId!).then(cita => {
      if (cita) {
        setPacienteId(cita.pacienteId);
        setEspecialidad(cita.especialidad);
        setMedico(cita.medico);
        setFecha(new Date(cita.fecha + 'T12:00:00'));
        setHora(cita.hora);
        setLugar(cita.lugar ?? '');
        setObservaciones(cita.observaciones ?? '');
      }
      setCargandoCita(false);
    }).catch(() => setCargandoCita(false));
  }, [citaId, esEdicion]);

  async function handleGuardar() {
    if (!pacienteId || !especialidad.trim() || !medico.trim()) {
      Alert.alert('Error', 'Paciente, especialidad y médico son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      if (esEdicion) {
        await actualizarCita(citaId!, {
          especialidad: especialidad.trim(),
          medico: medico.trim(),
          fecha: fecha.toISOString().slice(0, 10),
          hora: hora.trim(),
          lugar: lugar.trim(),
          observaciones: observaciones.trim(),
        });
      } else {
        await guardarCita({
          pacienteId,
          especialidad: especialidad.trim(),
          medico: medico.trim(),
          fecha: fecha.toISOString().slice(0, 10),
          hora: hora.trim(),
          lugar: lugar.trim(),
          observaciones: observaciones.trim(),
          estado: 'pendiente',
        });
      }
      showToast('Cita guardada');
      navigation.goBack();
    } catch { Alert.alert('Error', 'No se pudo guardar la cita.'); }
    setGuardando(false);
  }

  const pacientesActivos = pacientes.filter(p => !p.fallecido);

  if (cargandoCita) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!pacienteIdInicial && !esEdicion && (
        <>
          <Text style={styles.label}>Paciente *</Text>
          <View style={styles.selector}>
            {pacientesActivos.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.pacienteChip, pacienteId === p.id && styles.pacienteChipActivo]}
                onPress={() => setPacienteId(p.id)}
              >
                <Text style={[styles.pacienteChipTexto, pacienteId === p.id && { color: '#fff' }]}>
                  {p.nombre} {p.apellido}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TextInput label="Especialidad *" value={especialidad} onChangeText={setEspecialidad} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="Ej: Cardiología, Traumatología" />
      <TextInput label="Médico *" value={medico} onChangeText={setMedico} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="Ej: Dr. García" />

      <Text style={styles.label}>Fecha</Text>
      <TouchableOpacity style={[styles.dateBtn, { backgroundColor: colors.surface }]} onPress={() => setShowDatePicker(true)}>
        <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{fecha.toLocaleDateString('es-AR')}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker value={fecha} mode="date" onChange={(_, d) => { setShowDatePicker(false); if (d) setFecha(d); }} />
      )}

      <TextInput label="Hora (HH:MM)" value={hora} onChangeText={setHora} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="09:00" />
      <TextInput label="Lugar" value={lugar} onChangeText={setLugar} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Observaciones" value={observaciones} onChangeText={setObservaciones} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.btnGuardar} contentStyle={{ height: 52 }}>
        {esEdicion ? 'Guardar cambios' : 'Guardar Cita'}
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pacienteChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  pacienteChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pacienteChipTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  btnGuardar: { backgroundColor: COLORS.primary, borderRadius: 10 },
});
