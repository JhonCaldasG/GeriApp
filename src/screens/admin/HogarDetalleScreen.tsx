import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Usuario } from '../../types';
import { COLORS, FONT_SIZES } from '../../theme';

export default function HogarDetalleScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { hogarId, hogarNombre } = route.params;

  const [hogar, setHogar]       = useState<any>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const [{ data: hogarData }, { data: usuariosData }] = await Promise.all([
        supabase.from('hogar_config').select('*').eq('id', hogarId).single(),
        supabase.from('usuarios').select('*').eq('hogar_id', hogarId).order('nombre'),
      ]);
      if (hogarData) setHogar(hogarData);
      if (usuariosData) setUsuarios(usuariosData.map((row: any) => ({
        id: row.id, nombre: row.nombre, apellido: row.apellido,
        usuario: row.usuario, rol: row.rol, activo: row.activo,
        ultimoIngreso: row.ultimo_ingreso ?? null,
      })));
      setCargando(false);
    };
    cargar();
  }, [hogarId]);

  async function cambiarEstado(nuevoEstado: string) {
    Alert.alert(
      'Cambiar estado',
      `¿Cambiar estado del hogar a "${nuevoEstado}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const { error } = await supabase
              .from('hogar_config')
              .update({ estado: nuevoEstado })
              .eq('id', hogarId);
            if (!error) setHogar((h: any) => ({ ...h, estado: nuevoEstado }));
          },
        },
      ]
    );
  }

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const estadoActual = hogar?.estado ?? 'activo';
  const estados = ['activo', 'trial', 'suspendido'].filter(e => e !== estadoActual);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>INFORMACIÓN DEL HOGAR</Text>
        <View style={styles.fila}><Text style={styles.label}>Nombre</Text><Text style={styles.valor}>{hogar?.nombre}</Text></View>
        <View style={styles.fila}><Text style={styles.label}>Slug</Text><Text style={styles.valor}>@{hogar?.slug}</Text></View>
        <View style={styles.fila}>
          <Text style={styles.label}>Estado</Text>
          <Text style={[styles.valor, { textTransform: 'uppercase', fontWeight: '700' }]}>{estadoActual}</Text>
        </View>
        <View style={styles.fila}><Text style={styles.label}>Ciudad</Text><Text style={styles.valor}>{hogar?.ciudad || '—'}</Text></View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>CAMBIAR ESTADO</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {estados.map(e => (
            <TouchableOpacity
              key={e}
              style={styles.btnEstado}
              onPress={() => cambiarEstado(e)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnEstadoTexto}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>USUARIOS ({usuarios.length})</Text>
        {usuarios.map(u => (
          <View key={u.id} style={styles.usuarioFila}>
            <MaterialCommunityIcons
              name={u.rol === 'admin' ? 'shield-account' : u.rol === 'aseo' ? 'broom' : 'account-heart'}
              size={20} color={COLORS.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.usuarioNombre}>{u.nombre} {u.apellido}</Text>
              <Text style={styles.usuarioMeta}>@{u.usuario} · {u.rol}</Text>
            </View>
            <View style={[styles.activoBadge, { backgroundColor: u.activo ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: u.activo ? '#2E7D32' : '#B71C1C' }}>
                {u.activo ? 'activo' : 'inactivo'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16 },
  seccion: {
    backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  seccionTitulo: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    color: COLORS.textSecondary, textTransform: 'uppercase',
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  valor: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  btnEstado: {
    flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.primary,
    paddingVertical: 10, alignItems: 'center',
  },
  btnEstadoTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },
  usuarioFila: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  usuarioNombre: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  usuarioMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  activoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});
