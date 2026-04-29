import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import QRScannerModal from '../components/QRScannerModal';
import { useApp } from '../context/AppContext';
import { COLORS, FONT_SIZES } from '../theme';

type TabNav = BottomTabNavigationProp<any>;

export default function QRScannerScreen() {
  const navigation  = useNavigation<TabNav>();
  const { pacientes, cargarPacientes } = useApp();
  const [scannerVisible, setScannerVisible] = useState(false);

  // Cargar pacientes al enfocar por si hay nuevos
  useFocusEffect(useCallback(() => {
    cargarPacientes();
  }, []));

  function handleEscaneo(data: string) {
    setScannerVisible(false);
    const paciente = pacientes.find(p => p.id === data);
    if (paciente) {
      navigation.navigate('Pacientes', {
        screen: 'PerfilPaciente',
        params: { pacienteId: paciente.id },
      });
    } else {
      Alert.alert(
        'QR no reconocido',
        'El código escaneado no corresponde a ningún paciente registrado.',
        [{ text: 'Aceptar' }]
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.contenido}>
        <View style={styles.iconoContainer}>
          <MaterialCommunityIcons name="qrcode-scan" size={72} color={COLORS.primary} />
        </View>

        <Text style={styles.titulo}>Escanear paciente</Text>
        <Text style={styles.descripcion}>
          Apunte la cámara al código QR del paciente para acceder rápidamente a su perfil.
        </Text>

        <TouchableOpacity style={styles.boton} onPress={() => setScannerVisible(true)}>
          <MaterialCommunityIcons name="camera" size={22} color={COLORS.white} />
          <Text style={styles.botonTexto}>Abrir cámara</Text>
        </TouchableOpacity>
      </View>

      <QRScannerModal
        visible={scannerVisible}
        onEscanear={handleEscaneo}
        onDismiss={() => setScannerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contenido: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  iconoContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  titulo: {
    fontSize: FONT_SIZES.xl ?? 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  descripcion: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
    elevation: 2,
  },
  botonTexto: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
