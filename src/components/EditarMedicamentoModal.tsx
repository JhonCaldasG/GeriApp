import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Medicamento } from '../types';
import { useApp } from '../context/AppContext';
import HoraInicioSelector from './HoraInicioSelector';
import { COLORS, FONT_SIZES } from '../theme';

function horasEntreDosisDe(frecuencia: string): number | null {
  const f = frecuencia.toLowerCase().trim();
  if (f.includes('4 hora')) return 4;
  if (f.includes('6 hora')) return 6;
  if (f.includes('8 hora')) return 8;
  if (f.includes('12 hora')) return 12;
  if (f === 'una vez al día' || f === 'una vez al dia') return 24;
  if (f.includes('dos veces')) return 12;
  if (f.includes('tres veces')) return 8;
  return null;
}

function formatear12h(hora24: string): string {
  const [h, m] = hora24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calcularHorasDosis(horaInicio: string, frecuencia: string): string[] {
  if (!horaInicio || !horaInicio.includes(':')) return [];
  const [h, m] = horaInicio.split(':').map(Number);
  const inicioMin = h * 60 + m;
  const intervalo = horasEntreDosisDe(frecuencia);
  if (!intervalo) return [horaInicio];
  const count = Math.round(24 / intervalo);
  return Array.from({ length: count }, (_, i) => {
    const total = (inicioMin + i * intervalo * 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  });
}

const FRECUENCIAS = [
  'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas',
  'Cada 12 horas', 'Una vez al día', 'Dos veces al día',
  'Tres veces al día', 'Según necesidad',
];
const VIAS = ['Oral', 'Intravenosa', 'Intramuscular', 'Subcutánea', 'Tópica', 'Inhalatoria', 'Sublingual'];

interface Props {
  visible: boolean;
  medicamento: Medicamento | null;
  pacienteNombre: string;
  onDismiss: () => void;
  onGuardado: () => void;
}

export default function EditarMedicamentoModal({ visible, medicamento, pacienteNombre, onDismiss, onGuardado }: Props) {
  const { editarMedicamento } = useApp();
  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [horario, setHorario] = useState('');
  const [via, setVia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible && medicamento) {
      setNombre(medicamento.nombre);
      setDosis(medicamento.dosis);
      setFrecuencia(medicamento.frecuencia);
      setHorario(medicamento.horario && medicamento.horario.match(/^\d{2}:\d{2}$/) ? medicamento.horario : '08:00');
      setVia(medicamento.viaAdministracion);
      setObservaciones(medicamento.observaciones);
      setActivo(medicamento.activo);
    }
  }, [visible, medicamento]);

  async function handleGuardar() {
    if (!nombre.trim() || !dosis.trim()) return;
    setGuardando(true);
    await editarMedicamento(medicamento!.id, {
      nombre: nombre.trim(),
      dosis: dosis.trim(),
      frecuencia: frecuencia.trim(),
      horario: horario.trim(),
      viaAdministracion: via.trim(),
      observaciones: observaciones.trim(),
      activo,
    });
    setGuardando(false);
    onGuardado();
  }

  if (!medicamento) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerIcono}>
                <MaterialCommunityIcons name="pill" size={22} color={COLORS.warningLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>Editar Medicamento</Text>
                <Text style={styles.subtitulo}>{pacienteNombre}</Text>
              </View>
              <TouchableOpacity onPress={onDismiss}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
              <TextInput
                label="Nombre del Medicamento *"
                value={nombre}
                onChangeText={setNombre}
                style={styles.input}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />
              <TextInput
                label="Dosis *"
                value={dosis}
                onChangeText={setDosis}
                style={styles.input}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.subLabel}>Frecuencia</Text>
              <View style={styles.chipGrid}>
                {FRECUENCIAS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, frecuencia === f && styles.chipActivo]}
                    onPress={() => setFrecuencia(frecuencia === f ? '' : f)}
                  >
                    <Text style={[styles.chipTexto, frecuencia === f && styles.chipTextoActivo]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                label="O escriba la frecuencia"
                value={frecuencia}
                onChangeText={setFrecuencia}
                style={styles.input}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <HoraInicioSelector hora24={horario} onChange={setHorario} />
              {frecuencia ? (() => {
                const dosis = calcularHorasDosis(horario, frecuencia);
                if (dosis.length <= 1) return null;
                return (
                  <View style={styles.dosisPreview}>
                    <Text style={styles.dosisPreviewLabel}>Dosis calculadas</Text>
                    {dosis.map((h, i) => (
                      <Text key={i} style={styles.dosisPreviewHoras}>
                        Dosis {i + 1}:  {formatear12h(h)}
                      </Text>
                    ))}
                  </View>
                );
              })() : null}

              <Text style={styles.subLabel}>Vía de Administración</Text>
              <View style={styles.chipGrid}>
                {VIAS.map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, via === v && styles.chipActivo]}
                    onPress={() => setVia(via === v ? '' : v)}
                  >
                    <Text style={[styles.chipTexto, via === v && styles.chipTextoActivo]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                label="Observaciones"
                value={observaciones}
                onChangeText={setObservaciones}
                multiline
                numberOfLines={2}
                style={styles.input}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              {/* Estado activo/inactivo */}
              <TouchableOpacity
                style={[styles.estadoBoton, activo ? styles.estadoActivo : styles.estadoInactivo]}
                onPress={() => setActivo(!activo)}
              >
                <MaterialCommunityIcons
                  name={activo ? 'check-circle' : 'close-circle'}
                  size={20}
                  color={activo ? COLORS.secondaryLight : COLORS.textSecondary}
                />
                <Text style={[styles.estadoTexto, { color: activo ? COLORS.secondaryLight : COLORS.textSecondary }]}>
                  {activo ? 'Medicamento activo' : 'Medicamento inactivo'}
                </Text>
              </TouchableOpacity>

              <View style={styles.botones}>
                <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>Cancelar</Button>
                <Button
                  mode="contained"
                  onPress={handleGuardar}
                  loading={guardando}
                  style={[{ flex: 2 }, styles.botonGuardar]}
                  icon="content-save"
                >
                  Guardar Cambios
                </Button>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcono: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  input: { marginBottom: 10, backgroundColor: COLORS.surface },
  subLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surface,
  },
  chipActivo: { backgroundColor: COLORS.warningLight, borderColor: COLORS.warningLight },
  chipTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textPrimary },
  chipTextoActivo: { color: COLORS.white, fontWeight: '600' },
  estadoBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1,
  },
  estadoActivo: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  estadoInactivo: { backgroundColor: '#F5F5F5', borderColor: COLORS.border },
  estadoTexto: { fontSize: FONT_SIZES.sm, fontWeight: '600' },
  botones: { flexDirection: 'row', gap: 10 },
  botonGuardar: { backgroundColor: COLORS.warningLight },
  dosisPreview: {
    backgroundColor: '#E3F2FD', borderRadius: 10,
    padding: 10, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  dosisPreviewLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  dosisPreviewHoras: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
});
