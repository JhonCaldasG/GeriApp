import React, { useState } from 'react';
import {
  Modal, View, Image, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  fotos: string[];
  indiceInicial: number;
  onDismiss: () => void;
}

const { width: W, height: H } = Dimensions.get('window');

export default function VisorFotoModal({ fotos, indiceInicial, onDismiss }: Props) {
  const [indice, setIndice] = useState(indiceInicial);

  const anterior = () => setIndice(i => Math.max(0, i - 1));
  const siguiente = () => setIndice(i => Math.min(fotos.length - 1, i + 1));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.fondo}>

        {/* Barra superior */}
        <View style={styles.barra}>
          {fotos.length > 1 && (
            <Text style={styles.contador}>{indice + 1} / {fotos.length}</Text>
          )}
          <TouchableOpacity onPress={onDismiss} style={styles.cerrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Imagen */}
        <Image
          source={{ uri: fotos[indice] }}
          style={styles.imagen}
          resizeMode="contain"
        />

        {/* Navegación */}
        {fotos.length > 1 && (
          <View style={styles.navegacion}>
            <TouchableOpacity
              onPress={anterior}
              disabled={indice === 0}
              style={[styles.navBtn, indice === 0 && styles.navBtnDisabled]}
            >
              <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Indicadores de punto */}
            <View style={styles.puntos}>
              {fotos.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setIndice(i)}>
                  <View style={[styles.punto, i === indice && styles.puntoActivo]} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={siguiente}
              disabled={indice === fotos.length - 1}
              style={[styles.navBtn, indice === fotos.length - 1 && styles.navBtnDisabled]}
            >
              <MaterialCommunityIcons name="chevron-right" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  barra: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12,
    zIndex: 10,
  },
  contador: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: 40,
  },
  cerrar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 6,
  },
  imagen: {
    width: W,
    height: H * 0.78,
  },
  navegacion: {
    position: 'absolute',
    bottom: 48,
    left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24, padding: 6,
  },
  navBtnDisabled: { opacity: 0.25 },
  puntos: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  punto: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  puntoActivo: {
    backgroundColor: '#fff',
    width: 9, height: 9,
  },
});
