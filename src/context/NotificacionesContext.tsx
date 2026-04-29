import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Notificacion } from '../types';
import {
  obtenerNotificaciones,
  marcarLeida as marcarLeidaDB,
  marcarTodasLeidas as marcarTodasLeidasDB,
  eliminarNotificacion as eliminarNotificacionDB,
} from '../storage/notificaciones';
import { mostrarNotificacionLocal } from '../utils/notificacionesPush';
import { useAuth } from './AuthContext';

interface NotificacionesContextType {
  notificaciones: Notificacion[];
  noLeidas: number;
  cargando: boolean;
  cargar: () => Promise<void>;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  eliminarNotificacion: (id: string) => Promise<void>;
}

const NotificacionesContext = createContext<NotificacionesContextType | null>(null);

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) { setNotificaciones([]); return; }
    setCargando(true);
    try {
      const data = await obtenerNotificaciones(usuario.id, usuario.rol);
      setNotificaciones(data);
    } catch (e) {
      console.error('Error cargando notificaciones:', e);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => { cargar(); }, [cargar]);

  // Realtime: escuchar inserciones nuevas
  useEffect(() => {
    if (!usuario) return;

    const channel = supabase
      .channel(`notif-${usuario.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          const row = payload.new as any;
          if (row.destinatario_id === usuario.id || row.para_rol === usuario.rol) {
            cargar();
            mostrarNotificacionLocal(row.titulo, row.mensaje, row.datos ?? undefined).catch(() => {});
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [usuario, cargar]);

  const marcarLeida = async (id: string) => {
    await marcarLeidaDB(id);
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodasLeidas = async () => {
    if (!usuario) return;
    await marcarTodasLeidasDB(usuario.id, usuario.rol);
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const eliminarNotificacion = async (id: string) => {
    await eliminarNotificacionDB(id);
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <NotificacionesContext.Provider value={{
      notificaciones,
      noLeidas,
      cargando,
      cargar,
      marcarLeida,
      marcarTodasLeidas,
      eliminarNotificacion,
    }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  return ctx;
}
