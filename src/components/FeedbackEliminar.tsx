import React from 'react';
import { View, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES } from '../theme';

interface Props {
  eliminando: boolean;
  exito: boolean;
}

export default function FeedbackEliminar({ eliminando, exito }: Props) {
  return (
    <>
      <Modal transparent visible={eliminando} animationType="fade" statusBarTranslucent>
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Por favor, espera...</Text>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={exito} animationType="fade" statusBarTranslucent>
        <View style={styles.toastOverlay} pointerEvents="none">
          <View style={styles.toastBox}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.toastText}>Eliminado con éxito</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 14,
    elevation: 8,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toastOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 64,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    elevation: 6,
  },
  toastText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_SIZES.sm,
  },
});
