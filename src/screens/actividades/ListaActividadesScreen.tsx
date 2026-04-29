import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActividadesStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import { formatearFechaHora } from '../../storage';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { COLORS, FONT_SIZES } from '../../theme';
import VisorFotoModal from '../../components/VisorFotoModal';

type Props = NativeStackScreenProps<ActividadesStackParamList, 'ListaActividades'>;

const TIPO_CONFIG: Record<string, { color: string; bg: string; icono: string }> = {
  'Lúdica':     { color: '#E65100', bg: '#FFF3E0', icono: 'puzzle' },
  'Taller':     { color: '#1565C0', bg: '#E3F2FD', icono: 'hammer-wrench' },
  'Recreativa': { color: '#2E7D32', bg: '#E8F5E9', icono: 'soccer' },
  'Física':     { color: '#AD1457', bg: '#FCE4EC', icono: 'run' },
  'Cultural':   { color: '#6A1B9A', bg: '#F3E5F5', icono: 'palette' },
  'Social':     { color: '#00695C', bg: '#E0F2F1', icono: 'account-group' },
  'Otra':       { color: '#546E7A', bg: '#ECEFF1', icono: 'star-outline' },
};

export default function ListaActividadesScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { actividades, cargarActividades, eliminarActividad } = useApp();
  const { isAdmin } = useAuth();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [visor, setVisor] = useState<{ fotos: string[]; indice: number } | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => cargarActividades(pacienteId));
    return unsubscribe;
  }, [navigation, pacienteId]);

  const lista = actividades.filter(a => a.pacienteId === pacienteId);

  function confirmarEliminar(id: string) {
    ejecutarEliminacion('Eliminar actividad', '¿Desea eliminar este registro?', async () => {
      await eliminarActividad(id);
      await cargarActividades(pacienteId);
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <EmptyState
            icono="gamepad-variant-outline"
            titulo="Sin actividades registradas"
            subtitulo="Toque el botón + para registrar la primera actividad"
          />
        }
        renderItem={({ item }) => {
          const cfg = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG['Otra'];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.tipoIcono, { backgroundColor: cfg.bg }]}>
                  <MaterialCommunityIcons name={cfg.icono as any} size={22} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNombre}>{item.nombre}</Text>
                  <View style={styles.cardRow}>
                    <View style={[styles.tipoBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.tipoBadgeTexto, { color: cfg.color }]}>{item.tipo}</Text>
                    </View>
                  </View>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => confirmarEliminar(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>

              {item.descripcion ? (
                <Text style={styles.cardDescripcion}>{item.descripcion}</Text>
              ) : null}

              {item.fotoUrls?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosRow}>
                  {item.fotoUrls.map((url, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setVisor({ fotos: item.fotoUrls, indice: i })}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: url }} style={styles.fotoThumb} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>Por: {item.realizadoPor || '—'}</Text>
                <Text style={styles.cardMeta}>{formatearFechaHora(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
      />

      <FAB
        icon="plus"
        label="Registrar actividad"
        style={styles.fab}
        onPress={() => navigation.navigate('RegistrarActividad', { pacienteId, pacienteNombre })}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />

      {visor && (
        <VisorFotoModal
          fotos={visor.fotos}
          indiceInicial={visor.indice}
          onDismiss={() => setVisor(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', margin: 16, marginBottom: 8,
    borderRadius: 10, padding: 12, gap: 8,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 1,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipoIcono: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  tipoBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2,
  },
  tipoBadgeTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  cardDescripcion: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  fotosRow: { marginTop: 2 },
  fotoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: '#00695C' },
});
