// src/screens/asistencia/AsistenciaScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { RegistroAsistencia, Usuario } from '../../types';
import { obtenerAsistencia, registrarEntrada, registrarSalida } from '../../storage/asistencia';
import { obtenerUsuarios } from '../../storage/usuarios';

function calcularHoras(entrada: string, salida: string): string {
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = salida.split(':').map(Number);
  const totalMin = (sh * 60 + sm) - (eh * 60 + em);
  if (totalMin <= 0) return '';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

function offsetFecha(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const ROL_LABELS: Record<string, string> = { admin: 'Admin', enfermero: 'Enfermero', aseo: 'Aseo' };

export default function AsistenciaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [asistencia, setAsistencia] = useState<RegistroAsistencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const hoy = new Date().toISOString().slice(0, 10);
  const [fechaFiltro, setFechaFiltro] = useState(hoy);
  const esHoy = fechaFiltro === hoy;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [asist, users] = await Promise.all([
        obtenerAsistencia(fechaFiltro),
        obtenerUsuarios(),
      ]);
      setAsistencia(asist);
      setUsuarios(users.filter(u => u.activo));
    } catch { /* silencioso */ }
    setCargando(false);
  }, [fechaFiltro]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  function registroDeUsuario(uid: string) {
    return asistencia.find(a => a.usuarioId === uid);
  }

  async function handleEntrada(u: Usuario) {
    try { await registrarEntrada(u.id, `${u.nombre} ${u.apellido}`, u.rol); await cargar(); }
    catch (e: any) { Alert.alert('Error al registrar entrada', e?.message ?? String(e)); }
  }

  async function handleSalida(u: Usuario) {
    try { await registrarSalida(u.id); await cargar(); }
    catch (e: any) { Alert.alert('Error al registrar salida', e?.message ?? String(e)); }
  }

  const presentesCount = asistencia.filter(a => a.horaEntrada && !a.horaSalida).length;

  const usuariosFiltrados = usuarios.filter(u => {
    if (!busqueda.trim()) return true;
    const texto = `${u.nombre} ${u.apellido}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  const fechaLabel = new Date(fechaFiltro + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header con navegación de fecha */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.fechaNav}>
          <TouchableOpacity onPress={() => setFechaFiltro(f => offsetFecha(f, -1))} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerFecha}>{fechaLabel}</Text>
            {!esHoy && (
              <TouchableOpacity onPress={() => setFechaFiltro(hoy)}>
                <Text style={styles.volverHoy}>Volver a hoy</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setFechaFiltro(f => offsetFecha(f, 1))}
            style={[styles.navBtn, fechaFiltro >= hoy && { opacity: 0.3 }]}
            disabled={fechaFiltro >= hoy}
          >
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>{presentesCount} / {usuarios.length} presentes</Text>
      </View>

      {/* Buscador */}
      <View style={[styles.buscadorWrapper, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.buscador, { color: colors.textPrimary }]}
          placeholder="Buscar empleado..."
          placeholderTextColor={COLORS.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {usuariosFiltrados.length === 0 && !cargando && (
          <Text style={styles.vacio}>Sin resultados.</Text>
        )}
        {usuariosFiltrados.map(u => {
          const reg = registroDeUsuario(u.id);
          const presente = !!(reg?.horaEntrada && !reg?.horaSalida);
          const salio = !!(reg?.horaEntrada && reg?.horaSalida);
          const horas = reg?.horaEntrada && reg?.horaSalida ? calcularHoras(reg.horaEntrada, reg.horaSalida) : '';

          return (
            <View key={u.id} style={[styles.card, { backgroundColor: colors.surface }, presente && { borderLeftColor: COLORS.secondary }, salio && { borderLeftColor: COLORS.textSecondary }]}>
              <View style={[styles.avatar, { backgroundColor: presente ? COLORS.secondary : salio ? COLORS.textSecondary : COLORS.border }]}>
                <MaterialCommunityIcons name="account" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: colors.textPrimary }]}>{u.nombre} {u.apellido}</Text>
                <Text style={styles.rol}>{ROL_LABELS[u.rol] ?? u.rol}</Text>
                {reg?.horaEntrada && (
                  <Text style={styles.hora}>
                    Entrada: {reg.horaEntrada}
                    {reg.horaSalida ? ` · Salida: ${reg.horaSalida}` : ''}
                    {horas ? ` · ${horas}` : ''}
                  </Text>
                )}
                {!reg?.horaEntrada && !esHoy && (
                  <Text style={[styles.hora, { color: COLORS.textSecondary }]}>Sin registro</Text>
                )}
              </View>
              {esHoy && (
                <View style={styles.acciones}>
                  {!reg?.horaEntrada && (
                    <TouchableOpacity style={[styles.accionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handleEntrada(u)}>
                      <MaterialCommunityIcons name="login" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                  )}
                  {reg?.horaEntrada && !reg?.horaSalida && (
                    <TouchableOpacity style={[styles.accionBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleSalida(u)}>
                      <MaterialCommunityIcons name="logout" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
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
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fechaNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  navBtn: { padding: 4 },
  headerFecha: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'capitalize', textAlign: 'center' },
  volverHoy: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  headerSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },
  buscadorWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  buscador: { flex: 1, fontSize: FONT_SIZES.sm, paddingVertical: 4 },
  lista: { padding: 12, gap: 8 },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.border, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  rol: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  hora: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  acciones: { gap: 6 },
  accionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
