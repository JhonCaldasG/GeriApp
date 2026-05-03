import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast, ToastType } from '../context/ToastContext';

const CONFIG: Record<ToastType, { circleBg: string; icon: string; title: string }> = {
  success: { circleBg: '#2E7D32', icon: 'checkmark',       title: 'Guardado exitoso'    },
  warning: { circleBg: '#E65100', icon: 'create-outline',  title: 'Registro actualizado' },
  error:   { circleBg: '#B71C1C', icon: 'trash-outline',   title: 'Registro eliminado'  },
};

export default function Toast() {
  const { toast } = useToast();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale       = useRef(new Animated.Value(0.6)).current;
  const cardOpacity     = useRef(new Animated.Value(0)).current;
  const circleScale     = useRef(new Animated.Value(0)).current;
  const checkScale      = useRef(new Animated.Value(0)).current;
  const textOpacity     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      circleScale.setValue(0);
      checkScale.setValue(0);
      textOpacity.setValue(0);

      // 1. backdrop + card entran juntos
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(cardScale,       { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
        Animated.timing(cardOpacity,     { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();

      // 2. círculo verde hace pop
      setTimeout(() => {
        Animated.spring(circleScale, {
          toValue: 1, tension: 90, friction: 7, useNativeDriver: true,
        }).start();
      }, 150);

      // 3. check dentro del círculo hace pop con más rebote
      setTimeout(() => {
        Animated.spring(checkScale, {
          toValue: 1, tension: 130, friction: 5, useNativeDriver: true,
        }).start();
      }, 280);

      // 4. texto aparece
      setTimeout(() => {
        Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 320);

    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(cardOpacity,     { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(cardScale,       { toValue: 0.6, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [toast.visible]);

  const cfg = CONFIG[toast.type];

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { zIndex: 9999, opacity: backdropOpacity }]}
    >
      {/* fondo oscuro semitransparente */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />

      {/* tarjeta centrada */}
      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ scale: cardScale }] },
        ]}
      >
        {/* círculo con el ícono */}
        <Animated.View
          style={[
            styles.circle,
            { backgroundColor: cfg.circleBg, transform: [{ scale: circleScale }] },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name={cfg.icon as any} size={52} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>

        {/* textos */}
        <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
          {cfg.title}
        </Animated.Text>
        {!!toast.message && (
          <Animated.Text style={[styles.subtitle, { opacity: textOpacity }]}>
            {toast.message}
          </Animated.Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  card: {
    position: 'absolute',
    alignSelf: 'center',
    top: '35%',
    width: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 16,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#5A6A7E',
    textAlign: 'center',
    lineHeight: 18,
  },
});
