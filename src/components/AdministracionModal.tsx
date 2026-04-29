import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Medicamento } from '../types';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { COLORS, FONT_SIZES } from '../theme';
import { formatearFechaHora } from '../storage';

interface Props {
  visible: boolean;
  medicamento: Medicamento | null;
  pacienteNombre: string;
  dosisHoy: number;
  totalDiarias: number | null;
  ultimaAdminIso: string | null;
  onDismiss: () => void;
  onRegistrado: () => void;
}

function horasEntreDosisDe(frecuencia: string): number | null {
  const f = frecuencia.toLowerCase().trim();
  if (f.includes('4 hora')) return 4;
  if (f.includes('6 hora')) return 6;
  if (f.includes('8 hora')) return 8;
  if (f.includes('12 hora')) return 12;
  if (f === 'una vez al día' || f === 'una vez al dia') return 24;
  if (f.includes('dos veces')) return 12;
  if (f.includes('tres veces')) return 8;
  return null;
}

function calcularHorasDosisMin(horaInicio: string, frecuencia: string): number[] {
  if (!horaInicio || !horaInicio.match(/^\d{2}:\d{2}$/)) return [];
  const [h, m] = horaInicio.split(':').map(Number);
  const inicioMin = h * 60 + m;
  const intervalo = horasEntreDosisDe(frecuencia);
  if (!intervalo) return [inicioMin];
  const count = Math.round(24 / intervalo);
  return Array.from({ length: count }, (_, i) => (inicioMin + i * intervalo * 60) % (24 * 60));
}

function diffMin(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 * 60 - d);
}

const MARGEN_MIN = 40;

function estaEnHorario(horaInicio: string, frecuencia: string): boolean {
  const horarios = calcularHorasDosisMin(horaInicio, frecuencia);
  if (horarios.length === 0) return true;
  const ahora = new Date();
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();
  return horarios.some(h => diffMin(minActual, h) <= MARGEN_MIN);
}

function esDemasiadoTemprano(ultimaIso: string | null, frecuencia: string): boolean {
  if (!ultimaIso) return false;
  const intervalo = horasEntreDosisDe(frecuencia);
  if (!intervalo) return false;
  const minTranscurridos = (Date.now() - new Date(ultimaIso).getTime()) / 60000;
  return minTranscurridos < (intervalo * 60 - MARGEN_MIN);
}

function minutosParaSiguiente(ultimaIso: string, frecuencia: string): number {
  const intervalo = horasEntreDosisDe(frecuencia)!;
  const minTranscurridos = (Date.now() - new Date(ultimaIso).getTime()) / 60000;
  return Math.ceil(intervalo * 60 - minTranscurridos);
}

export default function AdministracionModal({
  visible, medicamento, pacienteNombre,
  dosisHoy, totalDiarias, ultimaAdminIso,
  onDismiss, onRegistrado,
}: Props) {
  const { usuario } = useAuth();
  const { registrarAdministracion } = useApp();
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [riesgoAceptado, setRiesgoAceptado] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const firmante = usuario ? `${usuario.nombre} ${usuario.apellido}` : '';
  const ahora = formatearFechaHora(new Date().toISOString());
  const temprano   = medicamento ? esDemasiadoTemprano(ultimaAdminIso, medicamento.frecuencia) : false;
  const fueraVentana = medicamento ? !estaEnHorario(medicamento.horario, medicamento.frecuencia) : false;
  const fueraDeHorario = temprano || fueraVentana;

  const advertenciaMensaje = temprano && ultimaAdminIso
    ? `La última dosis fue hace ${Math.floor((Date.now() - new Date(ultimaAdminIso).getTime()) / 60000)} min. `
      + `La siguiente está programada en aprox. ${minutosParaSiguiente(ultimaAdminIso, medicamento!.frecuencia)} min. `
      + `Adelantar la dosis puede ser perjudicial para el paciente.`
    : 'La hora actual no corresponde a ningún rango de toma configurado para este medicamento. '
      + 'Registrar una dosis fuera de horario puede representar un riesgo clínico.';

  const numeroDosisActual = dosisHoy + 1;
  const completa = totalDiarias !== null && dosisHoy >= totalDiarias;

  React.useEffect(() => {
    if (visible) {
      setRiesgoAceptado(false);
      setRechazando(false);
      setMotivoRechazo('');
      setNotas('');
    }
  }, [visible]);

  async function handleRegistrar() {
    if (!medicamento || completa) return;
    setGuardando(true);
    await registrarAdministracion({
      medicamentoId: medicamento.id,
      pacienteId: medicamento.pacienteId,
      medicamentoNombre: medicamento.nombre,
      dosis: medicamento.dosis,
      firmante,
      notas: notas.trim(),
      numeroDosis: numeroDosisActual,
      totalDiarias,
      rechazado: false,
      motivoRechazo: '',
    });
    setGuardando(false);
    onRegistrado();
  }

  async function handleRechazar() {
    if (!medicamento || !motivoRechazo.trim()) return;
    setGuardando(true);
    await registrarAdministracion({
      medicamentoId: medicamento.id,
      pacienteId: medicamento.pacienteId,
      medicamentoNombre: medicamento.nombre,
      dosis: medicamento.dosis,
      firmante,
      notas: '',
      numeroDosis: undefined,
      totalDiarias,
      rechazado: true,
      motivoRechazo: motivoRechazo.trim(),
    });
    setGuardando(false);
    onRegistrado();
  }

  if (!medicamento) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcono}>
                <MaterialCommunityIcons name="pill" size={22} color={COLORS.warningLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>Administración de Dosis</Text>
                <Text style={styles.subtitulo}>{pacienteNombre}</Text>
              </View>
              <TouchableOpacity onPress={onDismiss}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Info del medicamento */}
            <View style={styles.medCard}>
              <Text style={styles.medNombre}>{medicamento.nombre}</Text>
              <Text style={styles.medDosis}>{medicamento.dosis}  •  {medicamento.frecuencia}</Text>
              {medicamento.viaAdministracion ? <Text style={styles.medVia}>Vía: {medicamento.viaAdministracion}</Text> : null}
            </View>

            {/* Contador de dosis */}
            {totalDiarias !== null ? (
              <View style={[styles.dosisCounter, completa && styles.dosisCounterCompleta]}>
                <MaterialCommunityIcons
                  name={completa ? 'check-all' : 'counter'}
                  size={18}
                  color={completa ? COLORS.secondaryLight : COLORS.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dosisCounterLabel, completa && { color: COLORS.secondaryLight }]}>
                    {completa
                      ? `Todas las dosis del día completadas (${dosisHoy}/${totalDiarias})`
                      : `Dosis ${numeroDosisActual} de ${totalDiarias} del día`}
                  </Text>
                  {!completa && (
                    <View style={styles.dosisBarContainer}>
                      {Array.from({ length: totalDiarias }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dosisBarSegmento,
                            i < dosisHoy && styles.dosisBarSegmentoHecho,
                            i === dosisHoy && styles.dosisBarSegmentoActual,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.dosisSinLimite}>
                <MaterialCommunityIcons name="infinity" size={16} color={COLORS.textSecondary} />
                <Text style={styles.dosisSinLimiteTexto}>
                  Dosis {numeroDosisActual} de hoy  •  Según necesidad
                </Text>
              </View>
            )}

            {/* Bloqueo si ya se completaron */}
            {completa ? (
              <View style={styles.completaBox}>
                <MaterialCommunityIcons name="shield-check" size={28} color={COLORS.secondaryLight} />
                <Text style={styles.completaTitulo}>Dosis completadas</Text>
                <Text style={styles.completaDesc}>
                  Ya se registraron las {totalDiarias} dosis indicadas para hoy.{'\n'}
                  No se pueden registrar más dosis hasta mañana.
                </Text>
                <Button mode="contained" onPress={onDismiss} style={styles.botonCerrar}>
                  Entendido
                </Button>
              </View>
            ) : (
              <>
                {/* Fecha y firmante (solo lectura) */}
                <View style={styles.infoFila}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="calendar-clock" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.infoTexto}>{ahora}</Text>
                  </View>
                </View>

                <View style={styles.firmanteCard}>
                  <MaterialCommunityIcons name="account-check" size={20} color={COLORS.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.firmanteLabel}>Administrado por</Text>
                    <Text style={styles.firmanteNombre}>{firmante}</Text>
                  </View>
                  <MaterialCommunityIcons name="check-decagram" size={18} color={COLORS.secondaryLight} />
                </View>

                {/* Toggle rechazo */}
                <TouchableOpacity
                  style={[styles.rechazarToggle, rechazando && styles.rechazarToggleActivo]}
                  onPress={() => setRechazando(!rechazando)}
                >
                  <MaterialCommunityIcons
                    name={rechazando ? 'close-circle' : 'close-circle-outline'}
                    size={18}
                    color={rechazando ? COLORS.danger : COLORS.textSecondary}
                  />
                  <Text style={[styles.rechazarToggleTexto, rechazando && { color: COLORS.danger }]}>
                    {rechazando ? 'Registrando no-administración' : 'Paciente rechazó / no se pudo administrar'}
                  </Text>
                </TouchableOpacity>

                {rechazando ? (
                  <TextInput
                    label="Motivo del rechazo *"
                    value={motivoRechazo}
                    onChangeText={setMotivoRechazo}
                    placeholder="Ej: Paciente se negó a tomarlo..."
                    multiline
                    numberOfLines={2}
                    style={styles.input}
                    mode="outlined"
                    outlineColor={COLORS.danger}
                    activeOutlineColor={COLORS.danger}
                  />
                ) : (
                  <TextInput
                    label="Observaciones (opcional)"
                    value={notas}
                    onChangeText={setNotas}
                    placeholder="Ej: Paciente lo tomó sin dificultad..."
                    multiline
                    numberOfLines={2}
                    style={styles.input}
                    mode="outlined"
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                  />
                )}

                {/* Advertencia fuera de horario */}
                {fueraDeHorario && (
                  <View style={styles.advertenciaBox}>
                    <View style={styles.advertenciaHeader}>
                      <MaterialCommunityIcons name="alert" size={20} color={COLORS.danger} />
                      <Text style={styles.advertenciaTitulo}>Fuera del horario establecido</Text>
                    </View>
                    <Text style={styles.advertenciaTexto}>{advertenciaMensaje}</Text>
                    {!riesgoAceptado ? (
                      <TouchableOpacity
                        style={styles.botonAceptarRiesgo}
                        onPress={() => setRiesgoAceptado(true)}
                      >
                        <MaterialCommunityIcons name="shield-alert-outline" size={16} color={COLORS.danger} />
                        <Text style={styles.botonAceptarRiesgoTexto}>Entiendo el riesgo, continuar de todas formas</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.riesgoAceptadoBadge}>
                        <MaterialCommunityIcons name="shield-check-outline" size={16} color={COLORS.warningLight} />
                        <Text style={styles.riesgoAceptadoTexto}>Riesgo aceptado — proceda con precaución</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.botones}>
                  <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>
                    Cancelar
                  </Button>
                  {rechazando ? (
                    <Button
                      mode="contained"
                      onPress={handleRechazar}
                      loading={guardando}
                      disabled={!motivoRechazo.trim()}
                      style={[{ flex: 2 }, styles.botonRechazar]}
                      icon="close-circle"
                      buttonColor={COLORS.danger}
                    >
                      Registrar rechazo
                    </Button>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={handleRegistrar}
                      loading={guardando}
                      disabled={fueraDeHorario && !riesgoAceptado}
                      style={[styles.botonRegistrar, { flex: 2 }, fueraDeHorario && !riesgoAceptado && styles.botonRegistrarBloqueado]}
                      icon="check-circle"
                    >
                      Confirmar dosis {totalDiarias !== null ? `(${numeroDosisActual}/${totalDiarias})` : ''}
                    </Button>
                  )}
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12, paddingBottom: 32,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcono: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  medCard: {
    backgroundColor: '#FFF8E1', borderRadius: 12,
    padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.warningLight,
  },
  medNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  medDosis: { fontSize: FONT_SIZES.sm, color: COLORS.warningLight, fontWeight: '600', marginTop: 2 },
  medVia: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  dosisCounter: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#90CAF9',
  },
  dosisCounterCompleta: {
    backgroundColor: '#E8F5E9', borderColor: '#A5D6A7',
  },
  dosisCounterLabel: {
    fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary,
  },
  dosisBarContainer: {
    flexDirection: 'row', gap: 4, marginTop: 6,
  },
  dosisBarSegmento: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dosisBarSegmentoHecho: { backgroundColor: COLORS.secondaryLight },
  dosisBarSegmentoActual: { backgroundColor: COLORS.primary },
  dosisSinLimite: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.background, borderRadius: 8, padding: 10,
  },
  dosisSinLimiteTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  completaBox: {
    alignItems: 'center', gap: 8, paddingVertical: 16,
  },
  completaTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.secondaryLight },
  completaDesc: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
  botonCerrar: { backgroundColor: COLORS.secondaryLight, marginTop: 8 },
  infoFila: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  firmanteCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8F5E9', borderRadius: 12,
    padding: 12, gap: 10,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  firmanteLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.secondary, textTransform: 'uppercase' },
  firmanteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  input: { backgroundColor: COLORS.surface },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  botonRegistrar: { backgroundColor: COLORS.secondaryLight },
  botonRegistrarBloqueado: { backgroundColor: COLORS.border },
  advertenciaBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    padding: 14,
    gap: 8,
  },
  advertenciaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  advertenciaTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.danger, flex: 1 },
  advertenciaTexto: { fontSize: FONT_SIZES.xs, color: '#B71C1C', lineHeight: 18 },
  botonAceptarRiesgo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  botonAceptarRiesgoTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.danger, flex: 1 },
  riesgoAceptadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  riesgoAceptadoTexto: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.warningLight },
  rechazarToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, padding: 10,
    backgroundColor: COLORS.background,
  },
  rechazarToggleActivo: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFF5F5',
  },
  rechazarToggleTexto: {
    fontSize: FONT_SIZES.xs, fontWeight: '600',
    color: COLORS.textSecondary, flex: 1,
  },
  botonRechazar: { backgroundColor: COLORS.danger },
});
