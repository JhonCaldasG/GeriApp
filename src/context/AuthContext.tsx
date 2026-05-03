import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Usuario } from '../types';
import { supabase } from '../lib/supabase';
import { login as loginStorage, obtenerUsuarios } from '../storage/usuarios';

// ─── Configuración ───────────────────────────────────────────────────────────
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
const LOGOUT_ON_BACKGROUND = false;            // no cerrar sesión al minimizar app

interface AuthContextType {
  usuario: Usuario | null;
  cargando: boolean;
  isAdmin: boolean;
  isAseo: boolean;
  isSuperAdmin: boolean;
  ultimoIngreso: string | null;
  login: (usuario: string, password: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  completeLogin: () => Promise<boolean>;
  logout: () => void;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = '@sesion_usuario';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [ultimoIngreso, setUltimoIngreso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveTime = useRef<number>(Date.now());

  // ─── Cargar sesión al iniciar ─────────────────────────────────────────────
  useEffect(() => {
    const iniciar = async () => {
      // Primero intentar restaurar desde sesión de Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const usuarios = await obtenerUsuarios();
        const usuarioValido = usuarios.find(u => (u as any).auth_id === session.user.id && u.activo);
        if (usuarioValido) {
          setUsuario(usuarioValido);
          setUltimoIngreso(usuarioValido.ultimoIngreso ?? null);
          setCargando(false);
          startInactivityTimer();
          return;
        }
      }

      // Fallback: sesión guardada localmente (compatibilidad con sesiones anteriores)
      const sesion = await AsyncStorage.getItem(SESSION_KEY);
      if (sesion) {
        try {
          const sesionGuardada = JSON.parse(sesion);
          const usuarios = await obtenerUsuarios();
          const usuarioValido = usuarios.find(u => u.id === sesionGuardada.id && u.activo);
          if (usuarioValido) {
            setUsuario(usuarioValido);
            setUltimoIngreso(usuarioValido.ultimoIngreso ?? null);
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        } catch {
          await AsyncStorage.removeItem(SESSION_KEY);
        }
      }
      setCargando(false);
    };
    iniciar();
  }, []);

  // ─── AppState: background y vuelta al frente ──────────────────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (LOGOUT_ON_BACKGROUND) {
          doLogout();
          return;
        }
        // Guardar tiempo en que salió de la app
        lastActiveTime.current = Date.now();
        clearInactivityTimer();
      }

      if (nextState === 'active') {
        const elapsed = Date.now() - lastActiveTime.current;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          doLogout();
        } else {
          startInactivityTimer();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // ─── Timer de inactividad ─────────────────────────────────────────────────
  function startInactivityTimer() {
    clearInactivityTimer();
    inactivityTimer.current = setTimeout(() => {
      doLogout(false); // inactividad: ocultar UI pero mantener JWT de Supabase
    }, INACTIVITY_TIMEOUT_MS);
  }

  function clearInactivityTimer() {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }

  function resetInactivityTimer() {
    lastActiveTime.current = Date.now();
    startInactivityTimer();
  }

  // ─── Auth actions ─────────────────────────────────────────────────────────
  const doLogout = async (cerrarSesionAuth = true) => {
    clearInactivityTimer();
    setUsuario(null);
    await AsyncStorage.removeItem(SESSION_KEY);
    if (cerrarSesionAuth) await supabase.auth.signOut();
  };

  const login = async (usuarioStr: string, password: string): Promise<boolean> => {
    // Biometric path: restore last saved session (password is empty string)
    if (!password) {
      const sesion = await AsyncStorage.getItem(SESSION_KEY);
      if (sesion) {
        try {
          const s = JSON.parse(sesion);
          const usuarios = await obtenerUsuarios();
          const u = usuarios.find(usr => usr.id === s.id && usr.activo);
          if (u) {
            setUsuario(u);
            setUltimoIngreso(u.ultimoIngreso ?? null);
            startInactivityTimer();
            return true;
          }
        } catch { /* ignore */ }
      }
      return false;
    }

    const encontrado = await loginStorage(usuarioStr, password);
    if (encontrado) {
      setUsuario(encontrado);
      setUltimoIngreso(encontrado.ultimoIngreso ?? null);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(encontrado));
      startInactivityTimer();
      return true;
    }
    return false;
  };

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const completeLogin = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { data: rows, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', session.user.id)
      .eq('activo', true);

    const data = rows?.[0];
    if (error || !data) return false;

    const now = new Date().toISOString();
    await supabase.from('usuarios').update({ ultimo_ingreso: now }).eq('id', data.id);

    const u: Usuario = {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      usuario: data.usuario,
      rol: data.rol,
      activo: data.activo,
      ultimoIngreso: now,
    };
    setUsuario(u);
    setUltimoIngreso(now);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    startInactivityTimer();
    return true;
  };

  const logout = () => {
    doLogout(true); // logout manual: cierra también la sesión de Supabase
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      cargando,
      isAdmin: usuario?.rol === 'admin' || usuario?.rol === 'superadmin',
      isAseo: usuario?.rol === 'aseo',
      isSuperAdmin: usuario?.rol === 'superadmin',
      ultimoIngreso,
      login,
      loginWithEmail,
      completeLogin,
      logout,
      resetInactivityTimer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
