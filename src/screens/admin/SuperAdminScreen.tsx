import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { HogarConfigItem } from '../../types';
import { COLORS, FONT_SIZES } from '../../theme';

export default function SuperAdminScreen() {
  const navigation = useNavigation<any>();
  const [hogares, setHogares] = useState<HogarConfigItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('hogar_config')
      .select('id, nombre, slug, estado, creado_en:created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const items: HogarConfigItem[] = await Promise.all(
        data.map(async (h: any) => {
          const { count } = await supabase
            .from('pacientes')
            .select('*', { count: 'exact', head: true })
            .eq('hogar_id', h.id);
          return {
            id: h.id,
            nombre: h.nombre,
            slug: h.slug ?? '',
            estado: h.estado ?? 'activo',
            creadoEn: h.creado_en,
            cantidadPacientes: count ?? 0,
          };
        })
      );
      setHogares(items);
    }
  }, []);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  const estadoColor = (estado: string) => {
    if (estado === 'activo') return '#2E7D32';
    if (estado === 'trial') return '#E65100';
    return '#B71C1C';
  };

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={hogares}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <Text style={styles.titulo}>Hogares registrados ({hogares.length})</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('HogarDetalle', { hogarId: item.id, hogarNombre: item.nombre })}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="hospital-building" size={24} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hogarNombre}>{item.nombre}</Text>
              <Text style={styles.hogarSlug}>@{item.slug}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: estadoColor(item.estado) + '20' }]}>
              <Text style={[styles.estadoTexto, { color: estadoColor(item.estado) }]}>
                {item.estado}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.meta}>
              <MaterialCommunityIcons name="account-group" size={13} /> {item.cantidadPacientes} pacientes
            </Text>
            <Text style={styles.meta}>
              Registrado: {new Date(item.creadoEn).toLocaleDateString('es-AR')}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: 16, gap: 12 },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hogarNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  hogarSlug: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  estadoBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', textTransform: 'uppercase' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
});
