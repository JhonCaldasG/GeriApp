import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, FAB, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Usuario } from '../../types';
import { obtenerUsuarios, guardarUsuario, eliminarUsuario, actualizarUsuario } from '../../storage/usuarios';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import AgregarUsuarioModal from './AgregarUsuarioModal';

export default function GestionUsuariosScreen() {
  const { usuario: usuarioActual, logout } = useAuth();
  const { colors } = useAppTheme();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);

  const cargar = async () => {
    const lista = await obtenerUsuarios();
    setUsuarios(lista);
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  function abrirEditar(u: Usuario) {
    setUsuarioEditar(u);
    setModalVisible(true);
  }

  function abrirNuevo() {
    setUsuarioEditar(null);
    setModalVisible(true);
  }

  function confirmarEliminar(u: Usuario) {
    if (u.id === usuarioActual?.id) {
      Alert.alert('Error', 'No puede eliminar su propio usuario.');
      return;
    }
    ejecutarEliminacion(`Eliminar Usuario`, `¿Eliminar a ${u.nombre} ${u.apellido}?`, async () => {
      await eliminarUsuario(u.id);
      await cargar();
    });
  }

  async function handleGuardar(datos: Omit<Usuario, 'id'>) {
    try {
      if (usuarioEditar) {
        await actualizarUsuario(usuarioEditar.id, datos);
      } else {
        await guardarUsuario(datos);
      }
      setModalVisible(false);
      setUsuarioEditar(null);
      cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.sesionCard}>
            <MaterialCommunityIcons name="account-circle" size={28} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sesionNombre}>{usuarioActual?.nombre} {usuarioActual?.apellido}</Text>
              <Text style={styles.sesionUsuario}>@{usuarioActual?.usuario}</Text>
              <Chip
                style={[styles.sesionChip, { backgroundColor: '#C9DFF7' }]}
                textStyle={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}
              >
                Administrador
              </Chip>
            </View>
            <IconButton icon="logout" onPress={logout} iconColor={COLORS.danger} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.usuarioCard, { backgroundColor: colors.surface }]}>
            <View style={styles.usuarioCardIzq}>
              <View style={[styles.rolIcono, {
                backgroundColor: item.rol === 'admin' ? '#E3F2FD' : item.rol === 'aseo' ? '#FFF3E0' : '#E8F5E9'
              }]}>
                <MaterialCommunityIcons
                  name={item.rol === 'admin' ? 'shield-account' : item.rol === 'aseo' ? 'broom' : 'account-heart'}
                  size={24}
                  color={item.rol === 'admin' ? COLORS.primary : item.rol === 'aseo' ? COLORS.warning : COLORS.secondaryLight}
                />
              </View>
              <View style={styles.usuarioInfo}>
                <Text style={styles.usuarioNombre}>{item.nombre} {item.apellido}</Text>
                <Text style={styles.usuarioLogin}>@{item.usuario}</Text>
                <Chip
                  style={[styles.chip, {
                    backgroundColor: item.rol === 'admin' ? '#E3F2FD' : item.rol === 'aseo' ? '#FFF3E0' : '#E8F5E9'
                  }]}
                  textStyle={{
                    color: item.rol === 'admin' ? COLORS.primary : item.rol === 'aseo' ? COLORS.warning : '#2E7D32',
                    fontSize: 12, fontWeight: '700',
                  }}
                >
                  {item.rol === 'admin' ? 'Administrador' : item.rol === 'aseo' ? 'Aseo' : 'Enfermero'}
                </Chip>
              </View>
            </View>
            <View style={styles.usuarioAcciones}>
              <IconButton
                icon="pencil-outline"
                iconColor={COLORS.primary}
                onPress={() => abrirEditar(item)}
              />
              {item.id !== 'admin-1' && (
                <IconButton
                  icon="delete-outline"
                  iconColor={COLORS.danger}
                  onPress={() => confirmarEliminar(item)}
                />
              )}
            </View>
          </View>
        )}
      />

      <AgregarUsuarioModal
        visible={modalVisible}
        onDismiss={() => { setModalVisible(false); setUsuarioEditar(null); }}
        onGuardar={handleGuardar}
        usuarioEditar={usuarioEditar}
      />

      <FAB icon="plus" label="Nuevo Usuario" style={styles.fab} onPress={abrirNuevo} />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  lista: { padding: 16, paddingBottom: 100 },
  sesionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  sesionNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  sesionUsuario: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  sesionChip: { alignSelf: 'flex-start', marginTop: 4 },
  usuarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    elevation: 1,
  },
  usuarioCardIzq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  usuarioAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rolIcono: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  usuarioInfo: { flex: 1, gap: 3 },
  usuarioNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  usuarioLogin: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  chip: { alignSelf: 'flex-start', marginTop: 6 },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: COLORS.primary },
});
