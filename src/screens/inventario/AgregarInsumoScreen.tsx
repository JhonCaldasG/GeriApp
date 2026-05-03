import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager, Modal, FlatList } from 'react-native';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { Insumo } from '../../types';
import { obtenerInventario, guardarInsumo, actualizarInsumo, eliminarInsumo } from '../../storage/inventario';

const CATEGORIAS: Insumo['categoria'][] = ['higiene', 'medicamentos', 'material_medico', 'limpieza', 'alimentos'];
const CAT_LABELS: Record<string, string> = {
  higiene: 'Higiene', medicamentos: 'Medicamentos',
  material_medico: 'Material Médico', limpieza: 'Limpieza', alimentos: 'Alimentos',
};

interface PresentationOption {
  id: string;
  label: string;
  icon: string;
  defaultUnit: string;
}

const PRESENTATIONS: PresentationOption[] = [
  { id: 'tablet',      label: 'Tableta',       icon: 'pill',              defaultUnit: 'tabletas'     },
  { id: 'capsule',     label: 'Cápsula',        icon: 'pill-multiple',     defaultUnit: 'cápsulas'     },
  { id: 'syrup',       label: 'Jarabe',          icon: 'bottle-tonic',      defaultUnit: 'ml'           },
  { id: 'suspension',  label: 'Suspensión',      icon: 'bottle-tonic-plus', defaultUnit: 'ml'           },
  { id: 'injectable',  label: 'Inyectable',      icon: 'needle',            defaultUnit: 'ampollas'     },
  { id: 'drops',       label: 'Gotas',           icon: 'water-outline',     defaultUnit: 'ml'           },
  { id: 'cream',       label: 'Crema',           icon: 'lotion-plus',       defaultUnit: 'tubos'        },
  { id: 'inhaler',     label: 'Inhalador',       icon: 'weather-windy',     defaultUnit: 'inhaladores'  },
  { id: 'patch',       label: 'Parche',          icon: 'bandage',           defaultUnit: 'parches'      },
  { id: 'suppository', label: 'Supositorio',     icon: 'pill',              defaultUnit: 'supositorios' },
  { id: 'powder',      label: 'Polvo/Sobre',     icon: 'package-variant',   defaultUnit: 'sobres'       },
  { id: 'other',       label: 'Otro',            icon: 'dots-horizontal',   defaultUnit: 'unidades'     },
];

const CONCENTRATION_PRESETS = ['5mg', '10mg', '25mg', '50mg', '100mg', '200mg', '250mg', '500mg', '1g', '5mg/5ml', '10mg/5ml', '125mg/5ml', '250mg/5ml'];

interface MedicalSupplyType {
  id: string;
  label: string;
  icon: string;
  sizePresets: string[];
  defaultUnit: string;
}

const MEDICAL_SUPPLY_TYPES: MedicalSupplyType[] = [
  { id: 'gloves',      label: 'Guantes',      icon: 'hand-wash-outline',  sizePresets: ['XS', 'S', 'M', 'L', 'XL'],                   defaultUnit: 'pares'     },
  { id: 'mask',        label: 'Tapabocas',    icon: 'face-mask',          sizePresets: ['Estándar', 'Quirúrgico', 'N95', 'KN95'],       defaultUnit: 'unidades'  },
  { id: 'syringe',     label: 'Jeringa',      icon: 'needle',             sizePresets: ['1ml', '3ml', '5ml', '10ml', '20ml', '50ml'],  defaultUnit: 'unidades'  },
  { id: 'bandage',     label: 'Venda',        icon: 'bandage',            sizePresets: ['5cm', '7.5cm', '10cm', '15cm'],               defaultUnit: 'rollos'    },
  { id: 'gauze',       label: 'Gasa',         icon: 'bandage-outline',    sizePresets: ['10x10cm', '20x20cm', '30x30cm'],              defaultUnit: 'paquetes'  },
  { id: 'cotton',      label: 'Algodón',      icon: 'cloud-outline',      sizePresets: ['50g', '100g', '200g', '500g'],                defaultUnit: 'rollos'    },
  { id: 'needle',      label: 'Aguja',        icon: 'needle',             sizePresets: ['18G', '20G', '21G', '22G', '23G', '25G'],     defaultUnit: 'unidades'  },
  { id: 'catheter',    label: 'Catéter',      icon: 'water-outline',      sizePresets: ['14Fr', '16Fr', '18Fr', '20Fr', '22Fr'],       defaultUnit: 'unidades'  },
  { id: 'tape',        label: 'Esparadrapo',  icon: 'minus-circle-outline', sizePresets: ['1.25cm', '2.5cm', '5cm'],                   defaultUnit: 'rollos'    },
  { id: 'gluc_strip',  label: 'Tira glucosa', icon: 'water-check',        sizePresets: ['x25', 'x50', 'x100'],                        defaultUnit: 'tiras'     },
  { id: 'other',       label: 'Otro',         icon: 'dots-horizontal',    sizePresets: [],                                             defaultUnit: 'unidades'  },
];

const UNIT_OPTIONS: Record<string, string[]> = {
  medicamentos:    ['tabletas', 'cápsulas', 'ml', 'ampollas', 'mg', 'g', 'sobres', 'gotas', 'tubos', 'inhaladores', 'parches', 'supositorios', 'unidades'],
  material_medico: ['pares', 'unidades', 'rollos', 'paquetes', 'tiras', 'cajas', 'sobres'],
  higiene:         ['unidades', 'rollos', 'paquetes', 'litros', 'ml', 'kg', 'g'],
  limpieza:        ['litros', 'ml', 'unidades', 'rollos', 'paquetes', 'kg', 'g'],
  alimentos:       ['kg', 'g', 'litros', 'ml', 'unidades', 'porciones', 'cajas', 'latas'],
};

function DropdownField({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={dropdownStyles.field} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <View style={{ flex: 1 }}>
          <Text style={dropdownStyles.fieldLabel}>{label}</Text>
          <Text style={[dropdownStyles.fieldValue, !value && { color: COLORS.textSecondary }]}>
            {value || 'Selecciona una opción'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={dropdownStyles.sheet}>
            <View style={dropdownStyles.sheetHeader}>
              <View style={dropdownStyles.sheetHandle} />
              <Text style={dropdownStyles.sheetTitle}>{label}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const active = value === item;
                return (
                  <TouchableOpacity
                    style={[dropdownStyles.option, active && dropdownStyles.optionActive]}
                    onPress={() => { onChange(item); setOpen(false); }}
                  >
                    <Text style={[dropdownStyles.optionText, active && dropdownStyles.optionTextActive]}>{item}</Text>
                    {active && <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 340 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function AccordionSection({
  title, icon, accentColor, bgColor, summary, hasError = false, children,
}: {
  title: string; icon: string; accentColor: string;
  bgColor: string; summary?: string; hasError?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasError && !open) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOpen(true);
      Animated.timing(rotation, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [hasError]);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !open;
    setOpen(next);
    Animated.timing(rotation, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const borderColor = hasError ? COLORS.danger : accentColor + '55';

  return (
    <View style={[accordionStyles.wrapper, { borderColor }]}>
      <TouchableOpacity style={[accordionStyles.header, { backgroundColor: hasError ? '#FFF0F0' : bgColor }]} onPress={toggle} activeOpacity={0.75}>
        <View style={[accordionStyles.iconBox, { backgroundColor: (hasError ? COLORS.danger : accentColor) + '22' }]}>
          <MaterialCommunityIcons name={hasError ? 'alert-circle-outline' : icon as any} size={18} color={hasError ? COLORS.danger : accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[accordionStyles.title, { color: hasError ? COLORS.danger : accentColor }]}>{title}</Text>
          {!open && (
            <Text style={[accordionStyles.summary, hasError && { color: COLORS.danger }]} numberOfLines={1}>
              {hasError ? 'Campos obligatorios incompletos' : (summary || '')}
            </Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <MaterialCommunityIcons name="chevron-down" size={22} color={hasError ? COLORS.danger : accentColor} />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={accordionStyles.body}>{children}</View>}
    </View>
  );
}

export default function AgregarInsumoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const insumoId = route.params?.insumoId as string | undefined;
  const isEditing = !!insumoId;

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<Insumo['categoria']>('higiene');
  const [stockActual, setStockActual] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('5');
  const [unidad, setUnidad] = useState('unidades');
  const [observaciones, setObservaciones] = useState('');
  // Pharmaceutical fields (medications)
  const [presentation, setPresentation] = useState('');
  const [concentration, setConcentration] = useState('');
  // Medical supply fields
  const [medicalType, setMedicalType] = useState('');
  const [size, setSize] = useState('');
  // Shared
  const [packageQuantity, setPackageQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const [errorPharma, setErrorPharma]       = useState(false);
  const [errorMedSupply, setErrorMedSupply] = useState(false);
  const [errorStock, setErrorStock]         = useState('');

  const isMedication    = categoria === 'medicamentos';
  const isMedicalSupply = categoria === 'material_medico';

  useEffect(() => {
    if (!insumoId) return;
    obtenerInventario().then(lista => {
      const i = lista.find(x => x.id === insumoId);
      if (!i) return;
      setNombre(i.nombre);
      setCategoria(i.categoria);
      setStockActual(String(i.stockActual));
      setStockMinimo(String(i.stockMinimo));
      setUnidad(i.unidad);
      setObservaciones(i.observaciones ?? '');
      setPresentation(i.presentation ?? '');
      setConcentration(i.concentration ?? '');
      setMedicalType(i.presentation ?? '');
      setSize(i.size ?? '');
      setPackageQuantity(i.packageQuantity != null ? String(i.packageQuantity) : '');
    });
  }, [insumoId]);

  function selectPresentation(p: PresentationOption) {
    setPresentation(p.id);
    setErrorPharma(false);
    if (!unidad || unidad === 'unidades') setUnidad(p.defaultUnit);
  }

  function selectMedicalType(t: MedicalSupplyType) {
    setMedicalType(t.id);
    setErrorMedSupply(false);
    setSize('');
    if (!unidad || unidad === 'unidades') setUnidad(t.defaultUnit);
  }

  const activeMedicalType = MEDICAL_SUPPLY_TYPES.find(t => t.id === medicalType);

  const pharmaSummary = [
    PRESENTATIONS.find(p => p.id === presentation)?.label,
    concentration,
    packageQuantity ? `x${packageQuantity} por envase` : '',
  ].filter(Boolean).join(' · ') || 'Sin datos completados';

  const medSupplySummary = [
    MEDICAL_SUPPLY_TYPES.find(t => t.id === medicalType)?.label,
    size,
    packageQuantity ? `x${packageQuantity} por caja` : '',
  ].filter(Boolean).join(' · ') || 'Sin datos completados';

  function showCheck() {
    setSavedOk(true);
    Animated.sequence([
      Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(checkOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => navigation.navigate('Inventario'));
  }

  function buildPayload() {
    return {
      nombre: nombre.trim(),
      categoria,
      stockActual: parseFloat(stockActual) || 0,
      stockMinimo: parseFloat(stockMinimo) || 0,
      unidad: unidad.trim(),
      observaciones: observaciones.trim(),
      presentation: isMedication && presentation ? presentation
        : isMedicalSupply && medicalType ? medicalType : undefined,
      concentration: isMedication && concentration.trim() ? concentration.trim() : undefined,
      size: isMedicalSupply && size.trim() ? size.trim() : undefined,
      packageQuantity: (isMedication || isMedicalSupply) && packageQuantity
        ? (parseInt(packageQuantity, 10) || undefined) : undefined,
    };
  }

  function validate(): boolean {
    let valid = true;

    // Reset errors
    setErrorPharma(false);
    setErrorMedSupply(false);
    setErrorStock('');

    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre del insumo es obligatorio.');
      return false;
    }

    if (isMedication && !presentation) {
      setErrorPharma(true);
      valid = false;
    }

    if (isMedicalSupply && !medicalType) {
      setErrorMedSupply(true);
      valid = false;
    }

    const actual = parseFloat(stockActual) || 0;
    const minimo = parseFloat(stockMinimo) || 0;

    if (minimo <= 0) {
      setErrorStock('El stock mínimo debe ser mayor a 0.');
      valid = false;
    } else if (actual > 0 && minimo >= actual) {
      setErrorStock('El stock mínimo debe ser menor al stock actual para recibir alertas con anticipación.');
      valid = false;
    }

    if (!valid && (isMedication && !presentation || isMedicalSupply && !medicalType)) {
      Alert.alert('Campos requeridos', 'Completa los datos farmacéuticos antes de guardar.');
    }

    return valid;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditing) {
        await actualizarInsumo(insumoId!, buildPayload());
        showToast('', 'warning');
        setTimeout(() => navigation.navigate('Inventario'), 2600);
      } else {
        await guardarInsumo(buildPayload());
        showToast('');
        setTimeout(() => navigation.navigate('Inventario'), 2600);
      }
    } catch { Alert.alert('Error', 'No se pudo guardar el insumo.'); }
    setSaving(false);
  }

  async function handleDelete() {
    Alert.alert('Eliminar insumo', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await eliminarInsumo(insumoId!); showToast('', 'error'); setTimeout(() => navigation.navigate('Inventario'), 2600); }
        catch { Alert.alert('Error', 'No se pudo eliminar.'); }
      }},
    ]);
  }

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        label="Nombre del insumo *"
        value={nombre}
        onChangeText={setNombre}
        mode="outlined"
        style={styles.input}
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      {/* Category */}
      <Text style={styles.sectionLabel}>Categoría</Text>
      <View style={styles.chips}>
        {CATEGORIAS.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, categoria === cat && styles.chipActive]}
            onPress={() => setCategoria(cat)}
          >
            <Text style={[styles.chipText, categoria === cat && styles.chipTextActive]}>{CAT_LABELS[cat]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pharmaceutical section — accordion, only for medications */}
      {isMedication && (
        <AccordionSection
          title="Datos farmacéuticos"
          icon="pill"
          accentColor={COLORS.primary}
          bgColor="#F0F4FF"
          summary={pharmaSummary}
          hasError={errorPharma}
        >
          <Text style={styles.sectionLabel}>Presentación</Text>
          <View style={styles.presentationGrid}>
            {PRESENTATIONS.map(p => {
              const active = presentation === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.presentationChip, active && styles.presentationChipActive]}
                  onPress={() => selectPresentation(p)}
                >
                  <MaterialCommunityIcons name={p.icon as any} size={18} color={active ? '#fff' : COLORS.primary} />
                  <Text style={[styles.presentationLabel, active && styles.presentationLabelActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Concentración</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {CONCENTRATION_PRESETS.map(c => {
              const active = concentration === c;
              return (
                <TouchableOpacity key={c} style={[styles.presetChip, active && styles.presetChipActive]} onPress={() => setConcentration(active ? '' : c)}>
                  <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TextInput
            label="O escribe la concentración (ej: 500mg, 10mg/5ml)"
            value={concentration} onChangeText={setConcentration}
            mode="outlined" style={styles.input}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
          />
          <TextInput
            label="Cantidad por envase (ej: 30 tabletas por caja)"
            value={packageQuantity} onChangeText={setPackageQuantity}
            keyboardType="numeric" mode="outlined" style={styles.input}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
          />
        </AccordionSection>
      )}

      {/* Medical supply section — accordion, only for material_medico */}
      {isMedicalSupply && (
        <AccordionSection
          title="Datos del material médico"
          icon="medical-bag"
          accentColor={COLORS.secondary}
          bgColor="#F0FFF4"
          summary={medSupplySummary}
          hasError={errorMedSupply}
        >
          <Text style={styles.sectionLabel}>Tipo de material</Text>
          <View style={styles.presentationGrid}>
            {MEDICAL_SUPPLY_TYPES.map(t => {
              const active = medicalType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.presentationChip, active && styles.medChipActive]}
                  onPress={() => selectMedicalType(t)}
                >
                  <MaterialCommunityIcons name={t.icon as any} size={18} color={active ? '#fff' : COLORS.secondary} />
                  <Text style={[styles.presentationLabel, { color: active ? '#fff' : COLORS.secondary }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeMedicalType && activeMedicalType.sizePresets.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Talla / Tamaño</Text>
              <View style={styles.chips}>
                {activeMedicalType.sizePresets.map(s => {
                  const active = size === s;
                  return (
                    <TouchableOpacity key={s} style={[styles.chip, active && styles.medChipActive]} onPress={() => setSize(active ? '' : s)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TextInput
            label="O escribe la talla / especificación"
            value={size} onChangeText={setSize}
            mode="outlined" style={styles.input}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.secondary}
          />
          <TextInput
            label="Cantidad por caja / paquete (ej: 100 guantes por caja)"
            value={packageQuantity} onChangeText={setPackageQuantity}
            keyboardType="numeric" mode="outlined" style={styles.input}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.secondary}
          />
        </AccordionSection>
      )}

      {/* Stock */}
      <View style={styles.row}>
        <TextInput
          label="Stock actual"
          value={stockActual}
          onChangeText={v => { setStockActual(v); setErrorStock(''); }}
          keyboardType="numeric"
          mode="outlined"
          style={[styles.input, { flex: 1 }]}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
        />
        <TextInput
          label="Stock mínimo"
          value={stockMinimo}
          onChangeText={v => { setStockMinimo(v); setErrorStock(''); }}
          keyboardType="numeric"
          mode="outlined"
          style={[styles.input, { flex: 1 }]}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
        />
      </View>

      {!!errorStock && (
        <View style={styles.stockError}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color={COLORS.danger} />
          <Text style={styles.stockErrorText}>{errorStock}</Text>
        </View>
      )}

      <DropdownField
        label="Unidad de medida"
        value={unidad}
        options={UNIT_OPTIONS[categoria] ?? ['unidades', 'cajas', 'litros', 'kg', 'g']}
        onChange={setUnidad}
      />
      <TextInput
        label="Observaciones"
        value={observaciones}
        onChangeText={setObservaciones}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      {savedOk && (
        <Animated.View style={[styles.checkBanner, { opacity: checkOpacity }]}>
          <Text style={styles.checkText}>✓ Insumo guardado</Text>
        </Animated.View>
      )}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        style={styles.btnSave}
        contentStyle={{ height: 52 }}
      >
        {isEditing ? 'Guardar Cambios' : 'Agregar Insumo'}
      </Button>

      {isEditing && isAdmin && (
        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.btnDelete}
          textColor={COLORS.danger}
        >
          Eliminar insumo
        </Button>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  sectionLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  // Pharmaceutical section
  pharmaSection: {
    borderWidth: 1, borderRadius: 14, padding: 14,
    marginBottom: 14, backgroundColor: '#F3F6FF',
  },
  pharmaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  pharmaTitle: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.primary },
  presentationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  presentationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#fff',
  },
  presentationChipActive: { backgroundColor: COLORS.primary },
  medChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  presentationLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primary },
  presentationLabelActive: { color: '#fff' },
  presetScroll: { marginBottom: 8 },
  presetChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff',
    marginRight: 6,
  },
  presetChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  presetChipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  presetChipTextActive: { color: '#fff' },
  // Feedback
  checkBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', borderRadius: 10, paddingVertical: 12,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.secondary,
  },
  checkText: { color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.md },
  btnSave: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 10 },
  btnDelete: { marginTop: 8, borderColor: COLORS.danger, borderRadius: 10 },
  stockError: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FFF0F0', borderRadius: 8, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.danger + '55',
  },
  stockErrorText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.danger, fontWeight: '600', lineHeight: 18 },
});

const dropdownStyles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: 'transparent', marginBottom: 12,
  },
  fieldLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 2 },
  fieldValue: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, elevation: 20,
  },
  sheetHeader: { alignItems: 'center', paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 10 },
  sheetTitle: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  optionActive: { backgroundColor: '#EEF4FF' },
  optionText: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  optionTextActive: { fontWeight: '700', color: COLORS.primary },
});

const accordionStyles = StyleSheet.create({
  wrapper: {
    borderWidth: 1.5, borderRadius: 14,
    marginBottom: 14, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: FONT_SIZES.sm, fontWeight: '800' },
  summary: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  body: { padding: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
});
