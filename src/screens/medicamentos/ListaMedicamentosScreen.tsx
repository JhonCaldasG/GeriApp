import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, Modal, TextInput, TouchableOpacity } from 'react-native';
import { Text, FAB, IconButton, Chip, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Medicamento, Insumo, MedicamentosStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import EmptyState from '../../components/EmptyState';
import AdministracionModal from '../../components/AdministracionModal';
import EditarMedicamentoModal from '../../components/EditarMedicamentoModal';
import { formatearFechaHora } from '../../storage';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { obtenerIncumplimientos } from '../../storage/incumplimientos';
import { obtenerInventario, ajustarStock } from '../../storage/inventario';
import { crearNotificacion } from '../../storage/notificaciones';

type Props = NativeStackScreenProps<MedicamentosStackParamList, 'ListaMedicamentos'>;

/** Devuelve cuántas dosis diarias implica la frecuencia, o null si es ilimitada */
function dosesPerDay(frecuencia: string): number | null {
  const f = frecuencia.toLowerCase().trim();
  if (f.includes('4 hora')) return 6;
  if (f.includes('6 hora')) return 4;
  if (f.includes('8 hora')) return 3;
  if (f.includes('12 hora')) return 2;
  if (f === 'una vez al día' || f === 'una vez al dia') return 1;
  if (f.includes('dos veces')) return 2;
  if (f.includes('tres veces')) return 3;
  if (f.includes('necesidad')) return null;
  return null;
}

/** Horas entre dosis según frecuencia */
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

function formatear12h(hora24: string): string {
  const [h, m] = hora24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calcularHorasDosis(horaInicio: string, frecuencia: string): string[] {
  if (!horaInicio || !horaInicio.match(/^\d{2}:\d{2}$/)) return [];
  const [h, m] = horaInicio.split(':').map(Number);
  const inicioMin = h * 60 + m;
  const intervalo = horasEntreDosisDe(frecuencia);
  if (!intervalo) return [horaInicio];
  const count = Math.round(24 / intervalo);
  return Array.from({ length: count }, (_, i) => {
    const total = (inicioMin + i * intervalo * 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  });
}

/** Formatea la próxima toma en texto legible */
function formatearProximaToma(proxima: Date): { texto: string; vencida: boolean } {
  const ahora = new Date();
  const vencida = proxima <= ahora;
  const hoyStr = ahora.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const proximaStr = proxima.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = proxima.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  const mananaStr = manana.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let texto: string;
  if (proximaStr === hoyStr) {
    texto = `Hoy a las ${horaStr}`;
  } else if (proximaStr === mananaStr) {
    texto = `Mañana a las ${horaStr}`;
  } else {
    texto = `${proximaStr} a las ${horaStr}`;
  }
  return { texto, vencida };
}

function estadoStock(i: Insumo): 'bajo' | 'alerta' | 'ok' {
  if (i.stockActual <= i.stockMinimo) return 'bajo';
  if (i.stockActual <= i.stockMinimo * 1.5) return 'alerta';
  return 'ok';
}

/**
 * Returns how many inventory units to deduct for one dose administration.
 * - Measurement units (mg, ml, g, mcg, UI, etc.) → always 1 physical unit.
 * - Countable units (tableta, cápsula, comprimido, etc.) → use the numeric prefix.
 * - Anything else → 1.
 */
function parseDoseDeduction(dosis: string): number {
  const s = dosis.toLowerCase().trim();
  if (/\d+\s*(mg|ml|g\b|mcg|ug|ui|iu|mmol|meq|%|cc)/.test(s)) return 1;
  const countMatch = s.match(
    /^(\d+(?:\.\d+)?)\s*(tableta|comprimido|c[aá]psula|pastilla|gragea|tab\b|cap\b|gota|supositorio|parche|ampolla|amp\b|sobre|sachet)/,
  );
  if (countMatch) {
    const n = parseFloat(countMatch[1]);
    if (!isNaN(n) && n > 0 && n <= 20) return n;
  }
  return 1;
}

const COLOR_STOCK = { bajo: '#C62828', alerta: '#E65100', ok: '#2E7D32' };
const BG_STOCK    = { bajo: '#FFEBEE', alerta: '#FFF3E0', ok: '#E8F5E9' };

export default function ListaMedicamentosScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { medicamentos, cargarMedicamentos, eliminarMedicamento, administraciones, cargarAdministraciones, pacientes } = useApp();
  const { isAdmin, usuario } = useAuth();
  const { showToast } = useToast();
  const { colors } = useAppTheme();

  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [medAdministrar, setMedAdministrar] = useState<Medicamento | null>(null);
  const [medEditar, setMedEditar] = useState<Medicamento | null>(null);
  const [medsHabilitados, setMedsHabilitados] = useState<Set<string>>(new Set());
  const [inventarioMeds, setInventarioMeds] = useState<Insumo[]>([]);
  const [reporteModal, setReporteModal] = useState<{ med: Medicamento; insumo?: Insumo } | null>(null);
  const [reporteMensaje, setReporteMensaje] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarMedicamentos(pacienteId);
      cargarAdministraciones();
      obtenerInventario().then(lista => setInventarioMeds(lista.filter(i => i.categoria === 'medicamentos'))).catch(() => {});
      const hoyISO = new Date().toISOString().slice(0, 10);
      obtenerIncumplimientos(1).then(incs => {
        const habilitados = new Set(
          incs
            .filter(i =>
              i.pacienteId === pacienteId &&
              i.tipo === 'medicamento' &&
              i.fecha === hoyISO &&
              i.requerimientoEstado === 'resuelto'
            )
            .map(i => i.detalle)
        );
        setMedsHabilitados(habilitados);
      }).catch(() => {});
    });
    return unsubscribe;
  }, [navigation, pacienteId]);

  const meds = medicamentos.filter(m => m.pacienteId === pacienteId);
  const activos = meds.filter(m => m.activo);
  const inactivos = meds.filter(m => !m.activo);

  const hoy = new Date().toISOString().slice(0, 10);

  const adminsPaciente = useMemo(
    () => administraciones.filter(a => a.pacienteId === pacienteId),
    [administraciones, pacienteId]
  );

  /** Cuántas dosis se administraron hoy para un medicamento dado */
  const dosisHoyPorMed = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of adminsPaciente) {
      if (a.createdAt.slice(0, 10) === hoy) {
        map[a.medicamentoId] = (map[a.medicamentoId] ?? 0) + 1;
      }
    }
    return map;
  }, [adminsPaciente, hoy]);

  const pendientesHoy = useMemo(
    () => activos.filter(m => {
      const requeridas = dosesPerDay(m.frecuencia);
      const dadas = dosisHoyPorMed[m.id] ?? 0;
      if (requeridas === null) return dadas === 0;
      return dadas < requeridas;
    }),
    [activos, dosisHoyPorMed]
  );

  function dosisFaltantes(m: Medicamento): string {
    const requeridas = dosesPerDay(m.frecuencia);
    const dadas = dosisHoyPorMed[m.id] ?? 0;
    if (requeridas === null) return m.dosis;
    return `${m.dosis}  •  ${dadas}/${requeridas} dosis (faltan ${requeridas - dadas})`;
  }

  function ultimaAdminInfo(medId: string): { texto: string; iso: string } | null {
    const historial = administraciones.filter(a => a.medicamentoId === medId);
    if (historial.length === 0) return null;
    return { texto: formatearFechaHora(historial[0].createdAt), iso: historial[0].createdAt };
  }

  const paciente = pacientes.find(p => p.id === pacienteId);

  function confirmarEliminar(id: string, nombre: string) {
    ejecutarEliminacion(
      'Eliminar Medicamento',
      `¿Desea eliminar "${nombre}"?`,
      async () => {
        await eliminarMedicamento(id);
        await cargarMedicamentos(pacienteId);
      },
    );
  }

  function insumoParaMed(med: Medicamento): Insumo | undefined {
    const nombre = med.nombre.toLowerCase();
    return inventarioMeds.find(i => i.nombre.toLowerCase().includes(nombre) || nombre.includes(i.nombre.toLowerCase()));
  }

  async function enviarReporte() {
    if (!reporteModal) return;
    const { med, insumo } = reporteModal;
    const stockInfo = insumo ? ` Stock actual: ${insumo.stockActual} ${insumo.unidad} (mínimo: ${insumo.stockMinimo}).` : '';
    try {
      await crearNotificacion({
        paraRol: 'admin',
        tipo: 'stock_bajo',
        titulo: `Alerta de stock: ${med.nombre}`,
        mensaje: (reporteMensaje.trim() || `Se requiere revisión del stock de ${med.nombre}.`) + stockInfo + ` Reportado por ${usuario ? `${usuario.nombre} ${usuario.apellido}` : 'un usuario'}.`,
        datos: { medicamentoNombre: med.nombre, insumoId: insumo?.id },
      });
      Alert.alert('Enviado', 'El administrador fue notificado.');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el reporte.');
    }
    setReporteModal(null);
    setReporteMensaje('');
  }

  const renderMedicamento = ({ item }: { item: Medicamento }) => {
    const ultimaInfo = ultimaAdminInfo(item.id);
    const totalDiarias = dosesPerDay(item.frecuencia);
    const dosisHoy = dosisHoyPorMed[item.id] ?? 0;
    const dosisCompletas = totalDiarias !== null && dosisHoy >= totalDiarias;
    const habilitado = medsHabilitados.has(item.nombre);
    const insumo = insumoParaMed(item);
    const estado = insumo ? estadoStock(insumo) : null;

    // Calcular próxima toma
    let proximaToma: { texto: string; vencida: boolean } | null = null;
    if (ultimaInfo && item.activo) {
      const horas = horasEntreDosisDe(item.frecuencia);
      if (horas !== null) {
        const proxima = new Date(new Date(ultimaInfo.iso).getTime() + horas * 60 * 60 * 1000);
        proximaToma = formatearProximaToma(proxima);
      }
    }

    return (
      <View style={[styles.medCard, !item.activo && styles.medCardInactivo, { backgroundColor: colors.surface }]}>
        <View style={[styles.medIcono, { backgroundColor: item.activo ? '#FFF3E0' : '#F5F5F5' }]}>
          <MaterialCommunityIcons
            name="pill" size={24}
            color={item.activo ? COLORS.warningLight : COLORS.textSecondary}
          />
        </View>
        <View style={styles.medInfo}>
          <View style={styles.medTituloFila}>
            <Text style={styles.medNombre}>{item.nombre}</Text>
            {!item.activo && (
              <Chip compact style={styles.chipInactivo} textStyle={styles.chipInactivoTexto}>Inactivo</Chip>
            )}
          </View>
          <Text style={styles.medDosis}>{item.dosis}  —  {item.frecuencia}</Text>
          {item.horario ? (() => {
            const dosis = calcularHorasDosis(item.horario, item.frecuencia);
            if (dosis.length <= 1) return <Text style={styles.medHorario}>Inicio: {formatear12h(item.horario)}</Text>;
            return (
              <>
                {dosis.map((h, i) => (
                  <Text key={i} style={styles.medHorario}>Dosis {i + 1}: {formatear12h(h)}</Text>
                ))}
              </>
            );
          })() : null}
          {item.viaAdministracion ? <Text style={styles.medVia}>Vía: {item.viaAdministracion}</Text> : null}
          {item.observaciones ? <Text style={styles.medObs}>{item.observaciones}</Text> : null}

          {/* Stock en inventario */}
          {insumo && estado && (
            <View style={[styles.stockBadge, { backgroundColor: BG_STOCK[estado] }]}>
              <MaterialCommunityIcons name="package-variant-closed" size={12} color={COLOR_STOCK[estado]} />
              <Text style={[styles.stockTexto, { color: COLOR_STOCK[estado] }]}>
                Stock: {insumo.stockActual} {insumo.unidad}
                {estado === 'bajo' ? ' — Stock bajo' : estado === 'alerta' ? ' — Stock en alerta' : ''}
              </Text>
            </View>
          )}

          {/* Botón reportar */}
          {!isAdmin && (
            <TouchableOpacity
              style={styles.btnReporte}
              onPress={() => { setReporteModal({ med: item, insumo }); setReporteMensaje(''); }}
            >
              <MaterialCommunityIcons name="bell-ring-outline" size={13} color={COLORS.warning} />
              <Text style={styles.btnReporteTexto}>Informar al admin</Text>
            </TouchableOpacity>
          )}

          {/* Estado de dosis de hoy */}
          {item.activo && totalDiarias !== null && (
            <View style={styles.dosisProgreso}>
              {Array.from({ length: totalDiarias }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dosisSegmento, i < dosisHoy && styles.dosisSegmentoHecho]}
                />
              ))}
              <Text style={[styles.dosisProgresoTexto, dosisCompletas && { color: COLORS.secondaryLight }]}>
                {dosisCompletas
                  ? `✓ ${dosisHoy}/${totalDiarias} dosis completas`
                  : `${dosisHoy}/${totalDiarias} dosis hoy`}
              </Text>
            </View>
          )}

          {ultimaInfo ? (
            <View style={styles.ultimaAdmin}>
              <MaterialCommunityIcons name="check-circle" size={12} color={COLORS.secondaryLight} />
              <Text style={styles.ultimaAdminTexto}>Última dosis: {ultimaInfo.texto}</Text>
            </View>
          ) : item.activo ? (
            <View style={styles.ultimaAdmin}>
              <MaterialCommunityIcons name="clock-alert-outline" size={12} color={COLORS.warningLight} />
              <Text style={[styles.ultimaAdminTexto, { color: COLORS.warningLight }]}>Sin administraciones registradas</Text>
            </View>
          ) : null}

          {proximaToma && !dosisCompletas && (
            <View style={[styles.proximaToma, proximaToma.vencida && styles.proximaTomaVencida]}>
              <MaterialCommunityIcons
                name={proximaToma.vencida ? 'clock-alert' : 'clock-outline'}
                size={12}
                color={proximaToma.vencida ? COLORS.danger : COLORS.primary}
              />
              <Text style={[styles.proximaTomaTexto, proximaToma.vencida && { color: COLORS.danger }]}>
                {proximaToma.vencida ? 'Dosis pendiente desde ' : 'Próxima dosis: '}{proximaToma.texto}
              </Text>
            </View>
          )}

          {/* Botón registrar dosis */}
          {item.activo && (
            <View style={styles.accionesMed}>
              {dosisCompletas && !habilitado ? (
                <View style={styles.chipDosisCompleta}>
                  <MaterialCommunityIcons name="check-all" size={14} color={COLORS.secondaryLight} />
                  <Text style={styles.chipDosisCompletaTexto}>Dosis del día completadas</Text>
                </View>
              ) : (
                <>
                  {habilitado && (
                    <View style={styles.chipHabilitado}>
                      <MaterialCommunityIcons name="lock-open-variant-outline" size={12} color="#E65100" />
                      <Text style={styles.chipHabilitadoTexto}>Registro autorizado por admin</Text>
                    </View>
                  )}
                  <Chip
                    icon="needle"
                    onPress={() => setMedAdministrar(item)}
                    style={[styles.chipDosis, habilitado && styles.chipDosisHabilitado]}
                    textStyle={styles.chipDosisTexto}
                    compact
                  >
                    {totalDiarias !== null
                      ? `Registrar dosis ${dosisHoy + 1} de ${totalDiarias}`
                      : 'Registrar dosis'}
                  </Chip>
                </>
              )}
            </View>
          )}
        </View>
        <View style={styles.iconosAccion}>
          {isAdmin && (
            <IconButton
              icon="pencil-outline"
              iconColor={COLORS.primary}
              size={20}
              onPress={() => setMedEditar(item)}
            />
          )}
          {isAdmin && (
            <IconButton
              icon="delete-outline"
              iconColor={COLORS.danger}
              size={20}
              onPress={() => confirmarEliminar(item.id, item.nombre)}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color="#E65100" />
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

      <FlatList
        data={[...activos, ...inactivos]}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <>
            {/* Resumen de dosis */}
            {meds.length > 0 && (
              <View style={styles.resumenRow}>
                <View style={[styles.resumenCard, { borderLeftColor: COLORS.secondaryLight, backgroundColor: colors.surface }]}>
                  <Text style={styles.resumenNum}>{adminsPaciente.length}</Text>
                  <Text style={styles.resumenLabel}>Dosis{'\n'}registradas</Text>
                </View>
                <View style={[styles.resumenCard, { borderLeftColor: pendientesHoy.length > 0 ? COLORS.danger : COLORS.secondaryLight, backgroundColor: colors.surface }]}>
                  <Text style={[styles.resumenNum, pendientesHoy.length > 0 && { color: COLORS.danger }]}>
                    {pendientesHoy.length}
                  </Text>
                  <Text style={styles.resumenLabel}>Pendientes{'\n'}hoy</Text>
                </View>
                <View style={[styles.resumenCard, { borderLeftColor: COLORS.primary, backgroundColor: colors.surface }]}>
                  <Text style={styles.resumenNum}>{activos.length}</Text>
                  <Text style={styles.resumenLabel}>Medicamentos{'\n'}activos</Text>
                </View>
              </View>
            )}

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

            {/* Botón historial */}
            <TouchableRipple
              onPress={() => navigation.navigate('HistorialAdministraciones', { pacienteId, pacienteNombre })}
              style={styles.historialBtn}
              borderless={false}
            >
              <View style={styles.historialBtnInner}>
                <MaterialCommunityIcons name="history" size={18} color={COLORS.primary} />
                <Text style={styles.historialBtnTexto}>Ver historial de dosis</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.primary} />
              </View>
            </TouchableRipple>
            {meds.length > 0 ? (
              <Text style={styles.resumen}>
                {activos.length} activo{activos.length !== 1 ? 's' : ''}
                {inactivos.length > 0 ? `  •  ${inactivos.length} inactivo${inactivos.length !== 1 ? 's' : ''}` : ''}
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icono="pill"
            titulo="Sin medicamentos registrados"
            subtitulo="Toque el botón + para agregar un medicamento"
          />
        }
        renderItem={renderMedicamento}
      />

      {isAdmin && (
        <FAB
          icon="plus"
          label="Agregar Medicamento"
          style={styles.fab}
          onPress={() => navigation.navigate('AgregarMedicamento', { pacienteId, pacienteNombre })}
        />
      )}

      <Modal visible={!!reporteModal} transparent animationType="fade" onRequestClose={() => setReporteModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalTitulo}>Informar al administrador</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginBottom: 8 }}>
              {reporteModal?.med.nombre}
              {reporteModal?.insumo ? `  •  Stock: ${reporteModal.insumo.stockActual} ${reporteModal.insumo.unidad}` : '  •  Sin insumo vinculado en inventario'}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: COLORS.border, minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Describe la situación (opcional)"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              value={reporteMensaje}
              onChangeText={setReporteMensaje}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setReporteModal(null)}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirmar} onPress={enviarReporte}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdministracionModal
        visible={!!medAdministrar}
        medicamento={medAdministrar}
        pacienteNombre={pacienteNombre}
        dosisHoy={medAdministrar ? (dosisHoyPorMed[medAdministrar.id] ?? 0) : 0}
        totalDiarias={medAdministrar ? dosesPerDay(medAdministrar.frecuencia) : null}
        ultimaAdminIso={medAdministrar ? (ultimaAdminInfo(medAdministrar.id)?.iso ?? null) : null}
        onDismiss={() => setMedAdministrar(null)}
        onRegistrado={async (wasRejected: boolean) => {
          const med = medAdministrar;
          setMedAdministrar(null);
          cargarAdministraciones();
          if (!wasRejected && med) {
            const insumo = insumoParaMed(med);
            if (insumo) {
              const delta = -parseDoseDeduction(med.dosis);
              const stockAntes = insumo.stockActual;
              const stockDespues = Math.max(0, stockAntes + delta);
              try {
                await ajustarStock(insumo.id, delta, usuario ? `${usuario.nombre} ${usuario.apellido}` : undefined, pacienteNombre);
                obtenerInventario()
                  .then(lista => setInventarioMeds(lista.filter(i => i.categoria === 'medicamentos')))
                  .catch(() => {});
                if (stockAntes > insumo.stockMinimo && stockDespues <= insumo.stockMinimo) {
                  crearNotificacion({
                    paraRol: 'admin',
                    tipo: 'stock_bajo',
                    titulo: `Stock bajo: ${insumo.nombre}`,
                    mensaje: `El stock de ${insumo.nombre} llegó a ${stockDespues} ${insumo.unidad} (mínimo: ${insumo.stockMinimo}). Descuento automático por dosis de ${med.nombre} para ${pacienteNombre}.`,
                    datos: { insumoId: insumo.id, medicamentoNombre: med.nombre },
                  }).catch(() => {});
                }
              } catch {
                // Deduction failed silently — administration was already saved
              }
            }
          }
          showToast(wasRejected ? 'El rechazo de la dosis fue registrado correctamente.' : 'La administración de la dosis fue guardada correctamente.');
        }}
      />

      <EditarMedicamentoModal
        visible={!!medEditar}
        medicamento={medEditar}
        pacienteNombre={pacienteNombre}
        onDismiss={() => setMedEditar(null)}
        onGuardado={() => {
          setMedEditar(null);
          cargarMedicamentos(pacienteId);
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
    flexDirection: 'row', gap: 8, marginBottom: 10,
  },
  resumenCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 10,
    padding: 10, borderLeftWidth: 4, elevation: 1, alignItems: 'center',
  },
  resumenNum: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  pendientesBox: {
    marginBottom: 10, backgroundColor: '#FFF3E0',
    borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: COLORS.danger,
  },
  pendientesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pendientesTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.danger },
  pendienteItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  pendienteNombre: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  pendienteDosis: { fontSize: FONT_SIZES.xs, color: COLORS.warningLight },
  historialBtn: {
    backgroundColor: COLORS.surface, borderRadius: 10,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  historialBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
  },
  historialBtnTexto: { flex: 1, fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.primary },
  resumen: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 8 },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  medCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 1, gap: 12,
  },
  medCardInactivo: { opacity: 0.6 },
  medIcono: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  medInfo: { flex: 1 },
  iconosAccion: { flexDirection: 'column', alignItems: 'center' },
  medTituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  medNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  chipInactivo: { backgroundColor: '#EEEEEE', height: 24 },
  chipInactivoTexto: { fontSize: 10 },
  medDosis: { fontSize: FONT_SIZES.sm, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  medHorario: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  medVia: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  medObs: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  dosisProgreso: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap',
  },
  dosisSegmento: {
    width: 20, height: 5, borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dosisSegmentoHecho: { backgroundColor: COLORS.secondaryLight },
  dosisProgresoTexto: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginLeft: 2,
  },
  ultimaAdmin: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ultimaAdminTexto: { fontSize: FONT_SIZES.xs, color: COLORS.secondaryLight },
  proximaToma: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
  },
  proximaTomaVencida: {},
  proximaTomaTexto: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600' },
  accionesMed: { marginTop: 8 },
  chipDosis: { backgroundColor: '#E8F5E9', alignSelf: 'flex-start' },
  chipDosisTexto: { color: COLORS.secondary, fontSize: FONT_SIZES.xs, fontWeight: '700' },
  chipDosisHabilitado: { backgroundColor: '#FFF3E0' },
  chipHabilitado: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF3E0', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 6, alignSelf: 'flex-start',
  },
  chipHabilitadoTexto: { fontSize: 10, color: '#E65100', fontWeight: '600' },
  chipDosisCompleta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  chipDosisCompletaTexto: { fontSize: FONT_SIZES.xs, color: COLORS.secondaryLight, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.warningLight },
  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    marginTop: 6, alignSelf: 'flex-start',
  },
  stockTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  btnReporte: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80',
  },
  btnReporteTexto: { fontSize: FONT_SIZES.xs, color: COLORS.warning, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: 320, borderRadius: 16, padding: 20, gap: 12 },
  modalTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: FONT_SIZES.sm },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancelar: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalBtnConfirmar: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.warning },
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
