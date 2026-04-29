import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { PacientesStackParamList, EvaluacionClinica } from '../../types';
import { obtenerEvaluaciones, guardarEvaluacion, eliminarEvaluacion } from '../../storage/evaluaciones';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<PacientesStackParamList, 'EvaluacionClinica'>;

// ── Barthel ────────────────────────────────────────────────────────────────────
const BARTHEL_ITEMS = [
  { key: 'alimentacion',   label: 'Alimentación',        opciones: [{ v: 0, l: 'Dependiente' }, { v: 5, l: 'Necesita ayuda' }, { v: 10, l: 'Independiente' }] },
  { key: 'bano',           label: 'Baño',                opciones: [{ v: 0, l: 'Dependiente' }, { v: 5, l: 'Independiente' }] },
  { key: 'aseo',           label: 'Aseo personal',       opciones: [{ v: 0, l: 'Necesita ayuda' }, { v: 5, l: 'Independiente' }] },
  { key: 'vestido',        label: 'Vestido',             opciones: [{ v: 0, l: 'Dependiente' }, { v: 5, l: 'Necesita ayuda' }, { v: 10, l: 'Independiente' }] },
  { key: 'vejiga',         label: 'Control vesical',     opciones: [{ v: 0, l: 'Incontinente' }, { v: 5, l: 'Accidente ocasional' }, { v: 10, l: 'Continente' }] },
  { key: 'intestino',      label: 'Control intestinal',  opciones: [{ v: 0, l: 'Incontinente' }, { v: 5, l: 'Accidente ocasional' }, { v: 10, l: 'Continente' }] },
  { key: 'retrete',        label: 'Uso del retrete',     opciones: [{ v: 0, l: 'Dependiente' }, { v: 5, l: 'Necesita ayuda' }, { v: 10, l: 'Independiente' }] },
  { key: 'traslado',       label: 'Traslado silla/cama', opciones: [{ v: 0, l: 'Incapaz' }, { v: 5, l: 'Gran ayuda' }, { v: 10, l: 'Mínima ayuda' }, { v: 15, l: 'Independiente' }] },
  { key: 'deambulacion',   label: 'Deambulación',        opciones: [{ v: 0, l: 'Inmóvil' }, { v: 5, l: 'En silla de ruedas' }, { v: 10, l: 'Camina con ayuda' }, { v: 15, l: 'Independiente' }] },
  { key: 'escaleras',      label: 'Subir escaleras',     opciones: [{ v: 0, l: 'Incapaz' }, { v: 5, l: 'Necesita ayuda' }, { v: 10, l: 'Independiente' }] },
];

function barthelCategoria(p: number): { label: string; color: string } {
  if (p <= 20) return { label: 'Dependencia total', color: '#B71C1C' };
  if (p <= 60) return { label: 'Dependencia severa', color: '#E65100' };
  if (p <= 90) return { label: 'Dependencia moderada', color: '#F9A825' };
  if (p <= 99) return { label: 'Dependencia leve', color: '#2E7D32' };
  return { label: 'Independiente', color: '#1B5E20' };
}

// ── Braden ─────────────────────────────────────────────────────────────────────
const BRADEN_ITEMS = [
  { key: 'percepcion', label: 'Percepción sensorial', opciones: [{ v: 1, l: 'Completamente limitada' }, { v: 2, l: 'Muy limitada' }, { v: 3, l: 'Levemente limitada' }, { v: 4, l: 'Sin limitación' }] },
  { key: 'humedad',    label: 'Humedad',              opciones: [{ v: 1, l: 'Constantemente húmeda' }, { v: 2, l: 'Muy húmeda' }, { v: 3, l: 'Ocasionalmente húmeda' }, { v: 4, l: 'Raramente húmeda' }] },
  { key: 'actividad',  label: 'Actividad',            opciones: [{ v: 1, l: 'Encamado' }, { v: 2, l: 'En silla' }, { v: 3, l: 'Camina ocasionalmente' }, { v: 4, l: 'Camina con frecuencia' }] },
  { key: 'movilidad',  label: 'Movilidad',            opciones: [{ v: 1, l: 'Completamente inmóvil' }, { v: 2, l: 'Muy limitada' }, { v: 3, l: 'Levemente limitada' }, { v: 4, l: 'Sin limitación' }] },
  { key: 'nutricion',  label: 'Nutrición',            opciones: [{ v: 1, l: 'Muy pobre' }, { v: 2, l: 'Probablemente inadecuada' }, { v: 3, l: 'Adecuada' }, { v: 4, l: 'Excelente' }] },
  { key: 'roce',       label: 'Roce y presión',       opciones: [{ v: 1, l: 'Problema' }, { v: 2, l: 'Problema potencial' }, { v: 3, l: 'Sin problema aparente' }] },
];

function bradenCategoria(p: number): { label: string; color: string } {
  if (p <= 9)  return { label: 'Riesgo muy alto', color: '#B71C1C' };
  if (p <= 12) return { label: 'Riesgo alto', color: '#E65100' };
  if (p <= 14) return { label: 'Riesgo moderado', color: '#F9A825' };
  if (p <= 18) return { label: 'Riesgo leve', color: '#2E7D32' };
  return { label: 'Sin riesgo aparente', color: '#1B5E20' };
}

function ItemSelector({ item, value, onChange }: {
  item: { key: string; label: string; opciones: { v: number; l: string }[] };
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.itemLabel}>{item.label}</Text>
      <View style={styles.opcionesRow}>
        {item.opciones.map(op => (
          <TouchableOpacity
            key={op.v}
            style={[styles.opcionBtn, value === op.v && styles.opcionBtnActivo]}
            onPress={() => onChange(op.v)}
          >
            <Text style={[styles.opcionVal, value === op.v && styles.opcionValActivo]}>{op.v}</Text>
            <Text style={[styles.opcionLbl, value === op.v && styles.opcionLblActivo]} numberOfLines={2}>{op.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function HistorialCard({ ev, onEliminar }: { ev: EvaluacionClinica; onEliminar?: () => void }) {
  const { colors } = useAppTheme();
  const cat = ev.tipo === 'barthel' ? barthelCategoria(ev.puntuacion) : bradenCategoria(ev.puntuacion);
  const fecha = new Date(ev.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={[styles.histCard, { backgroundColor: colors.surface }]}>
      <View style={styles.histHeader}>
        <View style={[styles.histBadge, { backgroundColor: cat.color }]}>
          <Text style={styles.histBadgeTexto}>{ev.puntuacion} pts</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.histCategoria} numberOfLines={1}>{cat.label}</Text>
          <Text style={styles.histFecha}>{fecha}  •  {ev.evaluadoPor}</Text>
        </View>
        {onEliminar && (
          <TouchableOpacity onPress={onEliminar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>
      {ev.observaciones ? <Text style={styles.histObs}>{ev.observaciones}</Text> : null}
    </View>
  );
}

export default function EvaluacionClinicaScreen({ route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { usuario, isAdmin } = useAuth();
  const { colors } = useAppTheme();

  const [tipo, setTipo] = useState<'barthel' | 'braden'>('barthel');
  const [itemsBarthel, setItemsBarthel] = useState<Record<string, number>>(() =>
    Object.fromEntries(BARTHEL_ITEMS.map(i => [i.key, 0]))
  );
  const [itemsBraden, setItemsBraden] = useState<Record<string, number>>(() =>
    Object.fromEntries(BRADEN_ITEMS.map(i => [i.key, i.opciones[0].v]))
  );
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [historial, setHistorial] = useState<EvaluacionClinica[]>([]);
  const [guardando, setGuardando] = useState(false);

  const items = tipo === 'barthel' ? itemsBarthel : itemsBraden;
  const setItems = tipo === 'barthel' ? setItemsBarthel : setItemsBraden;
  const puntuacion = Object.values(items).reduce((a, b) => a + b, 0);
  const categoria = tipo === 'barthel' ? barthelCategoria(puntuacion) : bradenCategoria(puntuacion);
  const itemsDef = tipo === 'barthel' ? BARTHEL_ITEMS : BRADEN_ITEMS;

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerEvaluaciones(pacienteId, tipo);
      setHistorial(data);
    } catch { /* silent */ }
  }, [pacienteId, tipo]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function handleGuardar() {
    setGuardando(true);
    try {
      await guardarEvaluacion({
        pacienteId,
        tipo,
        puntuacion,
        items,
        observaciones: '',
        evaluadoPor: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Desconocido',
      });
      await cargar();
      Alert.alert('Guardado', `Evaluación ${tipo === 'barthel' ? 'Barthel' : 'Braden'} registrada: ${puntuacion} puntos (${categoria.label}).`);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la evaluación.');
    } finally {
      setGuardando(false);
    }
  }

  function confirmarEliminar(id: string) {
    ejecutarEliminacion('Eliminar', '¿Desea eliminar esta evaluación?', async () => {
      await eliminarEvaluacion(id);
      await cargar();
    });
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Paciente */}
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      {/* Selector de escala */}
      <SegmentedButtons
        value={tipo}
        onValueChange={v => { setTipo(v as any); cargar(); }}
        buttons={[
          { value: 'barthel', label: 'Escala Barthel (ADL)', icon: 'human-wheelchair' },
          { value: 'braden',  label: 'Escala Braden (UPP)',  icon: 'bandage' },
        ]}
        style={styles.segmented}
      />

      {/* Descripción */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        {tipo === 'barthel' ? (
          <Text style={styles.infoTexto}>
            Mide la independencia funcional en actividades de la vida diaria (AVD). Puntaje 0–100.
          </Text>
        ) : (
          <Text style={styles.infoTexto}>
            Predice el riesgo de úlceras por presión. Puntaje 6–23. A menor puntaje, mayor riesgo.
          </Text>
        )}
      </View>

      {/* Resultado actual */}
      <View style={[styles.resultadoCard, { borderColor: categoria.color }]}>
        <Text style={[styles.resultadoPts, { color: categoria.color }]}>{puntuacion}</Text>
        <Text style={[styles.resultadoCat, { color: categoria.color }]}>{categoria.label}</Text>
        <Text style={styles.resultadoMax}>
          {tipo === 'barthel' ? '/ 100 puntos' : '/ 23 puntos'}
        </Text>
      </View>

      {/* Items */}
      {itemsDef.map(item => (
        <ItemSelector
          key={item.key}
          item={item}
          value={items[item.key] ?? item.opciones[0].v}
          onChange={v => setItems(prev => ({ ...prev, [item.key]: v }))}
        />
      ))}

      <Button
        mode="contained"
        onPress={handleGuardar}
        loading={guardando}
        style={styles.botonGuardar}
        contentStyle={{ height: 52 }}
        icon="content-save"
      >
        Guardar evaluación
      </Button>

      {/* Historial */}
      {historial.length > 0 && (
        <>
          <Text style={styles.seccion}>Historial de evaluaciones</Text>
          {historial.map(ev => (
            <HistorialCard key={ev.id} ev={ev} onEliminar={isAdmin ? () => confirmarEliminar(ev.id) : undefined} />
          ))}
        </>
      )}

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E3F2FD', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  segmented: { marginBottom: 14 },
  infoCard: { borderRadius: 10, padding: 12, marginBottom: 14 },
  infoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  resultadoCard: {
    alignItems: 'center', borderRadius: 16,
    borderWidth: 2, padding: 20, marginBottom: 16,
  },
  resultadoPts: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  resultadoCat: { fontSize: FONT_SIZES.md, fontWeight: '700', marginTop: 4 },
  resultadoMax: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  itemRow: {
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
  },
  itemLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  opcionesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  opcionBtn: {
    flex: 1, minWidth: 64, alignItems: 'center',
    borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.border, padding: 8,
    backgroundColor: COLORS.background,
  },
  opcionBtnActivo: { backgroundColor: '#E3F2FD', borderColor: COLORS.primary },
  opcionVal: { fontSize: 18, fontWeight: '800', color: COLORS.textSecondary },
  opcionValActivo: { color: COLORS.primary },
  opcionLbl: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  opcionLblActivo: { color: COLORS.primary },
  botonGuardar: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 10, marginBottom: 24 },
  seccion: {
    fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  histCard: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  histHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, minWidth: 56, alignItems: 'center' },
  histBadgeTexto: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZES.md },
  histCategoria: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  histFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  histObs: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 8 },
});
