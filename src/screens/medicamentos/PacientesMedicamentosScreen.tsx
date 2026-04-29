import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MedicamentosStackParamList } from '../../types';
import { useApp } from '../../context/AppContext';
import PacienteCard from '../../components/PacienteCard';
import EmptyState from '../../components/EmptyState';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';

type Props = NativeStackScreenProps<MedicamentosStackParamList, 'PacientesMedicamentos'>;

export default function PacientesMedicamentosScreen({ navigation }: Props) {
  const { pacientes, cargarPacientes } = useApp();
  const { colors } = useAppTheme();
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarPacientes);
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
      <TouchableOpacity
        style={styles.timelineBtn}
        onPress={() => navigation.navigate('TimelineMedicamentos')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="timeline-clock-outline" size={18} color="#fff" />
        <Text style={styles.timelineBtnTexto}>Ver timeline del día</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.instruccion}>Seleccione el paciente para ver o agregar medicamentos</Text>
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
              navigation.navigate('ListaMedicamentos', {
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
  timelineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1565C0', borderRadius: 12,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  timelineBtnTexto: { flex: 1, color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },
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
