import React, { useState } from 'react';
import {
  View, StyleSheet, StatusBar, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHogarAcceso } from '../../context/HogarAccesoContext';
import { COLORS, FONT_SIZES } from '../../theme';

export default function WelcomeScreen() {
  const { desbloquear } = useHogarAcceso();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [usuario, setUsuario]         = useState('');
  const [password, setPassword]       = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando]       = useState(false);
  const [error, setError]             = useState('');
  const [focusUsuario, setFocusUsuario] = useState(false);
  const [focusPass, setFocusPass]       = useState(false);
  const [verDefaults, setVerDefaults]   = useState(false);

  async function handleIngresar() {
    if (!usuario.trim() || !password.trim()) {
      setError('Completá el usuario y contraseña del establecimiento.');
      return;
    }
    setCargando(true);
    setError('');
    const ok = await desbloquear(usuario.trim(), password);
    if (ok) {
      navigation.navigate('Login');
    } else {
      setError('Credenciales incorrectas. Verificá los datos del establecimiento.');
    }
    setCargando(false);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />

      {/* ── Branding superior ── */}
      <View style={[styles.topSection, { paddingTop: insets.top + 20 }]}>
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="hospital-building" size={44} color={COLORS.white} />
        </View>
        <Text style={styles.appNombre}>GeriaApp</Text>
        <Text style={styles.appTagline}>Gestión profesional de hogares geriátricos</Text>

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="shield-check" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.badgeTexto}>Seguro</Text>
          </View>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="cloud-check" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.badgeTexto}>En la nube</Text>
          </View>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="cellphone" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.badgeTexto}>Multi-dispositivo</Text>
          </View>
        </View>
      </View>

      {/* ── Tarjeta flotante ── */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.card, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.cardTitulo}>Acceso al establecimiento</Text>
          <Text style={styles.cardSubtitulo}>Ingresá las credenciales de tu hogar geriátrico</Text>

          {/* Usuario */}
          <View style={styles.campo}>
            <Text style={styles.campoLabel}>USUARIO DEL ESTABLECIMIENTO</Text>
            <View style={[styles.inputWrap, focusUsuario && styles.inputFocus, error && !usuario && styles.inputError]}>
              <MaterialCommunityIcons
                name="office-building-outline"
                size={20}
                color={focusUsuario ? COLORS.primary : COLORS.textSecondary}
                style={styles.inputIcono}
              />
              <TextInput
                value={usuario}
                onChangeText={t => { setUsuario(t); setError(''); }}
                placeholder="Usuario del establecimiento"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                onFocus={() => setFocusUsuario(true)}
                onBlur={() => setFocusUsuario(false)}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Contraseña */}
          <View style={styles.campo}>
            <Text style={styles.campoLabel}>CONTRASEÑA DEL ESTABLECIMIENTO</Text>
            <View style={[styles.inputWrap, focusPass && styles.inputFocus, error && !password && styles.inputError]}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={focusPass ? COLORS.primary : COLORS.textSecondary}
                style={styles.inputIcono}
              />
              <TextInput
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                placeholder="Contraseña del establecimiento"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!verPassword}
                style={styles.input}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                onSubmitEditing={handleIngresar}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setVerPassword(v => !v)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons
                  name={verPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorTexto}>{error}</Text>
            </View>
          ) : null}

          {/* CTA principal */}
          <TouchableOpacity
            style={[styles.btnIngresar, cargando && { opacity: 0.75 }]}
            onPress={handleIngresar}
            activeOpacity={0.85}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.btnIngresarTexto}>Ingresar al sistema</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          {/* Separador */}
          <View style={styles.separador}>
            <View style={styles.separadorLinea} />
            <Text style={styles.separadorTexto}>o</Text>
            <View style={styles.separadorLinea} />
          </View>

          {/* Ver planes */}
          <TouchableOpacity
            style={styles.btnPlanes}
            onPress={() => navigation.navigate('Planes')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="diamond-outline" size={18} color={COLORS.primary} />
            <Text style={styles.btnPlanesTexto}>Ver planes y adquirir suscripción</Text>
          </TouchableOpacity>

          {/* Credenciales por defecto (colapsable) */}
          <TouchableOpacity
            style={styles.defaultsToggle}
            onPress={() => setVerDefaults(v => !v)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={verDefaults ? 'chevron-up' : 'information-outline'}
              size={15}
              color={COLORS.textSecondary}
            />
            <Text style={styles.defaultsToggleTexto}>
              {verDefaults ? 'Ocultar acceso predeterminado' : 'Ver acceso predeterminado'}
            </Text>
          </TouchableOpacity>

          {verDefaults && (
            <View style={styles.defaultsBox}>
              <View style={styles.defaultsFila}>
                <View style={[styles.defaultsIcono, { backgroundColor: COLORS.primary + '15' }]}>
                  <MaterialCommunityIcons name="office-building" size={14} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.defaultsLabel}>Acceso inicial del establecimiento</Text>
                  <Text style={styles.defaultsValor}>hogar · 1234</Text>
                  <Text style={styles.defaultsNota}>El administrador puede cambiar estas credenciales en Configuración</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D47A1' },
  flex: { flex: 1 },

  topSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 6,
  },
  logoWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 4,
  },
  appNombre: {
    fontSize: 28, fontWeight: '800',
    color: COLORS.white, letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 18,
  },
  badgesRow: {
    flexDirection: 'row', gap: 8, marginTop: 10,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeTexto: { fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  card: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 28, paddingTop: 32,
    flexGrow: 1,
  },
  cardTitulo: {
    fontSize: FONT_SIZES.xl, fontWeight: '800',
    color: COLORS.textPrimary, marginBottom: 4,
  },
  cardSubtitulo: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 28,
  },

  campo: { marginBottom: 18 },
  campoLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    color: COLORS.textSecondary, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 54,
  },
  inputFocus: { borderColor: '#0D47A1' },
  inputError: { borderColor: COLORS.danger + '80' },
  inputIcono: { marginRight: 10 },
  input: {
    flex: 1, fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary, height: 54,
  },
  eyeBtn: { paddingLeft: 8 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF0F0', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#FFD0D0',
  },
  errorTexto: {
    flex: 1, fontSize: FONT_SIZES.sm,
    color: COLORS.danger, lineHeight: 18,
  },

  btnIngresar: {
    backgroundColor: '#0D47A1',
    borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, marginTop: 6,
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  btnIngresarTexto: {
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white,
  },

  separador: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginVertical: 22,
  },
  separadorLinea: { flex: 1, height: 1, backgroundColor: COLORS.border },
  separadorTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  btnPlanes: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  btnPlanesTexto: {
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary,
  },

  defaultsToggle: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    marginTop: 28, paddingVertical: 6,
  },
  defaultsToggleTexto: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
  },
  defaultsBox: {
    backgroundColor: COLORS.white, borderRadius: 14,
    padding: 16, marginTop: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  defaultsFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  defaultsIcono: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  defaultsLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  defaultsValor: {
    fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2,
  },
  defaultsNota: {
    fontSize: 10, color: COLORS.textSecondary, marginTop: 4, lineHeight: 14,
  },
});
