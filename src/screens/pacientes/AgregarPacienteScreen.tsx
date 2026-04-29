import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Divider, Switch } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uploadImagen } from '../../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PacientesStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { obtenerPacientes } from '../../storage';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<PacientesStackParamList, 'AgregarPaciente'>;

function Campo({ label, value, onChangeText, placeholder, keyboardType, multiline, required }: any) {
  return (
    <TextInput
      label={label + (required ? ' *' : '')}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      style={styles.input}
      mode="outlined"
      outlineColor={COLORS.border}
      activeOutlineColor={COLORS.primary}
    />
  );
}

export default function AgregarPacienteScreen({ navigation, route }: Props) {
  const { agregarPaciente, actualizarPaciente } = useApp();
  const { colors } = useAppTheme();
  const pacienteId = route.params?.pacienteId;
  const modoEdicion = !!pacienteId;

  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [dni, setDni] = useState('');
  const [habitacion, setHabitacion] = useState('');
  const [diagnosticoPrincipal, setDiagnosticoPrincipal] = useState('');
  const [alergias, setAlergias] = useState('');
  const [obraSocial, setObraSocial] = useState('');
  const [eps, setEps] = useState('');
  const [medicoResponsable, setMedicoResponsable] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoRelacion, setContactoRelacion] = useState('');
  const [fotoUri, setFotoUri] = useState<string | undefined>(undefined);
  const [riesgoCaida, setRiesgoCaida] = useState(false);
  const [fallecido, setFallecido] = useState(false);
  const [fechaFallecimiento, setFechaFallecimiento] = useState('');
  const hoyFormato = (() => { const d = new Date(); const dd = String(d.getDate()).padStart(2,'0'); const mm = String(d.getMonth()+1).padStart(2,'0'); return `${dd}/${mm}/${d.getFullYear()}`; })();
  const [fechaIngreso, setFechaIngreso] = useState(modoEdicion ? '' : hoyFormato);

  // Precargar datos si es edición
  useEffect(() => {
    if (!pacienteId) return;
    obtenerPacientes().then(lista => {
      const p = lista.find(x => x.id === pacienteId);
      if (!p) return;
      setNombre(p.nombre);
      setApellido(p.apellido);
      setDni(p.dni);
      setHabitacion(p.habitacion);
      setDiagnosticoPrincipal(p.diagnosticoPrincipal);
      setAlergias(p.alergias);
      setObraSocial(p.obraSocial);
      setEps(p.eps ?? '');
      setMedicoResponsable(p.medicoResponsable);
      setContactoNombre(p.contactoFamiliar?.nombre ?? '');
      setContactoTelefono(p.contactoFamiliar?.telefono ?? '');
      setContactoRelacion(p.contactoFamiliar?.relacion ?? '');
      setFotoUri(p.fotoUri);
      setRiesgoCaida(p.riesgoCaida ?? false);
      setFallecido(p.fallecido ?? false);
      if (p.fechaFallecimiento) {
        const [y, m, d] = p.fechaFallecimiento.slice(0, 10).split('-');
        setFechaFallecimiento(`${d}/${m}/${y}`);
      }
      if (p.fechaIngreso) {
        const [y, m, d] = p.fechaIngreso.slice(0, 10).split('-');
        setFechaIngreso(`${d}/${m}/${y}`);
      }
      if (p.fechaNacimiento) {
        const [y, m, d] = p.fechaNacimiento.slice(0, 10).split('-');
        setFechaNacimiento(`${d}/${m}/${y}`);
      }
    });
  }, [pacienteId]);

  async function seleccionarFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar una foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
    }
  }

  function autoFormatearFecha(texto: string): string {
    const soloNumeros = texto.replace(/\D/g, '').slice(0, 8);
    if (soloNumeros.length <= 2) return soloNumeros;
    if (soloNumeros.length <= 4) return `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2)}`;
    return `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2, 4)}/${soloNumeros.slice(4)}`;
  }

  function validarFecha(texto: string): boolean {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(texto)) return false;
    const [dia, mes, anio] = texto.split('/').map(Number);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
    const fecha = new Date(anio, mes - 1, dia);
    return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  }

  function parsearFecha(texto: string): string {
    const [dia, mes, anio] = texto.split('/');
    return new Date(Number(anio), Number(mes) - 1, Number(dia)).toISOString();
  }

  async function handleGuardar() {
    if (!nombre.trim() || !apellido.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y apellido son obligatorios.');
      return;
    }
    if (fechaNacimiento && !validarFecha(fechaNacimiento)) {
      Alert.alert('Fecha inválida', 'Ingrese la fecha en formato DD/MM/AAAA.');
      return;
    }

    const datos = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      fechaNacimiento: fechaNacimiento ? parsearFecha(fechaNacimiento) : new Date(1950, 0, 1).toISOString(),
      dni: dni.trim(),
      habitacion: habitacion.trim(),
      diagnosticoPrincipal: diagnosticoPrincipal.trim(),
      alergias: alergias.trim(),
      obraSocial: obraSocial.trim(),
      eps: eps.trim(),
      medicoResponsable: medicoResponsable.trim(),
      contactoFamiliar: {
        nombre: contactoNombre.trim(),
        telefono: contactoTelefono.trim(),
        relacion: contactoRelacion.trim(),
      },
      fotoUri,
      riesgoCaida,
      fallecido,
      fechaFallecimiento: fallecido && fechaFallecimiento && validarFecha(fechaFallecimiento)
        ? parsearFecha(fechaFallecimiento)
        : fallecido ? null : null,
      fechaIngreso: fechaIngreso && validarFecha(fechaIngreso)
        ? parsearFecha(fechaIngreso)
        : null,
    };

    setGuardando(true);
    try {
      if (modoEdicion) {
        let urlFinal = fotoUri;
        // Subir foto si es una URI local nueva
        if (fotoUri && fotoUri.startsWith('file://')) {
          urlFinal = await uploadImagen(
            fotoUri,
            'pacientes',
            `${pacienteId}/perfil/foto_${Date.now()}.jpg`
          );
        }
        await actualizarPaciente(pacienteId!, { ...datos, fotoUri: urlFinal ?? undefined });
        Alert.alert('Actualizado', 'Los datos del paciente fueron actualizados correctamente.', [
          { text: 'Aceptar', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Crear paciente sin foto primero para obtener el ID
        const nuevoPaciente = await agregarPaciente({ ...datos, fotoUri: undefined });
        let urlFinal: string | undefined;
        if (fotoUri && fotoUri.startsWith('file://')) {
          urlFinal = await uploadImagen(
            fotoUri,
            'pacientes',
            `${nuevoPaciente.id}/perfil/foto_${Date.now()}.jpg`
          );
          await actualizarPaciente(nuevoPaciente.id, { fotoUri: urlFinal });
        }
        Alert.alert('Guardado', 'El paciente fue registrado correctamente.', [
          { text: 'Aceptar', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={20}
    >
      <Text style={styles.seccion}>Datos Personales</Text>

      {/* Foto del paciente */}
      <View style={styles.fotoContainer}>
        <TouchableOpacity style={styles.fotoBoton} onPress={seleccionarFoto}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
          ) : (
            <View style={styles.fotoPlaceholder}>
              <MaterialCommunityIcons name="camera-plus" size={36} color={COLORS.textSecondary} />
              <Text style={styles.fotoPlaceholderTexto}>Foto del paciente</Text>
            </View>
          )}
        </TouchableOpacity>
        {fotoUri && (
          <TouchableOpacity onPress={() => setFotoUri(undefined)} style={styles.fotoEliminar}>
            <MaterialCommunityIcons name="close-circle" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      <Campo label="Nombre" value={nombre} onChangeText={setNombre} required />
      <Campo label="Apellido" value={apellido} onChangeText={setApellido} required />
      <Campo
        label="Fecha de Nacimiento (DD/MM/AAAA)"
        value={fechaNacimiento}
        onChangeText={(t: string) => setFechaNacimiento(autoFormatearFecha(t))}
        keyboardType="numeric"
        placeholder="01/01/1940"
      />
      <Campo label="Identificación" value={dni} onChangeText={setDni} keyboardType="numeric" />
      <Campo label="Habitación / Cama" value={habitacion} onChangeText={setHabitacion} placeholder="Ej: 101-A" />
      <Campo
        label="Fecha de Ingreso (DD/MM/AAAA)"
        value={fechaIngreso}
        onChangeText={(t: string) => setFechaIngreso(autoFormatearFecha(t))}
        keyboardType="numeric"
        placeholder="01/01/2024"
      />

      <Divider style={styles.divider} />
      <Text style={styles.seccion}>Información Médica</Text>
      <Campo label="Diagnóstico Principal" value={diagnosticoPrincipal} onChangeText={setDiagnosticoPrincipal} multiline />
      <Campo label="Alergias Conocidas" value={alergias} onChangeText={setAlergias} placeholder="Ej: Penicilina, Ibuprofeno" />

      {/* Riesgo de caída */}
      <View style={[styles.switchRow, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Riesgo de caída</Text>
          <Text style={styles.switchSub}>Se mostrará como alerta en la hoja de habitación</Text>
        </View>
        <Switch
          value={riesgoCaida}
          onValueChange={setRiesgoCaida}
          color={COLORS.danger}
        />
      </View>
      <Campo label="Tipo de Afiliación" value={obraSocial} onChangeText={setObraSocial} />
      <Campo label="EPS" value={eps} onChangeText={setEps} />
      <Campo label="Médico Responsable" value={medicoResponsable} onChangeText={setMedicoResponsable} />

      <Divider style={styles.divider} />
      <Text style={styles.seccion}>Contacto Familiar</Text>
      <Campo label="Nombre del Familiar" value={contactoNombre} onChangeText={setContactoNombre} />
      <Campo label="Teléfono" value={contactoTelefono} onChangeText={setContactoTelefono} keyboardType="phone-pad" />
      <Campo label="Relación (Ej: Hijo, Hija)" value={contactoRelacion} onChangeText={setContactoRelacion} />

      <Divider style={styles.divider} />
      <Text style={styles.seccion}>Estado del Paciente</Text>
      <View style={[styles.switchRow, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Paciente fallecido</Text>
          <Text style={styles.switchSub}>Se ocultará de la vista de enfermeros</Text>
        </View>
        <Switch
          value={fallecido}
          onValueChange={(v) => { setFallecido(v); if (!v) setFechaFallecimiento(''); }}
          color="#555"
        />
      </View>
      {fallecido && (
        <Campo
          label="Fecha de Fallecimiento (DD/MM/AAAA)"
          value={fechaFallecimiento}
          onChangeText={(t: string) => setFechaFallecimiento(autoFormatearFecha(t))}
          keyboardType="numeric"
          placeholder="01/01/2024"
        />
      )}

      <View style={styles.botones}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.botonCancelar}>
          Cancelar
        </Button>
        <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.botonGuardar}>
          {modoEdicion ? 'Guardar Cambios' : 'Guardar Paciente'}
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  seccion: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    marginTop: 4,
  },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  divider: { marginVertical: 16 },
  botones: { flexDirection: 'row', gap: 12, marginTop: 24 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: COLORS.primary },
  fotoContainer: { alignItems: 'center', marginBottom: 16, position: 'relative' },
  fotoBoton: { borderRadius: 70, overflow: 'hidden' },
  fotoPreview: { width: 120, height: 120, borderRadius: 60 },
  fotoPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.background,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  fotoPlaceholderTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },
  fotoEliminar: { position: 'absolute', top: 0, right: '35%' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 12, gap: 12,
  },
  switchLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  switchSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
});
