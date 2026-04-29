import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// En Expo Go las notificaciones locales no son totalmente compatibles desde SDK 53.
// Solo configuramos el handler en builds propios (development build o producción).
const esExpoGo = Constants.appOwnership === 'expo';

if (!esExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function configurarNotificaciones(): Promise<void> {
  if (esExpoGo) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificaciones',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1565C0',
      sound: 'default',
    });
  }

  if (!Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

export async function mostrarNotificacionLocal(
  titulo: string,
  mensaje: string,
  datos?: Record<string, any>,
): Promise<void> {
  if (esExpoGo) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: mensaje,
        data: datos ?? {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch {
    // Silencioso — no interrumpir el flujo si falla
  }
}
