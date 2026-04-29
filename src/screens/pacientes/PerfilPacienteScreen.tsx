import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Text, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { PacientesStackParamList, Paciente } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useHogar } from '../../context/HogarContext';
import { calcularEdad, formatearFecha, inicialesdePaciente, obtenerPacientes } from '../../storage';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import HorariosSignosModal from '../../components/HorariosSignosModal';
import QRCodigoModal from '../../components/QRCodigoModal';
import FeedbackEliminar from '../../components/FeedbackEliminar';
import { useEliminar } from '../../hooks/useEliminar';
import { generarYCompartirPDF } from '../../utils/generarHistoriaClinica';
import { generarHojaHabitacion } from '../../utils/generarHojaHabitacion';

type Props = NativeStackScreenProps<PacientesStackParamList, 'PerfilPaciente'>;

function InfoRow({ label, valor }: { label: string; valor: string }) {
  if (!valor) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

function AccionBoton({ icono, label, color, onPress }: { icono: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.accionBoton, { borderColor: color }]} onPress={onPress}>
      <MaterialCommunityIcons name={icono as any} size={26} color={color} />
      <Text style={[styles.accionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PerfilPacienteScreen({ navigation, route }: Props) {
  const { pacienteId } = route.params;
  const { colors } = useAppTheme();
  const { eliminarPaciente, cargarHorarios, medicamentos, signosVitales, registros, administraciones,
          cargarMedicamentos, cargarSignos, cargarRegistros, cargarAdministraciones } = useApp();
  const { isAdmin } = useAuth();
  const { hogar } = useHogar();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [horariosVisible, setHorariosVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [generandoHoja, setGenerandoHoja] = useState(false);
  const qrRef = useRef<any>(null);

  useEffect(() => {
    const cargar = async () => {
      const lista = await obtenerPacientes();
      const encontrado = lista.find((p) => p.id === pacienteId) || null;
      setPaciente(encontrado);
    };
    cargarHorarios();
    const unsubscribe = navigation.addListener('focus', cargar);
    return unsubscribe;
  }, [pacienteId, navigation]);

  if (!paciente) {
    return (
      <View style={styles.cargando}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  const edad = calcularEdad(paciente.fechaNacimiento);
  const iniciales = inicialesdePaciente(paciente.nombre, paciente.apellido);

  function confirmarEliminar() {
    ejecutarEliminacion(
      'Eliminar Paciente',
      `¿Está seguro que desea eliminar a ${paciente!.nombre} ${paciente!.apellido}? Esta acción no se puede deshacer.`,
      async () => { await eliminarPaciente(paciente!.id); },
      () => navigation.goBack(),
    );
  }

  async function handleExportarPDF() {
    setGenerandoPDF(true);
    try {
      await Promise.all([
        cargarMedicamentos(pacienteId),
        cargarSignos(pacienteId),
        cargarRegistros(pacienteId),
        cargarAdministraciones(),
      ]);
      await generarYCompartirPDF(
        paciente!,
        hogar,
        medicamentos,
        signosVitales,
        registros,
        administraciones,
      );
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF. Intente nuevamente.');
    } finally {
      setGenerandoPDF(false);
    }
  }

  async function handleHojaHabitacion() {
    if (!qrRef.current) {
      Alert.alert('Error', 'No se pudo capturar el QR. Intente nuevamente.');
      return;
    }
    setGenerandoHoja(true);
    qrRef.current.toDataURL(async (data: string) => {
      try {
        await generarHojaHabitacion(
          paciente!,
          hogar,
          `data:image/png;base64,${data}`,
        );
      } catch {
        Alert.alert('Error', 'No se pudo generar la hoja. Intente nuevamente.');
      } finally {
        setGenerandoHoja(false);
      }
    });
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Avatar y nombre */}
      <View style={styles.header}>
        {paciente.fotoUri ? (
          <Image source={{ uri: paciente.fotoUri }} style={styles.avatarFoto} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>
        )}
        <Text style={styles.nombre}>{paciente.apellido}, {paciente.nombre}</Text>
        <Text style={styles.subNombre}>{edad} años  •  Hab. {paciente.habitacion || 'Sin asignar'}</Text>
        {paciente.riesgoCaida && (
          <View style={[styles.alertaAlergia, styles.alertaCaida]}>
            <MaterialCommunityIcons name="walk" size={16} color="#E65100" />
            <Text style={[styles.alertaAlergiaTexto, { color: '#E65100' }]}>Riesgo de caída</Text>
          </View>
        )}
        {paciente.alergias ? (
          <View style={styles.alertaAlergia}>
            <MaterialCommunityIcons name="alert" size={16} color={COLORS.danger} />
            <Text style={styles.alertaAlergiaTexto}>Alergias: {paciente.alergias}</Text>
          </View>
        ) : null}
      </View>

      {/* Acciones rápidas */}
      <Text style={styles.seccion}>Acciones Rápidas</Text>
      <View style={styles.acciones}>
        <AccionBoton
          icono="heart-pulse"
          label="Signos Vitales"
          color={COLORS.danger}
          onPress={() => (navigation.getParent() as any)?.navigate('SignosVitales', {
            screen: 'HistorialSignos',
            params: { pacienteId: paciente.id, pacienteNombre: `${paciente.nombre} ${paciente.apellido}` },
          })}
        />
        <AccionBoton
          icono="pill"
          label="Medicamentos"
          color={COLORS.warningLight}
          onPress={() => (navigation.getParent() as any)?.navigate('Medicamentos', {
            screen: 'ListaMedicamentos',
            params: { pacienteId: paciente.id, pacienteNombre: `${paciente.nombre} ${paciente.apellido}` },
          })}
        />
        <AccionBoton
          icono="clipboard-text"
          label="Historial"
          color="#7B1FA2"
          onPress={() => (navigation.getParent() as any)?.navigate('Historial', {
            screen: 'ListaHistorial',
            params: { pacienteId: paciente.id, pacienteNombre: `${paciente.nombre} ${paciente.apellido}` },
          })}
        />
        {isAdmin && (
          <AccionBoton
            icono="clock-edit-outline"
            label="Horarios"
            color={COLORS.primary}
            onPress={() => setHorariosVisible(true)}
          />
        )}
        {isAdmin && (
          <AccionBoton
            icono="account-edit"
            label="Editar"
            color={COLORS.primary}
            onPress={() => navigation.navigate('AgregarPaciente', { pacienteId: paciente.id })}
          />
        )}
        <AccionBoton
          icono="note-text-outline"
          label="Notas Enf."
          color="#1565C0"
          onPress={() => navigation.navigate('NotasEnfermeria', {
            pacienteId: paciente.id,
            pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
          })}
        />
        <AccionBoton
          icono="human-wheelchair"
          label="Barthel / Braden"
          color="#6A1B9A"
          onPress={() => navigation.navigate('EvaluacionClinica', {
            pacienteId: paciente.id,
            pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
          })}
        />
        <AccionBoton
          icono="food"
          label="Dieta"
          color="#2E7D32"
          onPress={() => navigation.navigate('Dieta', {
            pacienteId: paciente.id,
            pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
          })}
        />
        <AccionBoton
          icono="human-handsdown"
          label="Incidentes"
          color="#E65100"
          onPress={() => navigation.navigate('Incidentes', {
            pacienteId: paciente.id,
            pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
          })}
        />
        <AccionBoton
          icono="calendar-remove"
          label="Ausencias"
          color="#1565C0"
          onPress={() => navigation.navigate('Ausencias', {
            pacienteId: paciente.id,
            pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
          })}
        />
        <AccionBoton
          icono="qrcode"
          label="Ver QR"
          color={COLORS.textSecondary}
          onPress={() => setQrVisible(true)}
        />
        {isAdmin && (
          <AccionBoton
            icono="printer"
            label="Hoja habitación"
            color="#00796B"
            onPress={handleHojaHabitacion}
          />
        )}
      </View>

      {/* QR oculto para captura en PDF */}
      <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <QRCode
          value={`hogargeriatrico://paciente/${paciente.id}`}
          size={200}
          getRef={(ref) => { qrRef.current = ref; }}
        />
      </View>

      <HorariosSignosModal
        visible={horariosVisible}
        pacienteId={paciente.id}
        pacienteNombre={`${paciente.nombre} ${paciente.apellido}`}
        onDismiss={() => setHorariosVisible(false)}
      />

      <QRCodigoModal
        visible={qrVisible}
        paciente={paciente}
        onDismiss={() => setQrVisible(false)}
      />

      {/* Datos personales — solo admin */}
      {isAdmin && (
        <>
          <Text style={styles.seccion}>Datos Personales</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <InfoRow label="Identificación" valor={paciente.dni} />
            <Divider style={styles.rowDivider} />
            <InfoRow label="Fecha de Nacimiento" valor={formatearFecha(paciente.fechaNacimiento)} />
            <Divider style={styles.rowDivider} />
            <InfoRow label="Edad" valor={`${edad} años`} />
            {paciente.fechaIngreso && (
              <>
                <Divider style={styles.rowDivider} />
                <InfoRow label="Fecha de Ingreso" valor={formatearFecha(paciente.fechaIngreso)} />
                <Divider style={styles.rowDivider} />
                <InfoRow
                  label="Días de estancia"
                  valor={`${Math.max(0, Math.floor((Date.now() - new Date(paciente.fechaIngreso).getTime()) / 86400000))} días`}
                />
              </>
            )}
          </View>
        </>
      )}

      {/* Información médica */}
      <Text style={styles.seccion}>Información Médica</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <InfoRow label="Diagnóstico Principal" valor={paciente.diagnosticoPrincipal} />
        {isAdmin && (
          <>
            <Divider style={styles.rowDivider} />
            <InfoRow label="Alergias" valor={paciente.alergias} />
            <Divider style={styles.rowDivider} />
            <InfoRow label="Tipo de Afiliación" valor={paciente.obraSocial} />
            <Divider style={styles.rowDivider} />
            <InfoRow label="EPS" valor={paciente.eps} />
            <Divider style={styles.rowDivider} />
            <InfoRow label="Médico Responsable" valor={paciente.medicoResponsable} />
          </>
        )}
      </View>

      {/* Contacto familiar — solo admin */}
      {isAdmin && (paciente.contactoFamiliar.nombre || paciente.contactoFamiliar.telefono) && (
        <>
          <Text style={styles.seccion}>Contacto Familiar</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <InfoRow label="Nombre" valor={paciente.contactoFamiliar.nombre} />
            <Divider style={styles.rowDivider} />
            <InfoRow label="Teléfono" valor={paciente.contactoFamiliar.telefono} />
            <Divider style={styles.rowDivider} />
            <InfoRow label="Relación" valor={paciente.contactoFamiliar.relacion} />
          </View>
        </>
      )}

      {isAdmin && (
        <View style={styles.botonesAdmin}>
          <Button
            mode="contained"
            onPress={handleExportarPDF}
            loading={generandoPDF}
            disabled={generandoPDF}
            style={styles.botonPDF}
            icon="file-pdf-box"
          >
            {generandoPDF ? 'Generando...' : 'Exportar Historia Clínica'}
          </Button>
          <Button
            mode="outlined"
            onPress={confirmarEliminar}
            textColor={COLORS.danger}
            style={styles.botonEliminar}
            icon="delete"
          >
            Eliminar Paciente
          </Button>
        </View>
      )}
      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 20, gap: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { color: COLORS.white, fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  avatarFoto: { width: 80, height: 80, borderRadius: 40, marginBottom: 4 },
  nombre: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
  subNombre: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  alertaAlergia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  alertaAlergiaTexto: { color: COLORS.danger, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  alertaCaida: { backgroundColor: '#FFF8E1' },
  seccion: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  accionBoton: {
    width: '30%',
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 6,
    backgroundColor: COLORS.surface,
  },
  accionLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, flex: 1 },
  infoValor: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600', flex: 2, textAlign: 'right' },
  rowDivider: { backgroundColor: COLORS.border },
  botonesAdmin: { gap: 8, marginTop: 8 },
  botonPDF: { backgroundColor: COLORS.primary },
  botonEliminar: { borderColor: COLORS.danger },
});
