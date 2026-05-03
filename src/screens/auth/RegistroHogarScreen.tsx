import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, Platform,
  KeyboardAvoidingView, ActivityIndicator, Modal,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import { setStoredSlug } from '../../storage/hogar';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZES } from '../../theme';

interface CreatedHogar {
  nombre: string;
  slug: string;
}

const NEXT_STEPS = [
  { icon: 'account-plus-outline', text: 'Agrega a tu equipo de enfermería desde Gestión de usuarios' },
  { icon: 'bed-outline',          text: 'Registra a los pacientes del hogar' },
  { icon: 'hospital-building',    text: 'Completa la información del hogar en Configuración' },
  { icon: 'pill',                 text: 'Carga los medicamentos y planes de cuidado' },
];

export default function RegistroHogarScreen() {
  const navigation          = useNavigation<any>();
  const insets              = useSafeAreaInsets();
  const { completeLogin }   = useAuth();

  const [hogarName, setHogarName]           = useState('');
  const [adminName, setAdminName]           = useState('');
  const [adminLastName, setAdminLastName]   = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [entering, setEntering]             = useState(false);
  const [error, setError]                   = useState('');
  const [createdHogar, setCreatedHogar]     = useState<CreatedHogar | null>(null);

  async function handleRegister() {
    if (!hogarName.trim() || !adminName.trim() || !email.trim() || !password.trim()) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/register-hogar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          nombreHogar:   hogarName.trim(),
          nombreAdmin:   adminName.trim(),
          apellidoAdmin: adminLastName.trim(),
          email:         email.trim().toLowerCase(),
          password,
        }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? result.message ?? 'Error al registrar');

      await setStoredSlug(result.hogar.slug);

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) throw authError;

      setCreatedHogar({ nombre: hogarName.trim(), slug: result.hogar.slug });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado al registrar el hogar.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoToPanel() {
    setEntering(true);
    await completeLogin();
    setEntering(false);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar nuevo hogar</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>DATOS DEL HOGAR</Text>
          <TextInput
            label="Nombre del hogar *"
            value={hogarName}
            onChangeText={t => { setHogarName(t); setError(''); }}
            style={styles.input}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DATOS DEL ADMINISTRADOR</Text>
          <TextInput
            label="Nombre *"
            value={adminName}
            onChangeText={t => { setAdminName(t); setError(''); }}
            style={styles.input}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />
          <TextInput
            label="Apellido"
            value={adminLastName}
            onChangeText={setAdminLastName}
            style={styles.input}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />
          <TextInput
            label="Email *"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />
          <TextInput
            label="Contraseña * (mín. 6 caracteres)"
            value={password}
            onChangeText={t => { setPassword(t); setError(''); }}
            secureTextEntry={!showPassword}
            style={styles.input}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(v => !v)}
              />
            }
          />

          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.registerBtn, loading && { opacity: 0.75 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="hospital-building" size={20} color={COLORS.white} />
                <Text style={styles.registerBtnText}>Crear hogar y comenzar</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal de éxito ──────────────────────────────────────────────────── */}
      <Modal
        visible={createdHogar !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={styles.successIconWrap}>
                <View style={styles.successCircle}>
                  <MaterialCommunityIcons name="check-bold" size={40} color={COLORS.white} />
                </View>
              </View>

              <Text style={styles.successTitle}>¡Hogar registrado con éxito!</Text>
              <Text style={styles.successSubtitle}>
                Ya puedes empezar a gestionar tu hogar geriátrico desde GeriaApp.
              </Text>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="hospital-building" size={16} color={COLORS.primary} />
                  <Text style={styles.infoLabel}>Hogar</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{createdHogar?.nombre}</Text>
                </View>
                <View style={styles.infoSeparator} />
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="identifier" size={16} color={COLORS.primary} />
                  <Text style={styles.infoLabel}>Identificador</Text>
                  <Text style={[styles.infoValue, styles.infoSlug]}>{createdHogar?.slug}</Text>
                </View>
              </View>

              <Text style={styles.stepsTitle}>Pasos siguientes</Text>
              {NEXT_STEPS.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <MaterialCommunityIcons name={step.icon as any} size={18} color={COLORS.primary} style={styles.stepIcon} />
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.panelBtn, entering && { opacity: 0.75 }]}
                onPress={handleGoToPanel}
                activeOpacity={0.85}
                disabled={entering}
              >
                {entering ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.panelBtnText}>Ir al panel de gestión</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.white} />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  content: { padding: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    color: COLORS.textSecondary, marginBottom: 12,
  },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF0F0', borderRadius: 12,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#FFD0D0',
  },
  errorText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.danger, lineHeight: 18 },
  registerBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  registerBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, maxHeight: '90%',
  },

  successIconWrap: { alignItems: 'center', marginBottom: 20 },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#059669', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  successTitle: {
    fontSize: FONT_SIZES.xl, fontWeight: '800',
    color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8,
  },
  successSubtitle: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },

  infoBox: {
    backgroundColor: COLORS.primary + '08', borderRadius: 14,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.primary + '20',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    fontWeight: '600', minWidth: 90,
  },
  infoValue: {
    flex: 1, fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary, fontWeight: '700',
  },
  infoSlug: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
  },
  infoSeparator: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  stepsTitle: {
    fontSize: FONT_SIZES.sm, fontWeight: '800',
    color: COLORS.textPrimary, marginBottom: 14, letterSpacing: 0.3,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  stepNumber: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  stepNumberText: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  stepIcon: { marginTop: 1 },
  stepText: {
    flex: 1, fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary, lineHeight: 20,
  },

  panelBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 8, marginBottom: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  panelBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
});
