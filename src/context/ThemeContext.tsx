import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { COLORS } from '../theme';

const THEME_KEY = '@tema_oscuro';

export const DARK_COLORS = {
  primary: '#90CAF9',
  primaryLight: '#64B5F6',
  primaryDark: '#1E88E5',
  secondary: '#A5D6A7',
  secondaryLight: '#81C784',
  warning: '#FFAB76',
  warningLight: '#FFA040',
  danger: '#EF9A9A',
  dangerLight: '#EF5350',
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#F0F0F0',
  textSecondary: '#9E9E9E',
  border: '#333333',
  success: '#A5D6A7',
  successLight: '#81C784',
  white: '#FFFFFF',
  normal: '#81C784',
  caution: '#FFAB76',
  alert: '#EF9A9A',
};

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof COLORS;
  paperTheme: typeof MD3LightTheme;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: COLORS,
  paperTheme: MD3LightTheme,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'true') setIsDark(true);
    }).catch(() => {});
  }, []);

  async function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, String(next)).catch(() => {});
  }

  const colors = isDark ? DARK_COLORS : COLORS;

  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: DARK_COLORS.primary,
          secondary: DARK_COLORS.secondary,
          background: DARK_COLORS.background,
          surface: DARK_COLORS.surface,
          error: DARK_COLORS.danger,
          onSurface: DARK_COLORS.textPrimary,
          onBackground: DARK_COLORS.textPrimary,
          outline: DARK_COLORS.border,
        },
      }
    : {
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

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, paperTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
