import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AseoStackParamList, LimpiezaRegistro } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { uploadImagen } from '../../lib/supabase';
import { rutaFotoHabitacion } from '../../storage/limpiezas';

type Props = NativeStackScreenProps<AseoStackParamList, 'RegistrarLimpieza'>;
type TipoLimpieza = LimpiezaRegistro['tipo'];

const TIPOS: { valor: TipoLimpieza; icono: string; color: string }[] = [
  { valor: 'Habitación',  icono: 'bed',              color: COLORS.primary },
  { valor: 'Baño',        icono: 'shower',            color: '#00695C' },
  { valor: 'Zona común',  icono: 'sofa',              color: '#7B1FA2' },
  { valor: 'Pasillo',     icono: 'road-variant',      color: '#E65100' },
  { valor: 'Zona ropas',  icono: 'washing-machine',   color: '#0277BD' },
  { valor: 'Cocina',      icono: 'chef-hat',          color: '#C62828' },
  { valor: 'General',     icono: 'broom',             color: COLORS.textSecondary },
];

export default function RegistrarLimpiezaScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre, habitacion } = route.params;
  const { agregarLimpieza } = useApp();
  const { usuario } = useAuth();

  const [guardando, setGuardando] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [tipo, setTipo] = useState<TipoLimpieza>('Habitación');
  const [descripcion, setDescripcion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);

  const realizadoPor = `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim();

  function abrirOpciones() {
    if (fotosLocales.length >= 10) {
      Alert.alert('Límite alcanzado', 'Máximo 10 fotos por registro.');
      return;
    }
    Alert.alert('Agregar evidencia', 'Seleccione la fuente', [
      { text: 'Tomar foto', onPress: () => abrirFuente('camera') },
      { text: 'Desde galería', onPress: () => abrirFuente('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function abrirFuente(fuente: 'camera' | 'gallery') {
    const permiso = fuente === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso denegado', 'Se necesita permiso para acceder.');
      return;
    }
    const result = fuente === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: 10 - fotosLocales.length });
    if (!result.canceled) {
      const nuevas = result.assets.map(a => a.uri);
      setFotosLocales(prev => [...prev, ...nuevas].slice(0, 10));
    }
  }

  function quitarFoto(uri: string) {
    setFotosLocales(prev => prev.filter(f => f !== uri));
  }

  async function handleGuardar() {
    if (!descripcion.trim()) {
      Alert.alert('Campo requerido', 'La descripción es obligatoria.');
      return;
    }
    setGuardando(true);
    try {
      let fotoUrls: string[] = [];
      if (fotosLocales.length > 0) {
        setSubiendoFotos(true);
        const carpeta = rutaFotoHabitacion(habitacion, tipo);
        const ahora = new Date();
        const ts = `${String(ahora.getHours()).padStart(2,'0')}${String(ahora.getMinutes()).padStart(2,'0')}${String(ahora.getSeconds()).padStart(2,'0')}`;
        fotoUrls = await Promise.all(
          fotosLocales.map((uri, i) =>
            uploadImagen(uri, 'hogar', `${carpeta}/limpieza_${ts}_${i + 1}.jpg`)
          )
        );
        setSubiendoFotos(false);
      }
      await agregarLimpieza({ pacienteId, tipo, descripcion: descripcion.trim(), realizadoPor, observaciones: observaciones.trim(), fotoUrls });
      Alert.alert('Registrado', 'La limpieza fue registrada correctamente.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setSubiendoFotos(false);
      Alert.alert('Error', e?.message ?? 'No se pudo guardar. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={20}
    >
      {/* Habitación header */}
      <View style={styles.habitacionHeader}>
        <MaterialCommunityIcons name="door-closed" size={20} color={COLORS.primary} />
        <View>
          <Text style={styles.habitacionTexto}>Hab. {habitacion}</Text>
          <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
        </View>
      </View>

      {/* Tipo de limpieza */}
      <Text style={styles.subLabel}>Área limpiada</Text>
      <View style={styles.tiposGrid}>
        {TIPOS.map(t => (
          <View
            key={t.valor}
            style={[
              styles.tipoBoton,
              tipo === t.valor && { borderColor: t.color, backgroundColor: t.color + '15' },
            ]}
          >
            <MaterialCommunityIcons
              name={t.icono as any}
              size={22}
              color={tipo === t.valor ? t.color : COLORS.textSecondary}
              onPress={() => setTipo(t.valor)}
            />
            <Text
              style={[styles.tipoTexto, tipo === t.valor && { color: t.color, fontWeight: '700' }]}
              onPress={() => setTipo(t.valor)}
            >
              {t.valor}
            </Text>
          </View>
        ))}
      </View>

      <TextInput
        label="Descripción *"
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej: Limpieza completa de piso y superficies..."
        multiline
        numberOfLines={4}
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      <TextInput
        label="Observaciones"
        value={observaciones}
        onChangeText={setObservaciones}
        placeholder="Ej: Se usó desinfectante hospitalario..."
        multiline
        numberOfLines={3}
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      {/* Fotos de evidencia */}
      <Text style={styles.subLabel}>Evidencia fotográfica ({fotosLocales.length}/10)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosScroll}>
        {fotosLocales.map((uri, i) => (
          <View key={i} style={styles.fotoWrapper}>
            <Image source={{ uri }} style={styles.fotoThumb} />
            <TouchableOpacity style={styles.fotoEliminar} onPress={() => quitarFoto(uri)}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}
        {fotosLocales.length < 10 && (
          <TouchableOpacity style={styles.fotoAgregar} onPress={abrirOpciones}>
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={COLORS.textSecondary} />
            <Text style={styles.fotoAgregarTexto}>Agregar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Realizado por */}
      <View style={styles.realizadoPorContainer}>
        <MaterialCommunityIcons name="account-circle" size={20} color={COLORS.textSecondary} />
        <Text style={styles.realizadoPorTexto}>
          Realizado por: <Text style={styles.realizadoPorNombre}>{realizadoPor}</Text>
        </Text>
      </View>

      {subiendoFotos && (
        <View style={styles.subiendoRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.subiendoTexto}>Subiendo fotos...</Text>
        </View>
      )}

      <View style={styles.botones}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.botonCancelar}>
          Cancelar
        </Button>
        <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.botonGuardar}>
          Registrar
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  habitacionHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', borderRadius: 10,
    padding: 12, gap: 10, marginBottom: 16,
    borderWidth: 1, borderColor: '#90CAF9',
  },
  habitacionTexto: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  pacienteNombre: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  subLabel: {
    fontSize: FONT_SIZES.sm, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },
  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tipoBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  tipoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  fotosScroll: { marginBottom: 16 },
  fotoWrapper: { position: 'relative', marginRight: 8 },
  fotoThumb: { width: 80, height: 80, borderRadius: 8 },
  fotoEliminar: { position: 'absolute', top: -6, right: -6 },
  fotoAgregar: {
    width: 80, height: 80, borderRadius: 8,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  fotoAgregarTexto: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  realizadoPorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 10,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  realizadoPorTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  realizadoPorNombre: { fontWeight: '700', color: COLORS.textPrimary },
  subiendoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  subiendoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: COLORS.primary },
});
