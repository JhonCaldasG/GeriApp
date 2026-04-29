import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES } from '../theme';

interface Props {
  visible: boolean;
  onEscanear: (data: string) => void;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');
const FRAME = width * 0.65;

export default function QRScannerModal({ visible, onEscanear, onDismiss }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);

  // Resetear estado al abrir el modal
  useEffect(() => {
    if (visible) setEscaneado(false);
  }, [visible]);

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible animationType="slide" onRequestClose={onDismiss}>
        <View style={styles.centrado}>
          <Text style={styles.mensajeTexto}>Cargando permisos de cámara...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible animationType="slide" onRequestClose={onDismiss}>
        <View style={styles.centrado}>
          <MaterialCommunityIcons name="camera-off" size={56} color={COLORS.textSecondary} />
          <Text style={styles.mensajeTitulo}>Permiso de cámara requerido</Text>
          <Text style={styles.mensajeTexto}>
            Para escanear QR se necesita acceso a la cámara.
          </Text>
          <TouchableOpacity style={styles.botonPermiso} onPress={requestPermission}>
            <Text style={styles.botonPermisoTexto}>Conceder permiso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonCerrar} onPress={onDismiss}>
            <Text style={styles.botonCerrarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  function handleBarcode({ data }: { data: string }) {
    if (escaneado) return;
    setEscaneado(true);
    onEscanear(data);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={escaneado ? undefined : handleBarcode}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Overlay oscuro con hueco */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMedio}>
            <View style={styles.overlaySide} />
            <View style={styles.frame}>
              {/* Esquinas del marco */}
              <View style={[styles.esquina, styles.esquinaTL]} />
              <View style={[styles.esquina, styles.esquinaTR]} />
              <View style={[styles.esquina, styles.esquinaBL]} />
              <View style={[styles.esquina, styles.esquinaBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} style={styles.btnCerrar}>
            <MaterialCommunityIcons name="close" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Escanear QR del Paciente</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Instrucción */}
        <View style={styles.instruccionContainer}>
          <MaterialCommunityIcons name="qrcode-scan" size={20} color={COLORS.white} />
          <Text style={styles.instruccion}>
            Apunte al código QR del paciente
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.6)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centrado: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background, padding: 32, gap: 16,
  },
  mensajeTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  mensajeTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },
  botonPermiso: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  botonPermisoTexto: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },
  botonCerrar: { paddingVertical: 10 },
  botonCerrarTexto: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },

  // Overlay con hueco central
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMedio: { flexDirection: 'row', height: FRAME },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  frame: {
    width: FRAME, height: FRAME,
  },
  overlayBottom: { flex: 1, backgroundColor: OVERLAY_COLOR },

  // Esquinas del marco
  esquina: {
    position: 'absolute', width: 28, height: 28,
    borderColor: COLORS.white, borderWidth: 3,
  },
  esquinaTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  esquinaTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  esquinaBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  esquinaBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
  },
  btnCerrar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: {
    color: COLORS.white, fontWeight: '700',
    fontSize: FONT_SIZES.md, textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // Instrucción abajo
  instruccionContainer: {
    position: 'absolute', bottom: 80,
    alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  instruccion: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: '600' },
});
