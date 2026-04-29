import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HistorialStackParamList, RegistroMedico } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { uploadImagen } from '../../lib/supabase';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<HistorialStackParamList, 'AgregarRegistro'>;
type TipoRegistro = RegistroMedico['tipo'];

const TIPOS: { valor: TipoRegistro; icono: string; color: string }[] = [
  { valor: 'Nota',          icono: 'note-text',   color: COLORS.primary },
  { valor: 'Diagnóstico',   icono: 'stethoscope', color: '#7B1FA2' },
  { valor: 'Procedimiento', icono: 'medical-bag', color: '#00695C' },
  { valor: 'Alergia',       icono: 'alert-circle', color: COLORS.danger },
  { valor: 'Observación',   icono: 'eye',          color: '#E65100' },
];

const MAX_FOTOS = 10;

function generarNombreFoto(): string {
  const now = new Date();
  const fecha = now.toISOString().slice(0, 10);
  const hora = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `registro_${fecha}_${hora}`;
}

export default function AgregarRegistroScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { agregarRegistro } = useApp();
  const { usuario } = useAuth();

  const [guardando, setGuardando] = useState(false);
  const [tipo, setTipo] = useState<TipoRegistro>('Nota');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const registradoPor = `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim();

  async function subirUri(uri: string) {
    setSubiendoFoto(true);
    try {
      const nombre = generarNombreFoto();
      const path = `${pacienteId}/registros/${nombre}.jpg`;
      const url = await uploadImagen(uri, 'pacientes', path);
      setFotoUrls(prev => [...prev, url]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  }

  function abrirOpciones() {
    if (subiendoFoto || fotoUrls.length >= MAX_FOTOS) return;
    Alert.alert('Agregar fotografía', '', [
      {
        text: 'Tomar foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) await subirUri(result.assets[0].uri);
        },
      },
      {
        text: 'Elegir de galería',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) await subirUri(result.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function quitarFoto(index: number) {
    setFotoUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleGuardar() {
    if (!titulo.trim() || !descripcion.trim()) {
      Alert.alert('Campos requeridos', 'El título y la descripción son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      await agregarRegistro({
        pacienteId,
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        registradoPor,
        fotoUrls,
      });
      Alert.alert('Guardado', 'El registro fue agregado correctamente.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intente nuevamente.');
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
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color="#7B1FA2" />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      <Text style={styles.subLabel}>Tipo de Registro</Text>
      <View style={styles.tiposGrid}>
        {TIPOS.map((t) => (
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
        label="Título *"
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Ej: Control de rutina, Fiebre detectada..."
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      <TextInput
        label="Descripción *"
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Describa en detalle el registro médico..."
        multiline
        numberOfLines={6}
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      {/* Fotos adjuntas */}
      <View style={styles.fotosHeader}>
        <Text style={styles.subLabel}>Fotografías adjuntas</Text>
        <Text style={styles.fotosContador}>{fotoUrls.length}/{MAX_FOTOS}</Text>
      </View>

      {fotoUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosScroll}>
          {fotoUrls.map((url, index) => (
            <View key={index} style={styles.fotoThumbContainer}>
              <Image source={{ uri: url }} style={styles.fotoThumb} resizeMode="cover" />
              <TouchableOpacity style={styles.fotoQuitar} onPress={() => quitarFoto(index)}>
                <MaterialCommunityIcons name="close-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {fotoUrls.length < MAX_FOTOS && (
        <TouchableOpacity
          style={styles.fotoBoton}
          onPress={abrirOpciones}
          disabled={subiendoFoto}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={subiendoFoto ? 'loading' : 'camera-plus'}
            size={28}
            color={COLORS.textSecondary}
          />
          <Text style={styles.fotoBotonTexto}>
            {subiendoFoto ? 'Subiendo foto...' : 'Agregar fotografía'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Registrado por — solo lectura */}
      <View style={styles.registradoPorContainer}>
        <MaterialCommunityIcons name="account-circle" size={20} color={COLORS.textSecondary} />
        <Text style={styles.registradoPorTexto}>
          Registrado por: <Text style={styles.registradoPorNombre}>{registradoPor}</Text>
        </Text>
      </View>

      <View style={styles.botones}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.botonCancelar}>
          Cancelar
        </Button>
        <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.botonGuardar}>
          Guardar Registro
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3E5F5', borderRadius: 10,
    padding: 12, gap: 8, marginBottom: 16,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#7B1FA2' },
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
  fotosHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fotosContador: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  fotosScroll: { marginBottom: 12 },
  fotoThumbContainer: {
    position: 'relative', marginRight: 10,
    borderRadius: 10, overflow: 'visible',
  },
  fotoThumb: { width: 100, height: 100, borderRadius: 10 },
  fotoQuitar: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: COLORS.white, borderRadius: 11,
  },
  fotoBoton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1.5, borderColor: COLORS.border,
    borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 20, marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  fotoBotonTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  registradoPorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 10,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  registradoPorTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  registradoPorNombre: { fontWeight: '700', color: COLORS.textPrimary },
  botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: '#7B1FA2' },
});
