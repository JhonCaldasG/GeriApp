// src/screens/listaEspera/ListaEsperaScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { SolicitanteIngreso } from '../../types';
import { obtenerListaEspera, guardarSolicitante, actualizarEstadoSolicitante, eliminarSolicitante } from '../../storage/listaEspera';

export default function ListaEsperaScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [solicitantes, setSolicitantes] = useState<SolicitanteIngreso[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState<SolicitanteIngreso['estado'] | 'todos'>('en_espera');
  const [modoAgregar, setModoAgregar] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoRelacion, setContactoRelacion] = useState('');
  const [prioridad, setPrioridad] = useState<SolicitanteIngreso['prioridad']>('normal');
  const [diagnostico, setDiagnostico] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setSolicitantes(await obtenerListaEspera()); } catch { /* silencioso */ }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const filtrados = solicitantes.filter(s => filtro === 'todos' || s.estado === filtro);

  async function handleGuardar() {
    if (!nombre.trim() || !apellido.trim() || !contactoNombre.trim() || !contactoTelefono.trim()) {
      Alert.alert('Error', 'Nombre, apellido y contacto son obligatorios.'); return;
    }
    setGuardando(true);
    try {
      await guardarSolicitante({
        nombre: nombre.trim(), apellido: apellido.trim(),
        contactoNombre: contactoNombre.trim(), contactoTelefono: contactoTelefono.trim(),
        contactoRelacion: contactoRelacion.trim(), prioridad,
        diagnosticoPreliminar: diagnostico.trim(),
        estado: 'en_espera',
        fechaSolicitud: new Date().toISOString().slice(0, 10),
      });
      setNombre(''); setApellido(''); setContactoNombre(''); setContactoTelefono(''); setContactoRelacion(''); setDiagnostico('');
      setModoAgregar(false);
      await cargar();
    } catch { Alert.alert('Error', 'No se pudo guardar.'); }
    setGuardando(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.filtrosRow, { backgroundColor: colors.surface }]}>
        {(['en_espera', 'admitido', 'descartado', 'todos'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filtroChip, filtro === f && styles.filtroChipActivo]} onPress={() => setFiltro(f)}>
            <Text style={[styles.filtroTexto, filtro === f && { color: '#fff' }]}>
              {f === 'en_espera' ? 'En espera' : f === 'admitido' ? 'Admitidos' : f === 'descartado' ? 'Descartados' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]} refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}>
        {!modoAgregar && (
          <TouchableOpacity style={styles.agregarBtn} onPress={() => setModoAgregar(true)}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.agregarBtnTexto}>Agregar a lista de espera</Text>
          </TouchableOpacity>
        )}

        {modoAgregar && (
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <Text style={styles.formTitulo}>Nuevo solicitante</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.inputRaw, { flex: 1, color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Nombre" placeholderTextColor={COLORS.textSecondary} value={nombre} onChangeText={setNombre} />
              <TextInput style={[styles.inputRaw, { flex: 1, color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Apellido" placeholderTextColor={COLORS.textSecondary} value={apellido} onChangeText={setApellido} />
            </View>
            <TextInput style={[styles.inputRaw, { color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Nombre del contacto" placeholderTextColor={COLORS.textSecondary} value={contactoNombre} onChangeText={setContactoNombre} />
            <TextInput style={[styles.inputRaw, { color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Teléfono del contacto" placeholderTextColor={COLORS.textSecondary} keyboardType="phone-pad" value={contactoTelefono} onChangeText={setContactoTelefono} />
            <TextInput style={[styles.inputRaw, { color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Diagnóstico preliminar (opcional)" placeholderTextColor={COLORS.textSecondary} value={diagnostico} onChangeText={setDiagnostico} />
            <Text style={styles.prioridadLabel}>Prioridad:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['normal', 'urgente'] as const).map(p => (
                <TouchableOpacity key={p} style={[styles.filtroChip, prioridad === p && { backgroundColor: p === 'urgente' ? COLORS.danger : COLORS.primary, borderColor: p === 'urgente' ? COLORS.danger : COLORS.primary }]} onPress={() => setPrioridad(p)}>
                  <Text style={[styles.filtroTexto, prioridad === p && { color: '#fff' }]}>{p === 'normal' ? 'Normal' : '🚨 Urgente'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button mode="outlined" onPress={() => setModoAgregar(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handleGuardar} loading={guardando} style={{ flex: 1, backgroundColor: COLORS.primary }}>Guardar</Button>
            </View>
          </View>
        )}

        {filtrados.length === 0 && <Text style={styles.vacio}>No hay solicitantes en esta sección.</Text>}

        {filtrados.map(s => (
          <View key={s.id} style={[styles.card, { backgroundColor: colors.surface }, s.prioridad === 'urgente' && { borderLeftColor: COLORS.danger }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardNombre, { color: colors.textPrimary }]}>
                  {s.prioridad === 'urgente' && <Text style={{ color: COLORS.danger }}>🚨 </Text>}
                  {s.nombre} {s.apellido}
                </Text>
                <Text style={styles.cardContacto}>{s.contactoNombre} · {s.contactoTelefono}</Text>
                {s.diagnosticoPreliminar ? <Text style={styles.cardDiag}>{s.diagnosticoPreliminar}</Text> : null}
                <Text style={styles.cardFecha}>Solicitud: {s.fechaSolicitud}</Text>
              </View>
              <View style={[styles.estadoBadge, { backgroundColor: s.estado === 'en_espera' ? '#FFF3E0' : s.estado === 'admitido' ? '#E8F5E9' : '#EEEEEE' }]}>
                <Text style={{ fontSize: FONT_SIZES.xs, fontWeight: '700', color: s.estado === 'en_espera' ? COLORS.warning : s.estado === 'admitido' ? COLORS.secondary : COLORS.textSecondary }}>
                  {s.estado === 'en_espera' ? 'En espera' : s.estado === 'admitido' ? 'Admitido' : 'Descartado'}
                </Text>
              </View>
            </View>
            {s.estado === 'en_espera' && (
              <View style={styles.acciones}>
                <TouchableOpacity style={[styles.accionBtn, { borderColor: COLORS.secondary }]} onPress={() => navigation.navigate('Pacientes', { screen: 'AgregarPaciente', params: { nombre: s.nombre, apellido: s.apellido } })}>
                  <Text style={{ color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Admitir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.accionBtn} onPress={() => actualizarEstadoSolicitante(s.id, 'descartado').then(cargar)}>
                  <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Descartar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Eliminar', '¿Eliminar solicitante?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => eliminarSolicitante(s.id).then(cargar) }])}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filtrosRow: { flexDirection: 'row', gap: 6, padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filtroChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  filtroChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroTexto: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  lista: { padding: 12, gap: 8 },
  agregarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, justifyContent: 'center' },
  agregarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },
  form: { borderRadius: 14, padding: 14, elevation: 2, gap: 8 },
  formTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  inputRaw: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: FONT_SIZES.sm },
  prioridadLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.primary, elevation: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardNombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  cardContacto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  cardDiag: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  cardFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  accionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});
