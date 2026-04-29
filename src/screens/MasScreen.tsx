import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../theme';

interface ModuloCard {
  tab: string;
  label: string;
  icono: string;
  color: string;
  bg: string;
  descripcion: string;
}

const MODULOS_COMUNES: ModuloCard[] = [
  { tab: 'Historial', label: 'Historial Médico', icono: 'clipboard-text', color: '#1565C0', bg: '#E3F2FD', descripcion: 'Registros y evolución clínica' },
  { tab: 'Aseo', label: 'Aseo y Limpieza', icono: 'broom', color: '#00695C', bg: '#E0F2F1', descripcion: 'Registro de limpiezas y zonas' },
  { tab: 'Inventario', label: 'Inventario', icono: 'package-variant', color: '#E65100', bg: '#FFF3E0', descripcion: 'Stock de insumos y materiales' },
  { tab: 'Citas', label: 'Citas Médicas', icono: 'calendar-heart', color: '#9C27B0', bg: '#F3E5F5', descripcion: 'Agenda de consultas y estudios' },
  { tab: 'Handover', label: 'Nota de Turno', icono: 'transfer', color: '#6A1B9A', bg: '#EDE7F6', descripcion: 'Entrega de turno entre personal' },
  { tab: 'Mensajes', label: 'Mensajes', icono: 'bulletin-board', color: '#0277BD', bg: '#E1F5FE', descripcion: 'Tablón de anuncios interno' },
  { tab: 'ReportesMensuales', label: 'Reportes', icono: 'file-chart', color: '#1565C0', bg: '#E3F2FD', descripcion: 'Reportes mensuales por paciente' },
  { tab: 'Protocolos', label: 'Protocolos', icono: 'clipboard-list', color: '#B71C1C', bg: '#FFEBEE', descripcion: 'Protocolos de actuación ante emergencias' },
];

const MODULOS_ADMIN: ModuloCard[] = [
  { tab: 'Usuarios', label: 'Gestión de Usuarios', icono: 'account-cog', color: '#6A1B9A', bg: '#F3E5F5', descripcion: 'Crear y administrar usuarios' },
  { tab: 'Configuracion', label: 'Configuración', icono: 'cog', color: '#E65100', bg: '#FFF3E0', descripcion: 'Datos del hogar geriátrico' },
  { tab: 'ListaEspera', label: 'Lista de Espera', icono: 'account-clock', color: '#AD1457', bg: '#FCE4EC', descripcion: 'Pacientes pendientes de ingreso' },
  { tab: 'Asistencia', label: 'Asistencia', icono: 'clipboard-account', color: '#2E7D32', bg: '#E8F5E9', descripcion: 'Control de asistencia del personal' },
  { tab: 'Estadisticas', label: 'Estadísticas', icono: 'chart-bar', color: '#2E7D32', bg: '#E8F5E9', descripcion: 'Métricas globales del hogar' },
];

export default function MasScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();

  const modulos = isAdmin ? [...MODULOS_COMUNES, ...MODULOS_ADMIN] : MODULOS_COMUNES;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
    >
      <Text style={styles.titulo}>Más módulos</Text>
      <Text style={styles.subtitulo}>Acceso rápido a todas las funciones</Text>

      <View style={styles.grid}>
        {modulos.map(m => (
          <TouchableOpacity
            key={m.tab}
            style={[styles.card, { backgroundColor: colors.surface }]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate(m.tab)}
          >
            <View style={[styles.cardIcono, { backgroundColor: m.bg }]}>
              <MaterialCommunityIcons name={m.icono as any} size={32} color={m.color} />
            </View>
            <Text style={[styles.cardLabel, { color: m.color }]}>{m.label}</Text>
            <Text style={styles.cardDesc}>{m.descripcion}</Text>
            <View style={[styles.cardArrow, { backgroundColor: m.bg }]}>
              <MaterialCommunityIcons name="chevron-right" size={16} color={m.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  titulo: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardIcono: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardArrow: {
    alignSelf: 'flex-end',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
