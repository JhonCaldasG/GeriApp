import React, { useState, useCallback } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { obtenerPacientes, obtenerSignos, obtenerMedicamentos } from '../storage';
import { obtenerAdministraciones } from '../storage/administraciones';
import { obtenerAusenciasActivas } from '../storage/ausencias';
import { useAppTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../theme';
import { Paciente, Medicamento, Ausencia } from '../types';

type SeccionItem =
  | { tipo: 'medicamento'; paciente: Paciente; med: Medicamento; ausencia?: undefined }
  | { tipo: 'signos'; paciente: Paciente; med?: undefined; ausencia?: undefined }
  | { tipo: 'ausencia'; paciente: Paciente; ausencia: Ausencia; med?: undefined };

export default function GuardiaRapidaScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();

  const [sinSignosHoy, setSinSignosHoy] = useState<Paciente[]>([]);
  const [medPendientes, setMedPendientes] = useState<{ paciente: Paciente; med: Medicamento }[]>([]);
  const [ausenciasActivas, setAusenciasActivas] = useState<{ ausencia: Ausencia; paciente: Paciente }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  const cargar = useCallback(async () => {
    setRefreshing(true);
    try {
      const hoyISO = new Date().toISOString().slice(0, 10);
      const ahoraH = new Date().getHours();

      const [pacientes, meds, admins, signos, ausenciasDB] = await Promise.all([
        obtenerPacientes(),
        obtenerMedicamentos(),
        obtenerAdministraciones(),
        obtenerSignos(),
        obtenerAusenciasActivas(),
      ]);

      const pacientesActivos = pacientes.filter(p => !p.fallecido);

      // IDs con ausencia activa
      const pacientesAusentesIds = new Set(ausenciasDB.map(a => a.pacienteId));

      // Pacientes sin signos hoy (excluir ausentes)
      const pacientesConSignosHoy = new Set(
        signos.filter(s => s.createdAt.slice(0, 10) === hoyISO).map(s => s.pacienteId)
      );
      const sinSignos = pacientesActivos.filter(p =>
        !pacientesConSignosHoy.has(p.id) && !pacientesAusentesIds.has(p.id)
      );
      setSinSignosHoy(sinSignos);

      // Medicamentos activos pendientes de esta franja horaria
      const medsActivos = meds.filter(m => m.activo);
      const adminsHoy = new Set(
        admins
          .filter(a => a.createdAt.slice(0, 10) === hoyISO && !a.rechazado)
          .map(a => a.medicamentoId)
      );
      const franjaMin = ahoraH * 60;
      const pendientes: { paciente: Paciente; med: Medicamento }[] = [];
      for (const med of medsActivos) {
        if (adminsHoy.has(med.id)) continue;
        const match = med.horario.match(/(\d{1,2}):(\d{2})/);
        if (!match) continue;
        const medMin = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        // Solo mostrar los que ya pasaron (o faltan menos de 30 min)
        if (medMin > franjaMin + 30) continue;
        const paciente = pacientesActivos.find(p => p.id === med.pacienteId);
        if (!paciente || pacientesAusentesIds.has(paciente.id)) continue;
        pendientes.push({ paciente, med });
      }
      setMedPendientes(pendientes);

      // Ausencias activas
      const ausConPaciente = ausenciasDB.map(a => ({
        ausencia: a,
        paciente: pacientesActivos.find(p => p.id === a.pacienteId)!,
      })).filter(x => !!x.paciente);
      setAusenciasActivas(ausConPaciente);

      setLastUpdate(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const totalPendientes = sinSignosHoy.length + medPendientes.length;

  const sections: { title: string; icono: string; color: string; data: SeccionItem[] }[] = [
    ...(medPendientes.length > 0 ? [{
      title: 'Medicamentos pendientes',
      icono: 'pill-off',
      color: '#E65100',
      data: medPendientes.map(x => ({ tipo: 'medicamento' as const, paciente: x.paciente, med: x.med })),
    }] : []),
    ...(sinSignosHoy.length > 0 ? [{
      title: 'Sin signos vitales hoy',
      icono: 'heart-pulse',
      color: '#C62828',
      data: sinSignosHoy.map(p => ({ tipo: 'signos' as const, paciente: p })),
    }] : []),
    ...(ausenciasActivas.length > 0 ? [{
      title: 'Pacientes ausentes',
      icono: 'calendar-remove',
      color: '#1565C0',
      data: ausenciasActivas.map(x => ({ tipo: 'ausencia' as const, paciente: x.paciente, ausencia: x.ausencia })),
    }] : []),
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      {/* Resumen */}
      <View style={[styles.resumenBar, { backgroundColor: colors.surface }]}>
        <View style={[styles.resumenIcono, { backgroundColor: totalPendientes > 0 ? '#FFEBEE' : '#E8F5E9' }]}>
          <MaterialCommunityIcons
            name={totalPendientes > 0 ? 'alert-circle' : 'check-circle'}
            size={28}
            color={totalPendientes > 0 ? '#C62828' : '#2E7D32'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.resumenNum, { color: totalPendientes > 0 ? '#C62828' : '#2E7D32' }]}>
            {totalPendientes === 0 ? '¡Todo al día!' : `${totalPendientes} tarea${totalPendientes !== 1 ? 's' : ''} pendiente${totalPendientes !== 1 ? 's' : ''}`}
          </Text>
          <Text style={styles.resumenSub}>
            {ausenciasActivas.length > 0 ? `${ausenciasActivas.length} paciente${ausenciasActivas.length !== 1 ? 's' : ''} ausente${ausenciasActivas.length !== 1 ? 's' : ''}  •  ` : ''}
            Actualizado {lastUpdate || '...'}
          </Text>
        </View>
        <TouchableOpacity onPress={cargar} style={styles.refrescarBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={styles.todoBien}>
          <MaterialCommunityIcons name="check-decagram" size={64} color='#2E7D32' />
          <Text style={styles.todoBienTitulo}>¡Guardia al día!</Text>
          <Text style={styles.todoBienSub}>No hay tareas pendientes para este turno.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, idx) => `${item.tipo}-${idx}`}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={cargar} />}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={[styles.seccionHeader, { borderLeftColor: section.color }]}>
              <MaterialCommunityIcons name={section.icono as any} size={16} color={section.color} />
              <Text style={[styles.seccionTitulo, { color: section.color }]}>{section.title}</Text>
              <View style={[styles.seccionBadge, { backgroundColor: section.color }]}>
                <Text style={styles.seccionBadgeTexto}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item }: { item: SeccionItem }) => {
            if (item.tipo === 'medicamento' && item.med) {
              return (
                <TouchableOpacity
                  style={[styles.card, { backgroundColor: colors.surface }]}
                  onPress={() => navigation.navigate('Medicamentos', {
                    screen: 'ListaMedicamentos',
                    params: { pacienteId: item.paciente.id, pacienteNombre: `${item.paciente.nombre} ${item.paciente.apellido}` },
                  })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cardIcono, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialCommunityIcons name="pill" size={20} color='#E65100' />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitulo}>{item.med.nombre}</Text>
                    <Text style={styles.cardSub}>{item.paciente.nombre} {item.paciente.apellido}  •  Hab. {item.paciente.habitacion}</Text>
                    <Text style={styles.cardDet}>{item.med.dosis}  •  {item.med.horario}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              );
            }
            if (item.tipo === 'signos') {
              return (
                <TouchableOpacity
                  style={[styles.card, { backgroundColor: colors.surface }]}
                  onPress={() => navigation.navigate('SignosVitales', {
                    screen: 'RegistrarSignos',
                    params: { pacienteId: item.paciente.id, pacienteNombre: `${item.paciente.nombre} ${item.paciente.apellido}` },
                  })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cardIcono, { backgroundColor: '#FFEBEE' }]}>
                    <MaterialCommunityIcons name="heart-pulse" size={20} color='#C62828' />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitulo}>{item.paciente.nombre} {item.paciente.apellido}</Text>
                    <Text style={styles.cardSub}>Hab. {item.paciente.habitacion}  •  Sin signos hoy</Text>
                  </View>
                  <View style={styles.registrarBadge}>
                    <Text style={styles.registrarBadgeTexto}>Registrar</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            // ausencia
            if (item.tipo === 'ausencia' && item.ausencia) {
              return (
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={[styles.cardIcono, { backgroundColor: '#E3F2FD' }]}>
                    <MaterialCommunityIcons name="calendar-remove" size={20} color='#1565C0' />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitulo}>{item.paciente.nombre} {item.paciente.apellido}</Text>
                    <Text style={styles.cardSub}>Hab. {item.paciente.habitacion}</Text>
                    <Text style={styles.cardDet}>
                      {item.ausencia.tipo === 'internacion' ? 'Internado' :
                       item.ausencia.tipo === 'salida_familiar' ? 'Salida familiar' :
                       item.ausencia.tipo === 'licencia' ? 'Licencia médica' : 'Ausente'}
                      {item.ausencia.destino ? ` — ${item.ausencia.destino}` : ''}
                    </Text>
                  </View>
                  <View style={styles.ausenteBadge}>
                    <Text style={styles.ausenteBadgeTexto}>Ausente</Text>
                  </View>
                </View>
              );
            }
            return null;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  resumenBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, marginBottom: 8, borderRadius: 16,
    padding: 16, elevation: 2,
  },
  resumenIcono: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  resumenNum: { fontSize: FONT_SIZES.md, fontWeight: '800' },
  resumenSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  refrescarBtn: { padding: 6 },

  todoBien: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  todoBienTitulo: { fontSize: 24, fontWeight: '800', color: '#2E7D32' },
  todoBienSub: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },

  lista: { padding: 16, gap: 6 },
  seccionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderLeftWidth: 3, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.background,
    marginBottom: 4,
  },
  seccionTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '800', flex: 1 },
  seccionBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  seccionBadgeTexto: { color: '#fff', fontSize: 11, fontWeight: '800' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12, elevation: 1, marginBottom: 6,
  },
  cardIcono: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  cardDet: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  registrarBadge: {
    backgroundColor: '#C62828', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  registrarBadgeTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ausenteBadge: {
    backgroundColor: '#E3F2FD', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#90CAF9',
  },
  ausenteBadgeTexto: { color: '#1565C0', fontSize: 11, fontWeight: '700' },
});
