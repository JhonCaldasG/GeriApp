import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HistorialStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import { formatearFechaHora } from '../../storage';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<HistorialStackParamList, 'ListaHistorial'>;

const TIPO_CONFIG: Record<string, { color: string; bg: string; icono: string }> = {
  Nota: { color: COLORS.primary, bg: '#E3F2FD', icono: 'note-text' },
  Diagnóstico: { color: '#7B1FA2', bg: '#F3E5F5', icono: 'stethoscope' },
  Procedimiento: { color: '#00695C', bg: '#E0F2F1', icono: 'medical-bag' },
  Alergia: { color: COLORS.danger, bg: '#FFEBEE', icono: 'alert-circle' },
  Observación: { color: '#E65100', bg: '#FFF3E0', icono: 'eye' },
};

export default function ListaHistorialScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { registros, cargarRegistros, eliminarRegistro } = useApp();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => cargarRegistros(pacienteId));
    return unsubscribe;
  }, [navigation, pacienteId]);

  const registrosPaciente = registros.filter((r) => r.pacienteId === pacienteId);

  function confirmarEliminar(id: string, titulo: string, fotoUrls?: string[]) {
    ejecutarEliminacion('Eliminar Registro', `¿Desea eliminar "${titulo}"?`, async () => {
      await eliminarRegistro(id, fotoUrls);
      await cargarRegistros(pacienteId);
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color="#7B1FA2" />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      <FlatList
        data={registrosPaciente}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <EmptyState
            icono="clipboard-text-outline"
            titulo="Sin registros médicos"
            subtitulo="Toque el botón + para agregar el primer registro"
          />
        }
        renderItem={({ item }) => {
          const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG['Nota'];
          return (
            <TouchableOpacity
              style={[styles.registroCard, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('DetalleRegistro', { registroId: item.id, pacienteNombre })}
              activeOpacity={0.75}
            >
              <View style={[styles.registroIcono, { backgroundColor: cfg.bg }]}>
                <MaterialCommunityIcons name={cfg.icono as any} size={22} color={cfg.color} />
              </View>
              <View style={styles.registroInfo}>
                <View style={styles.registroTituloFila}>
                  <Text style={styles.registroTitulo}>{item.titulo}</Text>
                  <Chip
                    compact
                    style={[styles.chipTipo, { backgroundColor: cfg.bg }]}
                    textStyle={[styles.chipTipoTexto, { color: cfg.color }]}
                  >
                    {item.tipo}
                  </Chip>
                </View>
                <Text style={styles.registroDescripcion}>{item.descripcion}</Text>
                <View style={styles.registroMeta}>
                  {item.registradoPor ? (
                    <Text style={styles.registradoPor}>Por: {item.registradoPor}</Text>
                  ) : null}
                  <Text style={styles.registroFecha}>{formatearFechaHora(item.createdAt)}</Text>
                </View>
              </View>
              {isAdmin && (
                <IconButton
                  icon="delete-outline"
                  iconColor={COLORS.danger}
                  size={18}
                  onPress={(e) => { e.stopPropagation?.(); confirmarEliminar(item.id, item.titulo, item.fotoUrls); }}
                />
              )}
            </TouchableOpacity>
          );
        }}
      />

      <FAB
        icon="plus"
        label="Agregar Registro"
        style={styles.fab}
        onPress={() => navigation.navigate('AgregarRegistro', { pacienteId, pacienteNombre })}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pacienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#7B1FA2' },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  registroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    gap: 12,
  },
  registroIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registroInfo: { flex: 1 },
  registroTituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  registroTitulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  chipTipo: {},
  chipTipoTexto: { fontSize: 10, fontWeight: '700', lineHeight: 14 },
  registroDescripcion: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  registroMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  registradoPor: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  registroFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: '#7B1FA2' },
});
