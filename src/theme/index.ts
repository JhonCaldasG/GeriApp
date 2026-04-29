import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#1565C0',
  primaryLight: '#1E88E5',
  primaryDark: '#0D47A1',
  secondary: '#2E7D32',
  secondaryLight: '#43A047',
  warning: '#E65100',
  warningLight: '#FB8C00',
  danger: '#C62828',
  dangerLight: '#EF5350',
  background: '#F4F6F9',
  surface: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#5A6A7E',
  border: '#DDE3EA',
  success: '#1B5E20',
  successLight: '#4CAF50',
  white: '#FFFFFF',
  // Vital signs
  normal: '#2E7D32',
  caution: '#E65100',
  alert: '#C62828',
};

/** Límites absolutos fisiológicamente posibles (fuera = valor inválido) */
export const SIGNO_LIMITES = {
  presionSistolica:  { min: 50,   max: 300,  label: '50 - 300 mmHg' },
  presionDiastolica: { min: 20,   max: 200,  label: '20 - 200 mmHg' },
  frecuenciaCardiaca:{ min: 20,   max: 300,  label: '20 - 300 lpm'  },
  temperatura:       { min: 30.0, max: 45.0, label: '30.0 - 45.0 °C' },
  saturacionOxigeno: { min: 50,   max: 100,  label: '50 - 100 %'    },
  glucosa:           { min: 10,   max: 600,  label: '10 - 600 mg/dL' },
  peso:              { min: 1,    max: 300,  label: '1 - 300 kg'    },
};

export const SIGNO_RANGOS = {
  presionSistolica: { normal: [90, 139], caution: [140, 159], alert: [160, 999] },
  presionDiastolica: { normal: [60, 89], caution: [90, 99], alert: [100, 999] },
  frecuenciaCardiaca: { normal: [60, 100], caution: [50, 59], alert: [0, 49] },
  temperatura: { normal: [36.0, 37.5], caution: [37.6, 38.4], alert: [38.5, 99] },
  saturacionOxigeno: { normal: [95, 100], caution: [90, 94], alert: [0, 89] },
  glucosa: { normal: [70, 140], caution: [141, 200], alert: [201, 9999] },
};

export const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.danger,
  },
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};
