import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZES } from '../theme';

interface Props {
  visible: boolean;
  titulo: string;
  resumen: string;
  onConfirmar: (firmante: string) => void;
  onCancelar: () => void;
}

export default function FirmaModal({ visible, titulo, resumen, onConfirmar, onCancelar }: Props) {
  const { usuario } = useAuth();
  const firma = usuario ? `${usuario.nombre} ${usuario.apellido}` : '';

  function handleConfirmar() {
    onConfirmar(firma);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancelar}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.headerIcono}>
              <MaterialCommunityIcons name="draw-pen" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Firma Digital</Text>
              <Text style={styles.subtitulo}>{titulo}</Text>
            </View>
            <TouchableOpacity onPress={onCancelar}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Resumen de lo que se guarda */}
          <View style={styles.resumenCard}>
            <Text style={styles.resumenLabel}>Resumen del registro:</Text>
            <Text style={styles.resumenTexto}>{resumen}</Text>
          </View>

          {/* Campo de firma */}
          <Text style={styles.firmaLabel}>
            Al confirmar, certifica que los datos son correctos y asume responsabilidad del registro.
          </Text>

          <View style={styles.firmanteCard}>
            <MaterialCommunityIcons name="draw-pen" size={22} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.firmanteLabel}>Firmante</Text>
              <Text style={styles.firmanteNombre}>{firma}</Text>
            </View>
            <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.secondaryLight} />
          </View>

          {/* Botones */}
          <View style={styles.botones}>
            <Button mode="outlined" onPress={onCancelar} style={styles.botonCancelar}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmar}
              style={styles.botonFirmar}
              icon="check-circle"
            >
              Confirmar y Firmar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  resumenCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  resumenLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  resumenTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  firmaLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  firmanteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  firmanteLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.secondary, textTransform: 'uppercase', marginBottom: 2 },
  firmanteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  botones: { flexDirection: 'row', gap: 10 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonFirmar: { flex: 2, backgroundColor: COLORS.primary },
});
