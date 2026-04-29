import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { HogarInfo, obtenerHogar, guardarHogar } from '../storage/hogar';

interface HogarContextType {
  hogar: HogarInfo;
  cargarHogar: () => Promise<void>;
  actualizarHogar: (info: HogarInfo) => Promise<void>;
}

const HogarContext = createContext<HogarContextType | null>(null);

export function HogarProvider({ children }: { children: ReactNode }) {
  const [hogar, setHogar] = useState<HogarInfo>({
    nombre: 'Hogar Geriátrico',
    direccion: '',
    telefono: '',
    email: '',
    ciudad: '',
    provincia: '',
    logoUri: null,
  });

  const cargarHogar = useCallback(async () => {
    const info = await obtenerHogar();
    setHogar(info);
  }, []);

  const actualizarHogar = useCallback(async (info: HogarInfo) => {
    await guardarHogar(info);
    setHogar(info);
  }, []);

  useEffect(() => { cargarHogar(); }, []);

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
