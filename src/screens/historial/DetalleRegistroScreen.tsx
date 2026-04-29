import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity,
  Modal, Dimensions, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HistorialStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatearFechaHora } from '../../storage';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<HistorialStackParamList, 'DetalleRegistro'>;

const TIPO_CONFIG: Record<string, { color: string; bg: string; icono: string }> = {
  Nota:          { color: COLORS.primary, bg: '#E3F2FD', icono: 'note-text' },
  Diagnóstico:   { color: '#7B1FA2',      bg: '#F3E5F5', icono: 'stethoscope' },
  Procedimiento: { color: '#00695C',      bg: '#E0F2F1', icono: 'medical-bag' },
  Alergia:       { color: COLORS.danger,  bg: '#FFEBEE', icono: 'alert-circle' },
  Observación:   { color: '#E65100',      bg: '#FFF3E0', icono: 'eye' },
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function DetalleRegistroScreen({ route }: Props) {
  const { registroId, pacienteNombre } = route.params;
  const { registros } = useApp();
  const registro = registros.find(r => r.id === registroId);

  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  if (!registro) {
    return (
      <View style={styles.centrado}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.noEncontrado}>Registro no encontrado</Text>
      </View>
    );
  }

  const cfg = TIPO_CONFIG[registro.tipo] ?? TIPO_CONFIG['Nota'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Paciente */}
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color="#7B1FA2" />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      {/* Tipo */}
      <View style={[styles.tipoRow, { backgroundColor: cfg.bg }]}>
        <MaterialCommunityIcons name={cfg.icono as any} size={24} color={cfg.color} />
        <Text style={[styles.tipoTexto, { color: cfg.color }]}>{registro.tipo}</Text>
      </View>

      {/* Título */}
      <Text style={styles.titulo}>{registro.titulo}</Text>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="account-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaTexto}>{registro.registradoPor || '—'}</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaTexto}>{formatearFechaHora(registro.createdAt)}</Text>
        </View>
      </View>

      {/* Descripción */}
      <View style={styles.seccion}>
        <Text style={styles.seccionLabel}>Descripción</Text>
        <Text style={styles.descripcion}>{registro.descripcion}</Text>
      </View>

      {/* Fotos */}
      {registro.fotoUrls && registro.fotoUrls.length > 0 && (
        <View style={styles.seccion}>
          <Text style={styles.seccionLabel}>
            Fotografías ({registro.fotoUrls.length})
          </Text>
          <View style={styles.fotosGrid}>
            {registro.fotoUrls.map((url, index) => (
              <TouchableOpacity key={index} onPress={() => setFotoAmpliada(url)} activeOpacity={0.85}>
                <Image source={{ uri: url }} style={styles.fotoThumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Modal foto ampliada */}
      <Modal visible={!!fotoAmpliada} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalFondo}>
          <TouchableOpacity style={styles.modalCerrar} onPress={() => setFotoAmpliada(null)}>
            <MaterialCommunityIcons name="close-circle" size={36} color={COLORS.white} />
          </TouchableOpacity>
          {fotoAmpliada && (
            <Image
              source={{ uri: fotoAmpliada }}
              style={styles.fotoAmpliada}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noEncontrado: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },

  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3E5F5', borderRadius: 10,
    padding: 12, gap: 8, marginBottom: 16,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#7B1FA2' },

  tipoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  tipoTexto: { fontSize: FONT_SIZES.md, fontWeight: '700' },

  titulo: {
    fontSize: FONT_SIZES.lg, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: 12,
  },

  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  seccion: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 16,
  },
  seccionLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  descripcion: {
    fontSize: FONT_SIZES.md, color: COLORS.textPrimary, lineHeight: 24,
  },

  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fotoThumb: {
    width: (SCREEN_W - 32 - 28 - 10) / 3,
    height: (SCREEN_W - 32 - 28 - 10) / 3,
    borderRadius: 10,
  },

  modalFondo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCerrar: {
    position: 'absolute', top: (StatusBar.currentHeight ?? 24) + 12, right: 16, zIndex: 10,
  },
  fotoAmpliada: { width: SCREEN_W, height: SCREEN_H * 0.8 },
});
