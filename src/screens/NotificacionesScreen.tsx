import React, { useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Notificacion, NotificacionTipo } from '../types';
import { useNotificaciones } from '../context/NotificacionesContext';
import { useAppTheme } from '../context/ThemeContext';
import { useEliminar } from '../hooks/useEliminar';
import FeedbackEliminar from '../components/FeedbackEliminar';
import { COLORS, FONT_SIZES } from '../theme';

// ── Config visual por tipo ─────────────────────────────────────────────────────
const TIPO_CONFIG: Record<NotificacionTipo, { icono: string; color: string; etiqueta: string }> = {
  requerimiento_nuevo:      { icono: 'file-document-alert',  color: '#1565C0', etiqueta: 'Requerimiento nuevo' },
  requerimiento_aprobado:   { icono: 'check-circle',          color: '#2E7D32', etiqueta: 'Aprobado' },
  requerimiento_rechazado:  { icono: 'close-circle',          color: '#C62828', etiqueta: 'Rechazado' },
  infraccion_nueva:         { icono: 'alert-circle',          color: '#E65100', etiqueta: 'Infracción' },
  turno_proximo:            { icono: 'calendar-clock',        color: '#00838F', etiqueta: 'Turno' },
  signos_alerta:            { icono: 'heart-pulse',           color: '#C62828', etiqueta: 'Alerta signos' },
  sistema:                  { icono: 'information',           color: '#607D8B', etiqueta: 'Sistema' },
};

function formatTiempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function agruparPorDia(items: Notificacion[]): { titulo: string; data: Notificacion[] }[] {
  const hoy = new Date().toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const grupos: Record<string, Notificacion[]> = {};
  for (const n of items) {
    const dia = n.createdAt.slice(0, 10);
    const key = dia === hoy ? 'Hoy' : dia === ayer ? 'Ayer' : new Date(dia + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(n);
  }
  return Object.entries(grupos).map(([titulo, data]) => ({ titulo, data }));
}

// ── Tarjeta de notificación ────────────────────────────────────────────────────
function NotifCard({ notif, onPress, onEliminar }: {
  notif: Notificacion;
  onPress: () => void;
  onEliminar: () => void;
}) {
  const { colors } = useAppTheme();
  const cfg = TIPO_CONFIG[notif.tipo] ?? TIPO_CONFIG.sistema;

  return (
    <TouchableOpacity
      style={[styles.card, !notif.leida && styles.cardNoLeida, notif.leida && { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={() =>
        Alert.alert('Notificación', '¿Eliminar esta notificación?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: onEliminar },
        ])
      }
      activeOpacity={0.7}
    >
      {/* Icono */}
      <View style={[styles.iconoCirculo, { backgroundColor: cfg.color + '18' }]}>
        <MaterialCommunityIcons name={cfg.icono as any} size={24} color={cfg.color} />
      </View>

      {/* Contenido */}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.etiqueta, { color: cfg.color }]}>{cfg.etiqueta}</Text>
          <Text style={styles.tiempo}>{formatTiempo(notif.createdAt)}</Text>
        </View>
        <Text style={[styles.titulo, !notif.leida && styles.tituloNoLeido]} numberOfLines={1}>
          {notif.titulo}
        </Text>
        <Text style={styles.mensaje} numberOfLines={2}>{notif.mensaje}</Text>
      </View>

      {/* Punto no leído */}
      {!notif.leida && <View style={[styles.puntoBadge, { backgroundColor: cfg.color }]} />}
    </TouchableOpacity>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function NotificacionesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { notificaciones, noLeidas, cargando, cargar, marcarLeida, marcarTodasLeidas, eliminarNotificacion } = useNotificaciones();
  const { eliminando, exito, conFeedback } = useEliminar();

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const grupos = agruparPorDia(notificaciones);

  function handlePress(notif: Notificacion) {
    if (!notif.leida) marcarLeida(notif.id);

    // Navegar a la pantalla relevante si hay datos
    if (notif.datos?.incumplimientoId) {
      navigation.navigate('Infracciones');
    }
  }

  if (notificaciones.length === 0 && !cargando) {
    return (
      <View style={[styles.vacio, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="bell-off-outline" size={64} color={COLORS.border} />
        <Text style={styles.vacioTexto}>Sin notificaciones</Text>
        <Text style={styles.vacioSub}>Aquí aparecerán los avisos importantes del sistema</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      {/* Barra superior */}
      {noLeidas > 0 && (
        <View style={styles.barraSuperior}>
          <Text style={styles.barraTexto}>{noLeidas} sin leer</Text>
          <TouchableOpacity onPress={marcarTodasLeidas} style={styles.barraBoton}>
            <MaterialCommunityIcons name="check-all" size={16} color={COLORS.primary} />
            <Text style={styles.barraBotonTexto}>Marcar todas leídas</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={grupos}
        keyExtractor={g => g.titulo}
        contentContainerStyle={styles.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
        renderItem={({ item: grupo }) => (
          <View>
            <Text style={styles.grupoDia}>{grupo.titulo}</Text>
            {grupo.data.map(notif => (
              <NotifCard
                key={notif.id}
                notif={notif}
                onPress={() => handlePress(notif)}
                onEliminar={() => conFeedback(() => eliminarNotificacion(notif.id))}
              />
            ))}
          </View>
        )}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  barraSuperior: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  barraTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  barraBoton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barraBotonTexto: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },

  lista: { padding: 16, gap: 4 },

  grupoDia: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 14,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardNoLeida: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },

  iconoCirculo: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },

  etiqueta: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tiempo: { fontSize: 10, color: COLORS.textSecondary },
  titulo: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginBottom: 3 },
  tituloNoLeido: { fontWeight: '700' },
  mensaje: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 17 },

  puntoBadge: {
    width: 9, height: 9, borderRadius: 5,
    flexShrink: 0, marginTop: 4,
  },

  vacio: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background, gap: 8, paddingHorizontal: 32,
  },
  vacioTexto: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textSecondary, marginTop: 8 },
  vacioSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
