import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Share } from 'react-native';
import { Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Paciente } from '../types';
import { COLORS, FONT_SIZES } from '../theme';
import { calcularEdad } from '../storage';

interface Props {
  visible: boolean;
  paciente: Paciente | null;
  onDismiss: () => void;
}

export default function QRCodigoModal({ visible, paciente, onDismiss }: Props) {
  if (!paciente) return null;

  const edad = calcularEdad(paciente.fechaNacimiento);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcono}>
              <MaterialCommunityIcons name="qrcode" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Código QR del Paciente</Text>
              <Text style={styles.subtitulo}>Escanear para acceder al perfil</Text>
            </View>
            <TouchableOpacity onPress={onDismiss}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Info paciente */}
          <View style={styles.pacienteInfo}>
            <Text style={styles.pacienteNombre}>{paciente.nombre} {paciente.apellido}</Text>
            <Text style={styles.pacienteDatos}>
              ID: {paciente.dni}  •  {edad} años  •  Hab. {paciente.habitacion}
            </Text>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <QRCode
              value={`hogargeriatrico://paciente/${paciente.id}`}
              size={220}
              color={COLORS.textPrimary}
              backgroundColor={COLORS.white}
            />
          </View>

          <Text style={styles.nota}>
            Presente este código al enfermero para registrar signos vitales o medicamentos.
          </Text>

          <TouchableOpacity style={styles.botonCerrar} onPress={onDismiss}>
            <Text style={styles.botonCerrarTexto}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  headerIcono: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  pacienteInfo: { alignItems: 'center', gap: 4 },
  pacienteNombre: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary },
  pacienteDatos: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  qrContainer: {
    padding: 16, backgroundColor: COLORS.white,
    borderRadius: 16, elevation: 2,
    borderWidth: 1, borderColor: COLORS.border,
  },
  nota: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 18,
  },
  botonCerrar: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 12, marginTop: 4,
  },
  botonCerrarTexto: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },
});
