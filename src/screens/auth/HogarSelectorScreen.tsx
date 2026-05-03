import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { getMyHogares, HogarItem, setStoredSlug } from '../../storage/hogar';
import { useAuth } from '../../context/AuthContext';
import { useHogar } from '../../context/HogarContext';
import { COLORS, FONT_SIZES } from '../../theme';

export default function HogarSelectorScreen() {
  const insets                    = useSafeAreaInsets();
  const navigation                = useNavigation<any>();
  const { completeLogin, logout } = useAuth();
  const { cargarHogar }           = useHogar();

  const [list, setList]           = useState<HogarItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [userName, setUserName]   = useState('');
  const [autoSelected, setAutoSelected] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserName(session.user.email.split('@')[0]);
      }
      const items = await getMyHogares();
      setList(items);
    } catch {
      setError('No se pudieron cargar tus hogares. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-seleccionar si hay exactamente un hogar
  useEffect(() => {
    if (!loading && list.length === 1 && !autoSelected && selecting === null) {
      setAutoSelected(true);
      selectHogar(list[0]);
    }
  }, [loading, list, autoSelected, selecting]);

  async function selectHogar(item: HogarItem) {
    setSelecting(item.id);
    setError('');
    try {
      await setStoredSlug(item.slug);
      // Tell the auth hook which hogar the user selected, then force a JWT
      // refresh so it re-injects hogar_id = item.id in the new token.
      // Without this, all RLS queries return data from the hogar that was
      // encoded in the original JWT (whichever record the hook picked first).
      await supabase.auth.updateUser({ data: { active_hogar_id: item.id } });
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      await cargarHogar();
      const ok = await completeLogin();
      if (!ok) setError('No se pudo inicializar tu sesión. Intenta de nuevo.');
    } catch {
      setError('Error al seleccionar el hogar. Intenta de nuevo.');
    } finally {
      setSelecting(null);
    }
  }

  function handleLogout() {
    logout();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
        <ActivityIndicator size="large" color={COLORS.white} />
        <Text style={styles.loadingText}>Cargando tus hogares...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatarWrap}>
          <MaterialCommunityIcons name="account-circle-outline" size={44} color={COLORS.white} />
        </View>
        <Text style={styles.greeting}>Hola, {userName || 'usuario'}</Text>
        <Text style={styles.subtitle}>
          {list.length > 1
            ? '¿En qué hogar trabajarás hoy?'
            : list.length === 1
            ? 'Iniciando tu sesión...'
            : 'No se encontraron hogares'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {list.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, selecting === item.id && styles.cardSelected]}
            onPress={() => selectHogar(item)}
            activeOpacity={0.85}
            disabled={selecting !== null}
          >
            <View style={styles.cardIcon}>
              {item.logoUri ? (
                <Image source={{ uri: item.logoUri }} style={styles.logo} />
              ) : (
                <MaterialCommunityIcons name="hospital-building" size={28} color={COLORS.primary} />
              )}
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={1}>{item.nombre}</Text>
              {item.ciudad ? (
                <View style={styles.cityRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.cityText}>{item.ciudad}</Text>
                </View>
              ) : null}
              <View style={[
                styles.roleBadge,
                item.rol === 'admin' || item.rol === 'superadmin'
                  ? styles.roleBadgeAdmin
                  : styles.roleBadgeNurse,
              ]}>
                <Text style={[
                  styles.roleBadgeText,
                  item.rol === 'admin' || item.rol === 'superadmin'
                    ? styles.roleBadgeTextAdmin
                    : styles.roleBadgeTextNurse,
                ]}>
                  {item.rol === 'superadmin' ? 'Super admin'
                    : item.rol === 'admin' ? 'Administrador'
                    : 'Enfermero'}
                </Text>
              </View>
            </View>

            <View style={styles.chevron}>
              {selecting === item.id ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
              )}
            </View>
          </TouchableOpacity>
        ))}

        {list.length === 0 && !error && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="hospital-building" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>
              No tienes hogares asociados a esta cuenta.{'\n'}
              Verifica que el correo sea el correcto o registra un nuevo hogar.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <MaterialCommunityIcons name="logout" size={16} color={COLORS.textSecondary} />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D47A1' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: COLORS.white, fontSize: FONT_SIZES.sm, opacity: 0.8 },

  header: {
    alignItems: 'center', paddingHorizontal: 32, paddingBottom: 32, gap: 6,
  },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', marginBottom: 4,
  },
  greeting: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  subtitle: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  listContent: {
    backgroundColor: '#F5F6FA',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 28, flexGrow: 1,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16, flexDirection: 'row', alignItems: 'center',
    padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '06' },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, overflow: 'hidden',
  },
  logo: { width: 52, height: 52 },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cityText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, marginTop: 2,
  },
  roleBadgeAdmin: { backgroundColor: COLORS.primary + '15' },
  roleBadgeNurse: { backgroundColor: '#059669' + '15' },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
  roleBadgeTextAdmin: { color: COLORS.primary },
  roleBadgeTextNurse: { color: '#059669' },
  chevron: { paddingLeft: 8, width: 32, alignItems: 'center' },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF0F0', borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#FFD0D0',
  },
  errorText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.danger, lineHeight: 18 },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  emptyText: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 16, marginTop: 8,
  },
  logoutBtnText: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});
