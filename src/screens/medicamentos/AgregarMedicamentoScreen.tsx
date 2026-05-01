import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MedicamentosStackParamList, Insumo } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import FirmaModal from '../../components/FirmaModal';
import HoraInicioSelector from '../../components/HoraInicioSelector';
import { COLORS, FONT_SIZES } from '../../theme';
import { obtenerInventario } from '../../storage/inventario';

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
  if (!m) return conc;
  return `${parseFloat(m[1]) / 2}${m[2]}`;
}
function doubleConc(conc: string): string {
  const m = conc.match(/^(\d+(?:\.\d+)?)(.*)/);
  if (!m) return conc;
  return `${parseFloat(m[1]) * 2}${m[2]}`;
}

function buildDoseOptions(insumo: Insumo | null): string[] {
  if (!insumo) {
    return [
      '1/2 tableta', '1 tableta', '2 tabletas',
      '1 cápsula', '2 cápsulas',
      '5 ml', '10 ml', '15 ml',
      '5 gotas', '10 gotas', '20 gotas',
      '1 supositorio', '1 parche', '1 sobre', '1 ampolla',
    ];
  }
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
  if (insumo.presentation === 'syrup' || insumo.presentation === 'suspension') {
    return conc ? [`5 ml (${conc})`, '10 ml', '15 ml'] : ['5 ml', '10 ml', '15 ml'];
  }
  if (unit) return [`1 ${unit}${conc ? ` (${conc})` : ''}`, `2 ${unit}s`];
  if (conc) return [conc];
  return ['1 tableta', '1 cápsula', '5 ml'];
}

const FRECUENCIAS = [
  'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas', 'Cada 12 horas',
  'Una vez al día', 'Dos veces al día', 'Tres veces al día', 'Según necesidad',
];

const VIAS = [
  'Oral', 'Intravenosa', 'Intramuscular', 'Subcutánea',
  'Tópica', 'Inhalatoria', 'Sublingual', 'Rectal', 'Transdérmica',
];

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

// ── Screen ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<MedicamentosStackParamList, 'AgregarMedicamento'>;

export default function AgregarMedicamentoScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { agregarMedicamento } = useApp();
  const { usuario } = useAuth();
  const [guardando, setGuardando] = useState(false);
  const [firmaVisible, setFirmaVisible] = useState(false);

  const [nombre, setNombre] = useState('');
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);
  const [dosis, setDosis] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [horario, setHorario] = useState('08:00');
  const [via, setVia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    obtenerInventario()
      .then(lista => setInsumos(lista.filter(i => i.categoria === 'medicamentos')))
      .catch(() => {});
  }, []);

  const sugerencias = nombre.trim().length > 0
    ? insumos.filter(i => i.nombre.toLowerCase().includes(nombre.toLowerCase()))
    : insumos;

  function seleccionarInsumo(insumo: Insumo) {
    setNombre(insumo.nombre);
    setInsumoSeleccionado(insumo);
    const opts = buildDoseOptions(insumo);
    setDosis(opts.length > 1 ? opts[1] : opts[0] ?? '');
    setMostrarSugerencias(false);
  }

  function limpiarInsumo() {
    setNombre('');
    setInsumoSeleccionado(null);
    setDosis('');
    setMostrarSugerencias(true);
  }

  function handleSolicitarFirma() {
    if (!nombre.trim() || !dosis.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y la dosis son obligatorios.');
      return;
    }
    setFirmaVisible(true);
  }

  async function handleGuardar(firmante: string) {
    setFirmaVisible(false);
    setGuardando(true);
    try {
      await agregarMedicamento({
        pacienteId,
        nombre: nombre.trim(),
        dosis: dosis.trim(),
        frecuencia: frecuencia.trim(),
        horario: horario.trim(),
        viaAdministracion: via.trim(),
        observaciones: observaciones.trim(),
        activo: true,
      });
      Alert.alert('Guardado', `Medicamento registrado.\nFirmado por: ${firmante}`, [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  const dosisOpciones = buildDoseOptions(insumoSeleccionado);
  const horasDosis = calcularHorasDosis(horario, frecuencia);

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        {/* Paciente */}
        <View style={styles.pacienteHeader}>
          <MaterialCommunityIcons name="account" size={20} color="#E65100" />
          <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
        </View>

        {/* Nombre — autocomplete */}
        <Text style={styles.fieldLabel}>Nombre del medicamento *</Text>
        <View style={styles.autocompleteWrapper}>
          <TouchableOpacity
            style={[styles.selectTrigger, nombre && styles.selectTriggerFilled]}
            onPress={() => setMostrarSugerencias(true)}
            activeOpacity={0.7}
          >
            <View style={styles.selectIconWrap}>
              <MaterialCommunityIcons name="pill" size={18} color={nombre ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <Text style={[styles.selectValue, !nombre && styles.selectPlaceholder, { flex: 1 }]} numberOfLines={1}>
              {nombre || 'Buscar en inventario...'}
            </Text>
            {nombre
              ? <TouchableOpacity onPress={limpiarInsumo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              : <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
            }
          </TouchableOpacity>

          {mostrarSugerencias && (
            <View style={styles.dropdown}>
              {sugerencias.length === 0 ? (
                <Text style={styles.dropdownVacio}>
                  {nombre.trim() ? 'Sin resultados en inventario.' : 'No hay medicamentos en inventario.'}
                </Text>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                  {sugerencias.map(i => {
                    const opts = buildDoseOptions(i);
                    const doseHint = opts.length > 1 ? opts[1] : opts[0];
                    return (
                      <TouchableOpacity key={i.id} style={styles.dropdownItem} onPress={() => seleccionarInsumo(i)}>
                        <View style={styles.dropdownIcono}>
                          <MaterialCommunityIcons name="pill" size={16} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownNombre}>{i.nombre}</Text>
                          {doseHint ? <Text style={styles.dropdownDosis}>{doseHint}</Text> : null}
                          <Text style={styles.dropdownStock}>
                            Stock: {i.stockActual} {i.unidad}
                            {i.stockActual <= i.stockMinimo ? '  ⚠ Bajo' : ''}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.dropdownCerrar} onPress={() => setMostrarSugerencias(false)}>
                <Text style={styles.dropdownCerrarTexto}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dosis */}
        <Text style={styles.fieldLabel}>Dosis *</Text>
        <SelectField
          label={insumoSeleccionado ? `Opciones para ${insumoSeleccionado.nombre}` : 'Selecciona una dosis'}
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

        {/* Hora de inicio */}
        <HoraInicioSelector hora24={horario} onChange={setHorario} />

        {/* Preview de dosis calculadas */}
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

        {/* Vía de administración */}
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
          placeholder="Ej: Administrar con alimentos, monitorear presión..."
          multiline
          numberOfLines={3}
          style={styles.textArea}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
        />

        {/* Botones */}
        <View style={styles.botones}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.botonCancelar}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={handleSolicitarFirma} loading={guardando} style={styles.botonGuardar} icon="draw-pen">
            Guardar y firmar
          </Button>
        </View>
      </KeyboardAwareScrollView>

      <FirmaModal
        visible={firmaVisible}
        titulo="Registro de Medicamento"
        resumen={`Paciente: ${pacienteNombre}\nMedicamento: ${nombre} ${dosis}\nFrecuencia: ${frecuencia || 'No especificada'}\nVía: ${via || 'No especificada'}`}
        onConfirmar={handleGuardar}
        onCancelar={() => setFirmaVisible(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 48 },

  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF3E0', borderRadius: 12,
    padding: 12, gap: 8, marginBottom: 20,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#E65100' },

  fieldLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 4,
  },

  // Select field trigger
  selectTrigger: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 14, gap: 10,
  },
  selectTriggerFilled: { borderColor: COLORS.primary },
  selectIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  selectLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  selectValue: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },
  selectPlaceholder: { color: COLORS.textSecondary, fontWeight: '400' },

  // Select bottom sheet
  selectOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  selectSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '65%', paddingTop: 8,
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
  selectSeparator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },

  // Autocomplete
  autocompleteWrapper: { zIndex: 10, marginBottom: 4 },
  dropdown: {
    position: 'absolute', top: 60, left: 0, right: 0, zIndex: 20,
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 10,
  },
  dropdownIcono: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  dropdownNombre: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  dropdownDosis: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  dropdownStock: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
  dropdownVacio: { padding: 16, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },
  dropdownCerrar: {
    alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  dropdownCerrarTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },

  // Dosis preview
  dosisPreview: {
    backgroundColor: '#EEF6FF', borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  dosisPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dosisPreviewLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dosisPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dosisPreviewChip: {
    backgroundColor: COLORS.surface, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center', borderWidth: 1, borderColor: '#90CAF9',
  },
  dosisPreviewNum: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  dosisPreviewHora: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },

  // Observaciones
  textArea: { marginBottom: 14, backgroundColor: COLORS.surface },

  // Botones
  botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: COLORS.primary },
});
