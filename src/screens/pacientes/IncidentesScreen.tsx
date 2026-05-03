import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, TextInput, Button, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { PacientesStackParamList, Incidente } from '../../types';
import { obtenerIncidentes, guardarIncidente, eliminarIncidente } from '../../storage/incidentes';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<PacientesStackParamList, 'Incidentes'>;

const TIPO_CONFIG: Record<Incidente['tipo'], { label: string; icono: string; color: string }> = {
  'caída':         { label: 'Caída',          icono: 'human-handsdown', color: '#E65100' },
  'lesión':        { label: 'Lesión',          icono: 'bandage',         color: '#C62828' },
  'comportamiento':{ label: 'Comportamiento',  icono: 'head-alert',      color: '#6A1B9A' },
  'medicación':    { label: 'Medicación',      icono: 'pill-off',        color: '#1565C0' },
  'otro':          { label: 'Otro',            icono: 'alert-circle',    color: '#607D8B' },
};

const TIPOS: Incidente['tipo'][] = ['caída', 'lesión', 'comportamiento', 'medicación', 'otro'];

export default function IncidentesScreen({ route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { usuario, isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const { showToast } = useToast();

  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Form state
  const [tipo, setTipo] = useState<Incidente['tipo']>('caída');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState('');
  const [consecuencias, setConsecuencias] = useState('');
  const [testigos, setTestigos] = useState('');
  const [acciones, setAcciones] = useState('');

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerIncidentes(pacienteId);
      setIncidentes(data);
    } catch { /* silent */ }
  }, [pacienteId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  function abrirModal() {
    setTipo('caída');
    setDescripcion('');
    setLugar('');
    setConsecuencias('');
    setTestigos('');
    setAcciones('');
    setModalVisible(true);
  }

  async function handleGuardar() {
    if (!descripcion.trim()) {
      Alert.alert('Requerido', 'La descripción es obligatoria.');
      return;
    }
    setGuardando(true);
    try {
      await guardarIncidente({
        pacienteId,
        tipo,
        descripcion: descripcion.trim(),
        lugar: lugar.trim(),
        consecuencias: consecuencias.trim(),
        testigos: testigos.trim(),
        accionesTomadas: acciones.trim(),
        registradoPor: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
      });
      showToast('Incidente registrado');
      setModalVisible(false);
      await cargar();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el incidente.');
    } finally {
      setGuardando(false);
    }
  }

  function confirmarEliminar(id: string) {
    ejecutarEliminacion('Eliminar', '¿Desea eliminar este incidente?', async () => {
      await eliminarIncidente(id);
      await cargar();
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Paciente header */}
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      <FlatList
        data={incidentes}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="shield-check-outline" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>Sin incidentes registrados</Text>
            <Text style={styles.vacioSub}>Registre caídas u otros eventos para llevar seguimiento</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG['otro'];
          const fecha = new Date(item.createdAt).toLocaleDateString('es-AR', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.tipoIcono, { backgroundColor: cfg.color + '22' }]}>
                  <MaterialCommunityIcons name={cfg.icono as any} size={22} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.tipoRow}>
                    <View style={[styles.tipoBadge, { backgroundColor: cfg.color }]}>
                      <Text style={styles.tipoBadgeTexto}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardFecha}>{fecha}  •  {item.registradoPor}</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => confirmarEliminar(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.descripcion}>{item.descripcion}</Text>

              {item.lugar ? (
                <View style={styles.detalleRow}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detalleTexto}>Lugar: {item.lugar}</Text>
                </View>
              ) : null}
              {item.consecuencias ? (
                <View style={styles.detalleRow}>
                  <MaterialCommunityIcons name="alert" size={14} color='#E65100' />
                  <Text style={styles.detalleTexto}>Consecuencias: {item.consecuencias}</Text>
                </View>
              ) : null}
              {item.testigos ? (
                <View style={styles.detalleRow}>
                  <MaterialCommunityIcons name="eye" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detalleTexto}>Testigos: {item.testigos}</Text>
                </View>
              ) : null}
              {item.accionesTomadas ? (
                <View style={[styles.accionesBox]}>
                  <Text style={styles.accionesLabel}>Acciones tomadas:</Text>
                  <Text style={styles.accionesTexto}>{item.accionesTomadas}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <FAB
        icon="plus"
        label="Registrar incidente"
        style={styles.fab}
        onPress={abrirModal}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <KeyboardAwareScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" enableOnAndroid>
            <View style={styles.sheetHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color={COLORS.danger} />
              <Text style={styles.sheetTitulo}>Registrar incidente</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tipo */}
            <Text style={styles.formLabel}>Tipo de incidente</Text>
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
              label="Descripción del incidente *"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            <TextInput
              label="Lugar donde ocurrió"
              value={lugar}
              onChangeText={setLugar}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              left={<TextInput.Icon icon="map-marker" />}
            />
            <TextInput
              label="Consecuencias"
              value={consecuencias}
              onChangeText={setConsecuencias}
              multiline
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            <TextInput
              label="Testigos"
              value={testigos}
              onChangeText={setTestigos}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              left={<TextInput.Icon icon="account-multiple" />}
            />
            <TextInput
              label="Acciones tomadas"
              value={acciones}
              onChangeText={setAcciones}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            <View style={styles.botones}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handleGuardar} loading={guardando}
                style={[styles.botonGuardar, { flex: 2 }]} icon="content-save" buttonColor={COLORS.danger}>
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
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 10 },
  vacioTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: '700' },
  vacioSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tipoIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tipoRow: { flexDirection: 'row' },
  tipoBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tipoBadgeTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.xs },
  cardFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  descripcion: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20, marginBottom: 8 },
  detalleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  detalleTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, flex: 1 },
  accionesBox: { backgroundColor: '#F3E5F5', borderRadius: 8, padding: 10, marginTop: 8 },
  accionesLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#6A1B9A', marginBottom: 4 },
  accionesTexto: { fontSize: FONT_SIZES.sm, color: '#4A148C' },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.danger },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheetContent: { padding: 24, gap: 10, paddingBottom: 32 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sheetTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  tiposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tipoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tipoBtnTexto: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.surface },
  botones: { flexDirection: 'row', gap: 10, marginTop: 8 },
  botonGuardar: { backgroundColor: COLORS.danger },
});
