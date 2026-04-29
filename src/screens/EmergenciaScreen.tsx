// src/screens/EmergenciaScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHogar } from '../context/HogarContext';
import { useAppTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../theme';

interface Protocolo {
  id: string;
  titulo: string;
  icono: string;
  color: string;
  pasos: string[];
}

const PROTOCOLOS: Protocolo[] = [
  {
    id: 'caida',
    titulo: 'Caída de Paciente',
    icono: 'human-handsdown',
    color: '#E65100',
    pasos: [
      'No mover al paciente hasta evaluar lesiones.',
      'Verificar estado de consciencia (responde, parpadea).',
      'Revisar presencia de sangrado o deformidades visibles.',
      'Llamar al médico de guardia e informar la situación.',
      'Registrar el incidente en la app (módulo Incidentes).',
      'Notificar al familiar de referencia.',
    ],
  },
  {
    id: 'paro',
    titulo: 'Paro Cardiorrespiratorio',
    icono: 'heart-pulse',
    color: '#C62828',
    pasos: [
      'Llamar al número de emergencias configurado.',
      'Verificar que no hay respiración ni pulso.',
      'Iniciar RCP: 30 compresiones + 2 respiraciones.',
      'Solicitar el DEA si está disponible en el hogar.',
      'Continuar RCP hasta que llegue la ambulancia.',
      'Registrar hora de inicio del evento.',
    ],
  },
  {
    id: 'incendio',
    titulo: 'Incendio / Evacuación',
    icono: 'fire',
    color: '#B71C1C',
    pasos: [
      'Activar alarma de incendio.',
      'Llamar a bomberos (100) y emergencias.',
      'Evacuar pacientes: comenzar por los más cercanos a la salida.',
      'Priorizar pacientes con movilidad reducida.',
      'No usar ascensores durante la evacuación.',
      'Reunirse en el punto de encuentro exterior.',
    ],
  },
];

export default function EmergenciaScreen() {
  const insets = useSafeAreaInsets();
  const { hogar } = useHogar();
  const { colors } = useAppTheme();
  const [expandido, setExpandido] = useState<string | null>(null);

  function llamarEmergencia() {
    const tel = hogar.telefonoEmergencia?.trim();
    if (!tel) {
      Alert.alert(
        'Sin número configurado',
        'Configurá el teléfono de emergencias en Configuración del Hogar.',
      );
      return;
    }
    Linking.openURL(`tel:${tel}`);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <TouchableOpacity style={styles.llamarBtn} onPress={llamarEmergencia} activeOpacity={0.8}>
        <MaterialCommunityIcons name="phone-alert" size={28} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.llamarTitulo}>Llamar a Emergencias</Text>
          <Text style={styles.llamarNumero}>
            {hogar.telefonoEmergencia?.trim() || 'Sin número configurado'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.seccion}>Protocolos de Emergencia</Text>

      {PROTOCOLOS.map(p => (
        <View key={p.id} style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => setExpandido(expandido === p.id ? null : p.id)}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIcono, { backgroundColor: p.color + '20' }]}>
              <MaterialCommunityIcons name={p.icono as any} size={26} color={p.color} />
            </View>
            <Text style={[styles.cardTitulo, { color: p.color }]}>{p.titulo}</Text>
            <MaterialCommunityIcons
              name={expandido === p.id ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={p.color}
            />
          </TouchableOpacity>

          {expandido === p.id && (
            <View style={styles.pasos}>
              {p.pasos.map((paso, idx) => (
                <View key={idx} style={styles.pasoFila}>
                  <View style={[styles.pasoBadge, { backgroundColor: p.color }]}>
                    <Text style={styles.pasoNum}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.pasoTexto, { color: colors.textPrimary }]}>{paso}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  llamarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#C62828', borderRadius: 16,
    padding: 18, marginBottom: 20,
  },
  llamarTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: '#fff' },
  llamarNumero: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  seccion: {
    fontSize: FONT_SIZES.sm, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 12,
  },
  card: {
    borderRadius: 14, marginBottom: 10,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 16,
  },
  cardIcono: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitulo: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '700' },
  pasos: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  pasoFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pasoBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  pasoNum: { color: '#fff', fontSize: FONT_SIZES.xs, fontWeight: '800' },
  pasoTexto: { flex: 1, fontSize: FONT_SIZES.sm, lineHeight: 20 },
});
