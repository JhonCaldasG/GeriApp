import React, { createContext, useContext, useState, ReactNode } from 'react';
import { validarAccesoHogar } from '../storage/hogarAcceso';

interface HogarAccesoContextType {
  desbloqueado: boolean;
  desbloquear: (usuario: string, password: string) => Promise<boolean>;
  bloquear: () => void;
}

const HogarAccesoContext = createContext<HogarAccesoContextType | null>(null);

export function HogarAccesoProvider({ children }: { children: ReactNode }) {
  const [desbloqueado, setDesbloqueado] = useState(false);

  async function desbloquear(usuario: string, password: string): Promise<boolean> {
    const ok = await validarAccesoHogar(usuario, password);
    if (ok) setDesbloqueado(true);
    return ok;
  }

  function bloquear() {
    setDesbloqueado(false);
  }

  return (
    <HogarAccesoContext.Provider value={{ desbloqueado, desbloquear, bloquear }}>
      {children}
    </HogarAccesoContext.Provider>
  );
}

export function useHogarAcceso() {
  const ctx = useContext(HogarAccesoContext);
  if (!ctx) throw new Error('useHogarAcceso debe usarse dentro de HogarAccesoProvider');
  return ctx;
}
