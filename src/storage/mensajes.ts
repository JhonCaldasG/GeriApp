import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MensajeInterno } from '../types';
import { getHogarId } from './hogar';

const LEIDOS_KEY = '@mensajes_leidos';

function rowToMensaje(row: any): MensajeInterno {
  return {
    id: row.id,
    autorId: row.autor_id,
    autorNombre: row.autor_nombre,
    titulo: row.titulo,
    cuerpo: row.cuerpo,
    paraRol: row.para_rol ?? 'todos',
    createdAt: row.created_at,
  };
}

export async function obtenerMensajes(rol: string): Promise<MensajeInterno[]> {
  const { data, error } = await supabase
    .from('mensajes_internos')
    .select('*')
    .or(`para_rol.eq.todos,para_rol.eq.${rol}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToMensaje);
}

export async function publicarMensaje(mensaje: Omit<MensajeInterno, 'id' | 'createdAt'>): Promise<MensajeInterno> {
  const hogarId = await getHogarId();
  const { data, error } = await supabase
    .from('mensajes_internos')
    .insert({
      hogar_id: hogarId,
      autor_id: mensaje.autorId,
      autor_nombre: mensaje.autorNombre,
      titulo: mensaje.titulo,
      cuerpo: mensaje.cuerpo,
      para_rol: mensaje.paraRol,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToMensaje(data);
}

export async function eliminarMensaje(id: string): Promise<void> {
  const { error } = await supabase.from('mensajes_internos').delete().eq('id', id);
  if (error) throw error;
}

export async function obtenerLeidos(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(LEIDOS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function marcarLeido(id: string): Promise<void> {
  const leidos = await obtenerLeidos();
  if (!leidos.includes(id)) {
    await AsyncStorage.setItem(LEIDOS_KEY, JSON.stringify([...leidos, id]));
  }
}

export async function contarNoLeidos(mensajes: MensajeInterno[]): Promise<number> {
  const leidos = await obtenerLeidos();
  return mensajes.filter(m => !leidos.includes(m.id)).length;
}
