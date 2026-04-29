import { supabase } from '../lib/supabase';

export interface HogarInfo {
  nombre: string;
  direccion: string;
  telefono: string;
  telefonoEmergencia: string;
  email: string;
  ciudad: string;
  provincia: string;
  logoUri: string | null;
}

const DEFAULT: HogarInfo = {
  nombre: 'Hogar Geriátrico',
  direccion: '',
  telefono: '',
  telefonoEmergencia: '',
  email: '',
  ciudad: '',
  provincia: '',
  logoUri: null,
};

function rowToHogar(row: any): HogarInfo {
  return {
    nombre: row.nombre ?? DEFAULT.nombre,
    direccion: row.direccion ?? '',
    telefono: row.telefono ?? '',
    telefonoEmergencia: row.telefono_emergencia ?? '',
    email: row.email ?? '',
    ciudad: row.ciudad ?? '',
    provincia: row.provincia ?? '',
    logoUri: row.logo_uri ?? null,
  };
}

export async function obtenerHogar(): Promise<HogarInfo> {
  const { data, error } = await supabase
    .from('hogar_config')
    .select('*')
    .eq('id', 1)
    .single();
  if (error || !data) return DEFAULT;
  return rowToHogar(data);
}

export async function guardarHogar(info: HogarInfo): Promise<void> {
  const { error } = await supabase
    .from('hogar_config')
    .upsert({
      id: 1,
      nombre: info.nombre,
      direccion: info.direccion,
      telefono: info.telefono,
      telefono_emergencia: info.telefonoEmergencia,
      email: info.email,
      ciudad: info.ciudad,
      provincia: info.provincia,
      logo_uri: info.logoUri,
    });
  if (error) throw error;
}
