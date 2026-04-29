import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SignosStackParamList, Paciente } from '../../types';
import { useApp } from '../../context/AppContext';
import PacienteCard from '../../components/PacienteCard';
import EmptyState from '../../components/EmptyState';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<SignosStackParamList, 'PacientesSignos'>;

export default function PacientesSignosScreen({ navigation }: Props) {
  const { pacientes, cargarPacientes, cargarHorarios } = useApp();
  const { colors } = useAppTheme();
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarPacientes();
      cargarHorarios();
    });
    return unsubscribe;
  }, [navigation]);

  const filtrados = pacientes.filter((p) => {
    const texto = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(texto) ||
      p.apellido.toLowerCase().includes(texto) ||
      p.habitacion.toLowerCase().includes(texto)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.instruccion}>Seleccione el paciente para registrar o ver sus signos vitales</Text>

      <View style={[styles.buscadorContainer, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textSecondary} />
        <TextInput
          style={styles.buscador}
          placeholder="Buscar paciente..."
          placeholderTextColor={COLORS.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PacienteCard
            paciente={item}
            onPress={() =>
              navigation.navigate('HistorialSignos', {
                pacienteId: item.id,
                pacienteNombre: `${item.nombre} ${item.apellido}`,
              })
            }
          />
        )}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <EmptyState
            icono="account-group-outline"
            titulo={busqueda ? 'Sin resultados' : 'No hay pacientes'}
            subtitulo="Registre pacientes desde la pestaña Pacientes"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  instruccion: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  buscadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  buscador: { flex: 1, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
});
