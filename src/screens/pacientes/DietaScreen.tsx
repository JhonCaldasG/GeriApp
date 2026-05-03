import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, TextInput, Button, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { PacientesStackParamList, RegistroDieta } from '../../types';
import { obtenerDieta, guardarDieta, eliminarDieta } from '../../storage/dieta';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<PacientesStackParamList, 'Dieta'>;

const TIPOS: RegistroDieta['tipo'][] = ['desayuno', 'almuerzo', 'merienda', 'cena', 'extra'];
const APETITO_OPTS: { v: RegistroDieta['apetito']; l: string; color: string; icono: string }[] = [
  { v: 'bueno',   l: 'Bueno',   color: '#2E7D32', icono: 'emoticon-happy-outline' },
  { v: 'regular', l: 'Regular', color: '#F9A825', icono: 'emoticon-neutral-outline' },
  { v: 'malo',    l: 'Malo',    color: '#C62828', icono: 'emoticon-sad-outline' },
];

const TIPO_CONFIG: Record<RegistroDieta['tipo'], { label: string; icono: string; color: string }> = {
  desayuno: { label: 'Desayuno',  icono: 'coffee',             color: '#E65100' },
  almuerzo: { label: 'Almuerzo',  icono: 'food',               color: '#2E7D32' },
  merienda: { label: 'Merienda',  icono: 'cookie',             color: '#6A1B9A' },
  cena:     { label: 'Cena',      icono: 'silverware-fork-knife', color: '#1565C0' },
  extra:    { label: 'Extra',     icono: 'plus-circle-outline', color: '#00838F' },
};

function PorcentajeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const steps = [0, 25, 50, 75, 100];
  const color = value >= 75 ? '#2E7D32' : value >= 50 ? '#F9A825' : '#C62828';
  return (
    <View style={styles.sliderRow}>
      {steps.map(s => (
        <TouchableOpacity
          key={s}
          style={[styles.sliderBtn, value === s && { backgroundColor: color, borderColor: color }]}
          onPress={() => onChange(s)}
        >
          <Text style={[styles.sliderBtnTexto, value === s && { color: '#fff' }]}>{s}%</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DietaScreen({ route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { usuario, isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const { showToast } = useToast();

  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [registros, setRegistros] = useState<RegistroDieta[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Form state
  const [tipo, setTipo] = useState<RegistroDieta['tipo']>('almuerzo');
  const [descripcion, setDescripcion] = useState('');
  const [porcentaje, setPorcentaje] = useState(100);
  const [apetito, setApetito] = useState<RegistroDieta['apetito']>('bueno');
  const [liquidos, setLiquidos] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerDieta(pacienteId);
      setRegistros(data);
    } catch { /* silent */ }
  }, [pacienteId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  function abrirModal() {
    setTipo('almuerzo');
    setDescripcion('');
    setPorcentaje(100);
    setApetito('bueno');
    setLiquidos('');
    setObservaciones('');
    setModalVisible(true);
  }

  async function handleGuardar() {
    setGuardando(true);
    try {
      await guardarDieta({
        pacienteId,
        tipo,
        descripcion: descripcion.trim(),
        porcentajeConsumido: porcentaje,
        apetito,
        liquidosMl: liquidos ? parseInt(liquidos, 10) : null,
        observaciones: observaciones.trim(),
        registradoPor: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
      });
      showToast('Registro de dieta guardado');
      setModalVisible(false);
      await cargar();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el registro.');
    } finally {
      setGuardando(false);
    }
  }

  function confirmarEliminar(id: string) {
    ejecutarEliminacion('Eliminar', '¿Desea eliminar este registro?', async () => {
      await eliminarDieta(id);
      await cargar();
    });
  }

  // Resumen del día
  const hoy = new Date().toISOString().slice(0, 10);
  const hoyRegistros = registros.filter(r => r.createdAt.slice(0, 10) === hoy);
  const avgPorcentaje = hoyRegistros.length
    ? Math.round(hoyRegistros.reduce((a, b) => a + b.porcentajeConsumido, 0) / hoyRegistros.length)
    : null;
  const totalLiquidos = hoyRegistros.reduce((a, b) => a + (b.liquidosMl ?? 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Paciente header */}
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      {/* Resumen del día */}
      {hoyRegistros.length > 0 && (
        <View style={[styles.resumenCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.resumenTitulo}>Resumen de hoy</Text>
          <View style={styles.resumenFila}>
            <View style={styles.resumenItem}>
              <Text style={[styles.resumenNum, { color: avgPorcentaje != null && avgPorcentaje < 50 ? '#C62828' : '#2E7D32' }]}>
                {avgPorcentaje ?? 0}%
              </Text>
              <Text style={styles.resumenLabel}>Consumo promedio</Text>
            </View>
            <View style={styles.resumenDiv} />
            <View style={styles.resumenItem}>
              <Text style={styles.resumenNum}>{hoyRegistros.length}</Text>
              <Text style={styles.resumenLabel}>Comidas registradas</Text>
            </View>
            <View style={styles.resumenDiv} />
            <View style={styles.resumenItem}>
              <Text style={styles.resumenNum}>{totalLiquidos > 0 ? `${totalLiquidos}ml` : '—'}</Text>
              <Text style={styles.resumenLabel}>Líquidos</Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={registros}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="food-off" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>No hay registros de dieta</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = TIPO_CONFIG[item.tipo];
          const apt = APETITO_OPTS.find(a => a.v === item.apetito)!;
          const fecha = new Date(item.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          const pctColor = item.porcentajeConsumido >= 75 ? '#2E7D32' : item.porcentajeConsumido >= 50 ? '#F9A825' : '#C62828';
          return (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.tipoIcono, { backgroundColor: cfg.color + '22' }]}>
                  <MaterialCommunityIcons name={cfg.icono as any} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipoLabel}>{cfg.label}</Text>
                  <Text style={styles.cardFecha}>{fecha}  •  {item.registradoPor}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.pctNum, { color: pctColor }]}>{item.porcentajeConsumido}%</Text>
                  <MaterialCommunityIcons name={apt.icono as any} size={20} color={apt.color} />
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => confirmarEliminar(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 4 }}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
              {item.descripcion ? <Text style={styles.cardDesc}>{item.descripcion}</Text> : null}
              {item.liquidosMl ? (
                <View style={styles.liquidosRow}>
                  <MaterialCommunityIcons name="cup-water" size={14} color={COLORS.primary} />
                  <Text style={styles.liquidosTexto}>{item.liquidosMl} ml</Text>
                </View>
              ) : null}
              {item.observaciones ? <Text style={styles.cardObs}>{item.observaciones}</Text> : null}
            </View>
          );
        }}
      />

      <FAB
        icon="plus"
        label="Registrar"
        style={styles.fab}
        onPress={abrirModal}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />

      {/* Modal de registro */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <KeyboardAwareScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" enableOnAndroid>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitulo}>Registrar ingesta</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tipo de comida */}
            <Text style={styles.formLabel}>Tipo de comida</Text>
            <View style={styles.tiposRow}>
              {TIPOS.map(t => {
                const cfg = TIPO_CONFIG[t];
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tipoBtn, tipo === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                    onPress={() => setTipo(t)}
                  >
                    <MaterialCommunityIcons name={cfg.icono as any} size={18} color={tipo === t ? '#fff' : cfg.color} />
                    <Text style={[styles.tipoBtnTexto, tipo === t && { color: '#fff' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Descripción */}
            <TextInput
              label="Descripción del menú"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Ej: Sopa de verduras, pollo al vapor..."
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            {/* Porcentaje consumido */}
            <Text style={styles.formLabel}>% Consumido</Text>
            <PorcentajeSlider value={porcentaje} onChange={setPorcentaje} />

            {/* Apetito */}
            <Text style={styles.formLabel}>Apetito</Text>
            <View style={styles.apetitoRow}>
              {APETITO_OPTS.map(opt => (
                <TouchableOpacity
                  key={opt.v}
                  style={[styles.apetitoBtn, apetito === opt.v && { backgroundColor: opt.color, borderColor: opt.color }]}
                  onPress={() => setApetito(opt.v)}
                >
                  <MaterialCommunityIcons name={opt.icono as any} size={22} color={apetito === opt.v ? '#fff' : opt.color} />
                  <Text style={[styles.apetitoBtnTexto, apetito === opt.v && { color: '#fff' }]}>{opt.l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Líquidos */}
            <TextInput
              label="Líquidos (ml) — opcional"
              value={liquidos}
              onChangeText={setLiquidos}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              left={<TextInput.Icon icon="cup-water" />}
            />

            {/* Observaciones */}
            <TextInput
              label="Observaciones"
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={2}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            <View style={styles.botones}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handleGuardar} loading={guardando} style={[styles.botonGuardar, { flex: 2 }]} icon="content-save">
                Guardar
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E3F2FD', margin: 16, marginBottom: 8,
    borderRadius: 10, padding: 12,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  resumenCard: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, elevation: 1 },
  resumenTitulo: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 10 },
  resumenFila: { flexDirection: 'row', alignItems: 'center' },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenNum: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  resumenDiv: { width: 1, height: 32, backgroundColor: COLORS.border },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipoIcono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tipoLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  cardFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  pctNum: { fontSize: FONT_SIZES.md, fontWeight: '800' },
  cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 8 },
  liquidosRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  liquidosTexto: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600' },
  cardObs: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.primary },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheetContent: { padding: 24, gap: 12, paddingBottom: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  tiposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tipoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tipoBtnTexto: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.surface, marginBottom: 4 },
  sliderRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  sliderBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  sliderBtnTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  apetitoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  apetitoBtn: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  apetitoBtnTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  botonGuardar: { backgroundColor: COLORS.primary },
});
