# Capa 2 — Operativo y Comunicación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar 6 módulos nuevos: Inventario de Insumos, Citas Médicas, Lista de Espera, Asistencia del Personal, Nota de Turno (Handover) y Mensajes Internos (Tablón).

**Architecture:** Cada módulo sigue el patrón existente: tipo en `types/index.ts` → storage en `src/storage/<modulo>.ts` → pantalla(s) en `src/screens/<modulo>/` → registro en `AppNavigator.tsx` → entrada en `MasScreen.tsx` y/o `CustomDrawer`. Las tablas nuevas se crean en Supabase directamente.

**Tech Stack:** React Native + Expo, TypeScript, Supabase, AsyncStorage (para estado leído/no leído de mensajes).

**Pre-requisito:** Capa 1 implementada y compilando sin errores.

---

## Task 1: Agregar tipos nuevos a types/index.ts

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Agregar tipos al final del archivo**

```typescript
// ── Inventario ────────────────────────────────────────────────────────────────
export interface Insumo {
  id: string;
  nombre: string;
  categoria: 'higiene' | 'medicamentos' | 'material_medico' | 'limpieza' | 'alimentos';
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Citas médicas ─────────────────────────────────────────────────────────────
export interface CitaMedica {
  id: string;
  pacienteId: string;
  especialidad: string;
  medico: string;
  fecha: string;       // YYYY-MM-DD
  hora: string;        // HH:MM
  lugar: string;
  observaciones?: string;
  estado: 'pendiente' | 'realizada' | 'cancelada';
  createdAt: string;
}

// ── Lista de espera ───────────────────────────────────────────────────────────
export interface SolicitanteIngreso {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string;
  diagnosticoPreliminar?: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoRelacion: string;
  prioridad: 'urgente' | 'normal';
  estado: 'en_espera' | 'admitido' | 'descartado';
  fechaSolicitud: string;
  observaciones?: string;
  createdAt: string;
}

// ── Asistencia ────────────────────────────────────────────────────────────────
export interface RegistroAsistencia {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  fecha: string;         // YYYY-MM-DD
  horaEntrada?: string;  // HH:MM
  horaSalida?: string;   // HH:MM
  observaciones?: string;
  createdAt: string;
}

// ── Handover ──────────────────────────────────────────────────────────────────
export interface NotaHandover {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  turno: 'mañana' | 'tarde' | 'noche';
  fecha: string;                  // YYYY-MM-DD
  novedades: string;
  medicamentosEventos: string;
  pendientesProximoTurno: string;
  createdAt: string;
}

// ── Mensajes internos ─────────────────────────────────────────────────────────
export interface MensajeInterno {
  id: string;
  autorId: string;
  autorNombre: string;
  titulo: string;
  cuerpo: string;
  paraRol: 'todos' | 'enfermero' | 'aseo';
  createdAt: string;
}

// ── Parámetros de navegación nuevos ──────────────────────────────────────────
export type InventarioStackParamList = {
  InventarioList: undefined;
  AgregarInsumo: { insumoId?: string } | undefined;
};

export type CitasStackParamList = {
  CitasList: { pacienteId?: string; pacienteNombre?: string } | undefined;
  AgregarCita: { pacienteId?: string; pacienteNombre?: string } | undefined;
};

export type ListaEsperaStackParamList = {
  ListaEsperaList: undefined;
  AgregarSolicitante: { solicitanteId?: string } | undefined;
};
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add types for Capa 2 modules"
```

---

## Task 2: Storage — Inventario

**Files:**
- Create: `src/storage/inventario.ts`

- [ ] **Step 1: Crear tablas en Supabase**

```sql
CREATE TABLE IF NOT EXISTS inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'higiene',
  stock_actual numeric NOT NULL DEFAULT 0,
  stock_minimo numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'unidades',
  observaciones text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

- [ ] **Step 2: Crear src/storage/inventario.ts**

```typescript
import { supabase } from '../lib/supabase';
import { Insumo } from '../types';

function rowToInsumo(row: any): Insumo {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    stockActual: Number(row.stock_actual),
    stockMinimo: Number(row.stock_minimo),
    unidad: row.unidad,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function obtenerInventario(): Promise<Insumo[]> {
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return (data ?? []).map(rowToInsumo);
}

export async function guardarInsumo(insumo: Omit<Insumo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Insumo> {
  const { data, error } = await supabase
    .from('inventario')
    .insert({
      nombre: insumo.nombre,
      categoria: insumo.categoria,
      stock_actual: insumo.stockActual,
      stock_minimo: insumo.stockMinimo,
      unidad: insumo.unidad,
      observaciones: insumo.observaciones ?? '',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToInsumo(data);
}

export async function actualizarInsumo(id: string, campos: Partial<Omit<Insumo, 'id' | 'createdAt'>>): Promise<void> {
  const update: any = { updated_at: new Date().toISOString() };
  if (campos.nombre !== undefined) update.nombre = campos.nombre;
  if (campos.categoria !== undefined) update.categoria = campos.categoria;
  if (campos.stockActual !== undefined) update.stock_actual = campos.stockActual;
  if (campos.stockMinimo !== undefined) update.stock_minimo = campos.stockMinimo;
  if (campos.unidad !== undefined) update.unidad = campos.unidad;
  if (campos.observaciones !== undefined) update.observaciones = campos.observaciones;
  const { error } = await supabase.from('inventario').update(update).eq('id', id);
  if (error) throw error;
}

export async function eliminarInsumo(id: string): Promise<void> {
  const { error } = await supabase.from('inventario').delete().eq('id', id);
  if (error) throw error;
}

export async function ajustarStock(id: string, delta: number): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('inventario')
    .select('stock_actual')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  const nuevo = Math.max(0, Number(data.stock_actual) + delta);
  const { error } = await supabase
    .from('inventario')
    .update({ stock_actual: nuevo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/storage/inventario.ts
git commit -m "feat: add inventario storage module"
```

---

## Task 3: Storage — Citas, Lista de Espera, Asistencia, Handover, Mensajes

**Files:**
- Create: `src/storage/citas.ts`
- Create: `src/storage/listaEspera.ts`
- Create: `src/storage/asistencia.ts`
- Create: `src/storage/handover.ts`
- Create: `src/storage/mensajes.ts`

- [ ] **Step 1: Crear tablas en Supabase**

```sql
CREATE TABLE IF NOT EXISTS citas_medicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  especialidad text NOT NULL,
  medico text NOT NULL,
  fecha date NOT NULL,
  hora text NOT NULL,
  lugar text NOT NULL DEFAULT '',
  observaciones text DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lista_espera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  fecha_nacimiento date,
  diagnostico_preliminar text DEFAULT '',
  contacto_nombre text NOT NULL,
  contacto_telefono text NOT NULL,
  contacto_relacion text NOT NULL DEFAULT '',
  prioridad text NOT NULL DEFAULT 'normal',
  estado text NOT NULL DEFAULT 'en_espera',
  fecha_solicitud date NOT NULL DEFAULT CURRENT_DATE,
  observaciones text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  usuario_nombre text NOT NULL,
  usuario_rol text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada text,
  hora_salida text,
  observaciones text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS handover (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  usuario_nombre text NOT NULL,
  turno text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  novedades text NOT NULL DEFAULT '',
  medicamentos_eventos text NOT NULL DEFAULT '',
  pendientes_proximo_turno text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mensajes_internos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL,
  autor_nombre text NOT NULL,
  titulo text NOT NULL,
  cuerpo text NOT NULL,
  para_rol text NOT NULL DEFAULT 'todos',
  created_at timestamptz DEFAULT now()
);
```

- [ ] **Step 2: Crear src/storage/citas.ts**

```typescript
import { supabase } from '../lib/supabase';
import { CitaMedica } from '../types';

function rowToCita(row: any): CitaMedica {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    especialidad: row.especialidad,
    medico: row.medico,
    fecha: row.fecha,
    hora: row.hora,
    lugar: row.lugar ?? '',
    observaciones: row.observaciones ?? '',
    estado: row.estado ?? 'pendiente',
    createdAt: row.created_at,
  };
}

export async function obtenerCitas(pacienteId?: string): Promise<CitaMedica[]> {
  let query = supabase.from('citas_medicas').select('*').order('fecha').order('hora');
  if (pacienteId) query = query.eq('paciente_id', pacienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToCita);
}

export async function guardarCita(cita: Omit<CitaMedica, 'id' | 'createdAt'>): Promise<CitaMedica> {
  const { data, error } = await supabase
    .from('citas_medicas')
    .insert({
      paciente_id: cita.pacienteId,
      especialidad: cita.especialidad,
      medico: cita.medico,
      fecha: cita.fecha,
      hora: cita.hora,
      lugar: cita.lugar,
      observaciones: cita.observaciones ?? '',
      estado: cita.estado,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToCita(data);
}

export async function actualizarEstadoCita(id: string, estado: CitaMedica['estado']): Promise<void> {
  const { error } = await supabase.from('citas_medicas').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function eliminarCita(id: string): Promise<void> {
  const { error } = await supabase.from('citas_medicas').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: Crear src/storage/listaEspera.ts**

```typescript
import { supabase } from '../lib/supabase';
import { SolicitanteIngreso } from '../types';

function rowToSolicitante(row: any): SolicitanteIngreso {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    fechaNacimiento: row.fecha_nacimiento ?? undefined,
    diagnosticoPreliminar: row.diagnostico_preliminar ?? '',
    contactoNombre: row.contacto_nombre,
    contactoTelefono: row.contacto_telefono,
    contactoRelacion: row.contacto_relacion,
    prioridad: row.prioridad ?? 'normal',
    estado: row.estado ?? 'en_espera',
    fechaSolicitud: row.fecha_solicitud,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerListaEspera(): Promise<SolicitanteIngreso[]> {
  const { data, error } = await supabase
    .from('lista_espera')
    .select('*')
    .order('prioridad')
    .order('fecha_solicitud');
  if (error) throw error;
  return (data ?? []).map(rowToSolicitante);
}

export async function guardarSolicitante(s: Omit<SolicitanteIngreso, 'id' | 'createdAt'>): Promise<SolicitanteIngreso> {
  const { data, error } = await supabase
    .from('lista_espera')
    .insert({
      nombre: s.nombre,
      apellido: s.apellido,
      fecha_nacimiento: s.fechaNacimiento ?? null,
      diagnostico_preliminar: s.diagnosticoPreliminar ?? '',
      contacto_nombre: s.contactoNombre,
      contacto_telefono: s.contactoTelefono,
      contacto_relacion: s.contactoRelacion,
      prioridad: s.prioridad,
      estado: s.estado,
      fecha_solicitud: s.fechaSolicitud,
      observaciones: s.observaciones ?? '',
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSolicitante(data);
}

export async function actualizarEstadoSolicitante(id: string, estado: SolicitanteIngreso['estado']): Promise<void> {
  const { error } = await supabase.from('lista_espera').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function eliminarSolicitante(id: string): Promise<void> {
  const { error } = await supabase.from('lista_espera').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 4: Crear src/storage/asistencia.ts**

```typescript
import { supabase } from '../lib/supabase';
import { RegistroAsistencia } from '../types';

function rowToAsistencia(row: any): RegistroAsistencia {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre,
    usuarioRol: row.usuario_rol ?? '',
    fecha: row.fecha,
    horaEntrada: row.hora_entrada ?? undefined,
    horaSalida: row.hora_salida ?? undefined,
    observaciones: row.observaciones ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerAsistencia(fecha: string): Promise<RegistroAsistencia[]> {
  const { data, error } = await supabase
    .from('asistencia')
    .select('*')
    .eq('fecha', fecha)
    .order('usuario_nombre');
  if (error) throw error;
  return (data ?? []).map(rowToAsistencia);
}

export async function obtenerAsistenciaRango(desde: string, hasta: string): Promise<RegistroAsistencia[]> {
  const { data, error } = await supabase
    .from('asistencia')
    .select('*')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha')
    .order('usuario_nombre');
  if (error) throw error;
  return (data ?? []).map(rowToAsistencia);
}

export async function registrarEntrada(usuarioId: string, usuarioNombre: string, usuarioRol: string): Promise<RegistroAsistencia> {
  const hoy = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 5);
  // Buscar si ya existe un registro para hoy
  const { data: existente } = await supabase
    .from('asistencia')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('fecha', hoy)
    .single();
  if (existente) {
    const { data, error } = await supabase
      .from('asistencia')
      .update({ hora_entrada: hora })
      .eq('id', existente.id)
      .select()
      .single();
    if (error) throw error;
    return rowToAsistencia(data);
  }
  const { data, error } = await supabase
    .from('asistencia')
    .insert({ usuario_id: usuarioId, usuario_nombre: usuarioNombre, usuario_rol: usuarioRol, fecha: hoy, hora_entrada: hora })
    .select()
    .single();
  if (error) throw error;
  return rowToAsistencia(data);
}

export async function registrarSalida(usuarioId: string): Promise<void> {
  const hoy = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 5);
  const { error } = await supabase
    .from('asistencia')
    .update({ hora_salida: hora })
    .eq('usuario_id', usuarioId)
    .eq('fecha', hoy);
  if (error) throw error;
}
```

- [ ] **Step 5: Crear src/storage/handover.ts**

```typescript
import { supabase } from '../lib/supabase';
import { NotaHandover } from '../types';

function rowToHandover(row: any): NotaHandover {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre,
    turno: row.turno,
    fecha: row.fecha,
    novedades: row.novedades ?? '',
    medicamentosEventos: row.medicamentos_eventos ?? '',
    pendientesProximoTurno: row.pendientes_proximo_turno ?? '',
    createdAt: row.created_at,
  };
}

export async function obtenerUltimoHandover(): Promise<NotaHandover | null> {
  const { data, error } = await supabase
    .from('handover')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return rowToHandover(data);
}

export async function obtenerHandoverPorFechaTurno(fecha: string, turno: string, usuarioId: string): Promise<NotaHandover | null> {
  const { data, error } = await supabase
    .from('handover')
    .select('*')
    .eq('fecha', fecha)
    .eq('turno', turno)
    .eq('usuario_id', usuarioId)
    .single();
  if (error) return null;
  return rowToHandover(data);
}

export async function guardarHandover(nota: Omit<NotaHandover, 'id' | 'createdAt'>): Promise<NotaHandover> {
  const existente = await obtenerHandoverPorFechaTurno(nota.fecha, nota.turno, nota.usuarioId);
  if (existente) {
    const { data, error } = await supabase
      .from('handover')
      .update({
        novedades: nota.novedades,
        medicamentos_eventos: nota.medicamentosEventos,
        pendientes_proximo_turno: nota.pendientesProximoTurno,
      })
      .eq('id', existente.id)
      .select()
      .single();
    if (error) throw error;
    return rowToHandover(data);
  }
  const { data, error } = await supabase
    .from('handover')
    .insert({
      usuario_id: nota.usuarioId,
      usuario_nombre: nota.usuarioNombre,
      turno: nota.turno,
      fecha: nota.fecha,
      novedades: nota.novedades,
      medicamentos_eventos: nota.medicamentosEventos,
      pendientes_proximo_turno: nota.pendientesProximoTurno,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToHandover(data);
}

export async function obtenerHandovers(limite = 10): Promise<NotaHandover[]> {
  const { data, error } = await supabase
    .from('handover')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map(rowToHandover);
}
```

- [ ] **Step 6: Crear src/storage/mensajes.ts**

```typescript
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MensajeInterno } from '../types';

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
  const { data, error } = await supabase
    .from('mensajes_internos')
    .insert({
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
```

- [ ] **Step 7: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/storage/citas.ts src/storage/listaEspera.ts src/storage/asistencia.ts src/storage/handover.ts src/storage/mensajes.ts
git commit -m "feat: add storage modules for Capa 2"
```

---

## Task 3: Pantallas de Inventario

**Files:**
- Create: `src/screens/inventario/InventarioScreen.tsx`
- Create: `src/screens/inventario/AgregarInsumoScreen.tsx`

- [ ] **Step 1: Crear InventarioScreen.tsx**

```typescript
// src/screens/inventario/InventarioScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { Insumo } from '../../types';
import { obtenerInventario, ajustarStock } from '../../storage/inventario';

const CATEGORIAS = ['todos', 'higiene', 'medicamentos', 'material_medico', 'limpieza', 'alimentos'] as const;
const CAT_LABELS: Record<string, string> = {
  todos: 'Todos', higiene: 'Higiene', medicamentos: 'Medicamentos',
  material_medico: 'Material Médico', limpieza: 'Limpieza', alimentos: 'Alimentos',
};

function estadoInsumo(i: Insumo): 'bajo' | 'alerta' | 'ok' {
  if (i.stockActual <= i.stockMinimo) return 'bajo';
  if (i.stockActual <= i.stockMinimo * 1.5) return 'alerta';
  return 'ok';
}

export default function InventarioScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [ajusteModal, setAjusteModal] = useState<{ insumo: Insumo; tipo: '+' | '-' } | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setInsumos(await obtenerInventario()); } catch { /* silencioso */ }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const filtrados = insumos.filter(i => categoriaFiltro === 'todos' || i.categoria === categoriaFiltro);
  const bajosCount = insumos.filter(i => estadoInsumo(i) === 'bajo').length;

  async function confirmarAjuste() {
    if (!ajusteModal) return;
    const cant = parseFloat(cantidadAjuste);
    if (isNaN(cant) || cant <= 0) { Alert.alert('Error', 'Ingresá una cantidad válida.'); return; }
    const delta = ajusteModal.tipo === '+' ? cant : -cant;
    try {
      await ajustarStock(ajusteModal.insumo.id, delta);
      await cargar();
    } catch { Alert.alert('Error', 'No se pudo ajustar el stock.'); }
    setAjusteModal(null);
    setCantidadAjuste('');
  }

  const colorEstado = { bajo: COLORS.danger, alerta: COLORS.warning, ok: COLORS.secondary };
  const bgEstado = { bajo: '#FFEBEE', alerta: '#FFF3E0', ok: '#E8F5E9' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Resumen */}
      <View style={[styles.resumen, { backgroundColor: colors.surface }]}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: COLORS.danger }]}>{bajosCount}</Text>
          <Text style={styles.resumenLabel}>Stock bajo</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: COLORS.primary }]}>{insumos.length}</Text>
          <Text style={styles.resumenLabel}>Total</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.agregarBtn}
            onPress={() => navigation.navigate('AgregarInsumo')}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.agregarBtnTexto}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro categorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroScroll} contentContainerStyle={styles.filtroContent}>
        {CATEGORIAS.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filtroChip, categoriaFiltro === cat && styles.filtroChipActivo]}
            onPress={() => setCategoriaFiltro(cat)}
          >
            <Text style={[styles.filtroChipTexto, categoriaFiltro === cat && styles.filtroChipTextoActivo]}>
              {CAT_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {filtrados.length === 0 && (
          <Text style={styles.vacio}>No hay insumos en esta categoría.</Text>
        )}
        {filtrados.map(insumo => {
          const est = estadoInsumo(insumo);
          return (
            <View key={insumo.id} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colorEstado[est] }]}>
              <View style={[styles.cardEstado, { backgroundColor: bgEstado[est] }]}>
                <MaterialCommunityIcons
                  name={est === 'bajo' ? 'alert' : est === 'alerta' ? 'alert-circle-outline' : 'check-circle'}
                  size={20}
                  color={colorEstado[est]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardNombre, { color: colors.textPrimary }]}>{insumo.nombre}</Text>
                <Text style={styles.cardCategoria}>{CAT_LABELS[insumo.categoria]}</Text>
                <Text style={[styles.cardStock, { color: colorEstado[est] }]}>
                  {insumo.stockActual} {insumo.unidad} (mín. {insumo.stockMinimo})
                </Text>
              </View>
              <View style={styles.cardAcciones}>
                <TouchableOpacity onPress={() => { setAjusteModal({ insumo, tipo: '+' }); setCantidadAjuste(''); }} style={styles.btnAjuste}>
                  <MaterialCommunityIcons name="plus" size={18} color={COLORS.secondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAjusteModal({ insumo, tipo: '-' }); setCantidadAjuste(''); }} style={styles.btnAjuste}>
                  <MaterialCommunityIcons name="minus" size={18} color={COLORS.danger} />
                </TouchableOpacity>
                {isAdmin && (
                  <TouchableOpacity onPress={() => navigation.navigate('AgregarInsumo', { insumoId: insumo.id })} style={styles.btnAjuste}>
                    <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal ajuste de stock */}
      <Modal visible={!!ajusteModal} transparent animationType="fade" onRequestClose={() => setAjusteModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalTitulo}>
              {ajusteModal?.tipo === '+' ? 'Entrada de stock' : 'Salida de stock'} — {ajusteModal?.insumo.nombre}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: COLORS.border }]}
              placeholder="Cantidad"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              value={cantidadAjuste}
              onChangeText={setCantidadAjuste}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setAjusteModal(null)}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirmar} onPress={confirmarAjuste}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  resumen: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  resumenItem: { alignItems: 'center' },
  resumenNum: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  agregarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 'auto',
  },
  agregarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },
  filtroScroll: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filtroContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  filtroChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  filtroChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroChipTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  filtroChipTextoActivo: { color: '#fff' },
  lista: { padding: 12, gap: 8 },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12, borderLeftWidth: 4,
    elevation: 1,
  },
  cardEstado: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardNombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  cardCategoria: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  cardStock: { fontSize: FONT_SIZES.sm, fontWeight: '600', marginTop: 2 },
  cardAcciones: { flexDirection: 'row', gap: 4 },
  btnAjuste: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: 300, borderRadius: 16, padding: 20, gap: 16 },
  modalTitulo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  modalInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: FONT_SIZES.md,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancelar: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  modalBtnConfirmar: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
});
```

- [ ] **Step 2: Crear AgregarInsumoScreen.tsx**

```typescript
// src/screens/inventario/AgregarInsumoScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { Insumo } from '../../types';
import { obtenerInventario, guardarInsumo, actualizarInsumo, eliminarInsumo } from '../../storage/inventario';
import { TouchableOpacity } from 'react-native';

const CATEGORIAS: Insumo['categoria'][] = ['higiene', 'medicamentos', 'material_medico', 'limpieza', 'alimentos'];
const CAT_LABELS: Record<string, string> = {
  higiene: 'Higiene', medicamentos: 'Medicamentos',
  material_medico: 'Material Médico', limpieza: 'Limpieza', alimentos: 'Alimentos',
};

export default function AgregarInsumoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const insumoId = route.params?.insumoId as string | undefined;
  const esEdicion = !!insumoId;

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<Insumo['categoria']>('higiene');
  const [stockActual, setStockActual] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('5');
  const [unidad, setUnidad] = useState('unidades');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!insumoId) return;
    obtenerInventario().then(lista => {
      const i = lista.find(x => x.id === insumoId);
      if (!i) return;
      setNombre(i.nombre);
      setCategoria(i.categoria);
      setStockActual(String(i.stockActual));
      setStockMinimo(String(i.stockMinimo));
      setUnidad(i.unidad);
      setObservaciones(i.observaciones ?? '');
    });
  }, [insumoId]);

  async function handleGuardar() {
    if (!nombre.trim()) { Alert.alert('Error', 'El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      if (esEdicion) {
        await actualizarInsumo(insumoId!, {
          nombre: nombre.trim(), categoria,
          stockActual: parseFloat(stockActual) || 0,
          stockMinimo: parseFloat(stockMinimo) || 0,
          unidad: unidad.trim(), observaciones: observaciones.trim(),
        });
      } else {
        await guardarInsumo({
          nombre: nombre.trim(), categoria,
          stockActual: parseFloat(stockActual) || 0,
          stockMinimo: parseFloat(stockMinimo) || 0,
          unidad: unidad.trim(), observaciones: observaciones.trim(),
        });
      }
      navigation.goBack();
    } catch { Alert.alert('Error', 'No se pudo guardar el insumo.'); }
    setGuardando(false);
  }

  async function handleEliminar() {
    Alert.alert('Eliminar insumo', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await eliminarInsumo(insumoId!); navigation.goBack(); }
        catch { Alert.alert('Error', 'No se pudo eliminar.'); }
      }},
    ]);
  }

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextInput label="Nombre del insumo *" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Text style={styles.label}>Categoría</Text>
      <View style={styles.chips}>
        {CATEGORIAS.map(cat => (
          <TouchableOpacity key={cat} style={[styles.chip, categoria === cat && styles.chipActivo]} onPress={() => setCategoria(cat)}>
            <Text style={[styles.chipTexto, categoria === cat && styles.chipTextoActivo]}>{CAT_LABELS[cat]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.fila}>
        <TextInput label="Stock actual" value={stockActual} onChangeText={setStockActual} keyboardType="numeric" mode="outlined" style={[styles.input, { flex: 1 }]} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
        <TextInput label="Stock mínimo" value={stockMinimo} onChangeText={setStockMinimo} keyboardType="numeric" mode="outlined" style={[styles.input, { flex: 1 }]} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      </View>

      <TextInput label="Unidad (ej: unidades, cajas)" value={unidad} onChangeText={setUnidad} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Observaciones" value={observaciones} onChangeText={setObservaciones} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.btnGuardar} contentStyle={{ height: 52 }}>
        {esEdicion ? 'Guardar Cambios' : 'Agregar Insumo'}
      </Button>

      {esEdicion && isAdmin && (
        <Button mode="outlined" onPress={handleEliminar} style={styles.btnEliminar} textColor={COLORS.danger}>
          Eliminar insumo
        </Button>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  fila: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextoActivo: { color: '#fff' },
  btnGuardar: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 10 },
  btnEliminar: { marginTop: 8, borderColor: COLORS.danger, borderRadius: 10 },
});
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/inventario/
git commit -m "feat: add InventarioScreen and AgregarInsumoScreen"
```

---

## Task 4: Pantalla HandoverScreen

**Files:**
- Create: `src/screens/turnos/HandoverScreen.tsx`

- [ ] **Step 1: Crear HandoverScreen.tsx**

```typescript
// src/screens/turnos/HandoverScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { NotaHandover } from '../../types';
import { obtenerUltimoHandover, guardarHandover } from '../../storage/handover';

const TURNOS: { value: NotaHandover['turno']; label: string; horas: string }[] = [
  { value: 'mañana', label: 'Mañana', horas: '07:00 - 15:00' },
  { value: 'tarde', label: 'Tarde', horas: '15:00 - 23:00' },
  { value: 'noche', label: 'Noche', horas: '23:00 - 07:00' },
];

function turnoActual(): NotaHandover['turno'] {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return 'mañana';
  if (h >= 15 && h < 23) return 'tarde';
  return 'noche';
}

export default function HandoverScreen() {
  const { usuario } = useAuth();
  const { colors } = useAppTheme();
  const [ultimaNota, setUltimaNota] = useState<NotaHandover | null>(null);
  const [modo, setModo] = useState<'ver' | 'editar'>('ver');
  const [turno, setTurno] = useState<NotaHandover['turno']>(turnoActual());
  const [novedades, setNovedades] = useState('');
  const [medicamentosEventos, setMedicamentosEventos] = useState('');
  const [pendientes, setPendientes] = useState('');
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(useCallback(() => {
    obtenerUltimoHandover().then(n => setUltimaNota(n));
  }, []));

  async function handleGuardar() {
    if (!usuario) return;
    setGuardando(true);
    try {
      await guardarHandover({
        usuarioId: usuario.id,
        usuarioNombre: `${usuario.nombre} ${usuario.apellido}`,
        turno,
        fecha: new Date().toISOString().slice(0, 10),
        novedades: novedades.trim(),
        medicamentosEventos: medicamentosEventos.trim(),
        pendientesProximoTurno: pendientes.trim(),
      });
      Alert.alert('Guardado', 'Nota de turno guardada correctamente.');
      setModo('ver');
      obtenerUltimoHandover().then(n => setUltimaNota(n));
    } catch {
      Alert.alert('Error', 'No se pudo guardar la nota.');
    }
    setGuardando(false);
  }

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Última nota recibida */}
      {ultimaNota && modo === 'ver' && (
        <View style={[styles.notaCard, { backgroundColor: colors.surface }]}>
          <View style={styles.notaHeader}>
            <MaterialCommunityIcons name="transfer" size={20} color={COLORS.primary} />
            <Text style={styles.notaTitulo}>Nota del turno anterior</Text>
          </View>
          <Text style={styles.notaMeta}>
            {ultimaNota.usuarioNombre} · Turno {ultimaNota.turno} · {ultimaNota.fecha}
          </Text>
          {ultimaNota.novedades ? (
            <View style={styles.campoBloque}>
              <Text style={styles.campoLabel}>📍 Novedades</Text>
              <Text style={[styles.campoTexto, { color: colors.textPrimary }]}>{ultimaNota.novedades}</Text>
            </View>
          ) : null}
          {ultimaNota.medicamentosEventos ? (
            <View style={styles.campoBloque}>
              <Text style={styles.campoLabel}>💊 Medicamentos / Eventos</Text>
              <Text style={[styles.campoTexto, { color: colors.textPrimary }]}>{ultimaNota.medicamentosEventos}</Text>
            </View>
          ) : null}
          {ultimaNota.pendientesProximoTurno ? (
            <View style={styles.campoBloque}>
              <Text style={styles.campoLabel}>⚠️ Pendientes para el próximo turno</Text>
              <Text style={[styles.campoTexto, { color: colors.textPrimary }]}>{ultimaNota.pendientesProximoTurno}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Formulario nueva nota */}
      {modo === 'editar' ? (
        <>
          <Text style={styles.seccion}>Mi nota de turno</Text>

          <View style={styles.turnosRow}>
            {TURNOS.map(t => (
              <View
                key={t.value}
                style={[styles.turnoChip, turno === t.value && styles.turnoChipActivo]}
              >
                <Text style={[styles.turnoChipTexto, turno === t.value && { color: '#fff' }]}>
                  {t.label}
                </Text>
              </View>
            ))}
          </View>

          <TextInput
            label="Novedades del turno"
            value={novedades}
            onChangeText={setNovedades}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            placeholder="¿Qué ocurrió durante tu turno?"
          />
          <TextInput
            label="Medicamentos / Eventos a destacar"
            value={medicamentosEventos}
            onChangeText={setMedicamentosEventos}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            placeholder="Rechazos, cambios, dosis especiales..."
          />
          <TextInput
            label="Pendientes para el próximo turno"
            value={pendientes}
            onChangeText={setPendientes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            placeholder="Curas, controles, avisos pendientes..."
          />

          <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.btnGuardar} contentStyle={{ height: 52 }}>
            Guardar nota de turno
          </Button>
          <Button mode="text" onPress={() => setModo('ver')} style={{ marginTop: 4 }}>Cancelar</Button>
        </>
      ) : (
        <Button
          mode="contained"
          icon="plus"
          onPress={() => setModo('editar')}
          style={[styles.btnGuardar, { marginTop: 16 }]}
          contentStyle={{ height: 52 }}
        >
          Crear nota de mi turno
        </Button>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  notaCard: { borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, gap: 8 },
  notaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notaTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.primary },
  notaMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  campoBloque: { gap: 2 },
  campoLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  campoTexto: { fontSize: FONT_SIZES.sm, lineHeight: 20 },
  seccion: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  turnosRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  turnoChip: { flex: 1, padding: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  turnoChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  turnoChipTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  input: { marginBottom: 10, backgroundColor: 'transparent' },
  btnGuardar: { backgroundColor: COLORS.primary, borderRadius: 10 },
});
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/turnos/HandoverScreen.tsx
git commit -m "feat: add HandoverScreen"
```

---

## Task 5: Pantalla MensajesScreen

**Files:**
- Create: `src/screens/mensajes/MensajesScreen.tsx`

- [ ] **Step 1: Crear MensajesScreen.tsx**

```typescript
// src/screens/mensajes/MensajesScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { MensajeInterno } from '../../types';
import { obtenerMensajes, publicarMensaje, eliminarMensaje, marcarLeido, obtenerLeidos } from '../../storage/mensajes';

const ROL_LABELS: Record<string, string> = { todos: 'Todos', enfermero: 'Enfermeros', aseo: 'Aseo' };

export default function MensajesScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const [mensajes, setMensajes] = useState<MensajeInterno[]>([]);
  const [leidos, setLeidos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [paraRol, setParaRol] = useState<MensajeInterno['paraRol']>('todos');
  const [modoPublicar, setModoPublicar] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const lista = await obtenerMensajes(usuario.rol);
      setMensajes(lista);
      const leidosIds = await obtenerLeidos();
      setLeidos(leidosIds);
      // Marcar como leídos al cargar
      await Promise.all(lista.map(m => marcarLeido(m.id)));
    } catch { /* silencioso */ }
    setCargando(false);
  }, [usuario]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function handlePublicar() {
    if (!titulo.trim() || !cuerpo.trim()) { Alert.alert('Error', 'Completá título y mensaje.'); return; }
    if (!usuario) return;
    setPublicando(true);
    try {
      await publicarMensaje({ autorId: usuario.id, autorNombre: `${usuario.nombre} ${usuario.apellido}`, titulo: titulo.trim(), cuerpo: cuerpo.trim(), paraRol });
      setTitulo(''); setCuerpo(''); setModoPublicar(false);
      await cargar();
    } catch { Alert.alert('Error', 'No se pudo publicar el mensaje.'); }
    setPublicando(false);
  }

  async function handleEliminar(id: string) {
    Alert.alert('Eliminar mensaje', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await eliminarMensaje(id); await cargar(); }
        catch { Alert.alert('Error', 'No se pudo eliminar.'); }
      }},
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {isAdmin && !modoPublicar && (
          <TouchableOpacity style={styles.publicarBtn} onPress={() => setModoPublicar(true)}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.publicarBtnTexto}>Publicar mensaje</Text>
          </TouchableOpacity>
        )}

        {isAdmin && modoPublicar && (
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.formTitulo}>Nuevo mensaje</Text>
            <TextInput label="Título" value={titulo} onChangeText={setTitulo} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
            <TextInput label="Mensaje" value={cuerpo} onChangeText={setCuerpo} mode="outlined" multiline numberOfLines={4} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

            <Text style={styles.rolLabel}>Para:</Text>
            <View style={styles.rolesRow}>
              {(['todos', 'enfermero', 'aseo'] as const).map(r => (
                <TouchableOpacity key={r} style={[styles.rolChip, paraRol === r && styles.rolChipActivo]} onPress={() => setParaRol(r)}>
                  <Text style={[styles.rolChipTexto, paraRol === r && { color: '#fff' }]}>{ROL_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button mode="outlined" onPress={() => setModoPublicar(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handlePublicar} loading={publicando} style={{ flex: 1, backgroundColor: COLORS.primary }}>Publicar</Button>
            </View>
          </View>
        )}

        {mensajes.length === 0 && !cargando && (
          <Text style={styles.vacio}>No hay mensajes publicados.</Text>
        )}

        {mensajes.map(m => {
          const noLeido = !leidos.includes(m.id);
          return (
            <View key={m.id} style={[styles.mensajeCard, { backgroundColor: colors.surface }, noLeido && styles.noLeido]}>
              <View style={styles.mensajeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mensajeTitulo, { color: colors.textPrimary }]}>
                    {noLeido && <Text style={{ color: COLORS.primary }}>● </Text>}{m.titulo}
                  </Text>
                  <Text style={styles.mensajeMeta}>{m.autorNombre} · {ROL_LABELS[m.paraRol]} · {m.createdAt.slice(0, 10)}</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => handleEliminar(m.id)}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.mensajeCuerpo, { color: colors.textPrimary }]}>{m.cuerpo}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { padding: 12, gap: 10 },
  publicarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, justifyContent: 'center' },
  publicarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.md },
  formCard: { borderRadius: 14, padding: 16, elevation: 2, gap: 4 },
  formTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  input: { marginBottom: 8, backgroundColor: 'transparent' },
  rolLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  rolesRow: { flexDirection: 'row', gap: 8 },
  rolChip: { flex: 1, padding: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  rolChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rolChipTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  mensajeCard: { borderRadius: 14, padding: 14, elevation: 1, gap: 6 },
  noLeido: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  mensajeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mensajeTitulo: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  mensajeMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  mensajeCuerpo: { fontSize: FONT_SIZES.sm, lineHeight: 20 },
});
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/mensajes/MensajesScreen.tsx
git commit -m "feat: add MensajesScreen"
```

---

## Task 6: Pantallas CitasMedicasScreen y AgregarCitaScreen

**Files:**
- Create: `src/screens/citas/CitasMedicasScreen.tsx`
- Create: `src/screens/citas/AgregarCitaScreen.tsx`

- [ ] **Step 1: Crear CitasMedicasScreen.tsx**

```typescript
// src/screens/citas/CitasMedicasScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { CitaMedica } from '../../types';
import { obtenerCitas, actualizarEstadoCita, eliminarCita } from '../../storage/citas';

const ESTADO_COLORS: Record<CitaMedica['estado'], string> = {
  pendiente: COLORS.warning, realizada: COLORS.secondary, cancelada: COLORS.textSecondary,
};
const ESTADO_LABELS: Record<CitaMedica['estado'], string> = {
  pendiente: 'Pendiente', realizada: 'Realizada', cancelada: 'Cancelada',
};

export default function CitasMedicasScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { pacientes } = useApp();
  const { colors } = useAppTheme();
  const pacienteId = route.params?.pacienteId as string | undefined;
  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [cargando, setCargando] = useState(false);
  const [tab, setTab] = useState<'proximas' | 'historial'>('proximas');

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setCitas(await obtenerCitas(pacienteId)); } catch { /* silencioso */ }
    setCargando(false);
  }, [pacienteId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const hoyISO = new Date().toISOString().slice(0, 10);
  const proximas = citas.filter(c => c.fecha >= hoyISO && c.estado === 'pendiente');
  const historial = citas.filter(c => c.fecha < hoyISO || c.estado !== 'pendiente');
  const citasMostradas = tab === 'proximas' ? proximas : historial;

  function nombrePaciente(id: string) {
    const p = pacientes.find(p => p.id === id);
    return p ? `${p.nombre} ${p.apellido}` : '—';
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        {(['proximas', 'historial'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActivo]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTexto, tab === t && styles.tabTextoActivo]}>
              {t === 'proximas' ? `Próximas (${proximas.length})` : `Historial (${historial.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.agregarBtn} onPress={() => navigation.navigate('AgregarCita', { pacienteId, pacienteNombre: route.params?.pacienteNombre })}>
        <MaterialCommunityIcons name="plus" size={18} color="#fff" />
        <Text style={styles.agregarBtnTexto}>Nueva cita</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {citasMostradas.length === 0 && <Text style={styles.vacio}>No hay citas en esta sección.</Text>}
        {citasMostradas.map(cita => {
          const color = ESTADO_COLORS[cita.estado];
          return (
            <View key={cita.id} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: color }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardFecha, { color }]}>{cita.fecha} · {cita.hora}</Text>
                  <Text style={[styles.cardEspecialidad, { color: colors.textPrimary }]}>{cita.especialidad}</Text>
                  <Text style={styles.cardMedico}>{cita.medico}</Text>
                  {!pacienteId && <Text style={styles.cardPaciente}>{nombrePaciente(cita.pacienteId)}</Text>}
                  {cita.lugar ? <Text style={styles.cardLugar}>{cita.lugar}</Text> : null}
                  {cita.observaciones ? <Text style={styles.cardObs}>{cita.observaciones}</Text> : null}
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.estadoTexto, { color }]}>{ESTADO_LABELS[cita.estado]}</Text>
                </View>
              </View>
              {cita.estado === 'pendiente' && (
                <View style={styles.acciones}>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => actualizarEstadoCita(cita.id, 'realizada').then(cargar)}>
                    <Text style={{ color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Marcar realizada</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => actualizarEstadoCita(cita.id, 'cancelada').then(cargar)}>
                    <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('Eliminar', '¿Eliminar cita?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => eliminarCita(cita.id).then(cargar) }])}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActivo: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabTexto: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  tabTextoActivo: { color: COLORS.primary },
  agregarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, margin: 12, borderRadius: 10, padding: 10, justifyContent: 'center' },
  agregarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },
  lista: { paddingHorizontal: 12, paddingBottom: 20, gap: 8 },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardFecha: { fontSize: FONT_SIZES.xs, fontWeight: '800', marginBottom: 2 },
  cardEspecialidad: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  cardMedico: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  cardPaciente: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },
  cardLugar: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  cardObs: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  estadoTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  accionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});
```

- [ ] **Step 2: Crear AgregarCitaScreen.tsx**

```typescript
// src/screens/citas/AgregarCitaScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { guardarCita } from '../../storage/citas';

export default function AgregarCitaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { pacientes } = useApp();
  const { colors } = useAppTheme();
  const pacienteIdInicial = route.params?.pacienteId as string | undefined;

  const [pacienteId, setPacienteId] = useState(pacienteIdInicial ?? '');
  const [especialidad, setEspecialidad] = useState('');
  const [medico, setMedico] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hora, setHora] = useState('09:00');
  const [lugar, setLugar] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    if (!pacienteId || !especialidad.trim() || !medico.trim()) {
      Alert.alert('Error', 'Paciente, especialidad y médico son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      await guardarCita({
        pacienteId,
        especialidad: especialidad.trim(),
        medico: medico.trim(),
        fecha: fecha.toISOString().slice(0, 10),
        hora: hora.trim(),
        lugar: lugar.trim(),
        observaciones: observaciones.trim(),
        estado: 'pendiente',
      });
      navigation.goBack();
    } catch { Alert.alert('Error', 'No se pudo guardar la cita.'); }
    setGuardando(false);
  }

  const pacientesActivos = pacientes.filter(p => !p.fallecido);

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {!pacienteIdInicial && (
        <>
          <Text style={styles.label}>Paciente *</Text>
          <View style={styles.selector}>
            {pacientesActivos.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.pacienteChip, pacienteId === p.id && styles.pacienteChipActivo]}
                onPress={() => setPacienteId(p.id)}
              >
                <Text style={[styles.pacienteChipTexto, pacienteId === p.id && { color: '#fff' }]}>
                  {p.nombre} {p.apellido}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TextInput label="Especialidad *" value={especialidad} onChangeText={setEspecialidad} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="Ej: Cardiología, Traumatología" />
      <TextInput label="Médico *" value={medico} onChangeText={setMedico} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="Ej: Dr. García" />

      <Text style={styles.label}>Fecha</Text>
      <TouchableOpacity style={[styles.dateBtn, { backgroundColor: colors.surface }]} onPress={() => setShowDatePicker(true)}>
        <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{fecha.toLocaleDateString('es-AR')}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker value={fecha} mode="date" minimumDate={new Date()} onChange={(_, d) => { setShowDatePicker(false); if (d) setFecha(d); }} />
      )}

      <TextInput label="Hora (HH:MM)" value={hora} onChangeText={setHora} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} placeholder="09:00" />
      <TextInput label="Lugar" value={lugar} onChangeText={setLugar} mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Observaciones" value={observaciones} onChangeText={setObservaciones} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Button mode="contained" onPress={handleGuardar} loading={guardando} style={styles.btnGuardar} contentStyle={{ height: 52 }}>
        Guardar Cita
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pacienteChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  pacienteChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pacienteChipTexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  btnGuardar: { backgroundColor: COLORS.primary, borderRadius: 10 },
});
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/citas/
git commit -m "feat: add CitasMedicasScreen and AgregarCitaScreen"
```

---

## Task 7: Pantallas ListaEsperaScreen y AsistenciaScreen

**Files:**
- Create: `src/screens/listaEspera/ListaEsperaScreen.tsx`
- Create: `src/screens/asistencia/AsistenciaScreen.tsx`

- [ ] **Step 1: Crear ListaEsperaScreen.tsx**

```typescript
// src/screens/listaEspera/ListaEsperaScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { SolicitanteIngreso } from '../../types';
import { obtenerListaEspera, guardarSolicitante, actualizarEstadoSolicitante, eliminarSolicitante } from '../../storage/listaEspera';

export default function ListaEsperaScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [solicitantes, setSolicitantes] = useState<SolicitanteIngreso[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState<SolicitanteIngreso['estado'] | 'todos'>('en_espera');
  const [modoAgregar, setModoAgregar] = useState(false);
  // Formulario
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoRelacion, setContactoRelacion] = useState('');
  const [prioridad, setPrioridad] = useState<SolicitanteIngreso['prioridad']>('normal');
  const [diagnostico, setDiagnostico] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setSolicitantes(await obtenerListaEspera()); } catch { /* silencioso */ }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const filtrados = solicitantes.filter(s => filtro === 'todos' || s.estado === filtro);

  async function handleGuardar() {
    if (!nombre.trim() || !apellido.trim() || !contactoNombre.trim() || !contactoTelefono.trim()) {
      Alert.alert('Error', 'Nombre, apellido y contacto son obligatorios.'); return;
    }
    setGuardando(true);
    try {
      await guardarSolicitante({
        nombre: nombre.trim(), apellido: apellido.trim(),
        contactoNombre: contactoNombre.trim(), contactoTelefono: contactoTelefono.trim(),
        contactoRelacion: contactoRelacion.trim(), prioridad,
        diagnosticoPreliminar: diagnostico.trim(),
        estado: 'en_espera',
        fechaSolicitud: new Date().toISOString().slice(0, 10),
      });
      setNombre(''); setApellido(''); setContactoNombre(''); setContactoTelefono(''); setContactoRelacion(''); setDiagnostico('');
      setModoAgregar(false);
      await cargar();
    } catch { Alert.alert('Error', 'No se pudo guardar.'); }
    setGuardando(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.filtrosRow, { backgroundColor: colors.surface }]}>
        {(['en_espera', 'admitido', 'descartado', 'todos'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filtroChip, filtro === f && styles.filtroChipActivo]} onPress={() => setFiltro(f)}>
            <Text style={[styles.filtroTexto, filtro === f && { color: '#fff' }]}>
              {f === 'en_espera' ? 'En espera' : f === 'admitido' ? 'Admitidos' : f === 'descartado' ? 'Descartados' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]} refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}>

        {!modoAgregar && (
          <TouchableOpacity style={styles.agregarBtn} onPress={() => setModoAgregar(true)}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.agregarBtnTexto}>Agregar a lista de espera</Text>
          </TouchableOpacity>
        )}

        {modoAgregar && (
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <Text style={styles.formTitulo}>Nuevo solicitante</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.inputRaw, { flex: 1, color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Nombre" placeholderTextColor={COLORS.textSecondary} value={nombre} onChangeText={setNombre} />
              <TextInput style={[styles.inputRaw, { flex: 1, color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Apellido" placeholderTextColor={COLORS.textSecondary} value={apellido} onChangeText={setApellido} />
            </View>
            <TextInput style={[styles.inputRaw, { color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Nombre del contacto" placeholderTextColor={COLORS.textSecondary} value={contactoNombre} onChangeText={setContactoNombre} />
            <TextInput style={[styles.inputRaw, { color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Teléfono del contacto" placeholderTextColor={COLORS.textSecondary} keyboardType="phone-pad" value={contactoTelefono} onChangeText={setContactoTelefono} />
            <TextInput style={[styles.inputRaw, { color: colors.textPrimary, borderColor: COLORS.border }]} placeholder="Diagnóstico preliminar (opcional)" placeholderTextColor={COLORS.textSecondary} value={diagnostico} onChangeText={setDiagnostico} />

            <Text style={styles.prioridadLabel}>Prioridad:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['normal', 'urgente'] as const).map(p => (
                <TouchableOpacity key={p} style={[styles.filtroChip, prioridad === p && { backgroundColor: p === 'urgente' ? COLORS.danger : COLORS.primary, borderColor: p === 'urgente' ? COLORS.danger : COLORS.primary }]} onPress={() => setPrioridad(p)}>
                  <Text style={[styles.filtroTexto, prioridad === p && { color: '#fff' }]}>{p === 'normal' ? 'Normal' : '🚨 Urgente'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button mode="outlined" onPress={() => setModoAgregar(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button mode="contained" onPress={handleGuardar} loading={guardando} style={{ flex: 1, backgroundColor: COLORS.primary }}>Guardar</Button>
            </View>
          </View>
        )}

        {filtrados.length === 0 && <Text style={styles.vacio}>No hay solicitantes en esta sección.</Text>}

        {filtrados.map(s => (
          <View key={s.id} style={[styles.card, { backgroundColor: colors.surface }, s.prioridad === 'urgente' && { borderLeftColor: COLORS.danger }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardNombre, { color: colors.textPrimary }]}>
                  {s.prioridad === 'urgente' && <Text style={{ color: COLORS.danger }}>🚨 </Text>}
                  {s.nombre} {s.apellido}
                </Text>
                <Text style={styles.cardContacto}>{s.contactoNombre} · {s.contactoTelefono}</Text>
                {s.diagnosticoPreliminar ? <Text style={styles.cardDiag}>{s.diagnosticoPreliminar}</Text> : null}
                <Text style={styles.cardFecha}>Solicitud: {s.fechaSolicitud}</Text>
              </View>
              <View style={[styles.estadoBadge, { backgroundColor: s.estado === 'en_espera' ? '#FFF3E0' : s.estado === 'admitido' ? '#E8F5E9' : '#EEEEEE' }]}>
                <Text style={{ fontSize: FONT_SIZES.xs, fontWeight: '700', color: s.estado === 'en_espera' ? COLORS.warning : s.estado === 'admitido' ? COLORS.secondary : COLORS.textSecondary }}>
                  {s.estado === 'en_espera' ? 'En espera' : s.estado === 'admitido' ? 'Admitido' : 'Descartado'}
                </Text>
              </View>
            </View>
            {s.estado === 'en_espera' && (
              <View style={styles.acciones}>
                <TouchableOpacity style={[styles.accionBtn, { borderColor: COLORS.secondary }]} onPress={() => navigation.navigate('Pacientes', { screen: 'AgregarPaciente', params: { nombre: s.nombre, apellido: s.apellido } })}>
                  <Text style={{ color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Admitir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.accionBtn} onPress={() => actualizarEstadoSolicitante(s.id, 'descartado').then(cargar)}>
                  <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: FONT_SIZES.xs }}>Descartar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Eliminar', '¿Eliminar solicitante?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => eliminarSolicitante(s.id).then(cargar) }])}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filtrosRow: { flexDirection: 'row', gap: 6, padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filtroChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  filtroChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroTexto: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  lista: { padding: 12, gap: 8 },
  agregarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, justifyContent: 'center' },
  agregarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },
  form: { borderRadius: 14, padding: 14, elevation: 2, gap: 8 },
  formTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  inputRaw: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: FONT_SIZES.sm },
  prioridadLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
  vacio: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.primary, elevation: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardNombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  cardContacto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  cardDiag: { fontSize: FONT_SIZES.xs, color: COLORS.primaryLight, marginTop: 2 },
  cardFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  accionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});
```

- [ ] **Step 2: Crear AsistenciaScreen.tsx**

```typescript
// src/screens/asistencia/AsistenciaScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { RegistroAsistencia } from '../../types';
import { obtenerAsistencia, registrarEntrada, registrarSalida } from '../../storage/asistencia';
import { obtenerUsuarios } from '../../storage/usuarios';
import { Usuario } from '../../types';

export default function AsistenciaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [asistencia, setAsistencia] = useState<RegistroAsistencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [asist, users] = await Promise.all([
        obtenerAsistencia(hoy),
        obtenerUsuarios(),
      ]);
      setAsistencia(asist);
      setUsuarios(users.filter(u => u.activo));
    } catch { /* silencioso */ }
    setCargando(false);
  }, [hoy]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  function registroDeUsuario(uid: string) {
    return asistencia.find(a => a.usuarioId === uid);
  }

  async function handleEntrada(u: Usuario) {
    try { await registrarEntrada(u.id, `${u.nombre} ${u.apellido}`, u.rol); await cargar(); }
    catch { Alert.alert('Error', 'No se pudo registrar la entrada.'); }
  }

  async function handleSalida(u: Usuario) {
    try { await registrarSalida(u.id); await cargar(); }
    catch { Alert.alert('Error', 'No se pudo registrar la salida.'); }
  }

  const ROL_LABELS: Record<string, string> = { admin: 'Admin', enfermero: 'Enfermero', aseo: 'Aseo' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={styles.headerFecha}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text style={styles.headerSub}>
          {asistencia.length} / {usuarios.length} presentes
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
      >
        {usuarios.map(u => {
          const reg = registroDeUsuario(u.id);
          const presente = !!(reg?.horaEntrada && !reg?.horaSalida);
          const salio = !!(reg?.horaEntrada && reg?.horaSalida);

          return (
            <View key={u.id} style={[styles.card, { backgroundColor: colors.surface }, presente && { borderLeftColor: COLORS.secondary }, salio && { borderLeftColor: COLORS.textSecondary }]}>
              <View style={[styles.avatar, { backgroundColor: presente ? COLORS.secondary : salio ? COLORS.textSecondary : COLORS.border }]}>
                <MaterialCommunityIcons name="account" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: colors.textPrimary }]}>{u.nombre} {u.apellido}</Text>
                <Text style={styles.rol}>{ROL_LABELS[u.rol] ?? u.rol}</Text>
                {reg?.horaEntrada && <Text style={styles.hora}>Entrada: {reg.horaEntrada}{reg.horaSalida ? ` · Salida: ${reg.horaSalida}` : ''}</Text>}
              </View>
              <View style={styles.acciones}>
                {!reg?.horaEntrada && (
                  <TouchableOpacity style={[styles.accionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handleEntrada(u)}>
                    <MaterialCommunityIcons name="login" size={18} color={COLORS.secondary} />
                  </TouchableOpacity>
                )}
                {reg?.horaEntrada && !reg?.horaSalida && (
                  <TouchableOpacity style={[styles.accionBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleSalida(u)}>
                    <MaterialCommunityIcons name="logout" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerFecha: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'capitalize' },
  headerSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  lista: { padding: 12, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.border, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  rol: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  hora: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  acciones: { gap: 6 },
  accionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/listaEspera/ src/screens/asistencia/
git commit -m "feat: add ListaEsperaScreen and AsistenciaScreen"
```

---

## Task 8: Registrar todas las pantallas en AppNavigator y actualizar MasScreen

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/screens/MasScreen.tsx`

- [ ] **Step 1: Agregar imports en AppNavigator.tsx**

Agregar los imports junto a los otros imports de pantallas:
```typescript
import InventarioScreen from '../screens/inventario/InventarioScreen';
import AgregarInsumoScreen from '../screens/inventario/AgregarInsumoScreen';
import CitasMedicasScreen from '../screens/citas/CitasMedicasScreen';
import AgregarCitaScreen from '../screens/citas/AgregarCitaScreen';
import ListaEsperaScreen from '../screens/listaEspera/ListaEsperaScreen';
import AsistenciaScreen from '../screens/asistencia/AsistenciaScreen';
import HandoverScreen from '../screens/turnos/HandoverScreen';
import MensajesScreen from '../screens/mensajes/MensajesScreen';
```

- [ ] **Step 2: Registrar pantallas en AppTabs**

Agregar dentro de `AppTabs()` antes del cierre de `Tab.Navigator`:

```tsx
{/* Inventario — todos los roles */}
<Tab.Screen name="Inventario" component={InventarioScreen}
  options={{ headerShown: true, ...headerOpts, title: 'Inventario de Insumos', headerLeft: menuLeft }} />
<Tab.Screen name="AgregarInsumo" component={AgregarInsumoScreen}
  options={({ route, navigation }) => ({ headerShown: true, ...headerOpts, title: route.params?.insumoId ? 'Editar Insumo' : 'Agregar Insumo', headerLeft: () => backButton(navigation) })} />

{/* Citas médicas — todos los roles */}
<Tab.Screen name="Citas" component={CitasMedicasScreen}
  options={{ headerShown: true, ...headerOpts, title: 'Citas Médicas', headerLeft: menuLeft }} />
<Tab.Screen name="AgregarCita" component={AgregarCitaScreen}
  options={({ navigation }) => ({ headerShown: true, ...headerOpts, title: 'Nueva Cita', headerLeft: () => backButton(navigation) })} />

{/* Lista de espera — admin */}
{isAdmin && (
  <Tab.Screen name="ListaEspera" component={ListaEsperaScreen}
    options={{ headerShown: true, ...headerOpts, title: 'Lista de Espera', headerLeft: menuLeft }} />
)}

{/* Asistencia — admin */}
{isAdmin && (
  <Tab.Screen name="Asistencia" component={AsistenciaScreen}
    options={{ headerShown: true, ...headerOpts, title: 'Asistencia del Personal', headerLeft: menuLeft }} />
)}

{/* Handover — todos */}
<Tab.Screen name="Handover" component={HandoverScreen}
  options={{ headerShown: true, ...headerOpts, title: 'Nota de Turno', headerLeft: menuLeft }} />

{/* Mensajes — todos */}
<Tab.Screen name="Mensajes" component={MensajesScreen}
  options={{ headerShown: true, ...headerOpts, title: 'Mensajes Internos', headerLeft: menuLeft }} />
```

- [ ] **Step 3: Actualizar MasScreen con los módulos nuevos**

En `src/screens/MasScreen.tsx`, reemplazar `MODULOS_COMUNES` y `MODULOS_ADMIN`:

```typescript
const MODULOS_COMUNES: ModuloCard[] = [
  { tab: 'Historial', label: 'Historial Médico', icono: 'clipboard-text', color: '#1565C0', bg: '#E3F2FD', descripcion: 'Registros y evolución clínica' },
  { tab: 'Aseo', label: 'Aseo y Limpieza', icono: 'broom', color: '#00695C', bg: '#E0F2F1', descripcion: 'Registro de limpiezas y zonas' },
  { tab: 'Inventario', label: 'Inventario', icono: 'package-variant', color: '#E65100', bg: '#FFF3E0', descripcion: 'Stock de insumos y materiales' },
  { tab: 'Citas', label: 'Citas Médicas', icono: 'calendar-heart', color: '#9C27B0', bg: '#F3E5F5', descripcion: 'Agenda de consultas y estudios' },
  { tab: 'Handover', label: 'Nota de Turno', icono: 'transfer', color: '#6A1B9A', bg: '#EDE7F6', descripcion: 'Entrega de turno entre personal' },
  { tab: 'Mensajes', label: 'Mensajes', icono: 'bulletin-board', color: '#0277BD', bg: '#E1F5FE', descripcion: 'Tablón de anuncios interno' },
];

const MODULOS_ADMIN: ModuloCard[] = [
  { tab: 'Usuarios', label: 'Gestión de Usuarios', icono: 'account-cog', color: '#6A1B9A', bg: '#F3E5F5', descripcion: 'Crear y administrar usuarios' },
  { tab: 'Configuracion', label: 'Configuración', icono: 'cog', color: '#E65100', bg: '#FFF3E0', descripcion: 'Datos del hogar geriátrico' },
  { tab: 'ListaEspera', label: 'Lista de Espera', icono: 'account-clock', color: '#AD1457', bg: '#FCE4EC', descripcion: 'Pacientes pendientes de ingreso' },
  { tab: 'Asistencia', label: 'Asistencia', icono: 'clipboard-account', color: '#2E7D32', bg: '#E8F5E9', descripcion: 'Control de asistencia del personal' },
];
```

- [ ] **Step 4: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Test manual**

Ejecutar `npx expo start` y verificar:
- MasScreen muestra los nuevos módulos
- Navegar a Inventario → se muestra la lista (vacía al inicio)
- Agregar un insumo → aparece en la lista
- Ajustar stock (+/-) → se abre el modal de cantidad
- Handover → muestra formulario de nota de turno
- Mensajes → admin puede publicar, todos pueden leer

- [ ] **Step 6: Commit final Capa 2**

```bash
git add src/navigation/AppNavigator.tsx src/screens/MasScreen.tsx
git commit -m "feat: register Capa 2 screens in navigation and update MasScreen"
```
