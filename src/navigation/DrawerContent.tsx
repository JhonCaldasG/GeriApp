import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useHogar } from '../context/HogarContext';
import { formatearFechaHora } from '../storage';
import { COLORS, FONT_SIZES } from '../theme';

interface ItemMenu {
  name: string;
  label: string;
  icono: string;
  color: string;
}

const ITEMS_COMUNES: ItemMenu[] = [
  { name: 'Inicio',        label: 'Inicio',          icono: 'home',          color: COLORS.primary },
  { name: 'GuardiaRapida', label: 'Guardia Rápida',  icono: 'shield-star',   color: '#00838F' },
  { name: 'Pacientes',     label: 'Pacientes',       icono: 'account-group', color: '#1565C0' },
  { name: 'SignosVitales', label: 'Signos Vitales',  icono: 'heart-pulse',   color: '#AD1457' },
  { name: 'Medicamentos',  label: 'Medicamentos',    icono: 'pill',          color: '#E65100' },
  { name: 'Historial',     label: 'Historial Médico',icono: 'clipboard-text',color: '#1565C0' },
];

const ITEM_ASEO: ItemMenu =
  { name: 'Aseo',          label: 'Aseo y Limpieza', icono: 'broom',         color: '#00695C' };

const ITEMS_ADMIN: ItemMenu[] = [
  { name: 'Turnos',        label: 'Turnos',          icono: 'calendar-clock',color: '#AD1457' },
  { name: 'Usuarios',      label: 'Usuarios',        icono: 'account-cog',   color: '#6A1B9A' },
  { name: 'Auditoria',     label: 'Auditoría',       icono: 'shield-search', color: '#E65100' },
  { name: 'Configuracion', label: 'Configuración',   icono: 'cog',           color: '#37474F' },
];

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { usuario, isAdmin, isAseo, ultimoIngreso, logout } = useAuth();
  const { hogar } = useHogar();
  const insets = useSafeAreaInsets();

  const rutaActiva = props.state.routes[props.state.index]?.name;

  function confirmarLogout() {
    Alert.alert('Cerrar Sesión', '¿Desea cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
    ]);
  }

  function navegar(name: string) {
    props.navigation.navigate(name);
    props.navigation.closeDrawer();
  }

  const soloAseo = isAseo && !isAdmin;

  const items: ItemMenu[] = [
    ...(soloAseo ? [{ name: 'Inicio', label: 'Inicio', icono: 'home', color: COLORS.primary }] : ITEMS_COMUNES),
    ...(isAdmin || isAseo ? [ITEM_ASEO] : []),
    ...(isAdmin ? ITEMS_ADMIN : []),
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>

      {/* ── Cabecera del hogar ── */}
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

      {/* ── Info del usuario ── */}
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

      {/* ── Items del menú ── */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        {items.map(item => {
          const activo = rutaActiva === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.menuItem, activo && { backgroundColor: item.color + '18' }]}
              onPress={() => navegar(item.name)}
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
              {activo && <View style={[styles.activoBorde, { backgroundColor: item.color }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.separador} />

      {/* ── Cerrar sesión ── */}
      <TouchableOpacity style={styles.logoutBoton} onPress={confirmarLogout} activeOpacity={0.7}>
        <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
        <Text style={styles.logoutTexto}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  logoWrapper: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
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

  menuScroll: { flex: 1, paddingTop: 8 },
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

  logoutBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingVertical: 16,
  },
  logoutTexto: { fontSize: FONT_SIZES.md, color: COLORS.danger, fontWeight: '600' },
});
