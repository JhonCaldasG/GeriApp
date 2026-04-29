import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES } from '../theme';

interface Props {
  onSignatureChange: (svgPath: string | null) => void;
  onSigningStart?: () => void;
  onSigningEnd?: () => void;
}

const PAD_HEIGHT = 240;

export default function SignaturePad({ onSignatureChange, onSigningStart, onSigningEnd }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [padWidth, setPadWidth] = useState(0);
  const pathsRef = useRef<string[]>([]);
  const currentPath = useRef('');
  const padWidthRef = useRef(0);
  const signed = paths.length > 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt) => {
        onSigningStart?.();
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        pathsRef.current = [...pathsRef.current, currentPath.current];
        setPaths([...pathsRef.current]);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        pathsRef.current[pathsRef.current.length - 1] = currentPath.current;
        setPaths([...pathsRef.current]);
      },

      onPanResponderRelease: () => {
        onSigningEnd?.();
        if (pathsRef.current.length > 0) {
          onSignatureChange(JSON.stringify({
            d: pathsRef.current.join(' '),
            w: padWidthRef.current,
            h: PAD_HEIGHT,
          }));
        } else {
          onSignatureChange(null);
        }
      },
    })
  ).current;

  function limpiar() {
    pathsRef.current = [];
    currentPath.current = '';
    setPaths([]);
    onSignatureChange(null);
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.canvas}
        onLayout={e => {
          const w = e.nativeEvent.layout.width;
          setPadWidth(w);
          padWidthRef.current = w;
        }}
        {...panResponder.panHandlers}
      >
        <Svg width={padWidth} height={PAD_HEIGHT}>
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={COLORS.primary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>

        {!signed && (
          <View style={styles.placeholder} pointerEvents="none">
            <MaterialCommunityIcons name="draw-pen" size={28} color={COLORS.border} />
            <Text style={styles.placeholderTexto}>Firma aquí</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.lineaFirma} />
        {signed ? (
          <TouchableOpacity style={styles.btnLimpiar} onPress={limpiar} activeOpacity={0.7}>
            <MaterialCommunityIcons name="delete-outline" size={15} color={COLORS.danger} />
            <Text style={styles.btnLimpiarTexto}>Limpiar</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.firmaPie}>Firma del familiar / responsable</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  canvas: {
    height: PAD_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    position: 'absolute',
    alignItems: 'center',
    gap: 6,
  },
  placeholderTexto: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.border,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineaFirma: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.textSecondary,
    opacity: 0.4,
  },
  firmaPie: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  btnLimpiar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger + '60',
    backgroundColor: '#FFF5F5',
  },
  btnLimpiarTexto: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    fontWeight: '600',
  },
});
