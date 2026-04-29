import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { HogarProvider } from './src/context/HogarContext';
import { HogarAccesoProvider } from './src/context/HogarAccesoContext';
import { NotificacionesProvider } from './src/context/NotificacionesContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { configurarNotificaciones } from './src/utils/notificacionesPush';
import AppNavigator from './src/navigation/AppNavigator';

function AppWithTheme() {
  const { paperTheme, isDark } = useAppTheme();
  return (
    <PaperProvider theme={paperTheme}>
      <HogarAccesoProvider>
        <HogarProvider>
          <AuthProvider>
            <NotificacionesProvider>
              <AppProvider>
                <StatusBar style={isDark ? 'light' : 'light'} />
                <AppNavigator />
              </AppProvider>
            </NotificacionesProvider>
          </AuthProvider>
        </HogarProvider>
      </HogarAccesoProvider>
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
