import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Image, StatusBar, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../context/AuthContext';
import { useHogar } from '../../context/HogarContext';
import { useHogarAcceso } from '../../context/HogarAccesoContext';
import { COLORS, FONT_SIZES } from '../../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const { hogar } = useHogar();
  const { bloquear } = useHogarAcceso();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [usuario, setUsuario]           = useState('');
  const [password, setPassword]         = useState('');
  const [verPassword, setVerPassword]   = useState(false);
  const [cargando, setCargando]         = useState(false);
  const [error, setError]               = useState('');
  const [focusUsuario, setFocusUsuario] = useState(false);
  const [focusPass, setFocusPass]       = useState(false);
  const [verDefaults, setVerDefaults]   = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const enabled = await AsyncStorage.getItem('@biometric_enabled');
      setBiometricAvailable(hasHardware && isEnrolled && enabled === 'true');
    })();
  }, []);

  async function handleBiometricLogin() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmar identidad',
      fallbackLabel: 'Usar contraseña',
    });
    if (!result.success) return;
    const sesion = await AsyncStorage.getItem('@sesion_usuario');
    if (!sesion) {
      Alert.alert('Sin sesión previa', 'Iniciá sesión con usuario y contraseña primero.');
      return;
    }
    const ok = await login(JSON.parse(sesion).usuario ?? '', '');
    if (!ok) {
      Alert.alert('Error', 'No se pudo restaurar la sesión. Iniciá sesión manualmente.');
    }
  }

  async function handleLogin() {
    if (!usuario.trim() || !password.trim()) {
      setError('Completá usuario y contraseña para continuar.');
      return;
    }
    setCargando(true);
    setError('');
    const ok = await login(usuario.trim(), password);
    if (!ok) setError('Usuario o contraseña incorrectos. Verificá tus datos e intentá de nuevo.');
    setCargando(false);
  }

  function handleSolicitarAcceso() {
    Alert.alert(
      'Solicitar acceso',
      'Para obtener una cuenta, comunicate con el administrador del sistema.',
      [{ text: 'Entendido', style: 'default' }],
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Sección superior con branding ──────────────────────────────── */}
      <View style={[styles.topSection, { paddingTop: insets.top + 24 }]}>
        <View style={styles.logoWrap}>
          {hogar.logoUri ? (
            <Image source={{ uri: hogar.logoUri }} style={styles.logoImg} />
          ) : (
            <MaterialCommunityIcons name="hospital-building" size={46} color={COLORS.white} />
          )}
        </View>
        <Text style={styles.appNombre} numberOfLines={2}>{hogar.nombre || 'Hogar Geriátrico'}</Text>
        <Text style={styles.appTagline}>Sistema de gestión de residentes</Text>
      </View>

      {/* ── Tarjeta flotante ────────────────────────────────────────────── */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.card, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.cardTitulo}>Bienvenido de vuelta</Text>
          <Text style={styles.cardSubtitulo}>Ingresá tus credenciales para acceder</Text>

          {/* Usuario */}
          <View style={styles.campo}>
            <Text style={styles.campoLabel}>USUARIO</Text>
            <View style={[styles.inputWrap, focusUsuario && styles.inputFocus, error && !usuario && styles.inputError]}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={focusUsuario ? COLORS.primary : COLORS.textSecondary}
                style={styles.inputIcono}
              />
              <TextInput
                value={usuario}
                onChangeText={t => { setUsuario(t); setError(''); }}
                placeholder="Tu nombre de usuario"
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
            <Text style={styles.campoLabel}>CONTRASEÑA</Text>
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
                placeholder="Tu contraseña"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!verPassword}
                style={styles.input}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                onSubmitEditing={handleLogin}
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
            style={[styles.btnLogin, cargando && { opacity: 0.75 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.btnLoginTexto}>Iniciar sesión</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          {/* Biometría */}
          {biometricAvailable && (
            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
              <MaterialCommunityIcons name="fingerprint" size={24} color={COLORS.primary} />
              <Text style={styles.biometricTexto}>Entrar con biometría</Text>
            </TouchableOpacity>
          )}

          {/* Separador */}
          <View style={styles.separador}>
            <View style={styles.separadorLinea} />
            <Text style={styles.separadorTexto}>o</Text>
            <View style={styles.separadorLinea} />
          </View>

          {/* Solicitar acceso */}
          <TouchableOpacity style={styles.btnRegistro} onPress={handleSolicitarAcceso} activeOpacity={0.8}>
            <MaterialCommunityIcons name="account-plus-outline" size={18} color={COLORS.primary} />
            <Text style={styles.btnRegistroTexto}>Solicitar acceso</Text>
          </TouchableOpacity>

          {/* Cambiar establecimiento */}
          <TouchableOpacity
            style={styles.cambiarEstab}
            onPress={() => { bloquear(); navigation.navigate('Welcome'); }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={COLORS.textSecondary} />
            <Text style={styles.cambiarEstabTexto}>Cambiar establecimiento</Text>
          </TouchableOpacity>

          {/* Credenciales colapsables */}
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
              {verDefaults ? 'Ocultar credenciales' : 'Ver accesos predeterminados'}
            </Text>
          </TouchableOpacity>

          {verDefaults && (
            <View style={styles.defaultsBox}>
              <View style={styles.defaultsFila}>
                <View style={[styles.defaultsRol, { backgroundColor: COLORS.primary + '15' }]}>
                  <MaterialCommunityIcons name="shield-account" size={14} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.defaultsLabel}>Administrador</Text>
                  <Text style={styles.defaultsValor}>admin · admin123</Text>
                </View>
              </View>
              <View style={[styles.defaultsFila, { marginTop: 10 }]}>
                <View style={[styles.defaultsRol, { backgroundColor: COLORS.secondaryLight + '20' }]}>
                  <MaterialCommunityIcons name="account-heart" size={14} color={COLORS.secondaryLight} />
                </View>
                <View>
                  <Text style={styles.defaultsLabel}>Enfermero</Text>
                  <Text style={styles.defaultsValor}>enfermero · 1234</Text>
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
  root: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1 },

  // ── Branding superior ────────────────────────────────────────────────────
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 36,
    gap: 6,
  },
  logoWrap: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoImg: { width: 90, height: 90 },
  appNombre: {
    fontSize: FONT_SIZES.xl, fontWeight: '800',
    color: COLORS.white, textAlign: 'center', lineHeight: 28,
  },
  appTagline: {
    fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },

  // ── Tarjeta ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 28, paddingTop: 34,
    flexGrow: 1,
  },
  cardTitulo: {
    fontSize: FONT_SIZES.xl, fontWeight: '800',
    color: COLORS.textPrimary, marginBottom: 4,
  },
  cardSubtitulo: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 28,
  },

  // ── Campos ───────────────────────────────────────────────────────────────
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
  inputFocus: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
  inputError: { borderColor: COLORS.danger + '80' },
  inputIcono: { marginRight: 10 },
  input: {
    flex: 1, fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    height: 54,
  },
  eyeBtn: { paddingLeft: 8 },

  // ── Error ────────────────────────────────────────────────────────────────
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

  // ── Botón login ──────────────────────────────────────────────────────────
  btnLogin: {
    backgroundColor: COLORS.primary,
    borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, marginTop: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  btnLoginTexto: {
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white,
  },

  // ── Botón biométrico ─────────────────────────────────────────────────────
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginTop: 12,
  },
  biometricTexto: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── Separador ────────────────────────────────────────────────────────────
  separador: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginVertical: 22,
  },
  separadorLinea: { flex: 1, height: 1, backgroundColor: COLORS.border },
  separadorTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // ── Botón registro ───────────────────────────────────────────────────────
  btnRegistro: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  btnRegistroTexto: {
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary,
  },

  // ── Cambiar establecimiento ──────────────────────────────────────────────
  cambiarEstab: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 6,
  },
  cambiarEstabTexto: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },

  // ── Credenciales colapsables ─────────────────────────────────────────────
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
  defaultsFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  defaultsRol: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  defaultsLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  defaultsValor: {
    fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary, marginTop: 1,
  },
});
