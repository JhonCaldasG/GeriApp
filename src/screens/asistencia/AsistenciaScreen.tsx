// src/screens/asistencia/AsistenciaScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { RegistroAsistencia, Usuario } from '../../types';
import { obtenerAsistencia, registrarEntrada, registrarSalida } from '../../storage/asistencia';
import { obtenerUsuarios } from '../../storage/usuarios';

export default function AsistenciaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [asistencia, setAsistencia] = useState<RegistroAsistencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [asist, users] = await Promise.all([
        obtenerAsistencia(hoy),
        obtenerUsuarios(),
      ]);
      setAsistencia(asist);
      setUsuarios(users.filter(u => u.activo));
    } catch { /* silencioso */ }
    setCargando(false);
  }, [hoy]);

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

  const ROL_LABELS: Record<string, string> = { admin: 'Admin', enfermero: 'Enfermero', aseo: 'Aseo' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={styles.headerFecha}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text style={styles.headerSub}>{asistencia.length} / {usuarios.length} presentes</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {usuarios.map(u => {
          const reg = registroDeUsuario(u.id);
          const presente = !!(reg?.horaEntrada && !reg?.horaSalida);
          const salio = !!(reg?.horaEntrada && reg?.horaSalida);

          return (
            <View key={u.id} style={[styles.card, { backgroundColor: colors.surface }, presente && { borderLeftColor: COLORS.secondary }, salio && { borderLeftColor: COLORS.textSecondary }]}>
              <View style={[styles.avatar, { backgroundColor: presente ? COLORS.secondary : salio ? COLORS.textSecondary : COLORS.border }]}>
                <MaterialCommunityIcons name="account" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: colors.textPrimary }]}>{u.nombre} {u.apellido}</Text>
                <Text style={styles.rol}>{ROL_LABELS[u.rol] ?? u.rol}</Text>
                {reg?.horaEntrada && <Text style={styles.hora}>Entrada: {reg.horaEntrada}{reg.horaSalida ? ` · Salida: ${reg.horaSalida}` : ''}</Text>}
              </View>
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
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerFecha: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'capitalize' },
  headerSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  lista: { padding: 12, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.border, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  rol: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  hora: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  acciones: { gap: 6 },
  accionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
