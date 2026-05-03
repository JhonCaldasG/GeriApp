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
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZES } from '../../theme';

export default function WelcomeScreen() {
  const navigation          = useNavigation<any>();
  const insets              = useSafeAreaInsets();
  const { loginWithEmail }  = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await loginWithEmail(email.trim().toLowerCase(), password);
      if (!ok) {
        setError('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
        return;
      }
      navigation.navigate('HogarSelector');
    } catch {
      setError('Error al conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />

      <View style={[styles.topSection, { paddingTop: insets.top + 20 }]}>
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="hospital-building" size={44} color={COLORS.white} />
        </View>
        <Text style={styles.appName}>GeriaApp</Text>
        <Text style={styles.appTagline}>Gestión profesional de hogares geriátricos</Text>

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="shield-check" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.badgeText}>Seguro</Text>
          </View>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="cloud-check" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.badgeText}>En la nube</Text>
          </View>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="cellphone" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.badgeText}>Multi-dispositivo</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.card, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.cardTitle}>Bienvenido</Text>
          <Text style={styles.cardSubtitle}>Inicia sesión con tu correo y contraseña</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CORREO ELECTRÓNICO</Text>
            <View style={[styles.inputWrap, emailFocused && styles.inputFocused, error && !email.trim() && styles.inputError]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={emailFocused ? COLORS.primary : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                placeholder="tucorreo@ejemplo.com"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
            <View style={[styles.inputWrap, passFocused && styles.inputFocused, error && !password.trim() && styles.inputError]}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={passFocused ? COLORS.primary : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                placeholder="Tu contraseña"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPassword}
                style={styles.input}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.75 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Iniciar sesión</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('RegistroHogar')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.registerBtnText}>Registrar nuevo hogar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.plansBtn}
            onPress={() => navigation.navigate('Planes')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="diamond-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.plansBtnText}>Ver planes y precios</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D47A1' },
  flex: { flex: 1 },
  topSection: {
    alignItems: 'center', paddingHorizontal: 32, paddingBottom: 32, gap: 6,
  },
  logoWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', marginBottom: 4,
  },
  appName: { fontSize: 28, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  appTagline: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 18 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: { fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  card: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 28, paddingTop: 32, flexGrow: 1,
  },
  cardTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 28 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: COLORS.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 54,
  },
  inputFocused: { borderColor: '#0D47A1' },
  inputError: { borderColor: COLORS.danger + '80' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, height: 54 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF0F0', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#FFD0D0',
  },
  errorText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.danger, lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#0D47A1', borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6,
    shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  submitBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08', marginBottom: 12,
  },
  registerBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  plansBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  plansBtnText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
});
