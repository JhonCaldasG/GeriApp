import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, TextInput, Button, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { PacientesStackParamList, Ausencia } from '../../types';
import { obtenerAusencias, guardarAusencia, cerrarAusencia, eliminarAusencia } from '../../storage/ausencias';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import SignaturePad from '../../components/SignaturePad';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<PacientesStackParamList, 'Ausencias'>;

const TIPO_CONFIG: Record<Ausencia['tipo'], { label: string; icono: string; color: string }> = {
  internacion:     { label: 'Internación',      icono: 'hospital-building', color: '#C62828' },
  salida_familiar: { label: 'Salida familiar',  icono: 'account-group',     color: '#1565C0' },
  licencia:        { label: 'Licencia médica',  icono: 'clipboard-plus',    color: '#2E7D32' },
  otro:            { label: 'Otro',             icono: 'calendar-remove',   color: '#607D8B' },
};

const TIPOS: Ausencia['tipo'][] = ['internacion', 'salida_familiar', 'licencia', 'otro'];

function formatFecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AusenciasScreen({ route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();

  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [scrollHabilitado, setScrollHabilitado] = useState(true);

  // Form
  const [tipo, setTipo] = useState<Ausencia['tipo']>('internacion');
  const [motivo, setMotivo] = useState('');
  const [dateInicio, setDateInicio] = useState(new Date());
  const [dateFin, setDateFin] = useState(new Date());
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [destino, setDestino] = useState('');
  const [responsable, setResponsable] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [firmaFamiliar, setFirmaFamiliar] = useState<string | null>(null);
  // Date picker del formulario
  const [activePicker, setActivePicker] = useState<'inicio' | 'fin' | null>(null);

  // Modal de marcar regreso
  const [regresoId, setRegresoId] = useState<string | null>(null);
  const [regresoFecha, setRegresoFecha] = useState(new Date());
  const [regresoPickerOpen, setRegresoPickerOpen] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerAusencias(pacienteId);
      setAusencias(data);
    } catch { /* silent */ }
  }, [pacienteId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  function toISO(d: Date) { return d.toISOString().slice(0, 10); }

  function horaActual() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  }

  function abrirModal() {
    const hoy = new Date();
    setTipo('internacion');
    setMotivo('');
    setDateInicio(hoy);
    setDateFin(hoy);
    setFechaInicio(toISO(hoy));
    setFechaFin('');
    setDestino('');
    setResponsable('');
    setObservaciones('');
    setFirmaFamiliar(null);
    setActivePicker(null);
    setScrollHabilitado(true);
    setModalVisible(true);
  }

  async function handleGuardar() {
    if (!motivo.trim()) {
      Alert.alert('Campo requerido', 'El motivo es obligatorio.');
      return;
    }
    if (!destino.trim()) {
      Alert.alert('Campo requerido', 'El destino o institución es obligatorio.');
      return;
    }
    if (!responsable.trim()) {
      Alert.alert('Campo requerido', 'El nombre del responsable o familiar es obligatorio.');
      return;
    }
    if (tipo === 'salida_familiar' && !firmaFamiliar) {
      Alert.alert('Firma requerida', 'La salida con familiar requiere la firma del responsable.');
      return;
    }
    setGuardando(true);
    try {
      await guardarAusencia({
        pacienteId,
        tipo,
        motivo: motivo.trim(),
        fechaInicio,
        horaSalida: horaActual(),
        fechaFin: fechaFin || null,
        destino: destino.trim(),
        responsable: responsable.trim(),
        observaciones: observaciones.trim(),
        firmaFamiliar: firmaFamiliar ?? null,
      });
      setModalVisible(false);
      await cargar();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la ausencia.');
    } finally {
      setGuardando(false);
    }
  }

  function confirmarCerrar(id: string) {
    setRegresoId(id);
    setRegresoFecha(new Date());
    setRegresoPickerOpen(false);
  }

  async function handleCerrar() {
    if (!regresoId) return;
    try {
      await cerrarAusencia(regresoId, toISO(regresoFecha), horaActual());
      setRegresoId(null);
      await cargar();
    } catch {
      Alert.alert('Error', 'No se pudo registrar el regreso.');
    }
  }

  function confirmarEliminar(id: string) {
    ejecutarEliminacion('Eliminar', '¿Desea eliminar este registro?', async () => {
      await eliminarAusencia(id);
      await cargar();
    });
  }

  const activas = ausencias.filter(a => !a.fechaFin);
  const cerradas = ausencias.filter(a => !!a.fechaFin);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      {activas.length > 0 && (
        <View style={styles.activasBanner}>
          <MaterialCommunityIcons name="alert-circle" size={18} color='#C62828' />
          <Text style={styles.activasBannerTexto}>
            {activas.length === 1 ? '1 ausencia activa' : `${activas.length} ausencias activas`}
          </Text>
        </View>
      )}

      <FlatList
        data={ausencias}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="calendar-check" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>No hay ausencias registradas</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG['otro'];
          const activa = !item.fechaFin;
          return (
            <View style={[styles.card, { backgroundColor: colors.surface }, activa && styles.cardActiva]}>
              <View style={styles.cardHeader}>
                <View style={[styles.tipoIcono, { backgroundColor: cfg.color + '22' }]}>
                  <MaterialCommunityIcons name={cfg.icono as any} size={22} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.tipoRow}>
                    <View style={[styles.tipoBadge, { backgroundColor: cfg.color }]}>
                      <Text style={styles.tipoBadgeTexto}>{cfg.label}</Text>
                    </View>
                    {activa && (
                      <View style={styles.activaBadge}>
                        <Text style={styles.activaBadgeTexto}>ACTIVA</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardFechas}>
                    {formatFecha(item.fechaInicio)}{item.horaSalida ? ` ${item.horaSalida}` : ''}
                    {item.fechaFin
                      ? ` → ${formatFecha(item.fechaFin)}${item.horaRegreso ? ` ${item.horaRegreso}` : ''}`
                      : ' → (presente)'}
                  </Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => confirmarEliminar(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.motivoTexto}>{item.motivo}</Text>
              {item.destino ? (
                <View style={styles.detalleRow}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detalleTexto}>{item.destino}</Text>
                </View>
              ) : null}
              {item.responsable ? (
                <View style={styles.detalleRow}>
                  <MaterialCommunityIcons name="account" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detalleTexto}>{item.responsable}</Text>
                </View>
              ) : null}
              {item.observaciones ? (
                <Text style={styles.obsTexto}>{item.observaciones}</Text>
              ) : null}

              {item.firmaFamiliar ? (() => {
                try {
                  const { d, w, h } = JSON.parse(item.firmaFamiliar!);
                  return (
                    <View style={styles.firmaViewer}>
                      <View style={styles.firmaViewerHeader}>
                        <MaterialCommunityIcons name="draw-pen" size={14} color="#2E7D32" />
                        <Text style={styles.firmaViewerLabel}>Firma del familiar</Text>
                      </View>
                      <View style={styles.firmaViewerCanvas}>
                        <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height={90}>
                          <Path
                            d={d}
                            stroke={COLORS.primary}
                            strokeWidth={2.5}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </View>
                    </View>
                  );
                } catch {
                  return null;
                }
              })() : null}

              {activa && isAdmin && (
                <Button
                  mode="outlined"
                  icon="account-check"
                  onPress={() => confirmarCerrar(item.id)}
                  style={styles.botonRegreso}
                  textColor='#2E7D32'
                  compact
                >
                  Marcar regreso hoy
                </Button>
              )}
            </View>
          );
        }}
      />

      <FAB
        icon="plus"
        label="Registrar ausencia"
        style={styles.fab}
        onPress={abrirModal}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <KeyboardAwareScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" enableOnAndroid scrollEnabled={scrollHabilitado}>
            <View style={styles.sheetHeader}>
              <MaterialCommunityIcons name="calendar-remove" size={24} color={COLORS.primary} />
              <Text style={styles.sheetTitulo}>Registrar ausencia</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tipo */}
            <Text style={styles.formLabel}>Tipo de ausencia</Text>
            <View style={styles.tiposRow}>
              {TIPOS.map(t => {
                const cfg = TIPO_CONFIG[t];
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tipoBtn, tipo === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                    onPress={() => setTipo(t)}
                  >
                    <MaterialCommunityIcons name={cfg.icono as any} size={16} color={tipo === t ? '#fff' : cfg.color} />
                    <Text style={[styles.tipoBtnTexto, tipo === t && { color: '#fff' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              label="Motivo *"
              value={motivo}
              onChangeText={setMotivo}
              multiline
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            {/* Fecha de inicio */}
            <Text style={styles.formLabelSm}>Fecha de inicio *</Text>
            <TouchableOpacity
              style={[styles.dateBtn, activePicker === 'inicio' && styles.dateBtnActivo]}
              onPress={() => setActivePicker(activePicker === 'inicio' ? null : 'inicio')}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.dateBtnTexto}>{formatFecha(fechaInicio)}</Text>
              <MaterialCommunityIcons name={activePicker === 'inicio' ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <DatePickerPanel
              visible={activePicker === 'inicio'}
              value={dateInicio}
              onDismiss={() => setActivePicker(null)}
              onConfirm={(d) => { setDateInicio(d); setFechaInicio(toISO(d)); setActivePicker(null); }}
            />

            {/* Fecha estimada de regreso (opcional) */}
            <Text style={styles.formLabelSm}>Fecha estimada de regreso</Text>
            {fechaFin ? (
              <View style={styles.dateBtnRow}>
                <TouchableOpacity
                  style={[styles.dateBtn, { flex: 1 }, activePicker === 'fin' && styles.dateBtnActivo]}
                  onPress={() => setActivePicker(activePicker === 'fin' ? null : 'fin')}
                >
                  <MaterialCommunityIcons name="calendar-check" size={20} color={COLORS.primary} />
                  <Text style={styles.dateBtnTexto}>{formatFecha(fechaFin)}</Text>
                  <MaterialCommunityIcons name={activePicker === 'fin' ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateClearBtn} onPress={() => { setFechaFin(''); setActivePicker(null); }}>
                  <MaterialCommunityIcons name="close" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.dateBtnVacio} onPress={() => { setDateFin(dateInicio); setFechaFin(toISO(dateInicio)); setActivePicker('fin'); }}>
                <MaterialCommunityIcons name="calendar-plus" size={20} color={COLORS.textSecondary} />
                <Text style={styles.dateBtnVacioTexto}>Seleccionar fecha estimada (opcional)</Text>
              </TouchableOpacity>
            )}
            <DatePickerPanel
              visible={activePicker === 'fin'}
              value={dateFin}
              minimumDate={dateInicio}
              onDismiss={() => setActivePicker(null)}
              onConfirm={(d) => { setDateFin(d); setFechaFin(toISO(d)); setActivePicker(null); }}
            />

            <TextInput
              label="Destino / Institución *"
              value={destino}
              onChangeText={setDestino}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              left={<TextInput.Icon icon="hospital-building" />}
            />
            <TextInput
              label="Responsable / Familiar *"
              value={responsable}
              onChangeText={setResponsable}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              left={<TextInput.Icon icon="account" />}
            />
            <TextInput
              label="Observaciones"
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            {tipo === 'salida_familiar' && (
              <View style={styles.firmaSeccion}>
                <View style={styles.firmaEncabezado}>
                  <MaterialCommunityIcons name="draw-pen" size={18} color={COLORS.primary} />
                  <Text style={styles.firmaLabel}>Firma del familiar / responsable *</Text>
                </View>
                <Text style={styles.firmaSubtitulo}>
                  El familiar debe firmar en el recuadro para autorizar la salida del paciente.
                </Text>
                <SignaturePad
                  onSignatureChange={setFirmaFamiliar}
                  onSigningStart={() => setScrollHabilitado(false)}
                  onSigningEnd={() => setScrollHabilitado(true)}
                />
              </View>
            )}

            <View style={styles.botones}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handleGuardar} loading={guardando}
                style={[{ flex: 2 }]} icon="content-save">
                Guardar
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Modal marcar regreso */}
      <Modal visible={regresoId !== null} animationType="slide" transparent onRequestClose={() => setRegresoId(null)}>
        <View style={styles.overlay}>
          <KeyboardAwareScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHeader}>
              <MaterialCommunityIcons name="account-check" size={24} color="#2E7D32" />
              <Text style={[styles.sheetTitulo, { color: '#2E7D32' }]}>Registrar regreso</Text>
              <TouchableOpacity onPress={() => setRegresoId(null)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabelSm}>Fecha de regreso</Text>
            <TouchableOpacity
              style={[styles.dateBtn, regresoPickerOpen && styles.dateBtnActivo]}
              onPress={() => setRegresoPickerOpen(v => !v)}
            >
              <MaterialCommunityIcons name="calendar-check" size={20} color="#2E7D32" />
              <Text style={styles.dateBtnTexto}>{formatFecha(toISO(regresoFecha))}</Text>
              <MaterialCommunityIcons name={regresoPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <DatePickerPanel
              visible={regresoPickerOpen}
              value={regresoFecha}
              onDismiss={() => setRegresoPickerOpen(false)}
              onConfirm={(d) => { setRegresoFecha(d); setRegresoPickerOpen(false); }}
            />

            <View style={[styles.botones, { marginTop: 20 }]}>
              <Button mode="outlined" onPress={() => setRegresoId(null)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handleCerrar} style={{ flex: 2, backgroundColor: '#2E7D32' }} icon="account-check">
                Confirmar regreso
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Selector de fecha inline (sin Modal anidado) ──────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

interface DatePickerPanelProps {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onDismiss: () => void;
}

function DatePickerPanel({ visible, value, minimumDate, onConfirm, onDismiss }: DatePickerPanelProps) {
  const [viewing, setViewing] = useState(new Date(value));
  const [selected, setSelected] = useState(new Date(value));

  useEffect(() => {
    if (visible) {
      setViewing(new Date(value));
      setSelected(new Date(value));
    }
  }, [visible]);

  if (!visible) return null;

  const year = viewing.getFullYear();
  const month = viewing.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  function isSel(day: number) {
    return selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
  }
  function isHoy(day: number) {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  }
  function isDis(day: number) {
    if (!minimumDate) return false;
    const minD = new Date(minimumDate);
    minD.setHours(0, 0, 0, 0);
    return new Date(year, month, day) < minD;
  }

  return (
    <View style={dp.container}>
      {/* Cabecera mes/año */}
      <View style={dp.header}>
        <TouchableOpacity onPress={() => setViewing(new Date(year, month - 1, 1))} style={dp.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={dp.titulo}>{MESES[month]} {year}</Text>
        <TouchableOpacity onPress={() => setViewing(new Date(year, month + 1, 1))} style={dp.navBtn}>
          <MaterialCommunityIcons name="chevron-right" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Días de semana */}
      <View style={dp.weekRow}>
        {DIAS_SEMANA.map(d => <Text key={d} style={dp.weekDay}>{d}</Text>)}
      </View>

      {/* Grilla */}
      <View style={dp.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={dp.cell} />;
          const sel = isSel(day);
          const hoy = isHoy(day);
          const dis = isDis(day);
          return (
            <TouchableOpacity
              key={day}
              style={[dp.cell, sel && dp.cellSel, hoy && !sel && dp.cellHoy, dis && dp.cellDis]}
              onPress={() => !dis && setSelected(new Date(year, month, day))}
              activeOpacity={dis ? 1 : 0.7}
            >
              <Text style={[dp.cellTxt, sel && dp.cellTxtSel, dis && dp.cellTxtDis]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Botones */}
      <View style={dp.actions}>
        <Button mode="text" onPress={onDismiss} textColor={COLORS.textSecondary}>Cancelar</Button>
        <Button mode="contained" onPress={() => onConfirm(selected)}>Confirmar</Button>
      </View>
    </View>
  );
}

const CELL_SIZE = 40;

const dp = StyleSheet.create({
  container: {
    backgroundColor: '#F0F4FF', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.primary + '40', marginTop: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { padding: 6 },
  titulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { width: CELL_SIZE, textAlign: 'center', fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center' },
  cellSel: { backgroundColor: COLORS.primary, borderRadius: CELL_SIZE / 2 },
  cellHoy: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: CELL_SIZE / 2 },
  cellDis: { opacity: 0.25 },
  cellTxt: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  cellTxtSel: { color: '#fff', fontWeight: '700' },
  cellTxtDis: { color: COLORS.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E3F2FD', margin: 16, marginBottom: 8,
    borderRadius: 10, padding: 12,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  activasBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#EF9A9A',
  },
  activasBannerTexto: { fontSize: FONT_SIZES.sm, color: '#C62828', fontWeight: '700' },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardActiva: { borderWidth: 1.5, borderColor: '#EF9A9A' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tipoIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tipoRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  tipoBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tipoBadgeTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.xs },
  activaBadge: {
    backgroundColor: '#C62828', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  activaBadgeTexto: { color: '#fff', fontWeight: '800', fontSize: 10 },
  cardFechas: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  motivoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20, marginBottom: 6 },
  detalleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detalleTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  obsTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 6 },
  botonRegreso: { marginTop: 10, borderColor: '#2E7D32' },
  firmaViewer: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    backgroundColor: '#F9FFF9',
    overflow: 'hidden',
  },
  firmaViewerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#E8F5E9',
  },
  firmaViewerLabel: { fontSize: FONT_SIZES.xs, color: '#2E7D32', fontWeight: '600' },
  firmaViewerCanvas: {
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#FAFAFA',
  },
  firmaSeccion: { gap: 8 },
  firmaEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  firmaLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  firmaSubtitulo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 18 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheetContent: { padding: 24, gap: 10, paddingBottom: 32 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sheetTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  formLabelSm: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  dateBtnTexto: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  dateBtnActivo: { borderColor: COLORS.primary, backgroundColor: '#EEF4FF' },
  dateBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateClearBtn: {
    borderWidth: 1, borderColor: COLORS.danger + '60',
    borderRadius: 8, padding: 10, backgroundColor: '#FFF5F5',
  },
  dateBtnVacio: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    borderStyle: 'dashed',
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  dateBtnVacioTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  tiposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tipoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tipoBtnTexto: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.surface },
  botones: { flexDirection: 'row', gap: 10, marginTop: 8 },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.primary },
});
