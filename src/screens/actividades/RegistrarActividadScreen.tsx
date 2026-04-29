import React, { useState } from 'react';
import {
  View, StyleSheet, Alert, ScrollView,
  TouchableOpacity, Image,
} from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActividadesStackParamList, ActividadPaciente } from '../../types';
import { rutaFotoActividad } from '../../storage/actividades';
import { uploadImagen } from '../../lib/supabase';
import VisorFotoModal from '../../components/VisorFotoModal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<ActividadesStackParamList, 'RegistrarActividad'>;

const MAX_FOTOS = 6;

const TIPOS: { valor: ActividadPaciente['tipo']; icono: string; color: string; bg: string }[] = [
  { valor: 'Lúdica',     icono: 'puzzle',        color: '#E65100', bg: '#FFF3E0' },
  { valor: 'Taller',     icono: 'hammer-wrench', color: '#1565C0', bg: '#E3F2FD' },
  { valor: 'Recreativa', icono: 'soccer',        color: '#2E7D32', bg: '#E8F5E9' },
  { valor: 'Física',     icono: 'run',           color: '#AD1457', bg: '#FCE4EC' },
  { valor: 'Cultural',   icono: 'palette',       color: '#6A1B9A', bg: '#F3E5F5' },
  { valor: 'Social',     icono: 'account-group', color: '#00695C', bg: '#E0F2F1' },
  { valor: 'Otra',       icono: 'star-outline',  color: '#546E7A', bg: '#ECEFF1' },
];

export default function RegistrarActividadScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { agregarActividad } = useApp();
  const { usuario } = useAuth();

  const [tipo, setTipo] = useState<ActividadPaciente['tipo']>('Lúdica');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [visor, setVisor] = useState<{ indice: number } | null>(null);

  const firmante = `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim();

  async function seleccionarFotos() {
    if (fotosLocales.length >= MAX_FOTOS) {
      Alert.alert('Límite alcanzado', `Máximo ${MAX_FOTOS} fotos por actividad.`);
      return;
    }
    const restantes = MAX_FOTOS - fotosLocales.length;

    Alert.alert('Agregar evidencia', '¿Cómo desea agregar la foto?', [
      {
        text: 'Tomar foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            setFotosLocales(prev => [...prev, result.assets[0].uri]);
          }
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
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: restantes,
          });
          if (!result.canceled) {
            setFotosLocales(prev => [...prev, ...result.assets.map(a => a.uri)]);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function quitarFoto(index: number) {
    setFotosLocales(prev => prev.filter((_, i) => i !== index));
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Ingrese el nombre de la actividad.');
      return;
    }
    setGuardando(true);
    try {
      const fotoUrls = fotosLocales.length > 0
        ? await Promise.all(
            fotosLocales.map((uri, i) =>
              uploadImagen(uri, 'pacientes', rutaFotoActividad(pacienteId, i))
            )
          )
        : [];

      await agregarActividad({
        pacienteId,
        tipo,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        realizadoPor: firmante,
        fotoUrls,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Paciente */}
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={18} color={COLORS.primary} />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      {/* Tipo */}
      <Text style={styles.seccion}>Tipo de actividad</Text>
      <View style={styles.tiposGrid}>
        {TIPOS.map(t => {
          const activo = tipo === t.valor;
          return (
            <TouchableOpacity
              key={t.valor}
              style={[styles.tipoChip, { borderColor: t.color, backgroundColor: activo ? t.bg : COLORS.surface }]}
              onPress={() => setTipo(t.valor)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name={t.icono as any} size={20} color={t.color} />
              <Text style={[styles.tipoChipTexto, { color: t.color, fontWeight: activo ? '800' : '500' }]}>
                {t.valor}
              </Text>
              {activo && (
                <MaterialCommunityIcons name="check-circle" size={14} color={t.color} style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Nombre */}
      <Text style={styles.seccion}>Actividad</Text>
      <TextInput
        label="Nombre de la actividad *"
        value={nombre}
        onChangeText={setNombre}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
        style={styles.input}
        placeholder="Ej: Bingo, Tejido, Caminata en jardín"
      />

      {/* Descripción */}
      <TextInput
        label="Descripción (opcional)"
        value={descripcion}
        onChangeText={setDescripcion}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
        style={styles.input}
        multiline
        numberOfLines={3}
        placeholder="Detalles de la actividad, observaciones, participación..."
      />

      {/* Evidencia fotográfica */}
      <Text style={styles.seccion}>
        Evidencia fotográfica
        <Text style={styles.seccionOpcional}> (opcional)</Text>
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.fotosScroll}
        contentContainerStyle={styles.fotosContenido}
      >
        {fotosLocales.map((uri, i) => (
          <View key={i} style={styles.fotoContainer}>
            <TouchableOpacity onPress={() => setVisor({ indice: i })} activeOpacity={0.85}>
              <Image source={{ uri }} style={styles.fotoThumb} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fotoEliminar} onPress={() => quitarFoto(i)}>
              <MaterialCommunityIcons name="close-circle" size={22} color={COLORS.danger} />
            </TouchableOpacity>
            <View style={styles.fotoNumero}>
              <Text style={styles.fotoNumeroTexto}>{i + 1}</Text>
            </View>
          </View>
        ))}

        {fotosLocales.length < MAX_FOTOS && (
          <TouchableOpacity style={styles.fotoAgregar} onPress={seleccionarFotos} activeOpacity={0.7}>
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={COLORS.primary} />
            <Text style={styles.fotoAgregarTexto}>
              {fotosLocales.length === 0 ? 'Agregar foto' : 'Otra foto'}
            </Text>
            <Text style={styles.fotoAgregarContador}>{fotosLocales.length}/{MAX_FOTOS}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Registrado por */}
      <View style={styles.firmaRow}>
        <MaterialCommunityIcons name="account-check" size={18} color={COLORS.primary} />
        <Text style={styles.firmaTexto}>
          Registrado por: <Text style={{ fontWeight: '700' }}>{firmante || '—'}</Text>
        </Text>
      </View>

      {visor && (
        <VisorFotoModal
          fotos={fotosLocales}
          indiceInicial={visor.indice}
          onDismiss={() => setVisor(null)}
        />
      )}

      {/* Botones */}
      <View style={styles.botones}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.botonCancelar}
          disabled={guardando}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleGuardar}
          loading={guardando}
          disabled={guardando}
          style={styles.botonGuardar}
          icon={guardando && fotosLocales.length > 0 ? 'cloud-upload' : 'check'}
        >
          {guardando && fotosLocales.length > 0 ? 'Subiendo fotos...' : 'Guardar'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },

  pacienteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 20,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },

  seccion: {
    fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: 10, marginTop: 4,
  },
  seccionOpcional: { fontWeight: '400', color: COLORS.textSecondary },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tipoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tipoChipTexto: { fontSize: FONT_SIZES.sm },

  input: { marginBottom: 12, backgroundColor: COLORS.surface },

  // Fotos
  fotosScroll: { marginBottom: 16 },
  fotosContenido: { gap: 10, paddingVertical: 4 },
  fotoContainer: { position: 'relative' },
  fotoThumb: {
    width: 90, height: 90, borderRadius: 10,
  },
  fotoEliminar: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: COLORS.surface, borderRadius: 11,
  },
  fotoNumero: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  fotoNumeroTexto: { fontSize: 10, color: '#fff', fontWeight: '700' },
  fotoAgregar: {
    width: 90, height: 90, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: '#F0F7FF',
  },
  fotoAgregarTexto: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  fotoAgregarContador: { fontSize: 9, color: COLORS.textSecondary },

  firmaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginBottom: 24,
  },
  firmaTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  botones: { flexDirection: 'row', gap: 12 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: '#00695C' },
});
