import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { HogarInfo, obtenerHogar, guardarHogar, getJwtClaims } from '../storage/hogar';
import { supabase } from '../lib/supabase';

interface HogarContextType {
  hogar: HogarInfo;
  cargarHogar: () => Promise<void>;
  actualizarHogar: (info: HogarInfo) => Promise<void>;
}

const DEFAULT_HOGAR: HogarInfo = {
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

const HogarContext = createContext<HogarContextType | null>(null);

export function HogarProvider({ children }: { children: ReactNode }) {
  const [hogar, setHogar] = useState<HogarInfo>(DEFAULT_HOGAR);

  const cargarHogar = useCallback(async () => {
    const { userRol } = await getJwtClaims();
    if (userRol === 'superadmin') return;

    const info = await obtenerHogar();
    setHogar(info);
  }, []);

  const actualizarHogar = useCallback(async (info: HogarInfo) => {
    await guardarHogar(info);
    setHogar(info);
  }, []);

  useEffect(() => {
    cargarHogar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        cargarHogar();
      } else if (event === 'SIGNED_OUT') {
        setHogar(DEFAULT_HOGAR);
      }
    });

    return () => subscription.unsubscribe();
  }, [cargarHogar]);

  return (
    <HogarContext.Provider value={{ hogar, cargarHogar, actualizarHogar }}>
      {children}
    </HogarContext.Provider>
  );
}

export function useHogar() {
  const ctx = useContext(HogarContext);
  if (!ctx) throw new Error('useHogar debe usarse dentro de HogarProvider');
  return ctx;
}
