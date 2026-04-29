import React, { useEffect, useState } from 'react';
import { View, SectionList, StyleSheet, TextInput, Alert } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PacientesStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import PacienteCard from '../../components/PacienteCard';
import EmptyState from '../../components/EmptyState';
import QRScannerModal from '../../components/QRScannerModal';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<PacientesStackParamList, 'ListaPacientes'>;

export default function ListaPacientesScreen({ navigation, route }: Props) {
  const destino = route.params?.destino;
  const { pacientes, cargarPacientes, cargando } = useApp();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const [busqueda, setBusqueda] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarPacientes);
    return unsubscribe;
  }, [navigation]);

  const filtrados = pacientes.filter((p) => {
    const texto = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(texto) ||
      p.apellido.toLowerCase().includes(texto) ||
      p.habitacion.toLowerCase().includes(texto) ||
      p.dni.includes(texto)
    );
  });

  const activos = filtrados.filter(p => !p.fallecido);
  const fallecidos = isAdmin ? filtrados.filter(p => p.fallecido) : [];

  const secciones = [
    { title: '', data: activos },
    ...(isAdmin && fallecidos.length > 0 ? [{ title: 'Fallecidos / Inactivos', data: fallecidos }] : []),
  ];

  function handleEscaneo(data: string) {
    setScannerVisible(false);
    const match = data.match(/hogargeriatrico:\/\/paciente\/(.+)/);
    const pacienteId = match ? match[1] : data;
    const paciente = pacientes.find(p => p.id === pacienteId);
    if (paciente) {
      navigation.navigate('PerfilPaciente', { pacienteId: paciente.id });
    } else {
      Alert.alert(
        'QR no reconocido',
        'El código escaneado no corresponde a ningún paciente registrado.',
        [{ text: 'Aceptar' }]
      );
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Buscador + botón QR */}
      <View style={styles.busquedaRow}>
        <View style={[styles.buscadorContainer, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textSecondary} style={styles.buscadorIcono} />
          <TextInput
            style={styles.buscador}
            placeholder="Buscar por nombre, habitación o Identificación..."
            placeholderTextColor={COLORS.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={COLORS.textSecondary}
              onPress={() => setBusqueda('')}
            />
          )}
        </View>
        <View
          style={styles.qrBtn}
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => setScannerVisible(true)}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={26} color={COLORS.primary} />
        </View>
      </View>

      {/* Contador */}
      {pacientes.length > 0 && (
        <Text style={styles.contador}>
          {activos.length} activo{activos.length !== 1 ? 's' : ''}
          {isAdmin && fallecidos.length > 0 ? `  •  ${fallecidos.length} fallecido${fallecidos.length !== 1 ? 's' : ''}` : ''}
        </Text>
      )}

      {/* Lista */}
      <SectionList
        sections={secciones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PacienteCard
            paciente={item}
            onPress={() => {
              if (destino === 'NotasEnfermeria') {
                navigation.navigate('NotasEnfermeria', {
                  pacienteId: item.id,
                  pacienteNombre: `${item.nombre} ${item.apellido}`,
                });
              } else {
                navigation.navigate('PerfilPaciente', { pacienteId: item.id });
              }
            }}
          />
        )}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.seccionHeader}>
              <MaterialCommunityIcons name="flower-outline" size={16} color="#888" />
              <Text style={styles.seccionHeaderTexto}>{section.title}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          cargando ? null : (
            <EmptyState
              icono="account-group-outline"
              titulo={busqueda ? 'Sin resultados' : 'Sin pacientes registrados'}
              subtitulo={busqueda ? 'Intente con otro término' : 'Toque el botón + para agregar el primer paciente'}
            />
          )
        }
      />

      {isAdmin && (
        <FAB
          icon="plus"
          label="Nuevo Paciente"
          style={styles.fab}
          onPress={() => navigation.navigate('AgregarPaciente')}
        />
      )}

      <QRScannerModal
        visible={scannerVisible}
        onEscanear={handleEscaneo}
        onDismiss={() => setScannerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  busquedaRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, marginBottom: 8, gap: 10,
  },
  buscadorContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buscadorIcono: { marginRight: 8 },
  buscador: {
    flex: 1,
    height: 48,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  qrBtn: {
    width: 48, height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  contador: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  seccionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.background,
    paddingVertical: 10, paddingHorizontal: 4,
    marginTop: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  seccionHeaderTexto: {
    fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: COLORS.primary,
  },
});
