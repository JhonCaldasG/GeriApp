import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { HogarProvider } from './src/context/HogarContext';
import { NotificacionesProvider } from './src/context/NotificacionesContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { configurarNotificaciones } from './src/utils/notificacionesPush';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/Toast';

function AppWithTheme() {
  const { paperTheme, isDark } = useAppTheme();
  return (
    <PaperProvider theme={paperTheme}>
      <HogarProvider>
        <AuthProvider>
          <NotificacionesProvider>
            <AppProvider>
              <ToastProvider>
                <StatusBar style={isDark ? 'light' : 'light'} />
                <AppNavigator />
                <Toast />
              </ToastProvider>
            </AppProvider>
          </NotificacionesProvider>
        </AuthProvider>
      </HogarProvider>
    </PaperProvider>
  );
}

export default function App() {
  useEffect(() => {
    configurarNotificaciones().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppWithTheme />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
