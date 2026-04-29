import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Paciente } from '../types';
import { calcularEdad, inicialesdePaciente } from '../storage';
import { COLORS, FONT_SIZES } from '../theme';

interface PacienteCardProps {
  paciente: Paciente;
  onPress: () => void;
}

const AVATAR_COLORS = [
  '#1565C0', '#2E7D32', '#6A1B9A', '#AD1457', '#00695C',
  '#E65100', '#283593', '#4E342E',
];

function colorPorId(id: string): string {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function PacienteCard({ paciente, onPress }: PacienteCardProps) {
  const edad = calcularEdad(paciente.fechaNacimiento);
  const iniciales = inicialesdePaciente(paciente.nombre, paciente.apellido);
  const avatarColor = colorPorId(paciente.id);

  const esFallecido = !!paciente.fallecido;
  const tieneDnr = !!paciente.dnr;

  return (
    <TouchableOpacity
      style={[styles.card, esFallecido && styles.cardFallecido]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {paciente.fotoUri ? (
        <Image source={{ uri: paciente.fotoUri }} style={[styles.avatarFoto, esFallecido && styles.avatarFallecido]} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: esFallecido ? '#aaa' : avatarColor }]}>
          <Text style={styles.avatarText}>{iniciales}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.nombre, esFallecido && styles.nombreFallecido]}>
          {paciente.apellido}, {paciente.nombre}
        </Text>
        <Text style={styles.detalle}>
          {edad} años  •  Hab. {paciente.habitacion || 'Sin asignar'}
        </Text>
        {paciente.diagnosticoPrincipal ? (
          <Text style={styles.diagnostico} numberOfLines={1}>
            {paciente.diagnosticoPrincipal}
          </Text>
        ) : null}
        {(tieneDnr || paciente.riesgoCaida) && (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            {tieneDnr && (
              <View style={styles.badgeDnr}>
                <Text style={styles.badgeDnrTexto}>DNR</Text>
              </View>
            )}
            {paciente.riesgoCaida && (
              <View style={styles.badgeCaida}>
                <Text style={styles.badgeCaidaTexto}>⚠ Caída</Text>
              </View>
            )}
          </View>
        )}
        {esFallecido && (
          <Text style={styles.badgeFallecido}>Fallecido</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detalle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  diagnostico: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryLight,
    marginTop: 2,
  },
  cardFallecido: {
    opacity: 0.65,
    backgroundColor: '#f5f5f5',
  },
  avatarFallecido: {
    opacity: 0.7,
  },
  nombreFallecido: {
    color: '#888',
  },
  badgeFallecido: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#888',
    marginTop: 3,
  },
  badgeDnr: {
    backgroundColor: COLORS.danger,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeDnrTexto: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeCaida: {
    backgroundColor: COLORS.warning + '25',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  badgeCaidaTexto: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
});
