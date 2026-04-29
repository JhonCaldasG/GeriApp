import React, { useCallback, useMemo, useState } from 'react';
import { View, SectionList, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MedicamentosStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatearFechaHora } from '../../storage';
import EmptyState from '../../components/EmptyState';
import EditarAdministracionModal from '../../components/EditarAdministracionModal';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { useEliminar } from '../../hooks/useEliminar';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<MedicamentosStackParamList, 'HistorialAdministraciones'>;

function fechaSolo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function hoySolo(): string {
  return new Date().toISOString().slice(0, 10);
}

function dosesPerDay(frecuencia: string): number | null {
  const f = frecuencia.toLowerCase().trim();
  if (f.includes('4 hora')) return 6;
  if (f.includes('6 hora')) return 4;
  if (f.includes('8 hora')) return 3;
  if (f.includes('12 hora')) return 2;
  if (f === 'una vez al día' || f === 'una vez al dia') return 1;
  if (f.includes('dos veces')) return 2;
  if (f.includes('tres veces')) return 3;
  return null; // sin límite definido
}

export default function HistorialAdministracionesScreen({ route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { administraciones, cargarAdministraciones, eliminarAdministracion, medicamentos, cargarMedicamentos } = useApp();
  const { isAdmin } = useAuth();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [adminEditar, setAdminEditar] = useState<typeof administraciones[0] | null>(null);

  // Recargar datos cada vez que la pantalla toma foco
  useFocusEffect(useCallback(() => {
    cargarAdministraciones();
    cargarMedicamentos(pacienteId);
  }, [pacienteId]));

  const hoy = hoySolo();

  const adminsPaciente = useMemo(
    () => administraciones.filter(a => a.pacienteId === pacienteId),
    [administraciones, pacienteId]
  );

  const medsPaciente = useMemo(
    () => medicamentos.filter(m => m.pacienteId === pacienteId),
    [medicamentos, pacienteId]
  );

  // Cuántas veces se administró hoy cada medicamento
  const dosisHoyPorMed = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of adminsPaciente) {
      if (a.createdAt.slice(0, 10) === hoy) {
        map[a.medicamentoId] = (map[a.medicamentoId] ?? 0) + 1;
      }
    }
    return map;
  }, [adminsPaciente, hoy]);

  // Pendiente si tiene menos dosis hoy de las requeridas
  const pendientesHoy = useMemo(
    () => medsPaciente.filter(m => {
      if (!m.activo) return false;
      const requeridas = dosesPerDay(m.frecuencia);
      const dadas = dosisHoyPorMed[m.id] ?? 0;
      if (requeridas === null) return dadas === 0; // sin límite → pendiente si no se dio ninguna hoy
      return dadas < requeridas;
    }),
    [medsPaciente, dosisHoyPorMed]
  );

  // Detalle de cuántas le faltan por dar
  function dosisFaltantes(m: typeof medsPaciente[0]): string {
    const requeridas = dosesPerDay(m.frecuencia);
    const dadas = dosisHoyPorMed[m.id] ?? 0;
    if (requeridas === null) return m.dosis;
    const faltan = requeridas - dadas;
    return `${m.dosis}  •  ${dadas}/${requeridas} dosis (faltan ${faltan})`;
  }

  // Agrupar historial por fecha
  const secciones = useMemo(() => {
    const grupos: Record<string, typeof adminsPaciente> = {};
    for (const a of adminsPaciente) {
      const fecha = a.createdAt.slice(0, 10);
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(a);
    }
    return Object.entries(grupos)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, data]) => ({ title: fechaSolo(fecha + 'T12:00:00'), data }));
  }, [adminsPaciente]);

  function confirmarEliminar(id: string, nombre: string, hora: string) {
    ejecutarEliminacion(
      'Eliminar dosis',
      `¿Está seguro que desea eliminar el registro de "${nombre}" del ${hora}?\n\nEsta acción no se puede deshacer.`,
      async () => { await eliminarAdministracion(id); },
    );
  }

  const totalAdministradas = adminsPaciente.length;

  return (
    <View style={styles.container}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color="#E65100" />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      {/* Resumen */}
      <View style={styles.resumenRow}>
        <View style={[styles.resumenCard, { borderLeftColor: COLORS.secondaryLight }]}>
          <Text style={styles.resumenNum}>{totalAdministradas}</Text>
          <Text style={styles.resumenLabel}>Dosis{'\n'}registradas</Text>
        </View>
        <View style={[styles.resumenCard, { borderLeftColor: pendientesHoy.length > 0 ? COLORS.danger : COLORS.secondaryLight }]}>
          <Text style={[styles.resumenNum, pendientesHoy.length > 0 && { color: COLORS.danger }]}>
            {pendientesHoy.length}
          </Text>
          <Text style={styles.resumenLabel}>Pendientes{'\n'}hoy</Text>
        </View>
        <View style={[styles.resumenCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.resumenNum}>{medsPaciente.filter(m => m.activo).length}</Text>
          <Text style={styles.resumenLabel}>Medicamentos{'\n'}activos</Text>
        </View>
      </View>

      {/* Pendientes hoy */}
      {pendientesHoy.length > 0 && (
        <View style={styles.pendientesBox}>
          <View style={styles.pendientesHeader}>
            <MaterialCommunityIcons name="clock-alert-outline" size={18} color={COLORS.danger} />
            <Text style={styles.pendientesTitulo}>Pendientes hoy ({pendientesHoy.length})</Text>
          </View>
          {pendientesHoy.map(m => (
            <View key={m.id} style={styles.pendienteItem}>
              <MaterialCommunityIcons name="pill" size={14} color={COLORS.warningLight} />
              <Text style={styles.pendienteNombre}>{m.nombre}</Text>
              <Text style={styles.pendienteDosis}>{dosisFaltantes(m)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Historial */}
      <SectionList
        sections={secciones}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.lista, secciones.length === 0 && { flex: 1 }]}
        renderSectionHeader={({ section }) => (
          <View style={styles.seccionHeader}>
            <Text style={styles.seccionFecha}>{section.title}</Text>
            <Text style={styles.seccionCount}>{section.data.length} dosis</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.adminCard, item.rechazado && styles.adminCardRechazado]}>
            <View style={[styles.adminIcono, item.rechazado && { backgroundColor: '#FFEBEE' }]}>
              <MaterialCommunityIcons
                name={item.rechazado ? 'pill-off' : 'pill'}
                size={20}
                color={item.rechazado ? COLORS.danger : COLORS.secondaryLight}
              />
            </View>
            <View style={styles.adminInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.adminNombre}>{item.medicamentoNombre}</Text>
                {item.rechazado && (
                  <View style={styles.rechazadoChip}>
                    <Text style={styles.rechazadoChipTexto}>No administrado</Text>
                  </View>
                )}
                {!item.rechazado && item.numeroDosis != null && item.totalDiarias != null && (
                  <View style={styles.dosisChip}>
                    <Text style={styles.dosisChipTexto}>{item.numeroDosis}/{item.totalDiarias}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.adminDosis}>{item.dosis}</Text>
              <View style={styles.adminMeta}>
                <MaterialCommunityIcons name="account-check" size={13} color={COLORS.textSecondary} />
                <Text style={styles.adminFirmante}>{item.firmante}</Text>
                <Text style={styles.adminSep}>•</Text>
                <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.adminHora}>{formatearFechaHora(item.createdAt)}</Text>
              </View>
              {item.rechazado && item.motivoRechazo ? (
                <Text style={[styles.adminNotas, { color: COLORS.danger }]}>Motivo: {item.motivoRechazo}</Text>
              ) : null}
              {!item.rechazado && item.notas ? (
                <Text style={styles.adminNotas}>"{item.notas}"</Text>
              ) : null}
            </View>
            {isAdmin ? (
              <View style={styles.acciones}>
                <IconButton
                  icon="pencil-outline"
                  iconColor={COLORS.primary}
                  size={18}
                  style={styles.accionBtn}
                  onPress={() => setAdminEditar(item)}
                />
                <IconButton
                  icon="delete-outline"
                  iconColor={COLORS.danger}
                  size={18}
                  style={styles.accionBtn}
                  onPress={() => confirmarEliminar(item.id, item.medicamentoNombre, formatearFechaHora(item.createdAt))}
                />
              </View>
            ) : (
              <View style={styles.checkIcon}>
                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.secondaryLight} />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icono="pill-off"
            titulo="Sin dosis registradas"
            subtitulo="Las administraciones de medicamentos aparecerán aquí"
          />
        }
      />

      <EditarAdministracionModal
        visible={!!adminEditar}
        administracion={adminEditar}
        onDismiss={() => setAdminEditar(null)}
        onGuardado={() => {
          setAdminEditar(null);
          cargarAdministraciones();
        }}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF3E0', margin: 16, marginBottom: 8,
    borderRadius: 10, padding: 12, gap: 8,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#E65100' },
  resumenRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginBottom: 10,
  },
  resumenCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 10,
    padding: 12, borderLeftWidth: 4, elevation: 1, alignItems: 'center',
  },
  resumenNum: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  pendientesBox: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: '#FFF3E0',
    borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: COLORS.danger,
  },
  pendientesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pendientesTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.danger },
  pendienteItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  pendienteNombre: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  pendienteDosis: { fontSize: FONT_SIZES.xs, color: COLORS.warningLight },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  seccionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, marginTop: 4,
  },
  seccionFecha: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'capitalize' },
  seccionCount: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  adminCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 8, elevation: 1, gap: 10,
  },
  adminIcono: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  adminInfo: { flex: 1 },
  adminNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  adminDosis: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600', marginTop: 1 },
  adminMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  adminFirmante: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  adminSep: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  adminHora: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  adminNotas: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  checkIcon: { paddingTop: 2, alignSelf: 'center' },
  acciones: { flexDirection: 'column', alignItems: 'center', alignSelf: 'center' },
  accionBtn: { margin: 0 },
  dosisChip: {
    backgroundColor: '#E3F2FD', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  dosisChipTexto: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  adminCardRechazado: {
    opacity: 0.85,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  rechazadoChip: {
    backgroundColor: '#FFEBEE', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#EF9A9A',
  },
  rechazadoChipTexto: { fontSize: 10, fontWeight: '700', color: COLORS.danger },
});
