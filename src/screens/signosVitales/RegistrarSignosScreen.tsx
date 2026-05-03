import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignosStackParamList, Incumplimiento } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FirmaModal from '../../components/FirmaModal';
import { COLORS, FONT_SIZES, SIGNO_RANGOS, SIGNO_LIMITES } from '../../theme';
import { obtenerIncumplimientos, registrarIncumplimiento, enviarRequerimiento } from '../../storage/incumplimientos';
import { crearNotificacion } from '../../storage/notificaciones';
import { registrarAuditoria } from '../../storage/auditoria';
import { obtenerSignos } from '../../storage';

type Props = NativeStackScreenProps<SignosStackParamList, 'RegistrarSignos'>;

// ── Modal incumplimiento sin requerimiento ─────────────────────────────────────
function IncumplimientoVencidoModal({ visible, tomaNombre, horaInicio, horaFin, pacienteId, pacienteNombre, onCerrar, onSolicitar }: {
  visible: boolean;
  tomaNombre: string;
  horaInicio: string;
  horaFin: string;
  pacienteId: string;
  pacienteNombre: string;
  onCerrar: () => void;
  onSolicitar: (inc: Incumplimiento) => void;
}) {
  const insets = useSafeAreaInsets();
  const [procesando, setProcesando] = useState(false);

  async function handleSolicitar() {
    setProcesando(true);
    try {
      const hoyISO = new Date().toISOString().slice(0, 10);
      // Registrar incumplimiento si todavía no existe (es idempotente)
      await registrarIncumplimiento({
        pacienteId,
        tipo: 'signos_vitales',
        detalle: tomaNombre,
        horaFin,
        fecha: hoyISO,
      });
      // Re-consultar para obtener el ID del registro
      const incs = await obtenerIncumplimientos(1);
      const inc = incs.find(i =>
        i.pacienteId === pacienteId &&
        i.tipo === 'signos_vitales' &&
        i.detalle === tomaNombre &&
        i.fecha === hoyISO
      );
      if (!inc) {
        Alert.alert('Error', 'No se pudo recuperar el incumplimiento. Intentá de nuevo.');
        return;
      }
      onCerrar();
      onSolicitar(inc);
    } catch {
      Alert.alert('Error', 'No se pudo procesar la solicitud. Verificá tu conexión.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <TouchableWithoutFeedback onPress={onCerrar}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      </TouchableWithoutFeedback>
      <View style={[reqStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={reqStyles.handle} />

        {/* Header */}
        <View style={reqStyles.header}>
          <View style={[reqStyles.headerIcono, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#E65100" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={reqStyles.titulo}>Incumplimiento registrado</Text>
            <Text style={reqStyles.subtitulo}>{pacienteNombre}  •  Toma {tomaNombre}</Text>
          </View>
          <TouchableOpacity onPress={onCerrar}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={[reqStyles.incInfo, { backgroundColor: '#FFF8F0', borderColor: '#FFD0A0' }]}>
          <MaterialCommunityIcons name="clock-remove-outline" size={15} color="#E65100" />
          <Text style={reqStyles.incInfoTexto}>
            Ventana vencida — {horaInicio} a {horaFin} · la toma no fue registrada en tiempo
          </Text>
        </View>

        <Text style={[reqStyles.label, { color: COLORS.textSecondary, fontWeight: '400', lineHeight: 20, marginBottom: 20 }]}>
          Esta toma quedó fuera del horario sin registro. El incumplimiento fue asentado en el sistema.{'\n\n'}
          Si hay una razón justificada (urgencia médica, paciente ausente, etc.), podés solicitar la apertura del período para ingresar el dato con una justificación. El administrador evaluará la solicitud.
        </Text>

        {/* Botones */}
        <TouchableOpacity
          style={[reqStyles.btnEnviar, procesando && { opacity: 0.7 }]}
          onPress={handleSolicitar}
          disabled={procesando}
          activeOpacity={0.85}
        >
          {procesando
            ? <Text style={reqStyles.btnEnviarTexto}>Procesando…</Text>
            : <>
                <MaterialCommunityIcons name="lock-open-variant-outline" size={18} color={COLORS.white} />
                <Text style={reqStyles.btnEnviarTexto}>Solicitar apertura y justificar</Text>
              </>
          }
        </TouchableOpacity>
        <TouchableOpacity style={reqStyles.btnCancelar} onPress={onCerrar} activeOpacity={0.7}>
          <Text style={reqStyles.btnCancelarTexto}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Modal requerimiento inline ────────────────────────────────────────────────
function RequerimientoSignoModal({ visible, incumplimiento, pacienteNombre, onCerrar, onEnviado }: {
  visible: boolean;
  incumplimiento: Incumplimiento | null;
  pacienteNombre: string;
  onCerrar: () => void;
  onEnviado: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { if (visible) setMotivo(''); }, [visible]);

  async function handleEnviar() {
    if (!motivo.trim()) {
      Alert.alert('Campo requerido', 'Ingrese el motivo del requerimiento.');
      return;
    }
    setEnviando(true);
    try {
      await enviarRequerimiento(
        incumplimiento!.id,
        motivo,
        usuario?.id,
        usuario ? `${usuario.nombre} ${usuario.apellido}` : undefined,
        pacienteNombre,
        incumplimiento?.detalle,
      );
      onEnviado();
    } catch {
      Alert.alert('Error', 'No se pudo enviar el requerimiento.');
    } finally {
      setEnviando(false);
    }
  }

  if (!incumplimiento) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onCerrar}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        </TouchableWithoutFeedback>
        <View style={[reqStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={reqStyles.handle} />
          <View style={reqStyles.header}>
            <View style={reqStyles.headerIcono}>
              <MaterialCommunityIcons name="send-clock" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={reqStyles.titulo}>Solicitud de justificación</Text>
              <Text style={reqStyles.subtitulo}>{pacienteNombre}  •  Toma {incumplimiento.detalle}</Text>
            </View>
            <TouchableOpacity onPress={onCerrar}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={reqStyles.incInfo}>
            <MaterialCommunityIcons name="clock-alert" size={15} color="#E65100" />
            <Text style={reqStyles.incInfoTexto}>
              Toma vencida — venció a las {incumplimiento.horaFin || '—'}
            </Text>
          </View>

          <Text style={reqStyles.label}>Motivo de la solicitud *</Text>
          <TextInput
            label="Explique por qué no se pudo registrar"
            value={motivo}
            onChangeText={setMotivo}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            multiline
            numberOfLines={4}
            style={reqStyles.input}
            placeholder="Ej: El paciente fue trasladado, falla del equipo..."
          />

          <View style={reqStyles.botones}>
            <Button mode="outlined" onPress={onCerrar} style={{ flex: 1, borderColor: COLORS.border }}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleEnviar}
              loading={enviando}
              disabled={enviando}
              style={{ flex: 2, backgroundColor: COLORS.primary }}
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

// ── Modal estado requerimiento existente ──────────────────────────────────────
function RequerimientoStatusModal({ visible, incumplimiento, pacienteNombre, onCerrar, onReenviar }: {
  visible: boolean;
  incumplimiento: Incumplimiento | null;
  pacienteNombre: string;
  onCerrar: () => void;
  onReenviar: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!incumplimiento) return null;

  const estado = incumplimiento.requerimientoEstado;
  const isPendiente = estado === 'pendiente';
  const isRechazado = estado === 'rechazado';

  const colorEstado = isPendiente ? '#1565C0' : isRechazado ? COLORS.danger : '#2E7D32';
  const bgEstado   = isPendiente ? '#E3F2FD'  : isRechazado ? '#FFEBEE'      : '#E8F5E9';
  const iconEstado = isPendiente ? 'clock-outline' : isRechazado ? 'close-circle-outline' : 'check-circle-outline';
  const textoEstado = isPendiente ? 'Pendiente de revisión' : isRechazado ? 'Requerimiento rechazado' : 'Aceptado';

  function formatTS(iso?: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onCerrar}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        </TouchableWithoutFeedback>
        <View style={[reqStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={reqStyles.handle} />

          <View style={reqStyles.header}>
            <View style={[reqStyles.headerIcono, { backgroundColor: bgEstado }]}>
              <MaterialCommunityIcons name={iconEstado as any} size={20} color={colorEstado} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={reqStyles.titulo}>Requerimiento registrado</Text>
              <Text style={reqStyles.subtitulo}>{pacienteNombre}  •  Toma {incumplimiento.detalle}</Text>
            </View>
            <TouchableOpacity onPress={onCerrar}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Badge estado */}
          <View style={[reqStyles.badgeEstado, { backgroundColor: bgEstado }]}>
            <MaterialCommunityIcons name={iconEstado as any} size={14} color={colorEstado} />
            <Text style={[reqStyles.badgeEstadoTexto, { color: colorEstado }]}>{textoEstado}</Text>
            {incumplimiento.requerimientoFecha && (
              <Text style={[reqStyles.badgeEstadoFecha, { color: colorEstado }]}>
                — {formatTS(incumplimiento.requerimientoFecha)}
              </Text>
            )}
          </View>

          {/* Motivo enviado */}
          <Text style={reqStyles.seccionLabel}>Motivo enviado</Text>
          <View style={reqStyles.motivoBox}>
            <MaterialCommunityIcons name="comment-text-outline" size={15} color={COLORS.textSecondary} />
            <Text style={reqStyles.motivoTexto}>"{incumplimiento.requerimientoMotivo}"</Text>
          </View>

          {/* Motivo rechazo si existe */}
          {isRechazado && incumplimiento.requerimientoRechazoMotivo && (
            <>
              <Text style={[reqStyles.seccionLabel, { color: COLORS.danger }]}>Motivo del rechazo</Text>
              <View style={[reqStyles.motivoBox, { backgroundColor: '#FFEBEE' }]}>
                <MaterialCommunityIcons name="close-circle-outline" size={15} color={COLORS.danger} />
                <Text style={[reqStyles.motivoTexto, { color: COLORS.danger }]}>
                  "{incumplimiento.requerimientoRechazoMotivo}"
                </Text>
              </View>
            </>
          )}

          <View style={[reqStyles.botones, { marginTop: 8 }]}>
            <Button mode="outlined" onPress={onCerrar} style={{ flex: 1, borderColor: COLORS.border }}>
              Cerrar
            </Button>
            {isRechazado && (
              <Button
                mode="contained"
                onPress={onReenviar}
                style={{ flex: 2, backgroundColor: COLORS.primary }}
                icon="send"
              >
                Enviar nuevo
              </Button>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const reqStyles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcono: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.sm, color: '#E65100', fontWeight: '600', marginTop: 2 },
  incInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FBE9E7', borderRadius: 8, padding: 10, marginBottom: 16,
  },
  incInfoTexto: { fontSize: FONT_SIZES.sm, color: '#BF360C', fontWeight: '600' },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  input: { backgroundColor: '#fff', marginBottom: 16 },
  botones: { flexDirection: 'row', gap: 12 },
  badgeEstado: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 16,
  },
  badgeEstadoTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  badgeEstadoFecha: { fontSize: FONT_SIZES.xs, fontWeight: '400' },
  seccionLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  motivoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.background, borderRadius: 8,
    padding: 12, marginBottom: 14,
  },
  motivoTexto: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontStyle: 'italic' },
  btnEnviar: {
    backgroundColor: COLORS.primary, borderRadius: 12, height: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 10,
  },
  btnEnviarTexto: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  btnCancelar: {
    height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelarTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
});

interface CampoSignoProps {
  label: string;
  valor: string;
  onChangeText: (v: string) => void;
  unidad: string;
  icono: string;
  rangoNormal: string;
  signoKey?: keyof typeof SIGNO_RANGOS;
  limiteKey?: keyof typeof SIGNO_LIMITES;
  obligatorio?: boolean;
  mostrarError?: boolean;
}

function CampoSigno({ label, valor, onChangeText, unidad, icono, rangoNormal, signoKey, limiteKey, obligatorio, mostrarError }: CampoSignoProps) {
  const num = parseFloat(valor);
  const limite = limiteKey ? SIGNO_LIMITES[limiteKey] : null;

  // Verificar si el valor está fuera de los límites absolutos
  const fueraDeRango = valor.trim() !== '' && !isNaN(num) && limite !== null &&
    (num < limite.min || num > limite.max);

  let colorBorde = COLORS.border;
  if ((obligatorio && mostrarError && !valor.trim()) || fueraDeRango) {
    colorBorde = COLORS.danger;
  } else if (!isNaN(num) && signoKey) {
    const rangos = SIGNO_RANGOS[signoKey];
    if (num >= rangos.normal[0] && num <= rangos.normal[1]) colorBorde = COLORS.secondaryLight;
    else if (num >= rangos.caution[0] && num <= rangos.caution[1]) colorBorde = COLORS.warningLight;
    else colorBorde = COLORS.dangerLight;
  }

  return (
    <View style={styles.campoSigno}>
      <View style={styles.campoSignoHeader}>
        <MaterialCommunityIcons name={icono as any} size={20} color={COLORS.textSecondary} />
        <Text style={styles.campoSignoLabel}>
          {label}
          {obligatorio && <Text style={styles.obligatorioAsterisco}> *</Text>}
        </Text>
        <Text style={styles.campoSignoRango}>Normal: {rangoNormal}</Text>
      </View>
      <TextInput
        value={valor}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={`Ej: ${rangoNormal.split('-')[0].trim()}`}
        right={<TextInput.Affix text={unidad} />}
        style={styles.campoSignoInput}
        mode="outlined"
        outlineColor={colorBorde}
        activeOutlineColor={colorBorde}
      />
      {obligatorio && mostrarError && !valor.trim() && (
        <Text style={styles.errorTexto}>Campo obligatorio</Text>
      )}
      {fueraDeRango && limite && (
        <Text style={styles.errorTexto}>Valor fuera de rango médico ({limite.label})</Text>
      )}
    </View>
  );
}

function formatConteo(minutos: number): string {
  if (minutos < 1) return 'menos de 1 min';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function RegistrarSignosScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre, signoId, tomaInicial, fechaInfraccion } = route.params;
  const modoEdicion = !!signoId;
  const { agregarSigno, actualizarSigno, horarios, cargarHorarios, signosVitales, cargarSignos, pacientes } = useApp();
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [guardando, setGuardando] = useState(false);
  const [firmaVisible, setFirmaVisible] = useState(false);
  const [tomaSeleccionada, setTomaSeleccionada] = useState('');
  const [tomaAutoSel, setTomaAutoSel] = useState(false);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [ahora, setAhora] = useState(new Date());
  const [tomasHabilitadas, setTomasHabilitadas] = useState<Set<string>>(new Set());
  const [tomasPendientes, setTomasPendientes] = useState<Set<string>>(new Set());
  const [requerimientoVisible, setRequerimientoVisible] = useState(false);
  const [requerimientoStatusVisible, setRequerimientoStatusVisible] = useState(false);
  const [incRequerimiento, setIncRequerimiento] = useState<Incumplimiento | null>(null);
  const [vencidaModalVisible, setVencidaModalVisible] = useState(false);
  const [tomaVencidaInfo, setTomaVencidaInfo] = useState<{ nombre: string; horaInicio: string; horaFin: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const tomasPaciente = [...(horarios[pacienteId] ?? [])].sort((a, b) =>
    a.horaInicio.localeCompare(b.horaInicio)
  );

  useFocusEffect(useCallback(() => {
    cargarHorarios();
    cargarSignos(pacienteId);
    const hoyISO = new Date().toISOString().slice(0, 10);
    obtenerIncumplimientos(30).then(incs => {
      const del_paciente = incs.filter(i =>
        i.pacienteId === pacienteId &&
        i.tipo === 'signos_vitales'
      );
      setTomasHabilitadas(new Set(
        del_paciente.filter(i => i.requerimientoEstado === 'resuelto').map(i => i.detalle)
      ));
      setTomasPendientes(new Set(
        del_paciente.filter(i => i.requerimientoEstado === 'pendiente' && i.fecha === hoyISO).map(i => i.detalle)
      ));
    }).catch(() => {});
  }, [pacienteId]));

  // Auto-seleccionar desde Infracciones: la toma específica habilitada
  useEffect(() => {
    if (!tomaInicial || modoEdicion) return;
    if (tomasPaciente.length === 0) return;
    const existe = tomasPaciente.find(t => t.nombre === tomaInicial);
    if (existe) setTomaSeleccionada(tomaInicial);
  }, [tomasPaciente.length, tomaInicial]);

  // Auto-seleccionar la toma activa al cargar horarios (solo si no hay tomaInicial)
  useEffect(() => {
    if (modoEdicion || tomaSeleccionada || tomaInicial) return;
    const activa = tomasPaciente.find(t => estadoToma(t) === 'activa');
    if (activa) { setTomaSeleccionada(activa.nombre); setTomaAutoSel(true); }
  }, [tomasPaciente.length]);

  // Pre-cargar valores si es edición
  useEffect(() => {
    if (!signoId) return;
    const signo = signosVitales.find(s => s.id === signoId);
    if (!signo) return;
    setPresionSistolica(signo.presionSistolica ?? '');
    setPresionDiastolica(signo.presionDiastolica ?? '');
    setFrecuenciaCardiaca(signo.frecuenciaCardiaca ?? '');
    setTemperatura(signo.temperatura ?? '');
    setSaturacionOxigeno(signo.saturacionOxigeno ?? '');
    setGlucosa(signo.glucosa ?? '');
    setPeso(signo.peso ?? '');
    setObservaciones(signo.observaciones ?? '');
    if (signo.tomaNombre) setTomaSeleccionada(signo.tomaNombre);
  }, [signoId, signosVitales]);

  const hoy = new Date().toDateString();
  const tomasRegistradasHoy = new Set(
    signosVitales
      .filter(s => s.pacienteId === pacienteId && new Date(s.createdAt).toDateString() === hoy && s.tomaNombre)
      .map(s => s.tomaNombre as string)
  );

  const [presionSistolica, setPresionSistolica] = useState('');
  const [presionDiastolica, setPresionDiastolica] = useState('');
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [saturacionOxigeno, setSaturacionOxigeno] = useState('');
  const [glucosa, setGlucosa] = useState('');
  const [peso, setPeso] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const tomaObligatoria = tomasPaciente.length > 0;

  const camposObligatoriosCompletos =
    presionSistolica.trim() !== '' &&
    presionDiastolica.trim() !== '' &&
    frecuenciaCardiaca.trim() !== '' &&
    (!tomaObligatoria || tomaSeleccionada !== '');

  function estadoToma(toma: typeof tomasPaciente[0]): 'registrada' | 'activa' | 'proxima' | 'incumplimiento' | 'habilitada' {
    if (tomasRegistradasHoy.has(toma.nombre)) return 'registrada';
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const [hIni, mIni] = toma.horaInicio.split(':').map(Number);
    const [hFin, mFin] = toma.horaFin.split(':').map(Number);
    const inicio = hIni * 60 + mIni;
    const fin = hFin * 60 + mFin;
    if (horaActual < inicio) return 'proxima';
    if (horaActual <= fin) return 'activa';
    if (tomasHabilitadas.has(toma.nombre)) return 'habilitada';
    return 'incumplimiento';
  }

  function minutosRestantes(horaFin: string): number {
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const [h, m] = horaFin.split(':').map(Number);
    return Math.max(0, h * 60 + m - horaActual);
  }

  function minutosParaInicio(horaInicio: string): number {
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const [h, m] = horaInicio.split(':').map(Number);
    return Math.max(0, h * 60 + m - horaActual);
  }

  async function seleccionarToma(toma: typeof tomasPaciente[0]) {
    const estado = estadoToma(toma);
    if (estado === 'registrada') return;
    if (estado === 'proxima') {
      Alert.alert('Toma no disponible', `La toma "${toma.nombre}" inicia a las ${toma.horaInicio}. Faltan ${formatConteo(minutosParaInicio(toma.horaInicio))}.`);
      return;
    }
    if (estado === 'incumplimiento') {
      const hoyISO = new Date().toISOString().slice(0, 10);
      const incs = await obtenerIncumplimientos(1);
      const inc = incs.find(i =>
        i.pacienteId === pacienteId &&
        i.tipo === 'signos_vitales' &&
        i.detalle === toma.nombre &&
        i.fecha === hoyISO
      );

      if (!inc) {
        setTomaVencidaInfo({ nombre: toma.nombre, horaInicio: toma.horaInicio, horaFin: toma.horaFin });
        setVencidaModalVisible(true);
        return;
      }

      setIncRequerimiento(inc);

      if (inc.requerimientoEstado) {
        // Ya tiene requerimiento → mostrar estado del específico
        setRequerimientoStatusVisible(true);
      } else {
        // Sin requerimiento → abrir formulario
        setRequerimientoVisible(true);
      }
      return;
    }
    // 'activa' o 'habilitada' → permite selección
    setTomaSeleccionada(tomaSeleccionada === toma.nombre ? '' : toma.nombre);
  }

  function valorFueraDeRango(valor: string, key: keyof typeof SIGNO_LIMITES): boolean {
    if (!valor.trim()) return false;
    const num = parseFloat(valor);
    if (isNaN(num)) return false;
    const { min, max } = SIGNO_LIMITES[key];
    return num < min || num > max;
  }

  const hayValoresInvalidos = [
    valorFueraDeRango(presionSistolica, 'presionSistolica'),
    valorFueraDeRango(presionDiastolica, 'presionDiastolica'),
    valorFueraDeRango(frecuenciaCardiaca, 'frecuenciaCardiaca'),
    valorFueraDeRango(temperatura, 'temperatura'),
    valorFueraDeRango(saturacionOxigeno, 'saturacionOxigeno'),
    valorFueraDeRango(glucosa, 'glucosa'),
    valorFueraDeRango(peso, 'peso'),
  ].some(Boolean);

  function resumenSignos(): string {
    const partes = [];
    if (presionSistolica) partes.push(`P/A: ${presionSistolica}/${presionDiastolica} mmHg`);
    if (frecuenciaCardiaca) partes.push(`FC: ${frecuenciaCardiaca} lpm`);
    if (temperatura) partes.push(`Temp: ${temperatura} °C`);
    if (saturacionOxigeno) partes.push(`SpO2: ${saturacionOxigeno}%`);
    if (glucosa) partes.push(`Glucosa: ${glucosa} mg/dL`);
    if (peso) partes.push(`Peso: ${peso} kg`);
    return `Paciente: ${pacienteNombre}\n${partes.join('  •  ')}`;
  }

  function handleSolicitarFirma() {
    setMostrarErrores(true);
    if (!camposObligatoriosCompletos) {
      const falta = tomaObligatoria && !tomaSeleccionada
        ? 'Debe seleccionar la toma del día, ingresar la Presión Arterial y la Frecuencia Cardíaca.'
        : 'Debe ingresar la Presión Arterial (sistólica y diastólica) y la Frecuencia Cardíaca.';
      Alert.alert('Campos obligatorios', falta);
      return;
    }
    if (hayValoresInvalidos) {
      Alert.alert('Valores inválidos', 'Uno o más campos contienen valores fuera del rango médico permitido. Corrija los campos marcados en rojo.');
      return;
    }
    setFirmaVisible(true);
  }

  function evaluarAlertas(): string[] {
    const alertas: string[] = [];
    const checks: { valor: string; key: keyof typeof SIGNO_RANGOS; label: string }[] = [
      { valor: presionSistolica, key: 'presionSistolica', label: 'Presión sistólica' },
      { valor: presionDiastolica, key: 'presionDiastolica', label: 'Presión diastólica' },
      { valor: frecuenciaCardiaca, key: 'frecuenciaCardiaca', label: 'Frecuencia cardíaca' },
      { valor: temperatura, key: 'temperatura', label: 'Temperatura' },
      { valor: saturacionOxigeno, key: 'saturacionOxigeno', label: 'SpO2' },
      { valor: glucosa, key: 'glucosa', label: 'Glucosa' },
    ];
    for (const { valor, key, label } of checks) {
      if (!valor.trim()) continue;
      const num = parseFloat(valor);
      if (isNaN(num)) continue;
      const rangos = SIGNO_RANGOS[key];
      const enNormal = num >= rangos.normal[0] && num <= rangos.normal[1];
      if (!enNormal) alertas.push(label);
    }
    return alertas;
  }

  async function handleGuardar(firmante: string) {
    setFirmaVisible(false);
    setGuardando(true);
    try {
      const datosBase = {
        presionSistolica,
        presionDiastolica,
        frecuenciaCardiaca,
        temperatura,
        saturacionOxigeno,
        glucosa,
        peso,
        observaciones,
        tomaNombre: tomaSeleccionada || undefined,
      };
      if (modoEdicion && signoId) {
        await actualizarSigno(signoId, { ...datosBase, editadoPor: firmante });
        showToast('Signos vitales actualizados', 'warning');
        setTimeout(() => navigation.replace('HistorialSignos', { pacienteId, pacienteNombre }), 2600);
      } else {
        await agregarSigno({ pacienteId, ...datosBase, registradoPor: firmante });

        // Evaluar alertas de signos fuera de rango
        const alertas = evaluarAlertas();
        if (alertas.length > 0) {
          const listaStr = alertas.join(', ');
          crearNotificacion({
            paraRol: 'admin',
            tipo: 'signos_alerta',
            titulo: `⚠️ Signos fuera de rango — ${pacienteNombre}`,
            mensaje: `${firmante} registró: ${listaStr} fuera de rango normal${tomaSeleccionada ? ` (Toma ${tomaSeleccionada})` : ''}.`,
            datos: { pacienteId, pacienteNombre, alertas },
          }).catch(() => {});
        }

        // Alerta evolución de peso (>5% en 30 días)
        if (peso && parseFloat(peso) > 0) {
          try {
            const todosSignos = await obtenerSignos(pacienteId);
            const hace30 = new Date(Date.now() - 30 * 86400000).toISOString();
            const signosConPeso = todosSignos
              .filter(s => s.peso && parseFloat(s.peso) > 0 && s.createdAt < new Date().toISOString())
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            const signosUlt30 = signosConPeso.filter(s => s.createdAt >= hace30);
            if (signosUlt30.length >= 1) {
              const pesoAnterior = parseFloat(signosUlt30[0].peso);
              const pesoActual = parseFloat(peso);
              const cambio = Math.abs((pesoActual - pesoAnterior) / pesoAnterior) * 100;
              if (cambio >= 5) {
                const dir = pesoActual > pesoAnterior ? 'aumentó' : 'bajó';
                crearNotificacion({
                  paraRol: 'admin',
                  tipo: 'signos_alerta',
                  titulo: `⚖️ Variación de peso — ${pacienteNombre}`,
                  mensaje: `El peso ${dir} ${cambio.toFixed(1)}% en los últimos 30 días (${pesoAnterior} kg → ${pesoActual} kg).`,
                  datos: { pacienteId, pacienteNombre, cambio },
                }).catch(() => {});
              }
            }
          } catch { /* silent */ }
        }

        // Auditoría
        registrarAuditoria({
          usuarioId: usuario?.id ?? '',
          usuarioNombre: firmante,
          accion: 'registrar_signos',
          entidad: 'signos_vitales',
          entidadId: pacienteId,
          detalle: `Paciente: ${pacienteNombre}${tomaSeleccionada ? `, toma: ${tomaSeleccionada}` : ''}`,
        });

        showToast(
          alertas.length > 0 ? `Alertas: ${alertas.join(', ')}` : '',
          alertas.length > 0 ? 'warning' : 'success',
        );
        setTimeout(() => navigation.replace('HistorialSignos', { pacienteId, pacienteNombre }), 2600);
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  const paciente = pacientes.find(p => p.id === pacienteId);

  return (
    <>
    <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={22} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      {paciente?.alergias?.trim() ? (
        <View style={styles.alergiaBanner}>
          <MaterialCommunityIcons name="alert-circle" size={18} color="#E65100" />
          <Text style={styles.alergiaTexto} numberOfLines={2}>
            <Text style={{ fontWeight: '800' }}>Alergias: </Text>
            {paciente.alergias.trim()}
          </Text>
        </View>
      ) : null}

      {tomasPaciente.length > 0 && (
        <View style={[styles.tomaContainer, mostrarErrores && !tomaSeleccionada && styles.tomaContainerError, tomaAutoSel && styles.tomaContainerAuto]}>
          <View style={styles.tomaLabelRow}>
            <Text style={styles.tomaLabel}>
              {tomaInicial ? 'Toma autorizada' : 'Toma del día'} <Text style={styles.obligatorioAsterisco}>*</Text>
            </Text>
            {tomaAutoSel && (
              <View style={styles.tomaAutoBadge}>
                <MaterialCommunityIcons name="lock-outline" size={12} color={COLORS.primary} />
                <Text style={styles.tomaAutoBadgeTexto}>Auto-detectada</Text>
              </View>
            )}
          </View>
          <View style={[styles.tomaChips, tomaAutoSel && { opacity: 0.75 }]}>
            {(tomaInicial ? tomasPaciente.filter(t => t.nombre === tomaInicial) : tomasPaciente).map(t => {
              // Cuando viene de Infracciones, forzar 'habilitada' independientemente del horario actual
              const estado = (tomaInicial && t.nombre === tomaInicial)
                ? 'habilitada'
                : estadoToma(t);
              const seleccionada = tomaSeleccionada === t.nombre;
              const colorEstado =
                estado === 'habilitada'     ? '#E65100' :
                estado === 'incumplimiento' ? COLORS.danger :
                estado === 'registrada'     ? '#2E7D32' :
                estado === 'proxima'        ? '#1565C0' :
                COLORS.primary;

              const chipStyle = [
                styles.tomaChip,
                estado === 'registrada'     && styles.tomaChipRegistrada,
                estado === 'proxima'        && styles.tomaChipProxima,
                estado === 'incumplimiento' && styles.tomaChipIncumplimiento,
                estado === 'habilitada'     && styles.tomaChipHabilitada,
                seleccionada && { backgroundColor: colorEstado, borderColor: colorEstado },
              ];
              const iconoNombre =
                estado === 'registrada' ? 'check-circle' :
                estado === 'proxima' ? 'clock-time-four-outline' :
                estado === 'incumplimiento' ? 'alert-circle' :
                estado === 'habilitada' ? 'lock-open-variant-outline' : 'clock-check-outline';
              const iconoColor = seleccionada ? COLORS.white : colorEstado;
              const subtexto =
                estado === 'registrada' ? 'Ya registrada' :
                estado === 'proxima' ? `Inicia en ${formatConteo(minutosParaInicio(t.horaInicio))}` :
                estado === 'incumplimiento' ? (tomasPendientes.has(t.nombre) ? 'Solicitud enviada' : 'Incumplimiento') :
                estado === 'habilitada' ? 'Autorizada' :
                `${formatConteo(minutosRestantes(t.horaFin))} restantes`;

              return (
                <TouchableOpacity
                  key={t.id}
                  style={chipStyle}
                  onPress={() => !tomaAutoSel && !tomaInicial && seleccionarToma(t)}
                  activeOpacity={tomaAutoSel || tomaInicial ? 1 : (estado === 'activa' ? 0.7 : 1)}
                >
                  <MaterialCommunityIcons name={iconoNombre as any} size={14} color={iconoColor} />
                  <View>
                    <Text style={[styles.tomaChipTexto, seleccionada && styles.tomaChipTextoActivo, estado !== 'activa' && !seleccionada && { color: iconoColor }]}>
                      {t.nombre}
                    </Text>
                    <Text style={[styles.tomaChipHora, seleccionada && styles.tomaChipTextoActivo, { color: seleccionada ? COLORS.white : iconoColor }]}>
                      {subtexto}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {fechaInfraccion && (
            <View style={styles.fechaInfraccionBanner}>
              <MaterialCommunityIcons name="calendar-alert" size={14} color="#E65100" />
              <Text style={styles.fechaInfraccionTexto}>
                Registro pendiente del{' '}
                {new Date(fechaInfraccion + 'T12:00:00').toLocaleDateString('es-AR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
            </View>
          )}
          {mostrarErrores && !tomaSeleccionada && (
            <Text style={styles.errorTexto}>Debe seleccionar una toma del día</Text>
          )}
        </View>
      )}

      <Text style={styles.instruccion}>
        Los campos marcados con <Text style={{ color: COLORS.danger }}>*</Text> son obligatorios.
      </Text>

      {/* Presión arterial */}
      <View style={styles.grupoCard}>
        <Text style={styles.grupoTitulo}>Presión Arterial</Text>
        <View style={styles.filaDos}>
          <View style={{ flex: 1 }}>
            <CampoSigno
              label="Sistólica"
              valor={presionSistolica}
              onChangeText={setPresionSistolica}
              unidad="mmHg"
              icono="arrow-up-circle"
              rangoNormal="90 - 139"
              signoKey="presionSistolica"
              limiteKey="presionSistolica"
              obligatorio
              mostrarError={mostrarErrores}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CampoSigno
              label="Diastólica"
              valor={presionDiastolica}
              onChangeText={setPresionDiastolica}
              unidad="mmHg"
              icono="arrow-down-circle"
              rangoNormal="60 - 89"
              signoKey="presionDiastolica"
              limiteKey="presionDiastolica"
              obligatorio
              mostrarError={mostrarErrores}
            />
          </View>
        </View>
      </View>

      {/* Otros signos */}
      <View style={styles.grupoCard}>
        <Text style={styles.grupoTitulo}>Otros Signos</Text>
        <CampoSigno
          label="Frecuencia Cardíaca"
          valor={frecuenciaCardiaca}
          onChangeText={setFrecuenciaCardiaca}
          unidad="lpm"
          icono="heart-pulse"
          rangoNormal="60 - 100"
          signoKey="frecuenciaCardiaca"
          limiteKey="frecuenciaCardiaca"
          obligatorio
          mostrarError={mostrarErrores}
        />
        <CampoSigno
          label="Temperatura"
          valor={temperatura}
          onChangeText={setTemperatura}
          unidad="°C"
          icono="thermometer"
          rangoNormal="36.0 - 37.5"
          signoKey="temperatura"
          limiteKey="temperatura"
        />
        <CampoSigno
          label="Saturación de Oxígeno (SpO2)"
          valor={saturacionOxigeno}
          onChangeText={setSaturacionOxigeno}
          unidad="%"
          icono="lungs"
          rangoNormal="95 - 100"
          signoKey="saturacionOxigeno"
          limiteKey="saturacionOxigeno"
        />
        <CampoSigno
          label="Glucosa en Sangre"
          valor={glucosa}
          onChangeText={setGlucosa}
          unidad="mg/dL"
          icono="water"
          rangoNormal="70 - 140"
          signoKey="glucosa"
          limiteKey="glucosa"
        />
        <CampoSigno
          label="Peso"
          valor={peso}
          onChangeText={setPeso}
          unidad="kg"
          icono="scale-bathroom"
          rangoNormal="—"
          limiteKey="peso"
        />
      </View>

      <TextInput
        label="Observaciones"
        value={observaciones}
        onChangeText={setObservaciones}
        placeholder="Notas adicionales..."
        multiline
        numberOfLines={3}
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      <View style={styles.botones}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.botonCancelar}>
          Cancelar
        </Button>
        <Button mode="contained" onPress={handleSolicitarFirma} loading={guardando} style={styles.botonGuardar} icon="draw-pen">
          {modoEdicion ? 'Actualizar y Firmar' : 'Guardar y Firmar'}
        </Button>
      </View>
    </KeyboardAwareScrollView>

    <FirmaModal
      visible={firmaVisible}
      titulo="Registro de Signos Vitales"
      resumen={resumenSignos()}
      onConfirmar={handleGuardar}
      onCancelar={() => setFirmaVisible(false)}
    />

    <RequerimientoSignoModal
      visible={requerimientoVisible}
      incumplimiento={incRequerimiento}
      pacienteNombre={pacienteNombre}
      onCerrar={() => { setRequerimientoVisible(false); setIncRequerimiento(null); }}
      onEnviado={() => {
        const detalle = incRequerimiento?.detalle;
        setRequerimientoVisible(false);
        setIncRequerimiento(null);
        if (detalle) setTomasPendientes(prev => new Set([...prev, detalle]));
        Alert.alert('Requerimiento enviado', 'El requerimiento fue enviado. Cuando el admin lo acepte podrás registrar la toma.');
      }}
    />

    <RequerimientoStatusModal
      visible={requerimientoStatusVisible}
      incumplimiento={incRequerimiento}
      pacienteNombre={pacienteNombre}
      onCerrar={() => { setRequerimientoStatusVisible(false); setIncRequerimiento(null); }}
      onReenviar={() => {
        setRequerimientoStatusVisible(false);
        setRequerimientoVisible(true);
      }}
    />

    {tomaVencidaInfo && (
      <IncumplimientoVencidoModal
        visible={vencidaModalVisible}
        tomaNombre={tomaVencidaInfo.nombre}
        horaInicio={tomaVencidaInfo.horaInicio}
        horaFin={tomaVencidaInfo.horaFin}
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        onCerrar={() => { setVencidaModalVisible(false); setTomaVencidaInfo(null); }}
        onSolicitar={(inc) => {
          setIncRequerimiento(inc);
          setRequerimientoVisible(true);
        }}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  pacienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  instruccion: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'center' },
  grupoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  grupoTitulo: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  filaDos: { flexDirection: 'row', gap: 8 },
  campoSigno: { marginBottom: 10 },
  campoSignoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  campoSignoLabel: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
  obligatorioAsterisco: { color: COLORS.danger, fontWeight: '700' },
  campoSignoRango: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  campoSignoInput: { backgroundColor: COLORS.surface },
  errorTexto: { fontSize: FONT_SIZES.xs, color: COLORS.danger, marginTop: 2 },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: COLORS.primary },
  tomaContainer: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 12, elevation: 1,
    borderWidth: 1, borderColor: 'transparent',
  },
  tomaContainerError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFF5F5',
  },
  tomaContainerAuto: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF',
  },
  tomaLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  tomaLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tomaAutoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E3F2FD', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tomaAutoBadgeTexto: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  fechaInfraccionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#FFF3E0', borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: '#E65100',
  },
  fechaInfraccionTexto: { fontSize: FONT_SIZES.xs, color: '#E65100', fontWeight: '600', flex: 1 },

  tomaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tomaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  tomaChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tomaChipRegistrada: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32', opacity: 0.8 },
  tomaChipProxima: { backgroundColor: '#E3F2FD', borderColor: '#1565C0' },
  tomaChipIncumplimiento: { backgroundColor: '#FFEBEE', borderColor: COLORS.danger },
  tomaChipHabilitada: { backgroundColor: '#FFF3E0', borderColor: '#E65100' },
  tomaChipTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
  tomaChipHora: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  tomaChipTextoActivo: { color: COLORS.white },
  tomaChipTextoRegistrada: { color: '#888' },
  alergiaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  alergiaTexto: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#E65100',
  },
});
