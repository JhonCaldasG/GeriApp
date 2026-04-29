import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Alert } from 'react-native';
import { Text, FAB, IconButton, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignosStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import SignoBadge from '../../components/SignoBadge';
import EmptyState from '../../components/EmptyState';
import TendenciasSignosChart from '../../components/TendenciasSignosChart';
import HorariosSignosModal from '../../components/HorariosSignosModal';
import { formatearFechaHora } from '../../storage';
import { crearNotificacion } from '../../storage/notificaciones';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { exportarExcel } from '../../utils/exportarExcel';

type Props = NativeStackScreenProps<SignosStackParamList, 'HistorialSignos'>;

const HORAS_REINFORME = 6;
function claveReporte(pacienteId: string) { return `@sin_horarios_reporte_${pacienteId}`; }

// ── Modal: paciente sin horarios configurados ──────────────────────────────────
function SinHorariosModal({ visible, isAdmin, pacienteId, pacienteNombre, usuarioNombre, onConfigurar, onCerrar }: {
  visible: boolean;
  isAdmin: boolean;
  pacienteId: string;
  pacienteNombre: string;
  usuarioNombre: string;
  onConfigurar: () => void;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [cargando, setCargando] = useState(true);
  const [ultimoReporte, setUltimoReporte] = useState<Date | null>(null);
  const [reportando, setReportando] = useState(false);
  const [recienEnviado, setRecienEnviado] = useState(false);

  useEffect(() => {
    if (!visible) {
      setRecienEnviado(false);
      setReportando(false);
      return;
    }
    setCargando(true);
    AsyncStorage.getItem(claveReporte(pacienteId))
      .then(val => setUltimoReporte(val ? new Date(val) : null))
      .catch(() => setUltimoReporte(null))
      .finally(() => setCargando(false));
  }, [visible, pacienteId]);

  const horasDesdeUltimo = ultimoReporte
    ? (Date.now() - ultimoReporte.getTime()) / 3600000
    : null;

  const puedeReportar = horasDesdeUltimo === null || horasDesdeUltimo >= HORAS_REINFORME;

  function formatearHora(fecha: Date) {
    return fecha.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function handleReportar() {
    setReportando(true);
    try {
      await crearNotificacion({
        paraRol: 'admin',
        tipo: 'requerimiento_nuevo',
        titulo: 'Horario de signos no configurado',
        mensaje: `${usuarioNombre} reporta que el paciente ${pacienteNombre} no tiene horarios de toma de signos vitales configurados. Se requiere que un administrador los establezca para poder continuar con el registro.`,
        datos: { pacienteId, pacienteNombre },
      });
      const ahora = new Date();
      await AsyncStorage.setItem(claveReporte(pacienteId), ahora.toISOString());
      setUltimoReporte(ahora);
      setRecienEnviado(true);
    } catch {
      Alert.alert('Error', 'No se pudo enviar el reporte. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setReportando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <TouchableWithoutFeedback onPress={onCerrar}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      </TouchableWithoutFeedback>
      <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={sheetStyles.handle} />

        <View style={sheetStyles.header}>
          <View style={sheetStyles.icono}>
            <MaterialCommunityIcons name="clock-alert-outline" size={26} color="#E65100" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sheetStyles.titulo}>Sin horario de signos</Text>
            <Text style={sheetStyles.subtitulo}>{pacienteNombre}</Text>
          </View>
          <TouchableOpacity onPress={onCerrar}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={sheetStyles.alerta}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#E65100" />
          <Text style={sheetStyles.alertaTexto}>
            Este paciente no tiene horarios de toma de signos vitales configurados.
            No es posible registrar signos sin un horario establecido.
          </Text>
        </View>

        {isAdmin ? (
          <>
            <Text style={sheetStyles.cuerpo}>
              Como administrador puedes configurar los horarios de toma ahora mismo y luego proceder con el registro.
            </Text>
            <TouchableOpacity style={sheetStyles.btnPrimario} onPress={onConfigurar} activeOpacity={0.85}>
              <MaterialCommunityIcons name="clock-edit-outline" size={18} color={COLORS.white} />
              <Text style={sheetStyles.btnPrimarioTexto}>Configurar horarios ahora</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sheetStyles.btnSecundario} onPress={onCerrar} activeOpacity={0.7}>
              <Text style={sheetStyles.btnSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </>
        ) : cargando ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={COLORS.primary} />
        ) : recienEnviado ? (
          <>
            <View style={sheetStyles.exitoBox}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#2E7D32" />
              <Text style={sheetStyles.exitoTexto}>
                Reporte enviado al administrador. Una vez que configure los horarios, vas a poder registrar los signos.
              </Text>
            </View>
            <TouchableOpacity style={sheetStyles.btnPrimario} onPress={onCerrar} activeOpacity={0.85}>
              <Text style={sheetStyles.btnPrimarioTexto}>Cerrar</Text>
            </TouchableOpacity>
          </>
        ) : !puedeReportar ? (
          <>
            <View style={sheetStyles.yaEnviadoBox}>
              <MaterialCommunityIcons name="clock-check-outline" size={18} color="#1565C0" />
              <View style={{ flex: 1 }}>
                <Text style={sheetStyles.yaEnviadoTitulo}>Reporte ya enviado</Text>
                <Text style={sheetStyles.yaEnviadoFecha}>
                  {formatearHora(ultimoReporte!)} · puedes re-informar en{' '}
                  {Math.ceil(HORAS_REINFORME - horasDesdeUltimo!)} h
                </Text>
              </View>
            </View>
            <TouchableOpacity style={sheetStyles.btnSecundario} onPress={onCerrar} activeOpacity={0.7}>
              <Text style={sheetStyles.btnSecundarioTexto}>Cerrar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={sheetStyles.cuerpo}>
              {ultimoReporte
                ? `Último reporte enviado el ${formatearHora(ultimoReporte)}. Ya han pasado más de ${HORAS_REINFORME} horas sin respuesta — puedes re-informar al administrador.`
                : 'Los horarios de signos deben ser configurados por el administrador. Puedes enviarle un reporte para que sea notificado de inmediato.'}
            </Text>
            <TouchableOpacity
              style={[sheetStyles.btnPrimario, reportando && { opacity: 0.7 }]}
              onPress={handleReportar}
              disabled={reportando}
              activeOpacity={0.85}
            >
              {reportando
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <MaterialCommunityIcons
                      name={ultimoReporte ? 'send-clock' : 'send-outline'}
                      size={18}
                      color={COLORS.white}
                    />
                    <Text style={sheetStyles.btnPrimarioTexto}>
                      {ultimoReporte ? 'Re-informar al administrador' : 'Reportar al administrador'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity style={sheetStyles.btnSecundario} onPress={onCerrar} activeOpacity={0.7}>
              <Text style={sheetStyles.btnSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function HistorialSignosScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { signosVitales, cargarSignos, eliminarSigno, cargarHorarios, horarios } = useApp();
  const { isAdmin, usuario } = useAuth();
  const { colors } = useAppTheme();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [sinHorariosVisible, setSinHorariosVisible] = useState(false);
  const [horariosModalVisible, setHorariosModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarSignos(pacienteId);
      cargarHorarios();
    });
    return unsubscribe;
  }, [navigation, pacienteId]);

  const signos = signosVitales.filter((s) => s.pacienteId === pacienteId);
  const tieneHorarios = (horarios[pacienteId] ?? []).length > 0;

  function handleRegistrar() {
    if (!tieneHorarios) {
      setSinHorariosVisible(true);
      return;
    }
    navigation.navigate('RegistrarSignos', { pacienteId, pacienteNombre });
  }

  function confirmarEliminar(id: string) {
    ejecutarEliminacion(
      'Eliminar Registro',
      '¿Desea eliminar este registro de signos vitales?',
      async () => {
        await eliminarSigno(id);
        await cargarSignos(pacienteId);
      },
    );
  }

  async function handleExportarExcel() {
    if (signos.length === 0) {
      Alert.alert('Sin datos', 'No hay registros para exportar con el filtro actual.');
      return;
    }
    try {
      await exportarExcel(`signos_${pacienteNombre.replace(/\s/g, '_')}`, [{
        nombre: 'Signos Vitales',
        datos: signos.map(s => ({
          Fecha: s.createdAt.slice(0, 10),
          Hora: s.createdAt.slice(11, 16),
          Toma: (s as any).tomaNombre ?? '',
          'P/A Sistólica': s.presionSistolica,
          'P/A Diastólica': s.presionDiastolica,
          'Frec. Cardíaca': s.frecuenciaCardiaca,
          Temperatura: s.temperatura,
          'SpO2 (%)': s.saturacionOxigeno,
          'Glucosa': s.glucosa,
          'Peso (kg)': s.peso,
          'Registrado por': (s as any).registradoPor ?? '',
          Observaciones: s.observaciones ?? '',
        })),
      }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo exportar.');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
        {!tieneHorarios && (
          <View style={styles.sinHorarioBadge}>
            <MaterialCommunityIcons name="clock-alert-outline" size={14} color="#E65100" />
            <Text style={styles.sinHorarioTexto}>Sin horario</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExportarExcel}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.secondary} />
          <Text style={styles.exportBtnTexto}>Exportar Excel</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={signos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={signos.length >= 2 ? <TendenciasSignosChart signos={signos} /> : null}
        ListEmptyComponent={
          <EmptyState
            icono="heart-pulse"
            titulo="Sin registros de signos vitales"
            subtitulo="Toca el botón + para registrar los primeros signos"
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.registroCard, { backgroundColor: colors.surface }]}>
            <View style={styles.registroHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.registroFecha}>{formatearFechaHora(item.createdAt)}</Text>
                {item.registradoPor ? (
                  <Text style={styles.registradoPor}>Por: {item.registradoPor}</Text>
                ) : null}
                {item.editadoPor ? (
                  <Text style={styles.editadoPor}>Edit by: {item.editadoPor}</Text>
                ) : null}
              </View>
              {isAdmin && (
                <>
                  <IconButton
                    icon="pencil-outline"
                    iconColor={COLORS.primary}
                    size={20}
                    onPress={() => navigation.navigate('RegistrarSignos', { pacienteId, pacienteNombre, signoId: item.id })}
                  />
                  <IconButton
                    icon="delete-outline"
                    iconColor={COLORS.danger}
                    size={20}
                    onPress={() => confirmarEliminar(item.id)}
                  />
                </>
              )}
            </View>

            <View style={styles.signosFila}>
              {item.presionSistolica && (
                <SignoBadge label="P/A Sist." valor={item.presionSistolica} unidad="mmHg" signoKey="presionSistolica" compact />
              )}
              {item.presionDiastolica && (
                <SignoBadge label="P/A Diast." valor={item.presionDiastolica} unidad="mmHg" signoKey="presionDiastolica" compact />
              )}
              {item.frecuenciaCardiaca && (
                <SignoBadge label="FC" valor={item.frecuenciaCardiaca} unidad="lpm" signoKey="frecuenciaCardiaca" compact />
              )}
              {item.temperatura && (
                <SignoBadge label="Temp." valor={item.temperatura} unidad="°C" signoKey="temperatura" compact />
              )}
              {item.saturacionOxigeno && (
                <SignoBadge label="SpO2" valor={item.saturacionOxigeno} unidad="%" signoKey="saturacionOxigeno" compact />
              )}
              {item.glucosa && (
                <SignoBadge label="Glucosa" valor={item.glucosa} unidad="mg/dL" signoKey="glucosa" compact />
              )}
              {item.peso && (
                <SignoBadge label="Peso" valor={item.peso} unidad="kg" compact />
              )}
            </View>

            {item.observaciones ? (
              <View style={styles.observaciones}>
                <Text style={styles.observacionesTexto}>{item.observaciones}</Text>
              </View>
            ) : null}
          </View>
        )}
      />

      <FAB
        icon="plus"
        label="Registrar Signos"
        style={styles.fab}
        onPress={handleRegistrar}
      />

      <SinHorariosModal
        visible={sinHorariosVisible}
        isAdmin={isAdmin}
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        usuarioNombre={usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Enfermero'}
        onConfigurar={() => {
          setSinHorariosVisible(false);
          setHorariosModalVisible(true);
        }}
        onCerrar={() => setSinHorariosVisible(false)}
      />

      <HorariosSignosModal
        visible={horariosModalVisible}
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        onDismiss={() => {
          setHorariosModalVisible(false);
          cargarHorarios();
        }}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  icono: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  alerta: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF8F0', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FFD0A0', marginBottom: 16,
  },
  alertaTexto: { flex: 1, fontSize: FONT_SIZES.sm, color: '#BF360C', lineHeight: 20 },
  cuerpo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 20 },
  exitoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  exitoTexto: { flex: 1, fontSize: FONT_SIZES.sm, color: '#2E7D32', lineHeight: 20 },
  yaEnviadoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#90CAF9',
  },
  yaEnviadoTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1565C0', marginBottom: 2 },
  yaEnviadoFecha: { fontSize: FONT_SIZES.xs, color: '#1565C0', lineHeight: 18 },
  btnPrimario: {
    backgroundColor: COLORS.primary, borderRadius: 12, height: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 10,
  },
  btnPrimarioTexto: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  btnSecundario: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSecundarioTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pacienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  pacienteNombre: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  sinHorarioBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FFD0A0',
  },
  sinHorarioTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#E65100' },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  registroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  registroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  registroFecha: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  registradoPor: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  editadoPor: { fontSize: FONT_SIZES.xs, color: COLORS.primary, marginTop: 1, fontStyle: 'italic' },
  signosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  observaciones: {
    marginTop: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
  },
  observacionesTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.primary },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.secondary,
  },
  exportBtnTexto: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.secondary,
  },
});
