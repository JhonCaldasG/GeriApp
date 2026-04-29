import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DrawerContext.Provider value={{
      isOpen,
      openDrawer: () => setIsOpen(true),
      closeDrawer: () => setIsOpen(false),
    }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer debe usarse dentro de DrawerProvider');
  return ctx;
}
