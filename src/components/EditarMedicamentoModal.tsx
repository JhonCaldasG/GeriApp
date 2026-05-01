import React, { useState, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, Modal, ScrollView, TouchableOpacity,
  FlatList, TextInput as RNTextInput,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Medicamento, Insumo } from '../types';
import { useApp } from '../context/AppContext';
import { obtenerInventario } from '../storage/inventario';
import HoraInicioSelector from './HoraInicioSelector';
import { COLORS, FONT_SIZES } from '../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (!horaInicio || !horaInicio.includes(':')) return [];
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

const DOSE_UNIT_LABELS: Record<string, string> = {
  tablet: 'tableta', capsule: 'cápsula', suppository: 'supositorio',
  drops: 'gotas', patch: 'parche', powder: 'sobre',
};

function halfConc(conc: string): string {
  const m = conc.match(/^(\d+(?:\.\d+)?)(.*)/);
  return m ? `${parseFloat(m[1]) / 2}${m[2]}` : conc;
}
function doubleConc(conc: string): string {
  const m = conc.match(/^(\d+(?:\.\d+)?)(.*)/);
  return m ? `${parseFloat(m[1]) * 2}${m[2]}` : conc;
}

function buildDoseOptions(insumo: Insumo | null): string[] {
  if (!insumo) return DOSIS_COMUNES_BASE;
  const unit = insumo.presentation ? DOSE_UNIT_LABELS[insumo.presentation] : null;
  const conc = insumo.concentration ?? '';
  if (unit === 'tableta' || unit === 'cápsula') {
    const s = conc ? ` (${conc})` : '';
    return [
      `1/2 ${unit}${conc ? ` (${halfConc(conc)})` : ''}`,
      `1 ${unit}${s}`,
      `2 ${unit}s${conc ? ` (${doubleConc(conc)})` : ''}`,
    ];
  }
  if (unit === 'gotas') return ['5 gotas', '10 gotas', '15 gotas', '20 gotas'];
  if (insumo.presentation === 'syrup' || insumo.presentation === 'suspension')
    return conc ? [`5 ml (${conc})`, '10 ml', '15 ml'] : ['5 ml', '10 ml', '15 ml'];
  if (unit) return [`1 ${unit}${conc ? ` (${conc})` : ''}`, `2 ${unit}s`];
  if (conc) return [conc];
  return DOSIS_COMUNES_BASE;
}

const DOSIS_COMUNES = [
  '1/2 tableta', '1 tableta', '2 tabletas',
  '1 cápsula', '2 cápsulas',
  '5 ml', '10 ml', '15 ml',
  '5 gotas', '10 gotas', '20 gotas',
  '1 supositorio', '1 parche', '1 sobre', '1 ampolla',
];
const DOSIS_COMUNES_BASE = DOSIS_COMUNES;

const FRECUENCIAS = [
  'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas', 'Cada 12 horas',
  'Una vez al día', 'Dos veces al día', 'Tres veces al día', 'Según necesidad',
];

const VIAS = [
  'Oral', 'Intravenosa', 'Intramuscular', 'Subcutánea',
  'Tópica', 'Inhalatoria', 'Sublingual', 'Rectal', 'Transdérmica',
];

// ── NombreSelectField (con búsqueda) ─────────────────────────────────────────

function NombreSelectField({ value, insumos, onSelect }: {
  value: string;
  insumos: Insumo[];
  onSelect: (insumo: Insumo) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const filtrados = busqueda.trim()
    ? insumos.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : insumos;

  function handleOpen() { setBusqueda(''); setOpen(true); }

  return (
    <>
      <TouchableOpacity
        style={[styles.selectTrigger, value && styles.selectTriggerFilled]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <View style={styles.selectIconWrap}>
          <MaterialCommunityIcons name="pill" size={18} color={value ? COLORS.primary : COLORS.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectLabel}>Medicamento</Text>
          <Text style={[styles.selectValue, !value && styles.selectPlaceholder]} numberOfLines={1}>
            {value || 'Seleccionar del inventario...'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.selectOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.selectSheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.selectHandle} />
            <Text style={styles.selectSheetTitle}>Seleccionar medicamento</Text>

            {/* Búsqueda */}
            <View style={styles.searchWrapper}>
              <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Buscar..."
                placeholderTextColor={COLORS.textSecondary}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtrados}
              keyExtractor={i => i.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.selectSeparator} />}
              ListEmptyComponent={
                <Text style={styles.searchVacio}>Sin resultados en inventario.</Text>
              }
              renderItem={({ item }) => {
                const selected = item.nombre === value;
                const bajo = item.stockActual <= item.stockMinimo;
                return (
                  <TouchableOpacity
                    style={[styles.selectOption, selected && styles.selectOptionActive]}
                    onPress={() => { onSelect(item); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>
                        {item.nombre}
                      </Text>
                      <Text style={[styles.searchItemStock, bajo && { color: COLORS.danger }]}>
                        Stock: {item.stockActual} {item.unidad}{bajo ? '  ⚠ Bajo' : ''}
                      </Text>
                    </View>
                    {selected && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────

function SelectField({ label, value, placeholder, options, onChange, icon }: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
  icon?: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.selectTrigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={styles.selectIconWrap}>
          <MaterialCommunityIcons
            name={(icon ?? 'chevron-down') as any}
            size={18}
            color={value ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectLabel}>{label}</Text>
          <Text style={[styles.selectValue, !value && styles.selectPlaceholder]} numberOfLines={1}>
            {value || placeholder}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.selectOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.selectSheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.selectHandle} />
            <Text style={styles.selectSheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.selectSeparator} />}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={[styles.selectOption, selected && styles.selectOptionActive]}
                    onPress={() => { onChange(item); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>
                      {item}
                    </Text>
                    {selected && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  medicamento: Medicamento | null;
  pacienteNombre: string;
  onDismiss: () => void;
  onGuardado: () => void;
}

export default function EditarMedicamentoModal({ visible, medicamento, pacienteNombre, onDismiss, onGuardado }: Props) {
  const { editarMedicamento } = useApp();
  const insets = useSafeAreaInsets();

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);
  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [horario, setHorario] = useState('08:00');
  const [via, setVia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      obtenerInventario()
        .then(lista => setInsumos(lista.filter(i => i.categoria === 'medicamentos')))
        .catch(() => {});
    }
    if (visible && medicamento) {
      setNombre(medicamento.nombre);
      setDosis(medicamento.dosis);
      setFrecuencia(medicamento.frecuencia);
      setHorario(medicamento.horario?.match(/^\d{2}:\d{2}$/) ? medicamento.horario : '08:00');
      setVia(medicamento.viaAdministracion);
      setObservaciones(medicamento.observaciones);
      setActivo(medicamento.activo);
      setInsumoSeleccionado(null);
    }
  }, [visible, medicamento]);

  function handleSeleccionarInsumo(insumo: Insumo) {
    setNombre(insumo.nombre);
    setInsumoSeleccionado(insumo);
    const opts = buildDoseOptions(insumo);
    setDosis(opts.length > 1 ? opts[1] : opts[0] ?? dosis);
  }

  const dosisOpciones = useMemo(() => {
    const base = buildDoseOptions(insumoSeleccionado);
    if (dosis && !base.includes(dosis)) return [dosis, ...base];
    return base;
  }, [insumoSeleccionado, dosis]);

  const horasDosis = calcularHorasDosis(horario, frecuencia);

  async function handleGuardar() {
    if (!nombre.trim() || !dosis.trim()) return;
    setGuardando(true);
    await editarMedicamento(medicamento!.id, {
      nombre: nombre.trim(),
      dosis: dosis.trim(),
      frecuencia: frecuencia.trim(),
      horario: horario.trim(),
      viaAdministracion: via.trim(),
      observaciones: observaciones.trim(),
      activo,
    });
    setGuardando(false);
    onGuardado();
  }

  if (!medicamento) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>

          {/* Handle + Header */}
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcono}>
              <MaterialCommunityIcons name="pill" size={22} color={COLORS.warningLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Editar medicamento</Text>
              <Text style={styles.subtitulo}>{pacienteNombre}</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.cerrarBtn}>
              <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Nombre */}
            <Text style={styles.fieldLabel}>Nombre del medicamento *</Text>
            <NombreSelectField
              value={nombre}
              insumos={insumos}
              onSelect={handleSeleccionarInsumo}
            />

            {/* Dosis */}
            <Text style={styles.fieldLabel}>Dosis *</Text>
            <SelectField
              label="Selecciona la dosis"
              value={dosis}
              placeholder="Seleccionar dosis..."
              options={dosisOpciones}
              onChange={setDosis}
              icon="pill"
            />

            {/* Frecuencia */}
            <Text style={styles.fieldLabel}>Frecuencia</Text>
            <SelectField
              label="Frecuencia de administración"
              value={frecuencia}
              placeholder="Seleccionar frecuencia..."
              options={FRECUENCIAS}
              onChange={setFrecuencia}
              icon="clock-outline"
            />

            {/* Hora inicio */}
            <HoraInicioSelector hora24={horario} onChange={setHorario} />

            {/* Preview horario calculado */}
            {frecuencia && horasDosis.length > 1 && (
              <View style={styles.dosisPreview}>
                <View style={styles.dosisPreviewHeader}>
                  <MaterialCommunityIcons name="calendar-clock" size={15} color={COLORS.primary} />
                  <Text style={styles.dosisPreviewLabel}>Horario calculado</Text>
                </View>
                <View style={styles.dosisPreviewGrid}>
                  {horasDosis.map((h, i) => (
                    <View key={i} style={styles.dosisPreviewChip}>
                      <Text style={styles.dosisPreviewNum}>{i + 1}</Text>
                      <Text style={styles.dosisPreviewHora}>{formatear12h(h)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Vía */}
            <Text style={styles.fieldLabel}>Vía de administración</Text>
            <SelectField
              label="Vía de administración"
              value={via}
              placeholder="Seleccionar vía..."
              options={VIAS}
              onChange={setVia}
              icon="needle"
            />

            {/* Observaciones */}
            <Text style={styles.fieldLabel}>Observaciones</Text>
            <TextInput
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={2}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            {/* Estado activo / inactivo */}
            <TouchableOpacity
              style={[styles.estadoBoton, activo ? styles.estadoActivo : styles.estadoInactivo]}
              onPress={() => setActivo(!activo)}
            >
              <MaterialCommunityIcons
                name={activo ? 'check-circle' : 'close-circle'}
                size={20}
                color={activo ? COLORS.secondaryLight : COLORS.textSecondary}
              />
              <Text style={[styles.estadoTexto, { color: activo ? COLORS.secondaryLight : COLORS.textSecondary }]}>
                {activo ? 'Medicamento activo' : 'Medicamento inactivo'}
              </Text>
            </TouchableOpacity>

            {/* Botones */}
            <View style={styles.botones}>
              <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleGuardar}
                loading={guardando}
                disabled={!nombre.trim() || !dosis.trim()}
                style={[{ flex: 2 }, styles.botonGuardar]}
                icon="content-save"
              >
                Guardar cambios
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerIcono: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary },
  subtitulo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
  cerrarBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },

  fieldLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 4,
  },
  input: { marginBottom: 14, backgroundColor: COLORS.surface },

  // SelectField trigger
  selectTrigger: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 14, gap: 10,
  },
  selectIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  selectLabel: {
    fontSize: 10, color: COLORS.textSecondary,
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4,
  },
  selectValue: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },
  selectPlaceholder: { color: COLORS.textSecondary, fontWeight: '400' },

  // SelectField bottom sheet
  selectOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  selectSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%', paddingTop: 8,
  },
  selectHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 12,
  },
  selectSheetTitle: {
    fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.textPrimary,
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  selectOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  selectOptionActive: { backgroundColor: '#EEF6FF' },
  selectOptionText: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  selectOptionTextActive: { color: COLORS.primary, fontWeight: '700' },
  selectTriggerFilled: { borderColor: COLORS.primary },
  selectSeparator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, paddingVertical: 2 },
  searchVacio: { padding: 20, textAlign: 'center', color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  searchItemStock: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Dosis preview
  dosisPreview: {
    backgroundColor: '#EEF6FF', borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  dosisPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dosisPreviewLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  dosisPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dosisPreviewChip: {
    backgroundColor: COLORS.surface, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center', borderWidth: 1, borderColor: '#90CAF9',
  },
  dosisPreviewNum: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  dosisPreviewHora: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },

  // Estado activo
  estadoBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5,
  },
  estadoActivo: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  estadoInactivo: { backgroundColor: '#F5F5F5', borderColor: COLORS.border },
  estadoTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700' },

  botones: { flexDirection: 'row', gap: 10 },
  botonGuardar: { backgroundColor: COLORS.warningLight },
});
