import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, SectionList, StyleSheet, Alert, Modal, ActivityIndicator,
  TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Incumplimiento, Paciente } from '../../types';
import { obtenerIncumplimientos, enviarRequerimiento, resolverRequerimiento, rechazarRequerimiento, eliminarIncumplimiento, obtenerCompletadosIds } from '../../storage/incumplimientos';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { obtenerPacientes } from '../../storage';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { exportarExcel } from '../../utils/exportarExcel';

// ── Donut chart ───────────────────────────────────────────────────────────────
const CHART_SIZE = 148;
const OUTER_R = 62;
const INNER_R = 41;
const CX = CHART_SIZE / 2;
const CY = CHART_SIZE / 2;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(startAngle: number, endAngle: number): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.9) {
    // Full circle: two semicircles
    const t = polarToCartesian(CX, CY, OUTER_R, 0);
    const b = polarToCartesian(CX, CY, OUTER_R, 180);
    const ti = polarToCartesian(CX, CY, INNER_R, 0);
    const bi = polarToCartesian(CX, CY, INNER_R, 180);
    return [
      `M ${t.x} ${t.y} A ${OUTER_R} ${OUTER_R} 0 1 1 ${b.x} ${b.y}`,
      `A ${OUTER_R} ${OUTER_R} 0 1 1 ${t.x} ${t.y}`,
      `M ${ti.x} ${ti.y} A ${INNER_R} ${INNER_R} 0 1 0 ${bi.x} ${bi.y}`,
      `A ${INNER_R} ${INNER_R} 0 1 0 ${ti.x} ${ti.y} Z`,
    ].join(' ');
  }
  const os = polarToCartesian(CX, CY, OUTER_R, startAngle);
  const oe = polarToCartesian(CX, CY, OUTER_R, endAngle);
  const is_ = polarToCartesian(CX, CY, INNER_R, startAngle);
  const ie = polarToCartesian(CX, CY, INNER_R, endAngle);
  const large = sweep > 180 ? '1' : '0';
  return [
    `M ${os.x} ${os.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${is_.x} ${is_.y}`,
    'Z',
  ].join(' ');
}

interface Segmento { label: string; value: number; color: string }

function GraficoInfracciones({
  total, signos, medicamentos, segmentos,
}: {
  total: number; signos: number; medicamentos: number; segmentos: Segmento[];
}) {
  const { colors } = useAppTheme();
  const cerradas = segmentos.find(s => s.label === 'Cerradas')?.value ?? 0;
  const tasaCierre = total > 0 ? Math.round((cerradas / total) * 100) : 0;

  // Build arc paths
  let angle = 0;
  const arcs = segmentos
    .filter(s => s.value > 0)
    .map(seg => {
      const sweep = (seg.value / total) * 360;
      const start = angle;
      const end = angle + sweep - (segmentos.filter(s => s.value > 0).length > 1 ? 1.5 : 0);
      angle += sweep;
      return { ...seg, path: donutArc(start, end) };
    });

  return (
    <View style={[styles.graficoCard, { backgroundColor: colors.surface }]}>
      <Text style={styles.graficoTitulo}>Resumen de infracciones</Text>
      <Text style={styles.graficoSubtitulo}>Últimos 60 días</Text>

      <View style={styles.graficoBody}>
        {/* Donut */}
        <View>
          <Svg width={CHART_SIZE} height={CHART_SIZE}>
            {total === 0 ? (
              <Circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke={COLORS.border} strokeWidth={OUTER_R - INNER_R} />
            ) : (
              arcs.map((a, i) => <Path key={i} d={a.path} fill={a.color} />)
            )}
            <Circle cx={CX} cy={CY} r={INNER_R - 2} fill={colors.surface} />
          </Svg>
          <View style={styles.graficoCentro} pointerEvents="none">
            <Text style={styles.graficoCentroNum}>{total}</Text>
            <Text style={styles.graficoCentroLabel}>total</Text>
          </View>
        </View>

        {/* Leyenda */}
        <View style={styles.leyenda}>
          {segmentos.map((seg, i) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <View key={i} style={styles.leyendaFila}>
                <View style={[styles.leyendaDot, { backgroundColor: seg.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.leyendaNombre} numberOfLines={1}>{seg.label}</Text>
                  <Text style={styles.leyendaNumero}>
                    <Text style={{ color: seg.color, fontWeight: '700' }}>{seg.value}</Text>
                    {'  '}
                    <Text style={styles.leyendaPct}>{pct}%</Text>
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tipos + tasa cierre */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="heart-pulse" size={15} color="#E65100" />
          <Text style={styles.statLabel}>Signos</Text>
          <Text style={[styles.statVal, { color: '#E65100' }]}>{signos}</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="pill-off" size={15} color="#7B1FA2" />
          <Text style={styles.statLabel}>Medicamentos</Text>
          <Text style={[styles.statVal, { color: '#7B1FA2' }]}>{medicamentos}</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="check-circle-outline" size={15} color="#2E7D32" />
          <Text style={styles.statLabel}>Tasa cierre</Text>
          <Text style={[styles.statVal, { color: '#2E7D32' }]}>{tasaCierre}%</Text>
        </View>
      </View>
    </View>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────
function formatFecha(iso: string): string {
  const hoy = new Date().toISOString().slice(0, 10);
  if (iso === hoy) return 'hoy';
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  if (iso === ayer.toISOString().slice(0, 10)) return 'ayer';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function formatTS(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ── Modal requerimiento ────────────────────────────────────────────────────────
interface RequerimientoModalProps {
  visible: boolean;
  incumplimiento: Incumplimiento | null;
  paciente: Paciente | null;
  onEnviar: (id: string, motivo: string) => Promise<void>;
  onCerrar: () => void;
}

function RequerimientoModal({ visible, incumplimiento, paciente, onEnviar, onCerrar }: RequerimientoModalProps) {
  const insets = useSafeAreaInsets();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { if (visible) setMotivo(''); }, [visible]);

  async function handleEnviar() {
    if (!motivo.trim()) {
      Alert.alert('Campo requerido', 'Ingrese el motivo de la solicitud de justificación.');
      return;
    }
    setEnviando(true);
    try {
      await onEnviar(incumplimiento!.id, motivo);
      onCerrar();
    } catch {
      Alert.alert('Error', 'No se pudo enviar el requerimiento.');
    } finally {
      setEnviando(false);
    }
  }

  if (!incumplimiento || !paciente) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onCerrar}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.modalHandle} />

        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitulo}>Solicitud de Justificación</Text>
            <Text style={styles.modalSubtitulo}>
              {paciente.nombre} {paciente.apellido}  •  {incumplimiento.tipo === 'signos_vitales' ? `Toma ${incumplimiento.detalle}` : incumplimiento.detalle}
            </Text>
          </View>
          <TouchableOpacity onPress={onCerrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Detalle del incumplimiento */}
        <View style={styles.incInfo}>
          <MaterialCommunityIcons
            name={incumplimiento.tipo === 'signos_vitales' ? 'heart-pulse' : 'pill-off'}
            size={16} color="#E65100"
          />
          <Text style={styles.incInfoTexto}>
            Incumplimiento — venció a las {incumplimiento.horaFin || '—'}  •  {formatFecha(incumplimiento.fecha)}
          </Text>
        </View>

        <Text style={styles.modalSeccion}>Motivo de la solicitud</Text>
        <TextInput
          label="Explique por qué no se pudo registrar *"
          value={motivo}
          onChangeText={setMotivo}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          multiline
          numberOfLines={4}
          style={styles.motivoInput}
          placeholder="Ej: El paciente fue trasladado de urgencia, el equipo presentó falla técnica..."
        />

        <View style={styles.modalBotones}>
          <Button mode="outlined" onPress={onCerrar} style={styles.botonCancelar}>Cancelar</Button>
          <Button
            mode="contained"
            onPress={handleEnviar}
            loading={enviando}
            disabled={enviando}
            style={styles.botonEnviar}
            icon="send"
          >
            Enviar solicitud
          </Button>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal rechazo ─────────────────────────────────────────────────────────────
interface RechazoModalProps {
  visible: boolean;
  incumplimiento: Incumplimiento | null;
  paciente: Paciente | null;
  onRechazar: (id: string, motivo: string) => Promise<void>;
  onCerrar: () => void;
}

function RechazoModal({ visible, incumplimiento, paciente, onRechazar, onCerrar }: RechazoModalProps) {
  const insets = useSafeAreaInsets();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { if (visible) setMotivo(''); }, [visible]);

  async function handleRechazar() {
    if (!motivo.trim()) {
      Alert.alert('Campo requerido', 'Ingrese el motivo del rechazo.');
      return;
    }
    setEnviando(true);
    try {
      await onRechazar(incumplimiento!.id, motivo);
      onCerrar();
    } catch {
      Alert.alert('Error', 'No se pudo registrar el rechazo.');
    } finally {
      setEnviando(false);
    }
  }

  if (!incumplimiento || !paciente) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onCerrar}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitulo}>Rechazar requerimiento</Text>
              <Text style={[styles.modalSubtitulo, { color: COLORS.danger }]}>
                {paciente.nombre} {paciente.apellido}  •  {incumplimiento.tipo === 'signos_vitales' ? `Toma ${incumplimiento.detalle}` : incumplimiento.detalle}
              </Text>
            </View>
            <TouchableOpacity onPress={onCerrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.incInfo, { backgroundColor: '#FFEBEE' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={[styles.incInfoTexto, { color: COLORS.danger }]}>
              Al rechazar, el registro NO será habilitado para el enfermero.
            </Text>
          </View>

          <Text style={styles.modalSeccion}>Motivo del rechazo</Text>
          <TextInput
            label="Explique por qué se rechaza la solicitud *"
            value={motivo}
            onChangeText={setMotivo}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.danger}
            multiline
            numberOfLines={4}
            style={styles.motivoInput}
            placeholder="Ej: La justificación no es válida según el protocolo..."
          />

          <View style={styles.modalBotones}>
            <Button mode="outlined" onPress={onCerrar} style={styles.botonCancelar}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={handleRechazar}
              loading={enviando}
              disabled={enviando}
              style={[styles.botonEnviar, { backgroundColor: COLORS.danger }]}
              icon="close-circle"
            >
              Rechazar
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Tarjeta de incumplimiento ──────────────────────────────────────────────────
interface IncCard {
  inc: Incumplimiento;
  paciente: Paciente | undefined;
  seccion: 'sin_justificar' | 'pendiente' | 'resuelto' | 'rechazado';
  isAdmin: boolean;
  completado: boolean;
  onEnviarReq: (inc: Incumplimiento) => void;
  onResolver: (inc: Incumplimiento) => void;
  onRechazar: (inc: Incumplimiento) => void;
  onEliminar: (inc: Incumplimiento) => void;
  onIrARegistrar: (inc: Incumplimiento, paciente: Paciente) => void;
}

function IncumplimientoCard({ inc, paciente, seccion, isAdmin, completado, onEnviarReq, onResolver, onRechazar, onEliminar, onIrARegistrar }: IncCard) {
  const esSignos = inc.tipo === 'signos_vitales';
  const iconoTipo = esSignos ? 'heart-pulse' : 'pill-off';
  const colorTipo = seccion === 'resuelto' ? '#2E7D32' : seccion === 'rechazado' ? COLORS.danger : seccion === 'pendiente' ? '#1565C0' : '#E65100';
  const bgCard = seccion === 'resuelto' ? '#F1F8E9' : seccion === 'rechazado' ? '#FFEBEE' : seccion === 'pendiente' ? '#E3F2FD' : '#FBE9E7';
  const borderColor = seccion === 'resuelto' ? '#A5D6A7' : seccion === 'rechazado' ? '#EF9A9A' : seccion === 'pendiente' ? '#90CAF9' : '#FFAB91';

  return (
    <View style={[styles.incCard, { borderLeftColor: colorTipo, backgroundColor: bgCard, borderColor }]}>
      {/* Encabezado */}
      <View style={styles.incCardHeader}>
        <View style={[styles.incIcono, { backgroundColor: bgCard }]}>
          <MaterialCommunityIcons name={iconoTipo as any} size={20} color={colorTipo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.incPaciente, { color: colorTipo }]}>
            {paciente ? `${paciente.nombre} ${paciente.apellido}` : 'Paciente'}
            {esSignos ? `  •  Toma ${inc.detalle}` : `  •  ${inc.detalle}`}
          </Text>
          <Text style={styles.incDetalle}>
            Incumplimiento — venció a las {inc.horaFin || '—'}  •  {formatFecha(inc.fecha)}
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={() => onEliminar(inc)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Traza del requerimiento */}
      {inc.requerimientoMotivo && (
        <View style={styles.requerimientoTraza}>
          <View style={styles.trazaFila}>
            <MaterialCommunityIcons name="send-circle-outline" size={14} color="#1565C0" />
            <Text style={styles.trazaLabel}>Solicitud enviada</Text>
            <Text style={styles.trazaFecha}>{inc.requerimientoFecha ? formatTS(inc.requerimientoFecha) : ''}</Text>
          </View>
          <Text style={styles.trazaMotivo}>"{inc.requerimientoMotivo}"</Text>
          {inc.requerimientoResueltoEn && (
            <View style={[styles.trazaFila, { marginTop: 6 }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color="#2E7D32" />
              <Text style={[styles.trazaLabel, { color: '#2E7D32' }]}>Aceptado — registro habilitado</Text>
              <Text style={styles.trazaFecha}>{formatTS(inc.requerimientoResueltoEn)}</Text>
            </View>
          )}
          {inc.requerimientoRechazadoEn && (
            <View style={[styles.trazaFila, { marginTop: 6 }]}>
              <MaterialCommunityIcons name="close-circle-outline" size={14} color={COLORS.danger} />
              <Text style={[styles.trazaLabel, { color: COLORS.danger }]}>Rechazado</Text>
              <Text style={styles.trazaFecha}>{formatTS(inc.requerimientoRechazadoEn)}</Text>
            </View>
          )}
          {inc.requerimientoRechazoMotivo && (
            <Text style={[styles.trazaMotivo, { color: COLORS.danger }]}>"{inc.requerimientoRechazoMotivo}"</Text>
          )}
        </View>
      )}

      {/* Acciones */}
      <View style={styles.incAcciones}>
        {seccion === 'sin_justificar' && (
          <TouchableOpacity
            style={styles.btnRequerimiento}
            onPress={() => onEnviarReq(inc)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="send" size={15} color={COLORS.white} />
            <Text style={styles.btnRequerimientoTexto}>Enviar requerimiento</Text>
          </TouchableOpacity>
        )}
        {seccion === 'pendiente' && (
          <View style={styles.pendienteAccionesCol}>
            <View style={styles.badgePendiente}>
              <MaterialCommunityIcons name="clock-outline" size={13} color="#1565C0" />
              <Text style={styles.badgePendienteTexto}>Requerimiento en espera</Text>
            </View>
            {isAdmin && (
              <View style={styles.pendienteBotones}>
                <TouchableOpacity
                  style={[styles.btnResolver, { flex: 1 }]}
                  onPress={() => onResolver(inc)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                  <Text style={styles.btnResolverTexto}>Aceptar y habilitar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnRechazar}
                  onPress={() => onRechazar(inc)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="close" size={14} color={COLORS.white} />
                  <Text style={styles.btnRechazarTexto}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        {seccion === 'resuelto' && (
          <View style={styles.resueltoBloq}>
            {completado ? (
              <View style={styles.badgeCompletado}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#2E7D32" />
                <Text style={styles.badgeCompletadoTexto}>
                  {inc.tipo === 'signos_vitales' ? 'Signos registrados' : 'Medicamento registrado'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.badgeResuelto}>
                  <MaterialCommunityIcons name="lock-open-variant" size={13} color="#2E7D32" />
                  <Text style={styles.badgeResueltoTexto}>Registro habilitado por admin</Text>
                </View>
                {!isAdmin && paciente && (
                  <TouchableOpacity
                    style={styles.btnIrARegistrar}
                    onPress={() => onIrARegistrar(inc, paciente)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={inc.tipo === 'signos_vitales' ? 'heart-pulse' : 'pill'}
                      size={14} color={COLORS.white}
                    />
                    <Text style={styles.btnIrARegistrarTexto}>
                      {inc.tipo === 'signos_vitales' ? 'Registrar signos' : 'Registrar medicamento'}
                    </Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color={COLORS.white} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
        {seccion === 'rechazado' && (
          <View style={styles.badgeRechazado}>
            <MaterialCommunityIcons name="close-circle" size={13} color={COLORS.danger} />
            <Text style={styles.badgeRechazadoTexto}>Requerimiento rechazado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function InfraccionesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { isAdmin, usuario } = useAuth();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [incumplimientos, setIncumplimientos] = useState<Incumplimiento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [iniciando, setIniciando] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [rechazoVisible, setRechazoVisible] = useState(false);
  const [incSeleccionado, setIncSeleccionado] = useState<Incumplimiento | null>(null);
  const [completadosIds, setCompletadosIds] = useState<Set<string>>(new Set());
  const listRef = useRef<SectionList<any>>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [incs, pacs] = await Promise.all([obtenerIncumplimientos(60), obtenerPacientes()]);
      setIncumplimientos(incs);
      setPacientes(pacs);
      const completados = await obtenerCompletadosIds(incs);
      setCompletadosIds(completados);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
      setIniciando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  // Auto-abrir modal de requerimiento si se llega desde Dashboard o RegistrarSignos
  useEffect(() => {
    const { autoAbrirPacienteId, autoAbrirDetalle, autoAbrirTipo } = route.params ?? {};
    if (!autoAbrirPacienteId || !autoAbrirDetalle) return;
    if (incumplimientos.length === 0) return;
    const inc = incumplimientos.find(i =>
      i.pacienteId === autoAbrirPacienteId &&
      i.detalle === autoAbrirDetalle &&
      i.tipo === autoAbrirTipo
    );
    if (!inc) return;
    if (!inc.requerimientoEstado || inc.requerimientoEstado === 'rechazado') {
      // Sin requerimiento o rechazado → abrir formulario de envío
      setIncSeleccionado(inc);
      setModalVisible(true);
    }
    // pendiente/resuelto → el usuario solo navega a la pantalla, no abre modal
  }, [incumplimientos, route.params]);

  function abrirRequerimiento(inc: Incumplimiento) {
    setIncSeleccionado(inc);
    setModalVisible(true);
  }

  function handleIrARegistrar(inc: Incumplimiento, paciente: Paciente) {
    const pacienteNombre = `${paciente.nombre} ${paciente.apellido}`;
    if (inc.tipo === 'signos_vitales') {
      navigation.navigate('SignosVitales', {
        screen: 'RegistrarSignos',
        params: { pacienteId: paciente.id, pacienteNombre, tomaInicial: inc.detalle, fechaInfraccion: inc.fecha },
      });
    } else {
      navigation.navigate('Medicamentos', {
        screen: 'ListaMedicamentos',
        params: { pacienteId: paciente.id, pacienteNombre },
      });
    }
  }

  function abrirRechazo(inc: Incumplimiento) {
    setIncSeleccionado(inc);
    setRechazoVisible(true);
  }

  async function handleRechazarRequerimiento(id: string, motivo: string) {
    const inc = incumplimientos.find(i => i.id === id);
    const paciente = pacientes.find(p => p.id === inc?.pacienteId);
    await rechazarRequerimiento(id, motivo, inc, paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined);
    setIncumplimientos(prev => prev.map(i =>
      i.id === id ? {
        ...i,
        requerimientoEstado: 'rechazado',
        requerimientoRechazadoEn: new Date().toISOString(),
        requerimientoRechazoMotivo: motivo,
      } : i
    ));
  }

  async function handleEnviarRequerimiento(id: string, motivo: string) {
    const inc = incumplimientos.find(i => i.id === id);
    const paciente = pacientes.find(p => p.id === inc?.pacienteId);
    await enviarRequerimiento(
      id,
      motivo,
      usuario?.id,
      usuario ? `${usuario.nombre} ${usuario.apellido}` : undefined,
      paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined,
      inc?.detalle,
    );
    setIncumplimientos(prev => prev.map(i =>
      i.id === id ? { ...i, requerimientoMotivo: motivo, requerimientoEstado: 'pendiente', requerimientoFecha: new Date().toISOString() } : i
    ));
  }

  function confirmarResolver(inc: Incumplimiento) {
    const paciente = pacientes.find(p => p.id === inc.pacienteId);
    const pacienteNombre = paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined;
    Alert.alert(
      'Aceptar requerimiento',
      `¿Aceptar la solicitud de ${paciente?.nombre ?? 'este paciente'} y habilitar el registro pendiente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar y habilitar', onPress: async () => {
            try {
              await resolverRequerimiento(inc.id, inc, pacienteNombre);
              setIncumplimientos(prev => prev.map(i =>
                i.id === inc.id ? { ...i, requerimientoEstado: 'resuelto', requerimientoResueltoEn: new Date().toISOString() } : i
              ));
            } catch {
              Alert.alert('Error', 'No se pudo actualizar.');
            }
          },
        },
      ]
    );
  }

  function confirmarEliminar(inc: Incumplimiento) {
    ejecutarEliminacion('Eliminar registro', '¿Eliminar este registro de infracción?', async () => {
      await eliminarIncumplimiento(inc.id);
      setIncumplimientos(prev => prev.filter(i => i.id !== inc.id));
    });
  }

  async function handleExportarExcel() {
    if (incumplimientos.length === 0) { Alert.alert('Sin datos', 'No hay infracciones.'); return; }
    try {
      await exportarExcel('infracciones', [{
        nombre: 'Infracciones',
        datos: incumplimientos.map(i => ({
          Fecha: i.fecha,
          Paciente: (i as any).pacienteNombre ?? i.pacienteId,
          Tipo: i.tipo === 'signos_vitales' ? 'Signos Vitales' : 'Medicamento',
          Detalle: i.detalle,
          Estado: (i as any).requerimientoEstado ?? 'pendiente',
          'Fecha resolución': (i as any).requerimientoResueltoEn?.slice(0, 10) ?? '',
        })),
      }]);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo exportar.'); }
  }

  // Secciones
  const sinJustificar    = incumplimientos.filter(i => !i.requerimientoEstado && !completadosIds.has(i.id));
  const pendientes       = incumplimientos.filter(i => i.requerimientoEstado === 'pendiente');
  const resueltasPendReg = incumplimientos.filter(i => i.requerimientoEstado === 'resuelto' && !completadosIds.has(i.id));
  const cerradas         = incumplimientos.filter(i => completadosIds.has(i.id));
  const rechazadas       = incumplimientos.filter(i => i.requerimientoEstado === 'rechazado' && !completadosIds.has(i.id));

  const ITEMS_VISIBLES = 4;
  function sliceSeccion<T>(titulo: string, arr: T[]) {
    return expandedSections.has(titulo) ? arr : arr.slice(0, ITEMS_VISIBLES);
  }

  const sections = [
    ...(sinJustificar.length > 0    ? [{ titulo: 'Sin justificar', seccion: 'sin_justificar' as const, data: sliceSeccion('Sin justificar', sinJustificar), total: sinJustificar.length, color: '#E65100' }] : []),
    ...(pendientes.length > 0       ? [{ titulo: 'Requerimiento enviado', seccion: 'pendiente' as const, data: sliceSeccion('Requerimiento enviado', pendientes), total: pendientes.length, color: '#1565C0' }] : []),
    ...(resueltasPendReg.length > 0 ? [{ titulo: 'Registro habilitado', seccion: 'resuelto' as const, data: sliceSeccion('Registro habilitado', resueltasPendReg), total: resueltasPendReg.length, color: '#2E7D32' }] : []),
    ...(rechazadas.length > 0       ? [{ titulo: 'Rechazados', seccion: 'rechazado' as const, data: sliceSeccion('Rechazados', rechazadas), total: rechazadas.length, color: COLORS.danger }] : []),
    ...(cerradas.length > 0         ? [{ titulo: 'Cerradas', seccion: 'resuelto' as const, data: sliceSeccion('Cerradas', cerradas), total: cerradas.length, color: '#607D8B' }] : []),
  ];

  // Datos para el gráfico
  const totalIncs = incumplimientos.length;
  const signosCount = incumplimientos.filter(i => i.tipo === 'signos_vitales').length;
  const medicamentosCount = incumplimientos.filter(i => i.tipo === 'medicamento').length;
  const segmentosGrafico: Segmento[] = [
    { label: 'Sin justificar', value: sinJustificar.length, color: '#E65100' },
    { label: 'En espera', value: pendientes.length, color: '#1565C0' },
    { label: 'Habilitadas', value: resueltasPendReg.length, color: '#2E7D32' },
    { label: 'Rechazadas', value: rechazadas.length, color: COLORS.danger },
    { label: 'Cerradas', value: cerradas.length, color: '#607D8B' },
  ];

  const pacienteSeleccionado = pacientes.find(p => p.id === incSeleccionado?.pacienteId) ?? null;

  function scrollToTitulo(titulo: string) {
    const idx = sections.findIndex(s => s.titulo === titulo);
    if (idx < 0) return;
    try {
      listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true, viewOffset: 0 });
    } catch {}
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      {/* Resumen */}
      <View style={[styles.resumenBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.resumenItem} onPress={() => scrollToTitulo('Sin justificar')} activeOpacity={0.6} disabled={sinJustificar.length === 0}>
          <Text style={[styles.resumenNum, { color: '#E65100' }]}>{sinJustificar.length}</Text>
          <Text style={styles.resumenLabel}>Sin justificar</Text>
        </TouchableOpacity>
        <View style={styles.resumenDivisor} />
        <TouchableOpacity style={styles.resumenItem} onPress={() => scrollToTitulo('Requerimiento enviado')} activeOpacity={0.6} disabled={pendientes.length === 0}>
          <Text style={[styles.resumenNum, { color: '#1565C0' }]}>{pendientes.length}</Text>
          <Text style={styles.resumenLabel}>En espera</Text>
        </TouchableOpacity>
        <View style={styles.resumenDivisor} />
        <TouchableOpacity style={styles.resumenItem} onPress={() => scrollToTitulo('Registro habilitado')} activeOpacity={0.6} disabled={resueltasPendReg.length === 0}>
          <Text style={[styles.resumenNum, { color: '#2E7D32' }]}>{resueltasPendReg.length}</Text>
          <Text style={styles.resumenLabel}>Habilitadas</Text>
        </TouchableOpacity>
        <View style={styles.resumenDivisor} />
        <TouchableOpacity style={styles.resumenItem} onPress={() => scrollToTitulo('Rechazados')} activeOpacity={0.6} disabled={rechazadas.length === 0}>
          <Text style={[styles.resumenNum, { color: COLORS.danger }]}>{rechazadas.length}</Text>
          <Text style={styles.resumenLabel}>Rechazadas</Text>
        </TouchableOpacity>
        <View style={styles.resumenDivisor} />
        <TouchableOpacity style={styles.resumenItem} onPress={() => scrollToTitulo('Cerradas')} activeOpacity={0.6} disabled={cerradas.length === 0}>
          <Text style={[styles.resumenNum, { color: '#607D8B' }]}>{cerradas.length}</Text>
          <Text style={styles.resumenLabel}>Cerradas</Text>
        </TouchableOpacity>
      </View>

      {isAdmin && (
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExportarExcel}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.secondary} />
          <Text style={styles.exportBtnTexto}>Exportar Excel</Text>
        </TouchableOpacity>
      )}

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        onRefresh={cargar}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <GraficoInfracciones
            total={totalIncs}
            signos={signosCount}
            medicamentos={medicamentosCount}
            segmentos={segmentosGrafico}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="shield-check" size={52} color={COLORS.border} />
            <Text style={styles.vacioTexto}>Sin infracciones registradas</Text>
            <Text style={styles.vacioSub}>Los últimos 60 días están limpios</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.seccionHeader, { borderLeftColor: section.color }]}>
            <Text style={[styles.seccionHeaderTexto, { color: section.color }]}>
              {section.titulo} ({(section as any).total ?? section.data.length})
            </Text>
          </View>
        )}
        renderSectionFooter={({ section }) => {
          const s = section as any;
          const restantes = (s.total ?? 0) - ITEMS_VISIBLES;
          if (restantes <= 0 || expandedSections.has(s.titulo)) return null;
          return (
            <TouchableOpacity
              style={styles.verMasBtn}
              activeOpacity={0.7}
              onPress={() => setExpandedSections(prev => new Set([...prev, s.titulo]))}
            >
              <MaterialCommunityIcons name="chevron-down" size={16} color={s.color} />
              <Text style={[styles.verMasTexto, { color: s.color }]}>
                Ver {restantes} más
              </Text>
            </TouchableOpacity>
          );
        }}
        renderItem={({ item, section }) => (
          <IncumplimientoCard
            inc={item}
            paciente={pacientes.find(p => p.id === item.pacienteId)}
            seccion={section.seccion}
            isAdmin={isAdmin}
            completado={completadosIds.has(item.id)}
            onEnviarReq={abrirRequerimiento}
            onResolver={confirmarResolver}
            onRechazar={abrirRechazo}
            onEliminar={confirmarEliminar}
            onIrARegistrar={handleIrARegistrar}
          />
        )}
      />

      {/* Overlay carga inicial */}
      {iniciando && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTexto}>Cargando infracciones…</Text>
          </View>
        </View>
      )}

      <RequerimientoModal
        visible={modalVisible}
        incumplimiento={incSeleccionado}
        paciente={pacienteSeleccionado}
        onEnviar={handleEnviarRequerimiento}
        onCerrar={() => setModalVisible(false)}
      />
      <RechazoModal
        visible={rechazoVisible}
        incumplimiento={incSeleccionado}
        paciente={pacienteSeleccionado}
        onRechazar={handleRechazarRequerimiento}
        onCerrar={() => setRechazoVisible(false)}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </View>
  );
}

// ── estilos ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  resumenBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    borderRadius: 14, paddingVertical: 14, elevation: 2,
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenNum: { fontSize: 24, fontWeight: '800' },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  resumenDivisor: { width: 1, height: 36, backgroundColor: COLORS.border },

  lista: { padding: 16, gap: 10 },

  seccionHeader: {
    borderLeftWidth: 3, paddingLeft: 10, marginBottom: 6, marginTop: 4,
  },
  seccionHeaderTexto: { fontSize: FONT_SIZES.sm, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Tarjeta
  incCard: {
    borderRadius: 12, borderWidth: 1,
    borderLeftWidth: 4, padding: 14,
    elevation: 1, gap: 10,
  },
  incCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  incIcono: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  incPaciente: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  incDetalle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Traza
  requerimientoTraza: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8, padding: 10, gap: 4,
  },
  trazaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trazaLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#1565C0', flex: 1 },
  trazaFecha: { fontSize: 10, color: COLORS.textSecondary },
  trazaMotivo: { fontSize: FONT_SIZES.xs, color: COLORS.textPrimary, fontStyle: 'italic', marginLeft: 20, marginTop: 2 },

  // Acciones
  incAcciones: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

  btnRequerimiento: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E65100', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  btnRequerimientoTexto: { fontSize: FONT_SIZES.xs, color: COLORS.white, fontWeight: '700' },

  pendienteAccionesCol: { flexDirection: 'column', gap: 8, flex: 1 },
  pendienteBotones: { flexDirection: 'row', gap: 8 },
  badgePendiente: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E3F2FD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
  },
  badgePendienteTexto: { fontSize: FONT_SIZES.xs, color: '#1565C0', fontWeight: '600' },

  btnResolver: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#2E7D32', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  btnResolverTexto: { fontSize: FONT_SIZES.xs, color: COLORS.white, fontWeight: '700' },
  btnRechazar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.danger, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  btnRechazarTexto: { fontSize: FONT_SIZES.xs, color: COLORS.white, fontWeight: '700' },
  badgeRechazado: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFEBEE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeRechazadoTexto: { fontSize: FONT_SIZES.xs, color: COLORS.danger, fontWeight: '700' },

  resueltoBloq: { flexDirection: 'column', gap: 8, flex: 1 },
  badgeResuelto: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
  },
  badgeResueltoTexto: { fontSize: FONT_SIZES.xs, color: '#2E7D32', fontWeight: '700' },
  btnIrARegistrar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
  },
  btnIrARegistrarTexto: { fontSize: FONT_SIZES.xs, color: COLORS.white, fontWeight: '700' },
  badgeCompletado: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  badgeCompletadoTexto: { fontSize: FONT_SIZES.xs, color: '#2E7D32', fontWeight: '700' },

  // Vacío
  vacio: { alignItems: 'center', paddingTop: 60, gap: 10 },
  vacioTexto: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textSecondary },
  vacioSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, elevation: 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  modalTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary },
  modalSubtitulo: { fontSize: FONT_SIZES.sm, color: '#E65100', marginTop: 2, fontWeight: '600' },
  modalSeccion: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  incInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FBE9E7', borderRadius: 8,
    padding: 10, marginBottom: 16,
  },
  incInfoTexto: { fontSize: FONT_SIZES.sm, color: '#BF360C', fontWeight: '600' },
  motivoInput: { backgroundColor: COLORS.surface, marginBottom: 16 },
  modalBotones: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonEnviar: { flex: 2, backgroundColor: '#E65100' },

  // Gráfico
  graficoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  graficoTitulo: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  graficoSubtitulo: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 14,
    marginTop: 2,
  },
  graficoBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  graficoCentro: {
    position: 'absolute',
    top: 0, left: 0,
    width: CHART_SIZE,
    height: CHART_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graficoCentroNum: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 30,
  },
  graficoCentroLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leyenda: {
    flex: 1,
    gap: 8,
  },
  leyendaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leyendaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  leyendaNombre: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  leyendaNumero: {
    fontSize: FONT_SIZES.xs,
  },
  leyendaPct: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDiv: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statVal: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },

  // Ver más
  verMasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  verMasTexto: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244,246,249,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  loadingTexto: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.secondary,
    marginHorizontal: 16, marginBottom: 8, alignSelf: 'flex-end',
  },
  exportBtnTexto: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.secondary,
  },
});
