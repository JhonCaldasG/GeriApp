import React, { useEffect, useState, useCallback } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Medicamento, Paciente, AdministracionMedicamento } from '../../types';
import { obtenerPacientes, obtenerMedicamentos } from '../../storage';
import { obtenerAdministraciones } from '../../storage/administraciones';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

// Franjas horarias del día
const FRANJAS = [
  { id: 'madrugada', label: 'Madrugada', rango: '00:00 – 05:59', color: '#303F9F', bg: '#E8EAF6', horas: [0, 1, 2, 3, 4, 5] },
  { id: 'mañana',    label: 'Mañana',    rango: '06:00 – 11:59', color: '#E65100', bg: '#FBE9E7', horas: [6, 7, 8, 9, 10, 11] },
  { id: 'tarde',     label: 'Tarde',     rango: '12:00 – 17:59', color: '#1565C0', bg: '#E3F2FD', horas: [12, 13, 14, 15, 16, 17] },
  { id: 'noche',     label: 'Noche',     rango: '18:00 – 23:59', color: '#4A148C', bg: '#F3E5F5', horas: [18, 19, 20, 21, 22, 23] },
];

function horaEnFranja(horario: string, franjaHoras: number[]): boolean {
  // horario puede ser "08:00", "8:00", "8h", "Mañana", etc.
  const match = horario.match(/(\d{1,2}):(\d{2})/);
  if (!match) return false;
  return franjaHoras.includes(parseInt(match[1], 10));
}

function esFranjaActual(franjaHoras: number[]): boolean {
  const h = new Date().getHours();
  return franjaHoras.includes(h);
}

interface ItemTimeline {
  paciente: Paciente;
  medicamento: Medicamento;
  administrado: boolean;
  horaAdmin?: string;
}

export default function TimelineMedicamentosScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [administraciones, setAdministraciones] = useState<AdministracionMedicamento[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [pacs, meds, admins] = await Promise.all([
        obtenerPacientes(),
        obtenerMedicamentos(),
        obtenerAdministraciones(),
      ]);
      setPacientes(pacs.filter(p => !p.fallecido));
      setMedicamentos(meds.filter(m => m.activo));
      setAdministraciones(admins);
    } catch { /* silent */ }
    finally { setCargando(false); }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const hoyISO = new Date().toISOString().slice(0, 10);

  // Admins de hoy
  const adminsHoy = administraciones.filter(a =>
    a.createdAt.slice(0, 10) === hoyISO
  );

  // Construir sections por franja
  const sections = FRANJAS.map(franja => {
    const items: ItemTimeline[] = [];
    for (const med of medicamentos) {
      if (!horaEnFranja(med.horario, franja.horas)) continue;
      const paciente = pacientes.find(p => p.id === med.pacienteId);
      if (!paciente) continue;
      const adminHoy = adminsHoy.find(a => a.medicamentoId === med.id);
      items.push({
        paciente,
        medicamento: med,
        administrado: !!adminHoy,
        horaAdmin: adminHoy ? new Date(adminHoy.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : undefined,
      });
    }
    // Orden: pendientes primero
    items.sort((a, b) => Number(a.administrado) - Number(b.administrado));
    return { ...franja, data: items };
  }).filter(s => s.data.length > 0);

  const totalHoy = medicamentos.length;
  const administradosHoy = new Set(adminsHoy.map(a => a.medicamentoId)).size;
  const pendientes = totalHoy - administradosHoy;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      {/* Resumen */}
      <View style={[styles.resumenBar, { backgroundColor: colors.surface }]}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: '#2E7D32' }]}>{administradosHoy}</Text>
          <Text style={styles.resumenLabel}>Administrados hoy</Text>
        </View>
        <View style={styles.resumenDiv} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: pendientes > 0 ? '#E65100' : COLORS.textSecondary }]}>{pendientes}</Text>
          <Text style={styles.resumenLabel}>Pendientes</Text>
        </View>
        <View style={styles.resumenDiv} />
        <View style={styles.resumenItem}>
          <Text style={styles.resumenNum}>{totalHoy}</Text>
          <Text style={styles.resumenLabel}>Total activos</Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.medicamento.id}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        onRefresh={cargar}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="pill" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>No hay medicamentos con horario definido</Text>
          </View>
        }
        renderSectionHeader={({ section: franja }) => (
          <View style={[styles.franjaHeader, { borderLeftColor: franja.color, backgroundColor: franja.bg }]}>
            <MaterialCommunityIcons
              name={esFranjaActual(franja.horas) ? 'clock-fast' : 'clock-outline'}
              size={16} color={franja.color}
            />
            <Text style={[styles.franjaTitulo, { color: franja.color }]}>{franja.label}</Text>
            <Text style={[styles.franjaRango, { color: franja.color }]}>{franja.rango}</Text>
            {esFranjaActual(franja.horas) && (
              <View style={[styles.badgeActual, { backgroundColor: franja.color }]}>
                <Text style={styles.badgeActualTexto}>Ahora</Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.medCard, item.administrado && styles.medCardAdministrado, { backgroundColor: colors.surface }]}>
            <View style={[styles.medIcono, { backgroundColor: item.administrado ? '#E8F5E9' : '#FFF3E0' }]}>
              <MaterialCommunityIcons
                name={item.administrado ? 'pill' : 'pill-off'}
                size={18}
                color={item.administrado ? '#2E7D32' : '#E65100'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.medNombre}>{item.medicamento.nombre}</Text>
              <Text style={styles.medPaciente}>
                <MaterialCommunityIcons name="account" size={12} color={COLORS.textSecondary} />
                {' '}{item.paciente.nombre} {item.paciente.apellido}  •  Hab. {item.paciente.habitacion}
              </Text>
              <Text style={styles.medDetalle}>{item.medicamento.dosis}  •  {item.medicamento.viaAdministracion}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {item.administrado ? (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#2E7D32" />
                  {item.horaAdmin && <Text style={styles.horaAdmin}>{item.horaAdmin}</Text>}
                </>
              ) : (
                <View style={styles.badgePendiente}>
                  <Text style={styles.badgePendienteTexto}>Pendiente</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  resumenBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    borderRadius: 14, paddingVertical: 14, elevation: 2,
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenNum: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  resumenDiv: { width: 1, height: 36, backgroundColor: COLORS.border },

  lista: { padding: 16, gap: 8 },

  franjaHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderLeftWidth: 3, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4,
  },
  franjaTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '800' },
  franjaRango: { fontSize: FONT_SIZES.xs, flex: 1 },
  badgeActual: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeActualTexto: { fontSize: 10, color: '#fff', fontWeight: '700' },

  medCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, elevation: 1,
  },
  medCardAdministrado: { opacity: 0.7 },
  medIcono: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  medNombre: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  medPaciente: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  medDetalle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

  badgePendiente: {
    backgroundColor: '#FFF3E0', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgePendienteTexto: { fontSize: 10, color: '#E65100', fontWeight: '700' },
  horaAdmin: { fontSize: 10, color: '#2E7D32', fontWeight: '600' },

  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
});
