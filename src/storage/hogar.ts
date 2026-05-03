import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const SLUG_KEY = '@hogar_slug';
const PLATAFORMA_DOMAIN = 'geriapp.com';

export interface HogarInfo {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  telefonoEmergencia: string;
  email: string;
  ciudad: string;
  provincia: string;
  logoUri: string | null;
  slug: string | null;
  estado?: string;
}

const DEFAULT: HogarInfo = {
  id: '',
  nombre: 'Hogar Geriátrico',
  direccion: '',
  telefono: '',
  telefonoEmergencia: '',
  email: '',
  ciudad: '',
  provincia: '',
  logoUri: null,
  slug: null,
};

function rowToHogar(row: any): HogarInfo {
  return {
    id: row.id,
    nombre: row.nombre ?? '',
    direccion: row.direccion ?? '',
    telefono: row.telefono ?? '',
    telefonoEmergencia: row.telefono_emergencia ?? '',
    email: row.email ?? '',
    ciudad: row.ciudad ?? '',
    provincia: row.provincia ?? '',
    logoUri: row.logo_uri ?? null,
    slug: row.slug ?? null,
    estado: row.estado ?? 'activo',
  };
}

/** Lee el slug del hogar guardado en este dispositivo */
export async function getStoredSlug(): Promise<string | null> {
  return AsyncStorage.getItem(SLUG_KEY);
}

/** Guarda el slug del hogar en este dispositivo */
export async function setStoredSlug(slug: string): Promise<void> {
  await AsyncStorage.setItem(SLUG_KEY, slug.trim().toLowerCase());
}

/** Construye el email de auth a partir del username y el slug local */
export async function getAuthDomain(): Promise<string> {
  const slug = await getStoredSlug();
  return slug ? `${slug}.${PLATAFORMA_DOMAIN}` : PLATAFORMA_DOMAIN;
}

/**
 * Decodifica el payload del JWT de Supabase para leer custom claims
 * inyectados por el Auth Hook (hogar_id, user_rol).
 */
export function parseJwtClaims(token: string): Record<string, any> {
  try {
    const base64 = token.split('.')[1];
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/** Obtiene el hogar_id del JWT actual. Lanza si no hay sesión. */
export async function getHogarId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No hay sesión activa');
  const claims = parseJwtClaims(session.access_token);
  if (!claims.hogar_id) throw new Error('El token no contiene hogar_id');
  return claims.hogar_id;
}

/** Obtiene hogar_id y user_rol del JWT, sin lanzar. */
export async function getJwtClaims(): Promise<{ hogarId: string | null; userRol: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { hogarId: null, userRol: null };
    const claims = parseJwtClaims(session.access_token);
    return {
      hogarId: claims.hogar_id ?? null,
      userRol: claims.user_rol ?? null,
    };
  } catch {
    return { hogarId: null, userRol: null };
  }
}

export async function obtenerHogar(): Promise<HogarInfo> {
  try {
    const hogarId = await getHogarId();
    const { data, error } = await supabase
      .from('hogar_config')
      .select('*')
      .eq('id', hogarId)
      .single();
    if (error || !data) return DEFAULT;
    return rowToHogar(data);
  } catch {
    return DEFAULT;
  }
}

export interface HogarItem {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string;
  logoUri: string | null;
  rol: string;
}

export async function getMyHogares(): Promise<HogarItem[]> {
  // Tier 1: RPC (requiere función mis_hogares() en Supabase)
  try {
    const { data, error } = await supabase.rpc('mis_hogares');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id, nombre: r.nombre, slug: r.slug ?? '',
        ciudad: r.ciudad ?? '', logoUri: r.logo_uri ?? null, rol: r.rol ?? 'enfermero',
      }));
    }
  } catch { /* RPC no existe aún */ }

  // Tier 2: query directo a usuarios → hogar_config por auth_id
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Sin sesión activa');

    const { data: userRows, error: userError } = await supabase
      .from('usuarios')
      .select('hogar_id, rol')
      .eq('auth_id', session.user.id)
      .eq('activo', true);

    if (!userError && userRows && userRows.length > 0) {
      const hogarIds = userRows.map((u: any) => u.hogar_id).filter(Boolean);
      const { data: hogarRows, error: hogarError } = await supabase
        .from('hogar_config')
        .select('id, nombre, slug, ciudad, logo_uri')
        .in('id', hogarIds);

      if (!hogarError && hogarRows && hogarRows.length > 0) {
        return hogarRows.map((h: any) => {
          const match = userRows.find((u: any) => u.hogar_id === h.id);
          return {
            id: h.id, nombre: h.nombre, slug: h.slug ?? '',
            ciudad: h.ciudad ?? '', logoUri: h.logo_uri ?? null,
            rol: match?.rol ?? 'enfermero',
          };
        });
      }
    }
  } catch { /* continuar al siguiente tier */ }

  // Tier 3: fallback al hogar del JWT actual
  const info = await obtenerHogar();
  const { userRol } = await getJwtClaims();
  if (!info.id) return [];
  return [{
    id: info.id, nombre: info.nombre, slug: info.slug ?? '',
    ciudad: info.ciudad, logoUri: info.logoUri, rol: userRol ?? 'enfermero',
  }];
}

export async function guardarHogar(info: HogarInfo): Promise<void> {
  const payload = {
    nombre: info.nombre,
    direccion: info.direccion,
    telefono: info.telefono,
    telefono_emergencia: info.telefonoEmergencia,
    email: info.email,
    ciudad: info.ciudad,
    provincia: info.provincia,
    logo_uri: info.logoUri,
    slug: info.slug,
  };
  const { error } = await supabase
    .from('hogar_config')
    .update(payload)
    .eq('id', info.id);
  if (error) throw error;
}
