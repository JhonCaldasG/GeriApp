import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MedicamentosStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import FirmaModal from '../../components/FirmaModal';
import HoraInicioSelector from '../../components/HoraInicioSelector';
import { COLORS, FONT_SIZES } from '../../theme';

function horasEntreDosisDe(frecuencia: string): number | null {
  const f = frecuencia.toLowerCase().trim();
  if (f.includes('4 hora')) return 4;
  if (f.includes('6 hora')) return 6;
  if (f.includes('8 hora')) return 8;
  if (f.includes('12 hora')) return 12;
  if (f === 'una vez al día' || f === 'una vez al dia') return 24;
  if (f.includes('dos veces')) return 12;
  if (f.includes('tres veces')) return 8;
  return null;
}

function formatear12h(hora24: string): string {
  const [h, m] = hora24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calcularHorasDosis(horaInicio: string, frecuencia: string): string[] {
  if (!horaInicio || !horaInicio.includes(':')) return [];
  const [h, m] = horaInicio.split(':').map(Number);
  const inicioMin = h * 60 + m;
  const intervalo = horasEntreDosisDe(frecuencia);
  if (!intervalo) return [horaInicio];
  const count = Math.round(24 / intervalo);
  return Array.from({ length: count }, (_, i) => {
    const total = (inicioMin + i * intervalo * 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  });
}

type Props = NativeStackScreenProps<MedicamentosStackParamList, 'AgregarMedicamento'>;

const FRECUENCIAS = [
  'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas',
  'Cada 12 horas', 'Una vez al día', 'Dos veces al día',
  'Tres veces al día', 'Según necesidad',
];

const VIAS = ['Oral', 'Intravenosa', 'Intramuscular', 'Subcutánea', 'Tópica', 'Inhalatoria', 'Sublingual'];

export default function AgregarMedicamentoScreen({ navigation, route }: Props) {
  const { pacienteId, pacienteNombre } = route.params;
  const { agregarMedicamento } = useApp();
  const { usuario } = useAuth();
  const [guardando, setGuardando] = useState(false);
  const [firmaVisible, setFirmaVisible] = useState(false);

  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [horario, setHorario] = useState('08:00');
  const [via, setVia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  function handleSolicitarFirma() {
    if (!nombre.trim() || !dosis.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y la dosis son obligatorios.');
      return;
    }
    setFirmaVisible(true);
  }

  async function handleGuardar(firmante: string) {
    setFirmaVisible(false);
    setGuardando(true);
    try {
      await agregarMedicamento({
        pacienteId,
        nombre: nombre.trim(),
        dosis: dosis.trim(),
        frecuencia: frecuencia.trim(),
        horario: horario.trim(),
        viaAdministracion: via.trim(),
        observaciones: observaciones.trim(),
        activo: true,
      });
      Alert.alert('Guardado', `Medicamento registrado.\nFirmado por: ${firmante}`, [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
    <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>
      <View style={styles.pacienteHeader}>
        <MaterialCommunityIcons name="account" size={20} color="#E65100" />
        <Text style={styles.pacienteNombre}>{pacienteNombre}</Text>
      </View>

      <TextInput
        label="Nombre del Medicamento *"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej: Enalapril, Metformina"
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />
      <TextInput
        label="Dosis *"
        value={dosis}
        onChangeText={setDosis}
        placeholder="Ej: 10 mg, 500 mg"
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      <Text style={styles.subLabel}>Frecuencia</Text>
      <View style={styles.chipGrid}>
        {FRECUENCIAS.map((f) => (
          <View
            key={f}
            style={[styles.chipOpcion, frecuencia === f && styles.chipOpcionSeleccionado]}
          >
            <Text
              style={[styles.chipTexto, frecuencia === f && styles.chipTextoSeleccionado]}
              onPress={() => setFrecuencia(frecuencia === f ? '' : f)}
            >
              {f}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        label="O escriba la frecuencia"
        value={frecuencia}
        onChangeText={setFrecuencia}
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      <HoraInicioSelector hora24={horario} onChange={setHorario} />
      {frecuencia ? (() => {
        const dosis = calcularHorasDosis(horario, frecuencia);
        if (dosis.length <= 1) return null;
        return (
          <View style={styles.dosisPreview}>
            <Text style={styles.dosisPreviewLabel}>Dosis calculadas</Text>
            {dosis.map((h, i) => (
              <Text key={i} style={styles.dosisPreviewHoras}>
                Dosis {i + 1}:  {formatear12h(h)}
              </Text>
            ))}
          </View>
        );
      })() : null}

      <Text style={styles.subLabel}>Vía de Administración</Text>
      <View style={styles.chipGrid}>
        {VIAS.map((v) => (
          <View key={v} style={[styles.chipOpcion, via === v && styles.chipOpcionSeleccionado]}>
            <Text
              style={[styles.chipTexto, via === v && styles.chipTextoSeleccionado]}
              onPress={() => setVia(via === v ? '' : v)}
            >
              {v}
            </Text>
          </View>
        ))}
      </View>

      <TextInput
        label="Observaciones"
        value={observaciones}
        onChangeText={setObservaciones}
        placeholder="Ej: Administrar con alimentos, monitorear presión..."
        multiline
        numberOfLines={3}
        style={styles.input}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
      />

      <View style={styles.botones}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.botonCancelar}>
          Cancelar
        </Button>
        <Button mode="contained" onPress={handleSolicitarFirma} loading={guardando} style={styles.botonGuardar} icon="draw-pen">
          Guardar y Firmar
        </Button>
      </View>
    </KeyboardAwareScrollView>

    <FirmaModal
      visible={firmaVisible}
      titulo="Registro de Medicamento"
      resumen={`Paciente: ${pacienteNombre}\nMedicamento: ${nombre} ${dosis}\nFrecuencia: ${frecuencia || 'No especificada'}\nVía: ${via || 'No especificada'}`}
      onConfirmar={handleGuardar}
      onCancelar={() => setFirmaVisible(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  pacienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  pacienteNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#E65100' },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  subLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chipOpcion: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  chipOpcionSeleccionado: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  chipTextoSeleccionado: { color: COLORS.white, fontWeight: '600' },
  botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: COLORS.primary },
  dosisPreview: {
    backgroundColor: '#E3F2FD', borderRadius: 10,
    padding: 10, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  dosisPreviewLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  dosisPreviewHoras: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
});
