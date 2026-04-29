import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { Text, FAB, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AseoStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useHogar } from '../../context/HogarContext';
import EmptyState from '../../components/EmptyState';
import { formatearFechaHora } from '../../storage';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { generarReporteLimpieza } from '../../utils/generarHojaLimpieza';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type Props = NativeStackScreenProps<AseoStackParamList, 'ListaLimpiezas'>;

const TIPO_CONFIG: Record<string, { color: string; bg: string; icono: string }> = {
  'Habitación':  { color: COLORS.primary,      bg: '#E3F2FD', icono: 'bed' },
  'Baño':        { color: '#00695C',            bg: '#E0F2F1', icono: 'shower' },
  'Zona común':  { color: '#7B1FA2',            bg: '#F3E5F5', icono: 'sofa' },
  'Pasillo':     { color: '#E65100',            bg: '#FFF3E0', icono: 'road-variant' },
  'Zona ropas':  { color: '#0277BD',            bg: '#E1F5FE', icono: 'washing-machine' },
  'Cocina':      { color: '#C62828',            bg: '#FFEBEE', icono: 'chef-hat' },
  'General':     { color: COLORS.textSecondary, bg: COLORS.background, icono: 'broom' },
};

export default function ListaLimpiezasScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre, habitacion } = route.params;
  const { limpiezas, cargarLimpiezas, eliminarLimpieza, pacientes } = useApp();
  const { isAdmin, isAseo, usuario } = useAuth();
  const { hogar } = useHogar();
  const { colors } = useAppTheme();

  const paciente = pacientes.find(p => p.id === pacienteId);
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const hoy = new Date();
  const [mostrarSelectorPeriodo, setMostrarSelectorPeriodo] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [añoSeleccionado, setAñoSeleccionado] = useState(hoy.getFullYear());

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => cargarLimpiezas(pacienteId));
    return unsubscribe;
  }, [navigation, pacienteId]);

  const limpiezasPaciente = limpiezas.filter(l => l.pacienteId === pacienteId);

  function confirmarEliminar(id: string, fotoUrls: string[]) {
    ejecutarEliminacion('Eliminar Registro', '¿Desea eliminar este registro de limpieza?', async () => {
      await eliminarLimpieza(id, fotoUrls);
      await cargarLimpiezas(pacienteId);
    });
  }

  async function ejecutarGenerarPdf() {
    setMostrarSelectorPeriodo(false);
    setGenerandoPdf(true);
    try {
      const firmaNombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : undefined;
      const firmaCargo  = isAdmin ? 'Administrador' : isAseo ? 'Aseo' : 'Enfermero';
      await generarReporteLimpieza(
        hogar,
        pacienteNombre,
        habitacion,
        limpiezasPaciente,
        mesSeleccionado,
        añoSeleccionado,
        paciente?.fotoUri,
        firmaNombre,
        firmaCargo,
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo generar el PDF.');
    } finally {
      setGenerandoPdf(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.habitacionHeader}>
        <MaterialCommunityIcons name="door-closed" size={20} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.habitacionTexto}>Hab. {habitacion}</Text>
          <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
        </View>
        <View style={styles.contadorBadge}>
          <Text style={styles.contadorTexto}>{limpiezasPaciente.length}</Text>
          <Text style={styles.contadorLabel}>registros</Text>
        </View>
        {isAdmin && (
          <IconButton
            icon={generandoPdf ? 'loading' : 'file-pdf-box'}
            iconColor="#C62828"
            size={26}
            onPress={() => setMostrarSelectorPeriodo(true)}
            disabled={generandoPdf}
          />
        )}
      </View>

      <FlatList
        data={limpiezasPaciente}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <EmptyState
            icono="broom"
            titulo="Sin registros de limpieza"
            subtitulo="Toque el botón + para registrar una limpieza"
          />
        }
        renderItem={({ item }) => {
          const cfg = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG['General'];
          return (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardIcono, { backgroundColor: cfg.bg }]}>
                <MaterialCommunityIcons name={cfg.icono as any} size={22} color={cfg.color} />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.cardTituloRow}>
                  <Text style={[styles.cardTipo, { color: cfg.color }]}>{item.tipo}</Text>
                  {item.fotoUrls?.length > 0 && (
                    <View style={styles.fotoBadge}>
                      <MaterialCommunityIcons name="image-multiple" size={12} color={COLORS.primary} />
                      <Text style={styles.fotoBadgeTexto}>{item.fotoUrls.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDescripcion}>{item.descripcion}</Text>
                {item.observaciones ? (
                  <Text style={styles.cardObservaciones}>{item.observaciones}</Text>
                ) : null}
                {item.fotoUrls?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosRow}>
                    {item.fotoUrls.map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={styles.fotoThumb} />
                    ))}
                  </ScrollView>
                )}
                <View style={styles.cardMeta}>
                  <Text style={styles.cardPor}>Por: {item.realizadoPor}</Text>
                  <Text style={styles.cardFecha}>{formatearFechaHora(item.createdAt)}</Text>
                </View>
              </View>
              {isAdmin && (
                <IconButton
                  icon="delete-outline"
                  iconColor={COLORS.danger}
                  size={18}
                  onPress={() => confirmarEliminar(item.id, item.fotoUrls ?? [])}
                />
              )}
            </View>
          );
        }}
      />

      <FAB
        icon="plus"
        label="Registrar Limpieza"
        style={styles.fab}
        onPress={() => navigation.navigate('RegistrarLimpieza', { pacienteId, pacienteNombre, habitacion })}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />

      {/* ── Selector de período ── */}
      <Modal visible={mostrarSelectorPeriodo} transparent animationType="fade" onRequestClose={() => setMostrarSelectorPeriodo(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostrarSelectorPeriodo(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            {/* Título */}
            <View style={styles.modalTituloRow}>
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#C62828" />
              <Text style={styles.modalTitulo}>Exportar PDF de auditoría</Text>
            </View>
            <Text style={styles.modalSubtitulo}>Seleccioná el período a incluir en el reporte</Text>

            {/* Selector de año */}
            <View style={styles.añoRow}>
              <TouchableOpacity onPress={() => setAñoSeleccionado(a => a - 1)} style={styles.añoBtn}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.añoTexto}>{añoSeleccionado}</Text>
              <TouchableOpacity
                onPress={() => setAñoSeleccionado(a => a + 1)}
                style={[styles.añoBtn, añoSeleccionado >= hoy.getFullYear() && { opacity: 0.3 }]}
                disabled={añoSeleccionado >= hoy.getFullYear()}
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Chips de meses */}
            <View style={styles.mesesGrid}>
              {MESES.map((nombre, idx) => {
                const esActivo = idx === mesSeleccionado;
                const esFuturo = añoSeleccionado >= hoy.getFullYear() && idx > hoy.getMonth();
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => !esFuturo && setMesSeleccionado(idx)}
                    style={[
                      styles.mesChip,
                      esActivo && { backgroundColor: COLORS.primary },
                      esFuturo && { opacity: 0.3 },
                    ]}
                    disabled={esFuturo}
                  >
                    <Text style={[styles.mesChipTexto, esActivo && { color: COLORS.white, fontWeight: '700' }]}>
                      {nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Resumen */}
            <View style={styles.periodoResumen}>
              <MaterialCommunityIcons name="calendar-range" size={15} color={COLORS.primary} />
              <Text style={styles.periodoResumenTexto}>
                {MESES[mesSeleccionado]} {añoSeleccionado} —{' '}
                {limpiezasPaciente.filter(l => {
                  const d = new Date(l.createdAt);
                  return d.getMonth() === mesSeleccionado && d.getFullYear() === añoSeleccionado;
                }).length} registro(s)
              </Text>
            </View>

            {/* Acciones */}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setMostrarSelectorPeriodo(false)}>
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnGenerar} onPress={ejecutarGenerarPdf}>
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.white} />
                <Text style={styles.modalBtnGenerarTexto}>Generar PDF</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  habitacionHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', margin: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#90CAF9',
  },
  habitacionTexto: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  pacienteNombre: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  contadorBadge: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  contadorTexto: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  contadorLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)' },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 10, gap: 12,
    borderWidth: 1, borderColor: COLORS.border, elevation: 1,
  },
  cardIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTipo: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  fotoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  fotoBadgeTexto: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  cardDescripcion: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginBottom: 2 },
  cardObservaciones: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  fotosRow: { marginBottom: 6, marginTop: 4 },
  fotoThumb: { width: 60, height: 60, borderRadius: 6, marginRight: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardPor: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  cardFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.primary },

  // ── Modal selector período ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', borderRadius: 20,
    padding: 24, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16,
  },
  modalTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  modalTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary },
  modalSubtitulo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 20 },

  añoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 18 },
  añoBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  añoTexto: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary, minWidth: 60, textAlign: 'center' },

  mesesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  mesChip: {
    width: 56, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  mesChipTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },

  periodoResumen: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary + '10', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 22,
  },
  periodoResumenTexto: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },

  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancelar: {
    flex: 1, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  modalBtnCancelarTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
  modalBtnGenerar: {
    flex: 2, height: 46, borderRadius: 12,
    backgroundColor: '#C62828',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  modalBtnGenerarTexto: { fontSize: FONT_SIZES.sm, color: COLORS.white, fontWeight: '700' },
});
