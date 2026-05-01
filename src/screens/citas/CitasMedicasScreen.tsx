// src/screens/citas/CitasMedicasScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { CitaMedica } from '../../types';
import { obtenerCitas, actualizarEstadoCita, eliminarCita } from '../../storage/citas';

const ESTADO_COLORS: Record<CitaMedica['estado'], string> = {
  pendiente: COLORS.warning, realizada: COLORS.secondary, cancelada: COLORS.textSecondary,
};
const ESTADO_LABELS: Record<CitaMedica['estado'], string> = {
  pendiente: 'Pendiente', realizada: 'Realizada', cancelada: 'Cancelada',
};
const DIA_LETRA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function generarDias(cantidad: number): { iso: string; num: number; letra: string }[] {
  const dias = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = -3; i < cantidad - 3; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dias.push({ iso: d.toISOString().slice(0, 10), num: d.getDate(), letra: DIA_LETRA[d.getDay()] });
  }
  return dias;
}

const DIAS = generarDias(18);

export default function CitasMedicasScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { pacientes } = useApp();
  const { isAseo } = useAuth();
  const { colors } = useAppTheme();
  const pacienteId = route.params?.pacienteId as string | undefined;
  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [cargando, setCargando] = useState(false);
  const [tab, setTab] = useState<'proximas' | 'historial'>('proximas');
  const [diaFiltro, setDiaFiltro] = useState<string | null>(null);
  const stripRef = useRef<ScrollView>(null);
  const hoyISO = new Date().toISOString().slice(0, 10);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setCitas(await obtenerCitas(pacienteId)); } catch { /* silencioso */ }
    setCargando(false);
  }, [pacienteId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  // Índice de citas por fecha para los dots del strip
  const citasPorDia: Record<string, number> = {};
  for (const c of citas) {
    if (c.estado === 'pendiente') citasPorDia[c.fecha] = (citasPorDia[c.fecha] ?? 0) + 1;
  }

  const proximas = citas.filter(c => c.fecha >= hoyISO && c.estado === 'pendiente');
  const historial = citas.filter(c => c.fecha < hoyISO || c.estado !== 'pendiente');
  let citasMostradas = tab === 'proximas' ? proximas : historial;
  if (diaFiltro) citasMostradas = citas.filter(c => c.fecha === diaFiltro);

  function nombrePaciente(id: string) {
    const p = pacientes.find(p => p.id === id);
    return p ? `${p.nombre} ${p.apellido}` : '—';
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Strip semanal */}
      <View style={[styles.stripWrapper, { backgroundColor: colors.surface }]}>
        <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripContent}>
          {DIAS.map(dia => {
            const seleccionado = diaFiltro === dia.iso;
            const esHoy = dia.iso === hoyISO;
            const tieneCitas = (citasPorDia[dia.iso] ?? 0) > 0;
            return (
              <TouchableOpacity
                key={dia.iso}
                style={[styles.diaCell, seleccionado && { backgroundColor: COLORS.primary }, esHoy && !seleccionado && styles.diaCellHoy]}
                onPress={() => setDiaFiltro(d => d === dia.iso ? null : dia.iso)}
                activeOpacity={0.7}
              >
                <Text style={[styles.diaLetra, seleccionado && { color: '#fff' }, esHoy && !seleccionado && { color: COLORS.primary }]}>{dia.letra}</Text>
                <Text style={[styles.diaNum, seleccionado && { color: '#fff' }, esHoy && !seleccionado && { color: COLORS.primary, fontWeight: '800' }]}>{dia.num}</Text>
                {tieneCitas
                  ? <View style={[styles.diaDot, { backgroundColor: seleccionado ? '#fff' : COLORS.warning }]} />
                  : <View style={styles.diaDotPlaceholder} />
                }
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tabs */}
      {!diaFiltro && (
        <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
          {(['proximas', 'historial'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActivo]} onPress={() => setTab(t)}>
              <Text style={[styles.tabTexto, tab === t && styles.tabTextoActivo]}>
                {t === 'proximas' ? `Próximas (${proximas.length})` : `Historial (${historial.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {diaFiltro && (
        <View style={[styles.diaFiltroBar, { backgroundColor: colors.surface }]}>
          <Text style={styles.diaFiltroTexto}>
            {new Date(diaFiltro + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <TouchableOpacity onPress={() => setDiaFiltro(null)}>
            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {!isAseo && (
        <TouchableOpacity
          style={styles.agregarBtn}
          onPress={() => navigation.navigate('AgregarCita', { pacienteId, pacienteNombre: route.params?.pacienteNombre, fechaSugerida: diaFiltro })}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={styles.agregarBtnTexto}>Nueva cita</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {citasMostradas.length === 0 && <Text style={styles.vacio}>No hay citas en esta sección.</Text>}
        {citasMostradas.map(cita => {
          const color = ESTADO_COLORS[cita.estado];
          return (
            <View key={cita.id} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: color }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardFecha, { color }]}>{cita.fecha} · {cita.hora}</Text>
                  <Text style={[styles.cardEspecialidad, { color: colors.textPrimary }]}>{cita.especialidad}</Text>
                  <Text style={styles.cardMedico}>{cita.medico}</Text>
                  {!pacienteId && <Text style={styles.cardPaciente}>{nombrePaciente(cita.pacienteId)}</Text>}
                  {cita.lugar ? <Text style={styles.cardLugar}>{cita.lugar}</Text> : null}
                  {cita.observaciones ? <Text style={styles.cardObs}>{cita.observaciones}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[styles.estadoBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.estadoTexto, { color }]}>{ESTADO_LABELS[cita.estado]}</Text>
                  </View>
                  {!isAseo && cita.estado === 'pendiente' && (
                    <TouchableOpacity onPress={() => navigation.navigate('AgregarCita', { citaId: cita.id, pacienteId: cita.pacienteId })}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {cita.estado === 'pendiente' && (
                <View style={styles.acciones}>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => actualizarEstadoCita(cita.id, 'realizada').then(cargar)}>
                    <Text style={{ color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Marcar realizada</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => actualizarEstadoCita(cita.id, 'cancelada').then(cargar)}>
                    <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('Eliminar', `¿Eliminar cita de ${cita.especialidad}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => eliminarCita(cita.id).then(cargar) }])}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stripWrapper: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stripContent: { paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
  diaCell: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, minWidth: 44 },
  diaCellHoy: { backgroundColor: COLORS.primary + '15' },
  diaLetra: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  diaNum: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  diaDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  diaDotPlaceholder: { width: 6, height: 6, marginTop: 2 },
  diaFiltroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  diaFiltroTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActivo: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabTexto: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  tabTextoActivo: { color: COLORS.primary },
  agregarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, margin: 12, borderRadius: 10, padding: 10, justifyContent: 'center' },
  agregarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },
  lista: { paddingHorizontal: 12, paddingBottom: 20, gap: 8 },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardFecha: { fontSize: FONT_SIZES.xs, fontWeight: '800', marginBottom: 2 },
  cardEspecialidad: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  cardMedico: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  cardPaciente: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },
  cardLugar: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  cardObs: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  estadoTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  accionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});
