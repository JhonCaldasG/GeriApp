import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image, ScrollView,
  Alert, Modal, Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHogar } from '../context/HogarContext';
import { useDrawer } from '../context/DrawerContext';
import { useNotificaciones } from '../context/NotificacionesContext';
import { formatearFechaHora } from '../storage';
import { COLORS, FONT_SIZES } from '../theme';

const DRAWER_WIDTH = 290;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MenuItem {
  name: string;
  label: string;
  icono: string;
  color: string;
  separator?: boolean;
  badge?: number;
  navTarget?: string;
  rootParams?: Record<string, any>;
}

export default function CustomDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { usuario, isAdmin, isAseo, ultimoIngreso, logout } = useAuth();
  const { noLeidas } = useNotificaciones();
  const { hogar } = useHogar();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  function navegar(name: string, rootScreen?: string, rootParams?: Record<string, any>) {
    closeDrawer();
    setTimeout(() => {
      if (rootScreen) {
        navigation.navigate(name as any, { screen: rootScreen, params: rootParams });
      } else {
        navigation.navigate(name as any);
      }
    }, 50);
  }

  function confirmarLogout() {
    closeDrawer();
    setTimeout(() => {
      Alert.alert('Cerrar Sesión', '¿Desea cerrar sesión?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
      ]);
    }, 300);
  }

  const soloAseo = isAseo && !isAdmin;

  const items: MenuItem[] = [
    { name: 'Inicio',        label: 'Inicio',           icono: 'home',           color: COLORS.primary },
    ...(!soloAseo ? [
      { name: 'Pacientes',     label: 'Pacientes',        icono: 'account-group',  color: '#1565C0', rootScreen: 'ListaPacientes' },
      { name: 'SignosVitales', label: 'Signos Vitales',   icono: 'heart-pulse',    color: '#AD1457', rootScreen: 'PacientesSignos' },
      { name: 'Medicamentos',  label: 'Medicamentos',     icono: 'pill',           color: '#E65100', rootScreen: 'PacientesMedicamentos' },
      { name: 'Historial',     label: 'Historial Médico', icono: 'clipboard-text', color: '#00695C', rootScreen: 'PacientesHistorial' },
      { name: 'Actividades',   label: 'Actividades',      icono: 'gamepad-variant',       color: '#2E7D32', rootScreen: 'PacientesActividades' },
      { name: 'NotasEnfermeria', label: 'Notas de Enfermería', icono: 'notebook-edit-outline', color: '#6A1B9A', navTarget: 'Pacientes', rootScreen: 'ListaPacientes', rootParams: { destino: 'NotasEnfermeria' } },
    ] : []),
    ...(isAdmin || isAseo ? [
      { name: 'Aseo', label: 'Aseo y Limpieza', icono: 'broom', color: '#0277BD', separator: !soloAseo, rootScreen: 'PacientesAseo' },
    ] : []),
    ...(!soloAseo ? [
      { name: 'ClinicaDashboard', label: 'Estado Clínico', icono: 'stethoscope', color: '#C62828', separator: true },
      { name: 'Infracciones', label: 'Infracciones', icono: 'alert-circle-outline', color: '#C62828' },
    ] : []),
    { name: 'Notificaciones', label: 'Notificaciones', icono: 'bell-outline', color: '#1565C0', badge: noLeidas },
    ...(isAdmin ? [
      { name: 'Turnos',        label: 'Turnos Enfermería', icono: 'calendar-clock', color: '#00838F', separator: true },
      { name: 'Usuarios',      label: 'Usuarios',          icono: 'account-cog',   color: '#6A1B9A' },
      { name: 'Configuracion', label: 'Configuración',     icono: 'cog',           color: '#37474F' },
    ] : []),
  ];

  const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index ?? 0]?.name;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={closeDrawer}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX }], paddingBottom: insets.bottom }]}>

        {/* Cabecera hogar */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.logoWrapper}>
            {hogar.logoUri ? (
              <Image source={{ uri: hogar.logoUri }} style={styles.logo} />
            ) : (
              <MaterialCommunityIcons name="hospital-building" size={28} color={COLORS.white} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hogarNombre} numberOfLines={2}>{hogar.nombre || 'Hogar Geriátrico'}</Text>
            {hogar.ciudad ? <Text style={styles.hogarCiudad}>{hogar.ciudad}</Text> : null}
          </View>
        </View>

        {/* Info usuario */}
        <View style={styles.usuarioBar}>
          <View style={styles.usuarioIcono}>
            <MaterialCommunityIcons
              name={isAdmin ? 'shield-account' : isAseo ? 'broom' : 'account-heart'}
              size={20}
              color={COLORS.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.usuarioNombre}>{usuario?.nombre} {usuario?.apellido}</Text>
            <Text style={styles.usuarioRol}>
              {isAdmin ? 'Administrador' : isAseo ? 'Aseo' : 'Enfermero'}
            </Text>
            {ultimoIngreso ? (
              <Text style={styles.usuarioIngreso}>Último ingreso: {formatearFechaHora(ultimoIngreso)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.separador} />

        {/* Menú */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {items.map(item => {
            const activo = currentRoute === item.name;
            return (
              <React.Fragment key={item.name}>
                {item.separator && <View style={styles.separadorMenu} />}
                <TouchableOpacity
                  style={[styles.menuItem, activo && { backgroundColor: item.color + '18' }]}
                  onPress={() => navegar(item.navTarget ?? item.name, (item as any).rootScreen, item.rootParams)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcono, activo && { backgroundColor: item.color + '22' }]}>
                    <MaterialCommunityIcons
                      name={item.icono as any}
                      size={22}
                      color={activo ? item.color : COLORS.textSecondary}
                    />
                  </View>
                  <Text style={[styles.menuLabel, activo && { color: item.color, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                  {item.badge != null && item.badge > 0 && (
                    <View style={[styles.menuBadge, { backgroundColor: item.color }]}>
                      <Text style={styles.menuBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                    </View>
                  )}
                  {activo && <View style={[styles.activoBorde, { backgroundColor: item.color }]} />}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </ScrollView>

        <View style={styles.separador} />

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.logoutBoton} onPress={confirmarLogout} activeOpacity={0.7}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
          <Text style={styles.logoutTexto}>Cerrar Sesión</Text>
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.surface,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingBottom: 16,
  },
  logoWrapper: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logo: { width: 48, height: 48 },
  hogarNombre: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.white },
  hogarCiudad: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  usuarioBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: COLORS.background,
  },
  usuarioIcono: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center',
  },
  usuarioNombre: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  usuarioRol: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600' },
  usuarioIngreso: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },

  separador: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  separadorMenu: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16, marginVertical: 6 },

  scroll: { flex: 1, paddingTop: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    marginHorizontal: 8, marginVertical: 1,
    borderRadius: 12, position: 'relative',
  },
  menuIcono: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, flex: 1 },
  activoBorde: {
    position: 'absolute', right: 12,
    width: 4, height: 24, borderRadius: 2,
  },

  menuBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, marginRight: 8,
  },
  menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  logoutBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingVertical: 16,
  },
  logoutTexto: { fontSize: FONT_SIZES.md, color: COLORS.danger, fontWeight: '600' },
});
