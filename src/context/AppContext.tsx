import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Paciente, SignoVital, Medicamento, RegistroMedico, TomaSigno, AdministracionMedicamento, LimpiezaRegistro, ActividadPaciente } from '../types';
import * as Storage from '../storage';
import * as HorariosStorage from '../storage/horariosSignos';
import * as AdminStorage from '../storage/administraciones';
import * as LimpiezasStorage from '../storage/limpiezas';
import * as ActividadesStorage from '../storage/actividades';

interface AppContextType {
  pacientes: Paciente[];
  signosVitales: SignoVital[];
  medicamentos: Medicamento[];
  registros: RegistroMedico[];
  horarios: { [pacienteId: string]: TomaSigno[] };
  cargando: boolean;
  cargarPacientes: () => Promise<void>;
  cargarSignos: (pacienteId?: string) => Promise<void>;
  cargarMedicamentos: (pacienteId?: string) => Promise<void>;
  cargarRegistros: (pacienteId?: string) => Promise<void>;
  cargarHorarios: () => Promise<void>;
  agregarPaciente: (p: Omit<Paciente, 'id' | 'createdAt'>) => Promise<Paciente>;
  actualizarPaciente: (id: string, datos: Partial<Omit<Paciente, 'id' | 'createdAt'>>) => Promise<void>;
  agregarSigno: (s: Omit<SignoVital, 'id' | 'createdAt'>) => Promise<void>;
  actualizarSigno: (id: string, s: Partial<Omit<SignoVital, 'id' | 'createdAt' | 'pacienteId'>>) => Promise<void>;
  agregarMedicamento: (m: Omit<Medicamento, 'id' | 'createdAt'>) => Promise<void>;
  agregarRegistro: (r: Omit<RegistroMedico, 'id' | 'createdAt'>) => Promise<void>;
  eliminarPaciente: (id: string) => Promise<void>;
  eliminarSigno: (id: string) => Promise<void>;
  eliminarMedicamento: (id: string) => Promise<void>;
  eliminarRegistro: (id: string, fotoUrls?: string[]) => Promise<void>;
  guardarTomaHorario: (pacienteId: string, toma: Omit<TomaSigno, 'id'>) => Promise<void>;
  eliminarTomaHorario: (pacienteId: string, tomaId: string) => Promise<void>;
  editarMedicamento: (id: string, datos: Partial<Omit<Medicamento, 'id' | 'createdAt' | 'pacienteId'>>) => Promise<void>;
  administraciones: AdministracionMedicamento[];
  cargarAdministraciones: (medicamentoId?: string) => Promise<void>;
  registrarAdministracion: (a: Omit<AdministracionMedicamento, 'id' | 'createdAt'>) => Promise<void>;
  eliminarAdministracion: (id: string) => Promise<void>;
  actualizarAdministracion: (id: string, datos: Partial<Pick<AdministracionMedicamento, 'firmante' | 'notas' | 'dosis' | 'createdAt'>>) => Promise<void>;
  limpiezas: LimpiezaRegistro[];
  cargarLimpiezas: (pacienteId?: string) => Promise<void>;
  agregarLimpieza: (l: Omit<LimpiezaRegistro, 'id' | 'createdAt'>) => Promise<void>;
  eliminarLimpieza: (id: string, fotoUrls?: string[]) => Promise<void>;
  actividades: ActividadPaciente[];
  cargarActividades: (pacienteId?: string) => Promise<void>;
  agregarActividad: (a: Omit<ActividadPaciente, 'id' | 'createdAt'>) => Promise<void>;
  eliminarActividad: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [signosVitales, setSignosVitales] = useState<SignoVital[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [registros, setRegistros] = useState<RegistroMedico[]>([]);
  const [horarios, setHorarios] = useState<{ [pacienteId: string]: TomaSigno[] }>({});
  const [administraciones, setAdministraciones] = useState<AdministracionMedicamento[]>([]);
  const [limpiezas, setLimpiezas] = useState<LimpiezaRegistro[]>([]);
  const [actividades, setActividades] = useState<ActividadPaciente[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargarPacientes = useCallback(async () => {
    setCargando(true);
    const data = await Storage.obtenerPacientes();
    setPacientes(data);
    setCargando(false);
  }, []);

  const cargarSignos = useCallback(async (pacienteId?: string) => {
    const data = await Storage.obtenerSignos(pacienteId);
    setSignosVitales(data);
  }, []);

  const cargarMedicamentos = useCallback(async (pacienteId?: string) => {
    const data = await Storage.obtenerMedicamentos(pacienteId);
    setMedicamentos(data);
  }, []);

  const cargarRegistros = useCallback(async (pacienteId?: string) => {
    const data = await Storage.obtenerRegistros(pacienteId);
    setRegistros(data);
  }, []);

  const cargarHorarios = useCallback(async () => {
    const data = await HorariosStorage.obtenerTodosHorarios();
    setHorarios(data);
  }, []);

  const agregarPaciente = useCallback(async (p: Omit<Paciente, 'id' | 'createdAt'>): Promise<Paciente> => {
    const nuevo = await Storage.guardarPaciente(p);
    await cargarPacientes();
    return nuevo;
  }, [cargarPacientes]);

  const actualizarPaciente = useCallback(async (id: string, datos: Partial<Omit<Paciente, 'id' | 'createdAt'>>) => {
    await Storage.actualizarPaciente(id, datos);
    await cargarPacientes();
  }, [cargarPacientes]);

  const agregarSigno = useCallback(async (s: Omit<SignoVital, 'id' | 'createdAt'>) => {
    await Storage.guardarSigno(s);
    await cargarSignos(s.pacienteId);
  }, [cargarSignos]);

  const actualizarSigno = useCallback(async (id: string, s: Partial<Omit<SignoVital, 'id' | 'createdAt' | 'pacienteId'>>) => {
    await Storage.actualizarSigno(id, s);
    const data = await Storage.obtenerSignos();
    setSignosVitales(data);
  }, []);

  const agregarMedicamento = useCallback(async (m: Omit<Medicamento, 'id' | 'createdAt'>) => {
    await Storage.guardarMedicamento(m);
    await cargarMedicamentos(m.pacienteId);
  }, [cargarMedicamentos]);

  const agregarRegistro = useCallback(async (r: Omit<RegistroMedico, 'id' | 'createdAt'>) => {
    await Storage.guardarRegistro(r);
    await cargarRegistros(r.pacienteId);
  }, [cargarRegistros]);

  const eliminarPaciente = useCallback(async (id: string) => {
    await Storage.eliminarPaciente(id);
    await cargarPacientes();
  }, [cargarPacientes]);

  const eliminarSigno = useCallback(async (id: string) => {
    await Storage.eliminarSigno(id);
    const data = await Storage.obtenerSignos();
    setSignosVitales(data);
  }, []);

  const eliminarMedicamento = useCallback(async (id: string) => {
    await Storage.eliminarMedicamento(id);
    const data = await Storage.obtenerMedicamentos();
    setMedicamentos(data);
  }, []);

  const eliminarRegistro = useCallback(async (id: string, fotoUrls?: string[]) => {
    await Storage.eliminarRegistro(id, fotoUrls);
    const data = await Storage.obtenerRegistros();
    setRegistros(data);
  }, []);

  const editarMedicamento = useCallback(async (id: string, datos: Partial<Omit<Medicamento, 'id' | 'createdAt' | 'pacienteId'>>) => {
    await Storage.actualizarMedicamento(id, datos);
    const data = await Storage.obtenerMedicamentos();
    setMedicamentos(data);
  }, []);

  const cargarAdministraciones = useCallback(async (medicamentoId?: string) => {
    const data = await AdminStorage.obtenerAdministraciones(medicamentoId);
    setAdministraciones(data);
  }, []);

  const registrarAdministracion = useCallback(async (a: Omit<AdministracionMedicamento, 'id' | 'createdAt'>) => {
    await AdminStorage.registrarAdministracion(a);
    const data = await AdminStorage.obtenerAdministraciones();
    setAdministraciones(data);
  }, []);

  const eliminarAdministracion = useCallback(async (id: string) => {
    await AdminStorage.eliminarAdministracion(id);
    const data = await AdminStorage.obtenerAdministraciones();
    setAdministraciones(data);
  }, []);

  const cargarLimpiezas = useCallback(async (pacienteId?: string) => {
    const data = await LimpiezasStorage.obtenerLimpiezas(pacienteId);
    setLimpiezas(data);
  }, []);

  const agregarLimpieza = useCallback(async (l: Omit<LimpiezaRegistro, 'id' | 'createdAt'>) => {
    await LimpiezasStorage.guardarLimpieza(l);
    await cargarLimpiezas(l.pacienteId);
  }, [cargarLimpiezas]);

  const eliminarLimpieza = useCallback(async (id: string, fotoUrls?: string[]) => {
    await LimpiezasStorage.eliminarLimpieza(id, fotoUrls);
    const data = await LimpiezasStorage.obtenerLimpiezas();
    setLimpiezas(data);
  }, []);

  const cargarActividades = useCallback(async (pacienteId?: string) => {
    const data = await ActividadesStorage.obtenerActividades(pacienteId);
    setActividades(data);
  }, []);

  const agregarActividad = useCallback(async (a: Omit<ActividadPaciente, 'id' | 'createdAt'>) => {
    await ActividadesStorage.guardarActividad(a);
    await cargarActividades(a.pacienteId);
  }, [cargarActividades]);

  const eliminarActividad = useCallback(async (id: string) => {
    await ActividadesStorage.eliminarActividad(id);
    const data = await ActividadesStorage.obtenerActividades();
    setActividades(data);
  }, []);

  const actualizarAdministracion = useCallback(async (
    id: string,
    datos: Partial<Pick<AdministracionMedicamento, 'firmante' | 'notas' | 'dosis' | 'createdAt'>>
  ) => {
    await AdminStorage.actualizarAdministracion(id, datos);
    const data = await AdminStorage.obtenerAdministraciones();
    setAdministraciones(data);
  }, []);

  const guardarTomaHorario = useCallback(async (pacienteId: string, toma: Omit<TomaSigno, 'id'>) => {
    await HorariosStorage.guardarToma(pacienteId, toma);
    await cargarHorarios();
  }, [cargarHorarios]);

  const eliminarTomaHorario = useCallback(async (pacienteId: string, tomaId: string) => {
    await HorariosStorage.eliminarToma(pacienteId, tomaId);
    await cargarHorarios();
  }, [cargarHorarios]);

  return (
    <AppContext.Provider
      value={{
        pacientes, signosVitales, medicamentos, registros, horarios, administraciones, limpiezas, actividades, cargando,
        cargarPacientes, cargarSignos, cargarMedicamentos, cargarRegistros, cargarHorarios,
        agregarPaciente, actualizarPaciente, agregarSigno, actualizarSigno, agregarMedicamento, agregarRegistro,
        eliminarPaciente, eliminarSigno, eliminarMedicamento, eliminarRegistro,
        guardarTomaHorario, eliminarTomaHorario,
        editarMedicamento, cargarAdministraciones, registrarAdministracion, eliminarAdministracion, actualizarAdministracion,
        limpiezas, cargarLimpiezas, agregarLimpieza, eliminarLimpieza,
        actividades, cargarActividades, agregarActividad, eliminarActividad,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}
