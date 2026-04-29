import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuditoriaEntry } from '../../types';
import { obtenerAuditoria } from '../../storage/auditoria';
import { COLORS, FONT_SIZES } from '../../theme';

const ACCION_CONFIG: Record<string, { icono: string; color: string; label: string }> = {
  registrar_signos:  { icono: 'heart-pulse',    color: '#E53935', label: 'Signos registrados' },
  nota_evolucion:    { icono: 'note-text',       color: '#1565C0', label: 'Nota de evolución' },
  signos_alerta:     { icono: 'alert-circle',    color: '#E65100', label: 'Alerta signos' },
  login:             { icono: 'login',           color: '#2E7D32', label: 'Inicio de sesión' },
  logout:            { icono: 'logout',          color: '#607D8B', label: 'Cierre de sesión' },
  admin_medicamento: { icono: 'pill',            color: '#7B1FA2', label: 'Medicamento admin.' },
};

function getConfig(accion: string) {
  return ACCION_CONFIG[accion] ?? { icono: 'information-outline', color: COLORS.textSecondary, label: accion };
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditoriaScreen() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<AuditoriaEntry[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerAuditoria(200);
      setEntries(data);
    } catch { /* silent */ }
    finally { setCargando(false); }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const filtradas = busqueda.trim()
    ? entries.filter(e =>
        e.usuarioNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.detalle ?? '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : entries;

  // Estadísticas rápidas
  const hoy = new Date().toISOString().slice(0, 10);
  const hoyCount = entries.filter(e => e.createdAt.slice(0, 10) === hoy).length;
  const usuarios = new Set(entries.map(e => e.usuarioId)).size;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Resumen */}
      <View style={styles.resumenBar}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: COLORS.primary }]}>{entries.length}</Text>
          <Text style={styles.resumenLabel}>Registros totales</Text>
        </View>
        <View style={styles.resumenDiv} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: '#E65100' }]}>{hoyCount}</Text>
          <Text style={styles.resumenLabel}>Hoy</Text>
        </View>
        <View style={styles.resumenDiv} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: '#2E7D32' }]}>{usuarios}</Text>
          <Text style={styles.resumenLabel}>Usuarios activos</Text>
        </View>
      </View>

      {/* Búsqueda */}
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por usuario, acción o detalle..."
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
        style={styles.busqueda}
        left={<TextInput.Icon icon="magnify" color={COLORS.textSecondary} />}
        right={busqueda ? <TextInput.Icon icon="close" onPress={() => setBusqueda('')} color={COLORS.textSecondary} /> : undefined}
      />

      <FlatList
        data={filtradas}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        onRefresh={cargar}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="shield-search" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>{busqueda ? 'Sin resultados' : 'Sin registros de auditoría'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = getConfig(item.accion);
          return (
            <View style={styles.entryCard}>
              <View style={[styles.entryIcono, { backgroundColor: cfg.color + '20' }]}>
                <MaterialCommunityIcons name={cfg.icono as any} size={18} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryAccion}>{cfg.label}</Text>
                  <Text style={styles.entryFecha}>{formatFechaHora(item.createdAt)}</Text>
                </View>
                <Text style={styles.entryUsuario}>
                  <MaterialCommunityIcons name="account-outline" size={12} color={COLORS.textSecondary} />
                  {' '}{item.usuarioNombre}
                </Text>
                {item.detalle && (
                  <Text style={styles.entryDetalle} numberOfLines={2}>{item.detalle}</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  resumenBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    borderRadius: 14, paddingVertical: 14, elevation: 2,
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenNum: { fontSize: 22, fontWeight: '800' },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  resumenDiv: { width: 1, height: 32, backgroundColor: COLORS.border },
  busqueda: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surface, fontSize: FONT_SIZES.sm,
  },
  lista: { paddingHorizontal: 16, paddingBottom: 20, gap: 8 },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  entryCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, elevation: 1,
  },
  entryIcono: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  entryAccion: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  entryFecha: { fontSize: 10, color: COLORS.textSecondary },
  entryUsuario: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  entryDetalle: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
    marginTop: 4, fontStyle: 'italic',
  },
});
