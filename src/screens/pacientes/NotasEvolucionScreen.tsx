import React, { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Alert, Modal,
  TouchableOpacity, TouchableWithoutFeedback, ScrollView, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, Button, TextInput, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PacientesStackParamList, NotaEvolucion, SignoVital, MedSnapshot, SignosSnapshot } from '../../types';
import { obtenerNotas, guardarNota, eliminarNota } from '../../storage/notas';
import { obtenerSignos } from '../../storage';
import { obtenerAdministraciones } from '../../storage/administraciones';
import { registrarAuditoria } from '../../storage/auditoria';
import { useAuth } from '../../context/AuthContext';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<PacientesStackParamList, 'NotasEnfermeria'>;
type Turno = 'mañana' | 'tarde' | 'noche';
type EstadoPaciente = 'estable' | 'regular' | 'delicado' | 'critico';

function turnoActual(): Turno {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 'mañana';
  if (h >= 14 && h < 22) return 'tarde';
  return 'noche';
}

const TURNOS: { valor: Turno; label: string; icono: string; color: string; bg: string }[] = [
  { valor: 'mañana', label: 'Mañana', icono: 'weather-sunny',         color: '#F57F17', bg: '#FFF8E1' },
  { valor: 'tarde',  label: 'Tarde',  icono: 'weather-partly-cloudy', color: '#1565C0', bg: '#E3F2FD' },
  { valor: 'noche',  label: 'Noche',  icono: 'weather-night',         color: '#4527A0', bg: '#EDE7F6' },
];

const ESTADOS: { valor: EstadoPaciente; label: string; color: string; bg: string }[] = [
  { valor: 'estable',  label: 'Estable',  color: '#2E7D32', bg: '#E8F5E9' },
  { valor: 'regular',  label: 'Regular',  color: '#F57F17', bg: '#FFF8E1' },
  { valor: 'delicado', label: 'Delicado', color: '#E65100', bg: '#FBE9E7' },
  { valor: 'critico',  label: 'Crítico',  color: '#C62828', bg: '#FFEBEE' },
];

const TURNO_CFG = Object.fromEntries(TURNOS.map(t => [t.valor, t])) as Record<Turno, typeof TURNOS[0]>;
const ESTADO_CFG = Object.fromEntries(ESTADOS.map(e => [e.valor, e])) as Record<EstadoPaciente, typeof ESTADOS[0]>;

function formatSignos(s: SignosSnapshot): string {
  const parts: string[] = [];
  if (s.presionSistolica && s.presionDiastolica) parts.push(`PA ${s.presionSistolica}/${s.presionDiastolica}`);
  if (s.frecuenciaCardiaca) parts.push(`FC ${s.frecuenciaCardiaca}`);
  if (s.temperatura) parts.push(`Temp ${s.temperatura}°C`);
  if (s.saturacionOxigeno) parts.push(`SpO₂ ${s.saturacionOxigeno}%`);
  if (s.glucosa) parts.push(`Glucosa ${s.glucosa}`);
  if (s.peso) parts.push(`Peso ${s.peso}kg`);
  return parts.join('  ·  ') || '—';
}

export default function NotasEvolucionScreen({ route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const insets = useSafeAreaInsets();
  const { usuario, isAdmin } = useAuth();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [notas, setNotas] = useState<NotaEvolucion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form
  const [turno, setTurno] = useState<Turno>(turnoActual());
  const [estadoPaciente, setEstadoPaciente] = useState<EstadoPaciente>('estable');
  const [texto, setTexto] = useState('');
  const [adjuntarSignos, setAdjuntarSignos] = useState(false);
  const [adjuntarMeds, setAdjuntarMeds] = useState(false);
  const [signosHoy, setSignosHoy] = useState<SignoVital | null>(null);
  const [medsHoy, setMedsHoy] = useState<MedSnapshot[]>([]);
  const [cargandoAdjuntos, setCargandoAdjuntos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setNotas(await obtenerNotas(pacienteId)); }
    catch { }
    finally { setCargando(false); }
  }, [pacienteId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function cargarDatosHoy() {
    setCargandoAdjuntos(true);
    try {
      const hoyStr = new Date().toDateString();
      const hoyISO = new Date().toISOString().slice(0, 10);
      const [allSignos, allAdmins] = await Promise.all([
        obtenerSignos(pacienteId),
        obtenerAdministraciones(),
      ]);
      const signos = allSignos.filter(s => new Date(s.createdAt).toDateString() === hoyStr);
      setSignosHoy(signos[0] ?? null);
      const meds = allAdmins
        .filter(a => a.pacienteId === pacienteId && a.createdAt.slice(0, 10) === hoyISO && !a.rechazado)
        .map(a => ({
          nombre: a.medicamentoNombre,
          dosis: a.dosis,
          hora: new Date(a.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        }));
      setMedsHoy(meds);
    } catch { }
    finally { setCargandoAdjuntos(false); }
  }

  function abrirModal() {
    setTurno(turnoActual());
    setEstadoPaciente('estable');
    setTexto('');
    setAdjuntarSignos(false);
    setAdjuntarMeds(false);
    setModalVisible(true);
    cargarDatosHoy();
  }

  async function handleGuardar() {
    if (!texto.trim()) return;
    setGuardando(true);
    try {
      const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Desconocido';
      const signosSnapshot: SignosSnapshot | null = adjuntarSignos && signosHoy ? {
        presionSistolica:   signosHoy.presionSistolica   || undefined,
        presionDiastolica:  signosHoy.presionDiastolica  || undefined,
        frecuenciaCardiaca: signosHoy.frecuenciaCardiaca || undefined,
        temperatura:        signosHoy.temperatura        || undefined,
        saturacionOxigeno:  signosHoy.saturacionOxigeno  || undefined,
        glucosa:            signosHoy.glucosa            || undefined,
        peso:               signosHoy.peso               || undefined,
      } : null;
      const nueva = await guardarNota({
        pacienteId,
        texto: texto.trim(),
        usuarioId: usuario?.id ?? '',
        usuarioNombre: nombre,
        turno,
        estadoPaciente,
        signosAdjuntos: signosSnapshot,
        medicamentosAdjuntos: adjuntarMeds && medsHoy.length > 0 ? medsHoy : null,
      });
      setNotas(prev => [nueva, ...prev]);
      setModalVisible(false);
      registrarAuditoria({
        usuarioId: usuario?.id ?? '',
        usuarioNombre: nombre,
        accion: 'nota_enfermeria',
        entidad: 'paciente',
        entidadId: pacienteId,
        detalle: `Paciente: ${pacienteNombre} — Turno: ${turno}`,
      });
    } catch {
      Alert.alert('Error', 'No se pudo guardar la nota.');
    } finally {
      setGuardando(false);
    }
  }

  function confirmarEliminar(nota: NotaEvolucion) {
    ejecutarEliminacion('Eliminar nota', '¿Eliminar esta nota de enfermería?', async () => {
      await eliminarNota(nota.id);
      setNotas(prev => prev.filter(n => n.id !== nota.id));
    });
  }

  function formatFechaHora(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={18} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
        <Text style={styles.totalBadge}>{notas.length} notas</Text>
      </View>

      <FlatList
        data={notas}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        onRefresh={cargar}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="notebook-outline" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>Sin notas de enfermería</Text>
            <Text style={styles.vacioSub}>Toca + para agregar la primera nota</Text>
          </View>
        }
        renderItem={({ item }) => {
          const tCfg = item.turno ? TURNO_CFG[item.turno] : null;
          const eCfg = item.estadoPaciente ? ESTADO_CFG[item.estadoPaciente] : null;
          return (
            <View style={styles.notaCard}>
              {/* Cabecera */}
              <View style={styles.notaHeader}>
                <View style={styles.notaIcono}>
                  <MaterialCommunityIcons name="note-text" size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.badgesRow}>
                    <Text style={styles.notaAutor} numberOfLines={1}>{item.usuarioNombre}</Text>
                    {tCfg && (
                      <View style={[styles.badge, { backgroundColor: tCfg.bg }]}>
                        <Text style={[styles.badgeTexto, { color: tCfg.color }]}>{tCfg.label}</Text>
                      </View>
                    )}
                    {eCfg && (
                      <View style={[styles.badge, { backgroundColor: eCfg.bg }]}>
                        <Text style={[styles.badgeTexto, { color: eCfg.color }]}>{eCfg.label}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.notaFecha}>{formatFechaHora(item.createdAt)}</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => confirmarEliminar(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Texto */}
              <Text style={styles.notaTexto}>{item.texto}</Text>

              {/* Signos adjuntos */}
              {item.signosAdjuntos && (
                <View style={styles.adjuntoBox}>
                  <View style={styles.adjuntoHeader}>
                    <MaterialCommunityIcons name="heart-pulse" size={13} color="#C62828" />
                    <Text style={[styles.adjuntoTitulo, { color: '#C62828' }]}>Signos del turno</Text>
                  </View>
                  <Text style={styles.adjuntoTexto}>{formatSignos(item.signosAdjuntos)}</Text>
                </View>
              )}

              {/* Medicamentos adjuntos */}
              {item.medicamentosAdjuntos && item.medicamentosAdjuntos.length > 0 && (
                <View style={[styles.adjuntoBox, { marginTop: 6, borderColor: '#EDE7F6' }]}>
                  <View style={styles.adjuntoHeader}>
                    <MaterialCommunityIcons name="pill" size={13} color="#7B1FA2" />
                    <Text style={[styles.adjuntoTitulo, { color: '#7B1FA2' }]}>
                      Medicamentos ({item.medicamentosAdjuntos.length})
                    </Text>
                  </View>
                  {item.medicamentosAdjuntos.map((m, i) => (
                    <Text key={i} style={styles.adjuntoTexto}>• {m.nombre} {m.dosis} — {m.hora}</Text>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />

      <FAB icon="plus" style={styles.fab} onPress={abrirModal} />
      <FeedbackEliminar eliminando={eliminando} exito={exito} />

      {/* Modal nueva nota */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitulo}>Nueva nota de enfermería</Text>
              <Text style={styles.modalSub}>{pacienteNombre}</Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Turno */}
            <Text style={styles.modalSeccion}>Turno</Text>
            <View style={styles.chipsRow}>
              {TURNOS.map(t => (
                <TouchableOpacity
                  key={t.valor}
                  style={[styles.chip, turno === t.valor && { backgroundColor: t.bg, borderColor: t.color }]}
                  onPress={() => setTurno(t.valor)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={t.icono as any}
                    size={15}
                    color={turno === t.valor ? t.color : COLORS.textSecondary}
                  />
                  <Text style={[styles.chipTexto, turno === t.valor && { color: t.color, fontWeight: '700' }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Estado */}
            <Text style={styles.modalSeccion}>Estado del paciente</Text>
            <View style={[styles.chipsRow, { flexWrap: 'wrap' }]}>
              {ESTADOS.map(e => (
                <TouchableOpacity
                  key={e.valor}
                  style={[styles.chip, estadoPaciente === e.valor && { backgroundColor: e.bg, borderColor: e.color }]}
                  onPress={() => setEstadoPaciente(e.valor)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipTexto, estadoPaciente === e.valor && { color: e.color, fontWeight: '700' }]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Observación */}
            <Text style={styles.modalSeccion}>Observación *</Text>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              mode="outlined"
              placeholder="Describir estado general, cambios observados, cuidados realizados, respuesta del paciente..."
              multiline
              numberOfLines={4}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              style={styles.input}
              autoFocus
            />

            {/* Adjuntar */}
            <Text style={styles.modalSeccion}>Adjuntar al registro</Text>

            <View style={styles.adjuntarRow}>
              <View style={[styles.adjuntarIcono, { backgroundColor: '#FFEBEE' }]}>
                <MaterialCommunityIcons name="heart-pulse" size={16} color="#C62828" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adjuntarLabel}>Signos vitales del día</Text>
                <Text
                  style={signosHoy ? styles.adjuntarPrev : styles.adjuntarSinDatos}
                  numberOfLines={1}
                >
                  {cargandoAdjuntos ? 'Cargando...' : signosHoy ? formatSignos(signosHoy) : 'Sin registro hoy'}
                </Text>
              </View>
              <Switch
                value={adjuntarSignos}
                onValueChange={setAdjuntarSignos}
                disabled={!signosHoy || cargandoAdjuntos}
                trackColor={{ false: COLORS.border, true: '#FFCDD2' }}
                thumbColor={adjuntarSignos ? '#C62828' : COLORS.surface}
              />
            </View>

            <View style={[styles.adjuntarRow, { marginTop: 8, marginBottom: 20 }]}>
              <View style={[styles.adjuntarIcono, { backgroundColor: '#EDE7F6' }]}>
                <MaterialCommunityIcons name="pill" size={16} color="#7B1FA2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adjuntarLabel}>Medicamentos administrados hoy</Text>
                <Text style={medsHoy.length > 0 ? styles.adjuntarPrev : styles.adjuntarSinDatos}>
                  {cargandoAdjuntos
                    ? 'Cargando...'
                    : medsHoy.length > 0
                    ? `${medsHoy.length} administración${medsHoy.length > 1 ? 'es' : ''}`
                    : 'Sin administraciones hoy'}
                </Text>
              </View>
              <Switch
                value={adjuntarMeds}
                onValueChange={setAdjuntarMeds}
                disabled={medsHoy.length === 0 || cargandoAdjuntos}
                trackColor={{ false: COLORS.border, true: '#E1BEE7' }}
                thumbColor={adjuntarMeds ? '#7B1FA2' : COLORS.surface}
              />
            </View>

            <View style={styles.modalBotones}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.btnCancelar}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleGuardar}
                loading={guardando}
                disabled={guardando || !texto.trim()}
                style={styles.btnGuardar}
                icon="content-save"
              >
                Guardar
              </Button>
            </View>
          </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E3F2FD', margin: 16, marginBottom: 8,
    borderRadius: 10, padding: 12,
  },
  pacienteNombre: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  totalBadge: {
    fontSize: FONT_SIZES.xs, color: COLORS.primary,
    backgroundColor: '#BBDEFB', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },

  lista: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },

  vacio: { alignItems: 'center', paddingTop: 60, gap: 10 },
  vacioTexto: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textSecondary },
  vacioSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // ── Nota card ──────────────────────────────────────────────────────────────
  notaCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, elevation: 1,
  },
  notaHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  notaIcono: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  notaAutor: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  notaFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

  badge: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeTexto: { fontSize: 10, fontWeight: '700' },

  notaTexto: {
    fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 22,
    backgroundColor: COLORS.background, borderRadius: 8, padding: 10,
  },

  adjuntoBox: {
    marginTop: 8, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
  },
  adjuntoHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  adjuntoTitulo: { fontSize: FONT_SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  adjuntoTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textPrimary, lineHeight: 18 },

  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.primary },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    elevation: 20, maxHeight: '92%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  modalTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary },
  modalSub: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  modalSeccion: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },

  // Chips turno / estado
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  chipTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // Observación
  input: { backgroundColor: COLORS.surface, marginBottom: 18 },

  // Adjuntar
  adjuntarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.background, borderRadius: 12, padding: 12,
  },
  adjuntarIcono: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  adjuntarLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  adjuntarPrev: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  adjuntarSinDatos: { fontSize: FONT_SIZES.xs, color: COLORS.border, marginTop: 2, fontStyle: 'italic' },

  // Botones
  modalBotones: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  btnCancelar: { flex: 1, borderColor: COLORS.border },
  btnGuardar: { flex: 2, backgroundColor: COLORS.primary },
});
