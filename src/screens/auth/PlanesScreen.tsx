import React from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Linking, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES } from '../../theme';

interface Feature { texto: string; incluido: boolean }

interface Plan {
  nombre: string;
  precio: string;
  periodo: string;
  icono: string;
  color: string;
  bg: string;
  recomendado?: boolean;
  features: Feature[];
  ctaTexto: string;
  ctaAccion: () => void;
}

const CONTACTO_WHATSAPP = 'https://wa.me/5491100000000?text=Hola%2C%20me%20interesa%20adquirir%20una%20suscripci%C3%B3n%20de%20GeriaApp';
const CONTACTO_EMAIL    = 'mailto:soporte@geriaapp.com?subject=Consulta%20suscripci%C3%B3n%20GeriaApp';

function abrirWhatsApp() { Linking.openURL(CONTACTO_WHATSAPP); }
function abrirEmail()    { Linking.openURL(CONTACTO_EMAIL); }

function FeatureRow({ texto, incluido }: Feature) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons
        name={incluido ? 'check-circle' : 'close-circle-outline'}
        size={16}
        color={incluido ? '#2E7D32' : '#BDBDBD'}
      />
      <Text style={[styles.featureTexto, !incluido && styles.featureTextoGris]}>{texto}</Text>
    </View>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <View style={[styles.planCard, { borderColor: plan.color + '40' }, plan.recomendado && styles.planCardDestacado]}>
      {plan.recomendado && (
        <View style={[styles.recomendadoBadge, { backgroundColor: plan.color }]}>
          <MaterialCommunityIcons name="star" size={11} color="#fff" />
          <Text style={styles.recomendadoTexto}>RECOMENDADO</Text>
        </View>
      )}
      <View style={[styles.planHeader, { backgroundColor: plan.bg }]}>
        <View style={[styles.planIcono, { backgroundColor: plan.color + '20' }]}>
          <MaterialCommunityIcons name={plan.icono as any} size={26} color={plan.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planNombre, { color: plan.color }]}>{plan.nombre}</Text>
          <View style={styles.precioRow}>
            <Text style={[styles.planPrecio, { color: plan.color }]}>{plan.precio}</Text>
            {plan.periodo ? <Text style={styles.planPeriodo}> / {plan.periodo}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.planFeatures}>
        {plan.features.map((f, i) => <FeatureRow key={i} {...f} />)}
      </View>

      <TouchableOpacity
        style={[styles.planCta, { backgroundColor: plan.color }]}
        onPress={plan.ctaAccion}
        activeOpacity={0.85}
      >
        <Text style={styles.planCtaTexto}>{plan.ctaTexto}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function PlanesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const planes: Plan[] = [
    {
      nombre: 'Básico',
      precio: 'Gratis',
      periodo: '',
      icono: 'leaf',
      color: '#2E7D32',
      bg: '#F1F8E9',
      features: [
        { texto: 'Hasta 10 residentes',      incluido: true  },
        { texto: 'Signos vitales',            incluido: true  },
        { texto: 'Medicamentos',              incluido: true  },
        { texto: 'Registro de aseo',          incluido: true  },
        { texto: 'Historial médico completo', incluido: false },
        { texto: 'Notas de enfermería',       incluido: false },
        { texto: 'Auditoría y reportes',      incluido: false },
        { texto: 'Multi-sede',                incluido: false },
        { texto: 'Soporte prioritario',       incluido: false },
      ],
      ctaTexto: 'Comenzar gratis',
      ctaAccion: () => navigation.goBack(),
    },
    {
      nombre: 'Profesional',
      precio: 'Consultar',
      periodo: 'mes',
      icono: 'star-circle',
      color: '#1565C0',
      bg: '#E3F2FD',
      recomendado: true,
      features: [
        { texto: 'Residentes ilimitados',     incluido: true  },
        { texto: 'Signos vitales',            incluido: true  },
        { texto: 'Medicamentos',              incluido: true  },
        { texto: 'Registro de aseo',          incluido: true  },
        { texto: 'Historial médico completo', incluido: true  },
        { texto: 'Notas de enfermería',       incluido: true  },
        { texto: 'Auditoría y reportes PDF',  incluido: true  },
        { texto: 'Multi-sede',                incluido: false },
        { texto: 'Soporte prioritario',       incluido: false },
      ],
      ctaTexto: 'Consultar precio',
      ctaAccion: abrirWhatsApp,
    },
    {
      nombre: 'Premium',
      precio: 'Consultar',
      periodo: 'mes',
      icono: 'crown',
      color: '#6A1B9A',
      bg: '#F3E5F5',
      features: [
        { texto: 'Residentes ilimitados',     incluido: true  },
        { texto: 'Todo lo Profesional',       incluido: true  },
        { texto: 'Multi-sede / Multi-hogar',  incluido: true  },
        { texto: 'Dashboard centralizado',    incluido: true  },
        { texto: 'Integración con sistemas',  incluido: true  },
        { texto: 'Soporte prioritario 24/7',  incluido: true  },
        { texto: 'Capacitación incluida',     incluido: true  },
        { texto: 'Personalización de marca',  incluido: true  },
        { texto: 'SLA garantizado',           incluido: true  },
      ],
      ctaTexto: 'Contactar equipo de ventas',
      ctaAccion: abrirWhatsApp,
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Planes y precios</Text>
          <Text style={styles.headerSub}>Elegí el plan ideal para tu establecimiento</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        {/* Planes */}
        {planes.map(p => <PlanCard key={p.nombre} plan={p} />)}

        {/* Contacto */}
        <View style={styles.contactoCard}>
          <Text style={styles.contactoTitulo}>¿Tenés alguna pregunta?</Text>
          <Text style={styles.contactoSub}>Nuestro equipo está disponible para asesorarte</Text>
          <View style={styles.contactoBtns}>
            <TouchableOpacity style={styles.contactoBtn} onPress={abrirWhatsApp} activeOpacity={0.8}>
              <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
              <Text style={styles.contactoBtnTexto}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactoBtn} onPress={abrirEmail} activeOpacity={0.8}>
              <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.primary} />
              <Text style={styles.contactoBtnTexto}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FB' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },

  scroll: { padding: 16, gap: 16 },

  planCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1.5, overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  planCardDestacado: {
    elevation: 6,
    shadowOpacity: 0.15,
  },
  recomendadoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  recomendadoTexto: {
    fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1,
  },

  planHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
  },
  planIcono: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  planNombre: { fontSize: FONT_SIZES.lg, fontWeight: '800' },
  precioRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  planPrecio: { fontSize: 20, fontWeight: '800' },
  planPeriodo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  planFeatures: { padding: 16, paddingTop: 8, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, flex: 1 },
  featureTextoGris: { color: COLORS.textSecondary },

  planCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, margin: 16, marginTop: 4,
    height: 46, borderRadius: 12,
  },
  planCtaTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#fff' },

  contactoCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 20, alignItems: 'center',
  },
  contactoTitulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  contactoSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 },
  contactoBtns: { flexDirection: 'row', gap: 12 },
  contactoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
  },
  contactoBtnTexto: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
});
