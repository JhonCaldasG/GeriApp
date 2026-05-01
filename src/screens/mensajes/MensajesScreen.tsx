// src/screens/mensajes/MensajesScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { MensajeInterno } from '../../types';
import { obtenerMensajes, publicarMensaje, eliminarMensaje, marcarLeido, obtenerLeidos } from '../../storage/mensajes';

const ROL_LABELS: Record<string, string> = { todos: 'Todos', enfermero: 'Enfermeros', aseo: 'Aseo' };

function fechaRelativa(iso: string): string {
  const ahora = new Date();
  const fecha = new Date(iso);
  const diffDias = Math.floor((ahora.getTime() - fecha.getTime()) / 86400000);
  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias} días`;
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function MensajesScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const [mensajes, setMensajes] = useState<MensajeInterno[]>([]);
  const [leidos, setLeidos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [paraRol, setParaRol] = useState<MensajeInterno['paraRol']>('todos');
  const [modoPublicar, setModoPublicar] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const lista = await obtenerMensajes(usuario.rol);
      setMensajes(lista);
      const leidosIds = await obtenerLeidos();
      setLeidos(leidosIds);
      await Promise.all(lista.map(m => marcarLeido(m.id)));
    } catch { /* silencioso */ }
    setCargando(false);
  }, [usuario]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function handlePublicar() {
    if (!titulo.trim() || !cuerpo.trim()) { Alert.alert('Error', 'Completá título y mensaje.'); return; }
    if (!usuario) return;
    setPublicando(true);
    try {
      await publicarMensaje({ autorId: usuario.id, autorNombre: `${usuario.nombre} ${usuario.apellido}`, titulo: titulo.trim(), cuerpo: cuerpo.trim(), paraRol });
      setTitulo(''); setCuerpo(''); setModoPublicar(false);
      await cargar();
    } catch { Alert.alert('Error', 'No se pudo publicar el mensaje.'); }
    setPublicando(false);
  }

  async function handleEliminar(id: string, tituloMensaje: string) {
    Alert.alert('Eliminar mensaje', `¿Eliminar "${tituloMensaje}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await eliminarMensaje(id); await cargar(); }
        catch { Alert.alert('Error', 'No se pudo eliminar.'); }
      }},
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {isAdmin && !modoPublicar && (
          <TouchableOpacity style={styles.publicarBtn} onPress={() => setModoPublicar(true)}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.publicarBtnTexto}>Publicar mensaje</Text>
          </TouchableOpacity>
        )}

        {isAdmin && modoPublicar && (
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.formTitulo}>Nuevo mensaje</Text>
            <TextInput label="Título" value={titulo} onChangeText={setTitulo} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
            <TextInput label="Mensaje" value={cuerpo} onChangeText={setCuerpo} mode="outlined" multiline numberOfLines={4} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
            <Text style={styles.rolLabel}>Para:</Text>
            <View style={styles.rolesRow}>
              {(['todos', 'enfermero', 'aseo'] as const).map(r => (
                <TouchableOpacity key={r} style={[styles.rolChip, paraRol === r && styles.rolChipActivo]} onPress={() => setParaRol(r)}>
                  <Text style={[styles.rolChipTexto, paraRol === r && { color: '#fff' }]}>{ROL_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button mode="outlined" onPress={() => setModoPublicar(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handlePublicar} loading={publicando} style={{ flex: 1, backgroundColor: COLORS.primary }}>Publicar</Button>
            </View>
          </View>
        )}

        {mensajes.length === 0 && !cargando && (
          <Text style={styles.vacio}>No hay mensajes publicados.</Text>
        )}

        {mensajes.map(m => {
          const noLeido = !leidos.includes(m.id);
          return (
            <View key={m.id} style={[styles.mensajeCard, { backgroundColor: colors.surface }, noLeido && styles.noLeido]}>
              <View style={styles.mensajeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mensajeTitulo, { color: colors.textPrimary }]}>
                    {noLeido && <Text style={{ color: COLORS.primary }}>● </Text>}{m.titulo}
                  </Text>
                  <Text style={styles.mensajeMeta}>
                    {m.autorNombre} · {ROL_LABELS[m.paraRol]} · {fechaRelativa(m.createdAt)}
                  </Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => handleEliminar(m.id, m.titulo)}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.mensajeCuerpo, { color: colors.textPrimary }]}>{m.cuerpo}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { padding: 12, gap: 10 },
  publicarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, justifyContent: 'center' },
  publicarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.md },
  formCard: { borderRadius: 14, padding: 16, elevation: 2, gap: 4 },
  formTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  input: { marginBottom: 8, backgroundColor: 'transparent' },
  rolLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  rolesRow: { flexDirection: 'row', gap: 8 },
  rolChip: { flex: 1, padding: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  rolChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rolChipTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  mensajeCard: { borderRadius: 14, padding: 14, elevation: 1, gap: 6 },
  noLeido: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  mensajeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mensajeTitulo: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  mensajeMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  mensajeCuerpo: { fontSize: FONT_SIZES.sm, lineHeight: 20 },
});
