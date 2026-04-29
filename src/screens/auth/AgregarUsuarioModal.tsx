import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RolUsuario, Usuario } from '../../types';
import { COLORS, FONT_SIZES } from '../../theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onGuardar: (datos: Omit<Usuario, 'id'>) => Promise<void>;
  usuarioEditar?: Usuario | null;
}

export default function AgregarUsuarioModal({ visible, onDismiss, onGuardar, usuarioEditar }: Props) {
  const editando = !!usuarioEditar;

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [usuarioStr, setUsuarioStr] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [rol, setRol] = useState<RolUsuario>('enfermero');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      if (usuarioEditar) {
        setNombre(usuarioEditar.nombre);
        setApellido(usuarioEditar.apellido);
        setUsuarioStr(usuarioEditar.usuario);
        setPassword('');
        setRol(usuarioEditar.rol);
      } else {
        setNombre(''); setApellido(''); setUsuarioStr(''); setPassword(''); setRol('enfermero');
      }
      setVerPassword(false);
    }
  }, [visible, usuarioEditar]);

  async function handleGuardar() {
    if (!nombre.trim() || !usuarioStr.trim()) return;
    if (!editando && !password.trim()) return;
    setGuardando(true);
    const datos: Omit<Usuario, 'id'> = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      usuario: usuarioStr.trim(),
      password: password.trim() || (usuarioEditar?.password ?? ''),
      rol,
      activo: true,
    };
    await onGuardar(datos);
    setGuardando(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.titulo}>{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>
            <TouchableOpacity onPress={onDismiss}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              label="Nombre *"
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            <TextInput
              label="Apellido"
              value={apellido}
              onChangeText={setApellido}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            <TextInput
              label="Usuario *"
              value={usuarioStr}
              onChangeText={setUsuarioStr}
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            <TextInput
              label={editando ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!verPassword}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              right={
                <TextInput.Icon
                  icon={verPassword ? 'eye-off' : 'eye'}
                  onPress={() => setVerPassword(!verPassword)}
                />
              }
            />

            {!editando && (
              <>
                <Text style={styles.rolLabel}>Rol</Text>
                <View style={styles.roles}>
                  {(['admin', 'enfermero', 'aseo'] as RolUsuario[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.rolBoton, rol === r && styles.rolBotonActivo]}
                      onPress={() => setRol(r)}
                    >
                      <MaterialCommunityIcons
                        name={r === 'admin' ? 'shield-account' : r === 'aseo' ? 'broom' : 'account-heart'}
                        size={22}
                        color={rol === r ? COLORS.white : COLORS.textSecondary}
                      />
                      <Text style={[styles.rolTexto, rol === r && styles.rolTextoActivo]}>
                        {r === 'admin' ? 'Administrador' : r === 'aseo' ? 'Aseo' : 'Enfermero'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.botones}>
              <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>Cancelar</Button>
              <Button
                mode="contained"
                onPress={handleGuardar}
                loading={guardando}
                style={[styles.botonGuardar, { flex: 2 }]}
                icon={editando ? 'content-save' : 'account-plus'}
              >
                {editando ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  input: { marginBottom: 10, backgroundColor: COLORS.surface },
  rolLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  roles: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  rolBoton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, padding: 14, backgroundColor: COLORS.background },
  rolBotonActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rolTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
  rolTextoActivo: { color: COLORS.white },
  botones: { flexDirection: 'row', gap: 10 },
  botonGuardar: { backgroundColor: COLORS.primary },
});
