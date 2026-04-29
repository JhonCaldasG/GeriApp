import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AseoStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import EmptyState from '../../components/EmptyState';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<AseoStackParamList, 'PacientesAseo'>;

export default function PacientesAseoScreen({ navigation }: Props) {
  const { pacientes, cargarPacientes } = useApp();
  const { colors } = useAppTheme();
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarPacientes);
    return unsubscribe;
  }, [navigation]);

  const filtrados = pacientes.filter(p => {
    const texto = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(texto) ||
      p.apellido.toLowerCase().includes(texto) ||
      p.habitacion.toLowerCase().includes(texto)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.instruccion}>Seleccione la habitación para registrar limpieza</Text>

      <View style={[styles.buscadorContainer, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textSecondary} />
        <TextInput
          style={styles.buscador}
          placeholder="Buscar habitación o paciente..."
          placeholderTextColor={COLORS.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <EmptyState
            icono="door-closed"
            titulo={busqueda ? 'Sin resultados' : 'No hay habitaciones'}
            subtitulo="Registre pacientes desde el módulo de Pacientes"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ListaLimpiezas', {
              pacienteId: item.id,
              pacienteNombre: `${item.nombre} ${item.apellido}`,
              habitacion: item.habitacion || 'Sin asignar',
            })}
          >
            <View style={styles.cardIcono}>
              <MaterialCommunityIcons name="door-closed" size={26} color={COLORS.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardHabitacion}>Hab. {item.habitacion || 'Sin asignar'}</Text>
              <Text style={styles.cardNombre}>{item.nombre} {item.apellido}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  instruccion: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    textAlign: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
  },
  buscadorContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, margin: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  buscador: { flex: 1, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 10, gap: 12,
    borderWidth: 1, borderColor: COLORS.border, elevation: 1,
  },
  cardIcono: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardHabitacion: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  cardNombre: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
});
