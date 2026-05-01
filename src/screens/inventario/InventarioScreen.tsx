// src/screens/inventario/InventarioScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { Insumo } from '../../types';
import { obtenerInventario, ajustarStock, obtenerMovimientosInsumo, MovimientoInventario } from '../../storage/inventario';
import { crearNotificacion } from '../../storage/notificaciones';

const CATEGORIAS = ['todos', 'higiene', 'medicamentos', 'material_medico', 'limpieza', 'alimentos'] as const;
const CAT_LABELS: Record<string, string> = {
  todos: 'Todos', higiene: 'Higiene', medicamentos: 'Medicamentos',
  material_medico: 'Material Médico', limpieza: 'Limpieza', alimentos: 'Alimentos',
};

const PRESENTATION_LABELS: Record<string, string> = {
  // Medications
  tablet: 'Tableta', capsule: 'Cápsula', syrup: 'Jarabe',
  suspension: 'Suspensión', injectable: 'Inyectable', drops: 'Gotas',
  cream: 'Crema', inhaler: 'Inhalador', patch: 'Parche',
  suppository: 'Supositorio', powder: 'Polvo/Sobre',
  // Medical supplies
  gloves: 'Guantes', mask: 'Tapabocas', syringe: 'Jeringa',
  bandage: 'Venda', gauze: 'Gasa', cotton: 'Algodón',
  needle: 'Aguja', catheter: 'Catéter', tape: 'Esparadrapo',
  gluc_strip: 'Tira glucosa',
  other: 'Otro',
};

const CATEGORIAS_POR_ROL: Record<string, Insumo['categoria'][]> = {
  admin:     ['higiene', 'medicamentos', 'material_medico', 'limpieza', 'alimentos'],
  enfermero: ['medicamentos'],
  aseo:      ['limpieza'],
};

function estadoInsumo(i: Insumo): 'bajo' | 'alerta' | 'ok' {
  if (i.stockActual <= i.stockMinimo) return 'bajo';
  if (i.stockActual <= i.stockMinimo * 1.5) return 'alerta';
  return 'ok';
}

export default function InventarioScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isAdmin, isAseo, usuario } = useAuth();
  const { colors } = useAppTheme();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [ajusteModal, setAjusteModal] = useState<{ insumo: Insumo; tipo: '+' | '-' } | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [historialModal, setHistorialModal] = useState<Insumo | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [reporteModal, setReporteModal] = useState<Insumo | null>(null);
  const [reporteMensaje, setReporteMensaje] = useState('');
  const [patientName, setPatientName] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<MovimientoInventario | null>(null);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  const puedeAjustar = isAdmin;
  const categoriasPermitidas: Insumo['categoria'][] = CATEGORIAS_POR_ROL[usuario?.rol ?? ''] ?? CATEGORIAS_POR_ROL.admin;
  const mostrarChips = isAdmin;

  useEffect(() => {
    if (!isAdmin && categoriasPermitidas.length === 1) {
      setCategoriaFiltro(categoriasPermitidas[0]);
    }
  }, [usuario?.rol]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setInsumos(await obtenerInventario()); } catch { /* silencioso */ }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const filtrados = insumos.filter(i => {
    const matchRol = isAdmin || categoriasPermitidas.includes(i.categoria);
    const matchCat = categoriaFiltro === 'todos' || i.categoria === categoriaFiltro;
    const matchBusq = busqueda.trim() === '' || i.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchRol && matchCat && matchBusq;
  });
  const bajosCount = insumos.filter(i => estadoInsumo(i) === 'bajo').length;

  async function confirmarAjuste() {
    if (!ajusteModal || savingAdjustment) return;
    const cant = parseFloat(cantidadAjuste);
    if (isNaN(cant) || cant <= 0) { Alert.alert('Error', 'Ingresá una cantidad válida.'); return; }
    const delta = ajusteModal.tipo === '+' ? cant : -cant;
    setSavingAdjustment(true);
    try {
      await ajustarStock(
        ajusteModal.insumo.id,
        delta,
        usuario ? `${usuario.nombre} ${usuario.apellido}` : undefined,
        patientName.trim() || undefined,
      );
      await cargar();
    } catch { Alert.alert('Error', 'No se pudo ajustar el stock.'); }
    setSavingAdjustment(false);
    setAjusteModal(null);
    setCantidadAjuste('');
    setPatientName('');
  }

  async function enviarReporte() {
    if (!reporteModal || sendingReport) return;
    setSendingReport(true);
    try {
      await crearNotificacion({
        paraRol: 'admin',
        tipo: 'stock_bajo',
        titulo: `Alerta de stock: ${reporteModal.nombre}`,
        mensaje: reporteMensaje.trim() || `Stock actual: ${reporteModal.stockActual} ${reporteModal.unidad} (mínimo: ${reporteModal.stockMinimo}). Reportado por ${usuario ? `${usuario.nombre} ${usuario.apellido}` : 'un usuario'}.`,
        datos: { insumoId: reporteModal.id, stockActual: reporteModal.stockActual },
      });
      Alert.alert('Enviado', 'El administrador fue notificado.');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el reporte.');
    }
    setSendingReport(false);
    setReporteModal(null);
    setReporteMensaje('');
  }

  async function abrirHistorial(insumo: Insumo) {
    setHistorialModal(insumo);
    setCargandoMovimientos(true);
    setMovimientos([]);
    try {
      const data = await obtenerMovimientosInsumo(insumo.id);
      setMovimientos(data);
    } catch { /* silencioso */ } finally {
      setCargandoMovimientos(false);
    }
  }

  const colorEstado = { bajo: COLORS.danger, alerta: COLORS.warning, ok: COLORS.secondary };
  const bgEstado = { bajo: '#FFEBEE', alerta: '#FFF3E0', ok: '#E8F5E9' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Resumen + agregar */}
      <View style={[styles.resumen, { backgroundColor: colors.surface }]}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: COLORS.danger }]}>{bajosCount}</Text>
          <Text style={styles.resumenLabel}>Stock bajo</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: COLORS.primary }]}>{insumos.length}</Text>
          <Text style={styles.resumenLabel}>Total</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.agregarBtn} onPress={() => navigation.navigate('AgregarInsumo')}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.agregarBtnTexto}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Buscador */}
      <View style={[styles.buscadorWrapper, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.buscador, { color: colors.textPrimary }]}
          placeholder="Buscar insumo..."
          placeholderTextColor={COLORS.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro categorías — solo admin */}
      {mostrarChips && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroScroll} contentContainerStyle={styles.filtroContent}>
          {CATEGORIAS.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filtroChip, categoriaFiltro === cat && styles.filtroChipActivo]}
              onPress={() => setCategoriaFiltro(cat)}
            >
              <Text style={[styles.filtroChipTexto, categoriaFiltro === cat && styles.filtroChipTextoActivo]}>
                {CAT_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {filtrados.length === 0 && (
          <Text style={styles.vacio}>{busqueda ? 'Sin resultados para tu búsqueda.' : 'No hay insumos en esta categoría.'}</Text>
        )}
        {filtrados.map(insumo => {
          const est = estadoInsumo(insumo);
          return (
            <View key={insumo.id} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colorEstado[est] }]}>
              <View style={[styles.cardEstado, { backgroundColor: bgEstado[est] }]}>
                <MaterialCommunityIcons
                  name={est === 'bajo' ? 'alert' : est === 'alerta' ? 'alert-circle-outline' : 'check-circle'}
                  size={20}
                  color={colorEstado[est]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardNombre, { color: colors.textPrimary }]}>{insumo.nombre}</Text>

                {/* Pharmaceutical badges */}
                <View style={styles.cardBadgeRow}>
                  {insumo.presentation && (
                    <View style={styles.cardBadge}>
                      <Text style={styles.cardBadgeText}>
                        {PRESENTATION_LABELS[insumo.presentation] ?? insumo.presentation}
                      </Text>
                    </View>
                  )}
                  {insumo.concentration && (
                    <View style={[styles.cardBadge, styles.cardBadgeConc]}>
                      <Text style={[styles.cardBadgeText, { color: COLORS.primary }]}>{insumo.concentration}</Text>
                    </View>
                  )}
                  {insumo.size && (
                    <View style={[styles.cardBadge, styles.cardBadgeSize]}>
                      <Text style={[styles.cardBadgeText, { color: '#2E7D32' }]}>{insumo.size}</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.cardStock, { color: colorEstado[est] }]}>
                  {insumo.stockActual} {insumo.unidad} (mín. {insumo.stockMinimo})
                  {insumo.packageQuantity ? `  ·  x${insumo.packageQuantity} por envase` : ''}
                </Text>
                <Text style={styles.cardCategoria}>{CAT_LABELS[insumo.categoria]}</Text>
              </View>
              <View style={styles.cardAcciones}>
                {puedeAjustar && (
                  <>
                    <TouchableOpacity onPress={() => { setAjusteModal({ insumo, tipo: '+' }); setCantidadAjuste(''); }} style={styles.btnAjuste}>
                      <MaterialCommunityIcons name="plus" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setAjusteModal({ insumo, tipo: '-' }); setCantidadAjuste(''); }} style={styles.btnAjuste}>
                      <MaterialCommunityIcons name="minus" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => abrirHistorial(insumo)} style={styles.btnAjuste}>
                  <MaterialCommunityIcons name="history" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                {!isAdmin && (
                  <TouchableOpacity onPress={() => { setReporteModal(insumo); setReporteMensaje(''); }} style={styles.btnAjuste}>
                    <MaterialCommunityIcons name="bell-ring-outline" size={18} color={COLORS.warning} />
                  </TouchableOpacity>
                )}
                {isAdmin && (
                  <TouchableOpacity onPress={() => navigation.navigate('AgregarInsumo', { insumoId: insumo.id })} style={styles.btnAjuste}>
                    <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal ajuste */}
      <Modal visible={!!ajusteModal} transparent animationType="fade" onRequestClose={() => { setAjusteModal(null); setPatientName(''); }}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => { setAjusteModal(null); setPatientName(''); }} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalTitulo}>
              {ajusteModal?.tipo === '+' ? 'Entrada de stock' : 'Salida de stock'} — {ajusteModal?.insumo.nombre}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: COLORS.border }]}
              placeholder={`Cantidad (${ajusteModal?.insumo.unidad})`}
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              value={cantidadAjuste}
              onChangeText={setCantidadAjuste}
              autoFocus
            />
            {ajusteModal?.tipo === '-' && (
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: COLORS.border }]}
                placeholder="Administrado a (paciente, opcional)"
                placeholderTextColor={COLORS.textSecondary}
                value={patientName}
                onChangeText={setPatientName}
                autoCapitalize="words"
              />
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => { setAjusteModal(null); setPatientName(''); }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnConfirmar, savingAdjustment && { opacity: 0.6 }]} onPress={confirmarAjuste} disabled={savingAdjustment}>
                {savingAdjustment
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal reporte de stock */}
      <Modal visible={!!reporteModal} transparent animationType="fade" onRequestClose={() => setReporteModal(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setReporteModal(null)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalTitulo}>Reportar al administrador</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginBottom: 4 }}>
              {reporteModal?.nombre} — Stock actual: {reporteModal?.stockActual} {reporteModal?.unidad}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: COLORS.border, minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Mensaje para el admin (opcional)"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              value={reporteMensaje}
              onChangeText={setReporteMensaje}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setReporteModal(null)}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnConfirmar, { backgroundColor: COLORS.warning }, sendingReport && { opacity: 0.6 }]} onPress={enviarReporte} disabled={sendingReport}>
                {sendingReport
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal historial movimientos */}
      <Modal visible={!!historialModal} transparent animationType="slide" onRequestClose={() => { setHistorialModal(null); setSelectedMovement(null); }}>
        <View style={styles.historialOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => { setHistorialModal(null); setSelectedMovement(null); }} />
          <View style={[styles.historialPanel, { backgroundColor: colors.surface }]}>
            {/* Handle */}
            <View style={styles.historialHandle} />

            {/* Header */}
            <View style={styles.historialHeader}>
              {selectedMovement ? (
                <TouchableOpacity onPress={() => setSelectedMovement(null)} style={styles.historialCerrar}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.historialHeaderIcono}>
                  <MaterialCommunityIcons name="history" size={20} color={COLORS.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.historialTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
                  {selectedMovement ? 'Detalle del movimiento' : historialModal?.nombre}
                </Text>
                <Text style={styles.historialSubtitulo}>
                  {selectedMovement ? historialModal?.nombre : 'Últimos movimientos'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setHistorialModal(null); setSelectedMovement(null); }} style={styles.historialCerrar}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Contenido */}
            {cargandoMovimientos ? (
              <View style={styles.historialCargando}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.historialCargandoTexto}>Cargando movimientos...</Text>
              </View>
            ) : selectedMovement ? (
              <ScrollView
                style={styles.historialScroll}
                contentContainerStyle={[styles.historialScrollContent, { paddingBottom: insets.bottom + 16 }]}
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  const isEntry = selectedMovement.tipo === 'entrada';
                  const date = new Date(selectedMovement.createdAt);
                  return (
                    <>
                      <View style={[styles.detailTypeTag, { backgroundColor: isEntry ? '#E8F5E9' : '#FFEBEE' }]}>
                        <MaterialCommunityIcons name={isEntry ? 'arrow-up' : 'arrow-down'} size={18} color={isEntry ? COLORS.secondary : COLORS.danger} />
                        <Text style={[styles.detailTypeText, { color: isEntry ? COLORS.secondary : COLORS.danger }]}>
                          {isEntry ? 'Entrada de stock' : 'Salida de stock'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Cantidad</Text>
                        <Text style={[styles.detailValue, { color: isEntry ? COLORS.secondary : COLORS.danger, fontWeight: '700' }]}>
                          {isEntry ? '+' : '−'}{selectedMovement.cantidad} {historialModal?.unidad}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Stock</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {selectedMovement.stockAntes} → {selectedMovement.stockDespues} {historialModal?.unidad}
                        </Text>
                      </View>
                      {selectedMovement.patientName && historialModal?.categoria === 'medicamentos' ? (
                        <View style={[styles.detailRow, styles.detailPatientRow]}>
                          <MaterialCommunityIcons name="account-heart" size={16} color={COLORS.primary} />
                          <Text style={styles.detailLabel}>Paciente</Text>
                          <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: '700' }]}>
                            {selectedMovement.patientName}
                          </Text>
                        </View>
                      ) : null}
                      {selectedMovement.usuarioNombre ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Registrado por</Text>
                          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedMovement.usuarioNombre}</Text>
                        </View>
                      ) : null}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Fecha</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.detailLabel}>Hora</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </ScrollView>
            ) : movimientos.length === 0 ? (
              <View style={styles.historialVacio}>
                <MaterialCommunityIcons name="inbox-outline" size={40} color={COLORS.textSecondary} />
                <Text style={styles.historialVacioTexto}>Sin movimientos registrados</Text>
                <Text style={styles.historialVacioSub}>Los ajustes de stock se registran a partir de ahora.</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.historialScroll}
                contentContainerStyle={[styles.historialScrollContent, { paddingBottom: insets.bottom + 16 }]}
                showsVerticalScrollIndicator={false}
              >
                {movimientos.map((m, idx) => {
                  const esEntrada = m.tipo === 'entrada';
                  const fecha = new Date(m.createdAt);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedMovement(m)}
                      style={[
                        styles.movRow,
                        { borderLeftColor: esEntrada ? COLORS.secondary : COLORS.danger },
                        idx < movimientos.length - 1 && styles.movRowBorder,
                      ]}
                    >
                      <View style={[styles.movIcono, { backgroundColor: esEntrada ? '#E8F5E9' : '#FFEBEE' }]}>
                        <MaterialCommunityIcons
                          name={esEntrada ? 'arrow-up' : 'arrow-down'}
                          size={16}
                          color={esEntrada ? COLORS.secondary : COLORS.danger}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.movCantidad, { color: esEntrada ? COLORS.secondary : COLORS.danger }]}>
                          {esEntrada ? '+' : '−'}{m.cantidad} {historialModal?.unidad}
                        </Text>
                        <Text style={styles.movStock}>
                          Stock: {m.stockAntes} → {m.stockDespues} {historialModal?.unidad}
                        </Text>
                        {m.patientName ? (
                          <Text style={styles.movPatient}>
                            <MaterialCommunityIcons name="account" size={11} color={COLORS.primary} /> {m.patientName}
                          </Text>
                        ) : m.usuarioNombre ? (
                          <Text style={styles.movUsuario}>{m.usuarioNombre}</Text>
                        ) : null}
                      </View>
                      <View style={styles.movFechaCol}>
                        <Text style={styles.movFechaDia}>
                          {fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </Text>
                        <Text style={styles.movFechaHora}>
                          {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  resumen: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  resumenItem: { alignItems: 'center' },
  resumenNum: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  agregarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 'auto',
  },
  agregarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },
  buscadorWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  buscador: { flex: 1, fontSize: FONT_SIZES.sm, paddingVertical: 4 },
  filtroScroll: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filtroContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  filtroChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  filtroChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroChipTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  filtroChipTextoActivo: { color: '#fff' },
  lista: { padding: 12, gap: 8 },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, lineHeight: 22 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12, borderLeftWidth: 4, elevation: 1,
  },
  cardEstado: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardNombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  cardBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 2, flexWrap: 'wrap' },
  cardBadge: {
    backgroundColor: '#EEF2FF', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  cardBadgeConc: { backgroundColor: '#E3F2FD' },
  cardBadgeSize: { backgroundColor: '#E8F5E9' },
  cardBadgeText: { fontSize: 11, fontWeight: '700', color: '#5C6BC0' },
  cardCategoria: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  cardStock: { fontSize: FONT_SIZES.sm, fontWeight: '600', marginTop: 2 },
  cardAcciones: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  btnAjuste: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: 300, borderRadius: 16, padding: 20, gap: 16 },
  modalTitulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  modalInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: FONT_SIZES.md,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancelar: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  modalBtnConfirmar: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
  historialOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  historialPanel: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '62%',
    elevation: 20,
    overflow: 'hidden',
  },
  historialHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  historialHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  historialHeaderIcono: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  historialTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800' },
  historialSubtitulo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
  historialCerrar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  historialCargando: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12,
  },
  historialCargandoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  historialVacio: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8, paddingHorizontal: 32,
  },
  historialVacioTexto: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textSecondary },
  historialVacioSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  historialScroll: { flex: 1 },
  historialScrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  movRow: {
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 12,
    marginBottom: 2,
  },
  movRowBorder: {
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  movIcono: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  movCantidad: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  movStock: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  movUsuario: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1, fontStyle: 'italic' },
  movPatient: { fontSize: FONT_SIZES.xs, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  movFechaCol: { alignItems: 'flex-end', marginLeft: 8 },
  movFechaDia: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textPrimary },
  movFechaHora: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  detailTypeTag: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 8 },
  detailTypeText: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailPatientRow: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, borderBottomWidth: 0, marginVertical: 2 },
  detailLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, width: 110 },
  detailValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, flex: 1 },
});
