import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useHogar } from '../../context/HogarContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase, uploadImagen } from '../../lib/supabase';
import { HogarInfo } from '../../storage/hogar';
import { COLORS, FONT_SIZES } from '../../theme';
import { Switch } from 'react-native';

export default function ConfiguracionHogarScreen() {
  const { hogar, actualizarHogar } = useHogar();
  const { isDark, toggleTheme, colors } = useAppTheme();
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);

  useEffect(() => {
    setNombre(hogar.nombre);
    setDireccion(hogar.direccion);
    setTelefono(hogar.telefono);
    setEmail(hogar.email);
    setCiudad(hogar.ciudad);
    setProvincia(hogar.provincia);
    setLogoUri(hogar.logoUri);
  }, [hogar]);

  async function seleccionarFoto() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar el logo.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      const uri = resultado.assets[0].uri;
      try {
        const path = `logo/logo_${Date.now()}.jpg`;
        const url = await uploadImagen(uri, 'hogar', path);
        setLogoUri(url);
      } catch {
        Alert.alert('Error', 'No se pudo subir el logo.');
      }
    }
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre del hogar es obligatorio.');
      return;
    }
    setGuardando(true);
    const info: HogarInfo = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      ciudad: ciudad.trim(),
      provincia: provincia.trim(),
      logoUri,
    };
    await actualizarHogar(info);
    setGuardando(false);
    Alert.alert('Guardado', 'La información del hogar fue actualizada correctamente.');
  }

  return (
    <KeyboardAwareScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

        {/* Logo */}
        <Text style={styles.seccion}>Logo del Hogar</Text>
        <View style={styles.logoContainer}>
          <TouchableOpacity style={styles.logoBoton} onPress={seleccionarFoto}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImagen} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={36} color={COLORS.textSecondary} />
                <Text style={styles.logoTexto}>Subir logo</Text>
              </View>
            )}
          </TouchableOpacity>
          {logoUri && (
            <Button
              mode="text"
              onPress={() => setLogoUri(null)}
              textColor={COLORS.danger}
              compact
            >
              Quitar logo
            </Button>
          )}
        </View>

        {/* Datos del hogar */}
        <Text style={styles.seccion}>Información del Hogar</Text>

        <TextInput
          label="Nombre del Hogar *"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej: Hogar San José"
          style={styles.input}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          left={<TextInput.Icon icon="hospital-building" />}
        />
        <TextInput
          label="Dirección"
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Ej: Av. Corrientes 1234"
          style={styles.input}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          left={<TextInput.Icon icon="map-marker" />}
        />
        <View style={styles.fila}>
          <TextInput
            label="Ciudad"
            value={ciudad}
            onChangeText={setCiudad}
            style={[styles.input, { flex: 1 }]}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />
          <TextInput
            label="Provincia"
            value={provincia}
            onChangeText={setProvincia}
            style={[styles.input, { flex: 1 }]}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />
        </View>
        <TextInput
          label="Teléfono"
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          placeholder="Ej: 011-4567-8901"
          style={styles.input}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          left={<TextInput.Icon icon="phone" />}
        />
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Ej: contacto@hogar.com"
          style={styles.input}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          left={<TextInput.Icon icon="email" />}
        />

        <Button
          mode="contained"
          onPress={handleGuardar}
          loading={guardando}
          style={styles.botonGuardar}
          contentStyle={{ height: 52 }}
          icon="content-save"
        >
          Guardar Cambios
        </Button>

        {/* Modo nocturno */}
        <View style={[styles.temaCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name={isDark ? 'weather-night' : 'weather-sunny'} size={22} color={isDark ? '#7B1FA2' : '#E65100'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.temaTitulo}>Modo nocturno</Text>
            <Text style={styles.temaSubtitulo}>{isDark ? 'Tema oscuro activo' : 'Tema claro activo'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: COLORS.border, true: '#7B1FA2' }}
            thumbColor={isDark ? '#CE93D8' : COLORS.surface}
          />
        </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  seccion: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  logoContainer: { alignItems: 'center', marginBottom: 24, gap: 8 },
  logoBoton: {
    width: 130,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  logoImagen: { width: '100%', height: '100%', borderRadius: 14 },
  logoPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  input: { marginBottom: 10, backgroundColor: COLORS.surface },
  fila: { flexDirection: 'row', gap: 10 },
  botonGuardar: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 10 },
  temaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, marginTop: 16, elevation: 1,
  },
  temaTitulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  temaSubtitulo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
});
