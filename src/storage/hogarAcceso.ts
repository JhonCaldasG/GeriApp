import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@hogar_acceso_config';

export interface HogarAccesoConfig {
  usuario: string;
  password: string;
}

const DEFAULT: HogarAccesoConfig = { usuario: 'hogar', password: '1234' };

export async function obtenerHogarAcceso(): Promise<HogarAccesoConfig> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return JSON.parse(raw);
  } catch {
    return DEFAULT;
  }
}

export async function guardarHogarAcceso(config: HogarAccesoConfig): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(config));
}

export async function validarAccesoHogar(usuario: string, password: string): Promise<boolean> {
  const config = await obtenerHogarAcceso();
  return (
    usuario.trim().toLowerCase() === config.usuario.trim().toLowerCase() &&
    password === config.password
  );
}
