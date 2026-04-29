import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AdministracionMedicamento } from '../types';
import { useApp } from '../context/AppContext';
import HoraInicioSelector from './HoraInicioSelector';
import { COLORS, FONT_SIZES } from '../theme';

interface Props {
  visible: boolean;
  administracion: AdministracionMedicamento | null;
  onDismiss: () => void;
  onGuardado: () => void;
}

// ── Helpers fecha/hora ────────────────────────────────────────────────────────
function isoToLocal(iso: string): { fecha: string; hora24: string } {
  const d = new Date(iso);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  const h     = String(d.getHours()).padStart(2, '0');
  const m     = String(d.getMinutes()).padStart(2, '0');
  return { fecha: `${day}/${month}/${year}`, hora24: `${h}:${m}` };
}

function localToIso(fecha: string, hora24: string): string | null {
  // fecha: DD/MM/YYYY   hora24: HH:MM
  const partesFecha = fecha.split('/');
  const partesHora  = hora24.split(':');
  if (partesFecha.length !== 3 || partesHora.length !== 2) return null;
  const [day, month, year] = partesFecha.map(Number);
  const [h, m]             = partesHora.map(Number);
  if (!day || !month || !year || isNaN(h) || isNaN(m)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, h, m, 0);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatearFecha(fecha: string): string {
  // Aplica máscara DD/MM/YYYY mientras el usuario escribe
  const solo = fecha.replace(/\D/g, '').slice(0, 8);
  if (solo.length <= 2) return solo;
  if (solo.length <= 4) return `${solo.slice(0, 2)}/${solo.slice(2)}`;
  return `${solo.slice(0, 2)}/${solo.slice(2, 4)}/${solo.slice(4)}`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function EditarAdministracionModal({ visible, administracion, onDismiss, onGuardado }: Props) {
  const { actualizarAdministracion } = useApp();
  const [firmante, setFirmante]   = useState('');
  const [notas, setNotas]         = useState('');
  const [dosis, setDosis]         = useState('');
  const [fecha, setFecha]         = useState('');
  const [hora24, setHora24]       = useState('08:00');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible && administracion) {
      setFirmante(administracion.firmante);
      setNotas(administracion.notas ?? '');
      setDosis(administracion.dosis);
      const { fecha: f, hora24: h } = isoToLocal(administracion.createdAt);
      setFecha(f);
      setHora24(h);
    }
  }, [visible, administracion]);

  async function handleGuardar() {
    if (!administracion) return;
    const iso = localToIso(fecha, hora24);
    if (!iso) {
      Alert.alert('Fecha inválida', 'Verifique que la fecha tenga el formato DD/MM/YYYY correcto.');
      return;
    }
    setGuardando(true);
    await actualizarAdministracion(administracion.id, {
      firmante:  firmante.trim(),
      notas:     notas.trim(),
      dosis:     dosis.trim(),
      createdAt: iso,
    });
    setGuardando(false);
    onGuardado();
  }

  if (!administracion) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcono}>
              <MaterialCommunityIcons name="pencil" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Editar dosis</Text>
              <Text style={styles.subtitulo}>{administracion.medicamentoNombre}</Text>
            </View>
            <TouchableOpacity onPress={onDismiss}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput
              label="Dosis"
              value={dosis}
              onChangeText={setDosis}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            <TextInput
              label="Administrado por"
              value={firmante}
              onChangeText={setFirmante}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            <TextInput
              label="Observaciones"
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={3}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            {/* Sección fecha y hora */}
            <View style={styles.fechaHoraSeccion}>
              <View style={styles.fechaHoraHeader}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={COLORS.primary} />
                <Text style={styles.fechaHoraLabel}>Fecha y hora de administración</Text>
              </View>

              <TextInput
                label="Fecha (DD/MM/YYYY)"
                value={fecha}
                onChangeText={v => setFecha(formatearFecha(v))}
                keyboardType="numeric"
                maxLength={10}
                style={styles.input}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                left={<TextInput.Icon icon="calendar" />}
              />

              <HoraInicioSelector hora24={hora24} onChange={setHora24} />
            </View>

            <View style={styles.botones}>
              <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleGuardar}
                loading={guardando}
                style={[{ flex: 2 }, styles.botonGuardar]}
                icon="content-save"
              >
                Guardar cambios
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, maxHeight: '90%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcono: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.surface, marginBottom: 12 },
  fechaHoraSeccion: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  fechaHoraHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  fechaHoraLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  botonGuardar: { backgroundColor: COLORS.primary },
});
