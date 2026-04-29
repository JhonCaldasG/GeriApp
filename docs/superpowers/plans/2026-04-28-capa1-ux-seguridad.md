# Capa 1 — UX y Seguridad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar EmergenciaScreen, campo DNR, banners de alergia, autenticación biométrica, banner de cumpleaños en UI y acciones rápidas al dashboard.

**Architecture:** Los cambios son transversales: tipos → storage → componentes → pantallas. El modo oscuro y las notificaciones de cumpleaños ya están implementados; solo se agrega el banner visual en el dashboard. Biometría carga la sesión guardada en `@sesion_usuario` sin re-autenticar contra la BD.

**Tech Stack:** React Native + Expo, TypeScript, Supabase, expo-local-authentication (nueva dep), AsyncStorage.

---

## Pre-requisito: Backup

- [ ] **Copiar carpeta como backup**

```bash
cp -r "D:/Claude_DBA/Proyectos/Apps/hogar-geriatrico" "D:/Claude_DBA/Proyectos/Apps/hogar-geriatrico-backup"
```

---

## Task 1: Instalar expo-local-authentication

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Instalar dependencia**

```bash
cd "D:/Claude_DBA/Proyectos/Apps/hogar-geriatrico"
npx expo install expo-local-authentication
```

- [ ] **Step 2: Verificar compilación TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-local-authentication"
```

---

## Task 2: Agregar telefonoEmergencia a HogarInfo

**Files:**
- Modify: `src/storage/hogar.ts`
- Modify: `src/context/HogarContext.tsx`

- [ ] **Step 1: Actualizar HogarInfo y funciones de storage**

En `src/storage/hogar.ts`, reemplazar el contenido completo:

```typescript
import { supabase } from '../lib/supabase';

export interface HogarInfo {
  nombre: string;
  direccion: string;
  telefono: string;
  telefonoEmergencia: string;
  email: string;
  ciudad: string;
  provincia: string;
  logoUri: string | null;
}

const DEFAULT: HogarInfo = {
  nombre: 'Hogar Geriátrico',
  direccion: '',
  telefono: '',
  telefonoEmergencia: '',
  email: '',
  ciudad: '',
  provincia: '',
  logoUri: null,
};

function rowToHogar(row: any): HogarInfo {
  return {
    nombre: row.nombre ?? DEFAULT.nombre,
    direccion: row.direccion ?? '',
    telefono: row.telefono ?? '',
    telefonoEmergencia: row.telefono_emergencia ?? '',
    email: row.email ?? '',
    ciudad: row.ciudad ?? '',
    provincia: row.provincia ?? '',
    logoUri: row.logo_uri ?? null,
  };
}

export async function obtenerHogar(): Promise<HogarInfo> {
  const { data, error } = await supabase
    .from('hogar_config')
    .select('*')
    .eq('id', 1)
    .single();
  if (error || !data) return DEFAULT;
  return rowToHogar(data);
}

export async function guardarHogar(info: HogarInfo): Promise<void> {
  const { error } = await supabase
    .from('hogar_config')
    .upsert({
      id: 1,
      nombre: info.nombre,
      direccion: info.direccion,
      telefono: info.telefono,
      telefono_emergencia: info.telefonoEmergencia,
      email: info.email,
      ciudad: info.ciudad,
      provincia: info.provincia,
      logo_uri: info.logoUri,
    });
  if (error) throw error;
}
```

- [ ] **Step 2: Agregar columna en Supabase**

Ejecutar en Supabase SQL editor:
```sql
ALTER TABLE hogar_config ADD COLUMN IF NOT EXISTS telefono_emergencia text DEFAULT '';
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/storage/hogar.ts
git commit -m "feat: add telefonoEmergencia to HogarInfo"
```

---

## Task 3: Agregar campo telefonoEmergencia en ConfiguracionHogarScreen

**Files:**
- Modify: `src/screens/configuracion/ConfiguracionHogarScreen.tsx`

- [ ] **Step 1: Agregar estado y campo en el formulario**

Localizar en `ConfiguracionHogarScreen.tsx` la línea `const [provincia, setProvincia] = useState('');` y agregar debajo:

```typescript
const [telefonoEmergencia, setTelefonoEmergencia] = useState('');
```

Localizar el `useEffect` que setea los estados y agregar:
```typescript
setTelefonoEmergencia(hogar.telefonoEmergencia);
```

Localizar la función `handleGuardar` donde se construye `const info: HogarInfo` y agregar el campo:
```typescript
const info: HogarInfo = {
  nombre: nombre.trim(),
  direccion: direccion.trim(),
  telefono: telefono.trim(),
  telefonoEmergencia: telefonoEmergencia.trim(),
  email: email.trim(),
  ciudad: ciudad.trim(),
  provincia: provincia.trim(),
  logoUri,
};
```

Agregar el campo visual después del TextInput de "Teléfono" y antes del de "Email":
```tsx
<TextInput
  label="Teléfono de Emergencias"
  value={telefonoEmergencia}
  onChangeText={setTelefonoEmergencia}
  keyboardType="phone-pad"
  placeholder="Ej: 911, 107, SAME"
  style={styles.input}
  mode="outlined"
  outlineColor={COLORS.border}
  activeOutlineColor={COLORS.danger}
  left={<TextInput.Icon icon="phone-alert" />}
/>
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/configuracion/ConfiguracionHogarScreen.tsx
git commit -m "feat: add emergency phone field to hogar config"
```

---

## Task 4: Crear EmergenciaScreen

**Files:**
- Create: `src/screens/EmergenciaScreen.tsx`

- [ ] **Step 1: Crear la pantalla**

```typescript
// src/screens/EmergenciaScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHogar } from '../context/HogarContext';
import { useAppTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../theme';

interface Protocolo {
  id: string;
  titulo: string;
  icono: string;
  color: string;
  pasos: string[];
}

const PROTOCOLOS: Protocolo[] = [
  {
    id: 'caida',
    titulo: 'Caída de Paciente',
    icono: 'human-handsdown',
    color: '#E65100',
    pasos: [
      'No mover al paciente hasta evaluar lesiones.',
      'Verificar estado de consciencia (responde, parpadea).',
      'Revisar presencia de sangrado o deformidades visibles.',
      'Llamar al médico de guardia e informar la situación.',
      'Registrar el incidente en la app (módulo Incidentes).',
      'Notificar al familiar de referencia.',
    ],
  },
  {
    id: 'paro',
    titulo: 'Paro Cardiorrespiratorio',
    icono: 'heart-pulse',
    color: '#C62828',
    pasos: [
      'Llamar al número de emergencias configurado.',
      'Verificar que no hay respiración ni pulso.',
      'Iniciar RCP: 30 compresiones + 2 respiraciones.',
      'Solicitar el DEA si está disponible en el hogar.',
      'Continuar RCP hasta que llegue la ambulancia.',
      'Registrar hora de inicio del evento.',
    ],
  },
  {
    id: 'incendio',
    titulo: 'Incendio / Evacuación',
    icono: 'fire',
    color: '#B71C1C',
    pasos: [
      'Activar alarma de incendio.',
      'Llamar a bomberos (100) y emergencias.',
      'Evacuar pacientes: comenzar por los más cercanos a la salida.',
      'Priorizar pacientes con movilidad reducida.',
      'No usar ascensores durante la evacuación.',
      'Reunirse en el punto de encuentro exterior.',
    ],
  },
];

export default function EmergenciaScreen() {
  const insets = useSafeAreaInsets();
  const { hogar } = useHogar();
  const { colors } = useAppTheme();
  const [expandido, setExpandido] = useState<string | null>(null);

  function llamarEmergencia() {
    const tel = hogar.telefonoEmergencia?.trim();
    if (!tel) {
      Alert.alert(
        'Sin número configurado',
        'Configurá el teléfono de emergencias en Configuración del Hogar.',
      );
      return;
    }
    Linking.openURL(`tel:${tel}`);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <TouchableOpacity style={styles.llamarBtn} onPress={llamarEmergencia} activeOpacity={0.8}>
        <MaterialCommunityIcons name="phone-alert" size={28} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.llamarTitulo}>Llamar a Emergencias</Text>
          <Text style={styles.llamarNumero}>
            {hogar.telefonoEmergencia?.trim() || 'Sin número configurado'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.seccion}>Protocolos de Emergencia</Text>

      {PROTOCOLOS.map(p => (
        <View key={p.id} style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => setExpandido(expandido === p.id ? null : p.id)}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIcono, { backgroundColor: p.color + '20' }]}>
              <MaterialCommunityIcons name={p.icono as any} size={26} color={p.color} />
            </View>
            <Text style={[styles.cardTitulo, { color: p.color }]}>{p.titulo}</Text>
            <MaterialCommunityIcons
              name={expandido === p.id ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={p.color}
            />
          </TouchableOpacity>

          {expandido === p.id && (
            <View style={styles.pasos}>
              {p.pasos.map((paso, idx) => (
                <View key={idx} style={styles.pasoFila}>
                  <View style={[styles.pasoBadge, { backgroundColor: p.color }]}>
                    <Text style={styles.pasoNum}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.pasoTexto, { color: colors.textPrimary }]}>{paso}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  llamarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#C62828', borderRadius: 16,
    padding: 18, marginBottom: 20,
  },
  llamarTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: '#fff' },
  llamarNumero: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  seccion: {
    fontSize: FONT_SIZES.sm, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 12,
  },
  card: {
    borderRadius: 14, marginBottom: 10,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 16,
  },
  cardIcono: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitulo: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '700' },
  pasos: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  pasoFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pasoBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  pasoNum: { color: '#fff', fontSize: FONT_SIZES.xs, fontWeight: '800' },
  pasoTexto: { flex: 1, fontSize: FONT_SIZES.sm, lineHeight: 20 },
});
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/EmergenciaScreen.tsx
git commit -m "feat: add EmergenciaScreen with protocols"
```

---

## Task 5: Agregar EmergenciaScreen a la navegación

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Importar y registrar la pantalla**

Agregar el import después de los imports existentes de pantallas:
```typescript
import EmergenciaScreen from '../screens/EmergenciaScreen';
```

Dentro de `AppTabs()`, agregar este `Tab.Screen` después de la última pantalla visible y antes del cierre de `Tab.Navigator`:
```tsx
<Tab.Screen name="Emergencia" component={EmergenciaScreen}
  options={{ headerShown: true, ...headerOpts, title: 'Emergencia',
    headerLeft: menuLeft,
    headerStyle: { backgroundColor: '#C62828' },
  }} />
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: register EmergenciaScreen in navigation"
```

---

## Task 6: Campo DNR en el tipo Paciente y Supabase

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Agregar campo dnr al tipo Paciente**

En `src/types/index.ts`, localizar la interfaz `Paciente` y agregar el campo `dnr` después de `riesgoCaida`:

```typescript
export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  dni: string;
  habitacion: string;
  diagnosticoPrincipal: string;
  alergias: string;
  obraSocial: string;
  eps: string;
  medicoResponsable: string;
  contactoFamiliar: {
    nombre: string;
    telefono: string;
    relacion: string;
  };
  fotoUri?: string;
  riesgoCaida?: boolean;
  dnr?: boolean;
  fallecido?: boolean;
  fechaFallecimiento?: string | null;
  fechaIngreso?: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Agregar columna en Supabase**

Ejecutar en Supabase SQL editor:
```sql
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS dnr boolean DEFAULT false;
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add dnr field to Paciente type"
```

---

## Task 7: Actualizar storage de pacientes para DNR

**Files:**
- Modify: `src/storage/index.ts`

- [ ] **Step 1: Leer el archivo actual**

```bash
grep -n "dnr\|riesgoCaida\|rowToPaciente\|pacienteToRow" src/storage/index.ts | head -40
```

- [ ] **Step 2: Actualizar rowToPaciente y pacienteToRow**

Localizar la función que convierte row de Supabase a `Paciente` (probablemente `rowToPaciente`) y agregar el campo:

```typescript
// Dentro de rowToPaciente o equivalente:
riesgoCaida: row.riesgo_caida ?? false,
dnr: row.dnr ?? false,
```

Localizar la función que convierte `Paciente` a row (para upsert/insert) y agregar:
```typescript
// Dentro de la función de guardado:
riesgo_caida: paciente.riesgoCaida ?? false,
dnr: paciente.dnr ?? false,
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/storage/index.ts
git commit -m "feat: persist dnr field in pacientes storage"
```

---

## Task 8: DNR toggle en AgregarPacienteScreen

**Files:**
- Modify: `src/screens/pacientes/AgregarPacienteScreen.tsx`

- [ ] **Step 1: Agregar estado y toggle**

Localizar la declaración `const [riesgoCaida, setRiesgoCaida] = useState(false)` y agregar debajo:
```typescript
const [dnr, setDnr] = useState(false);
```

Localizar donde se setean los estados al cargar un paciente existente (probablemente en un `useEffect` con `pacienteId`) y agregar:
```typescript
setDnr(pacienteExistente.dnr ?? false);
```

Localizar donde se construye el objeto `paciente` para guardar y agregar:
```typescript
dnr,
```

Localizar el toggle de `riesgoCaida` en el JSX y agregar un toggle similar para DNR justo después:
```tsx
{/* Toggle DNR */}
<View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
  <MaterialCommunityIcons name="heart-off" size={22} color={dnr ? COLORS.danger : COLORS.textSecondary} />
  <View style={{ flex: 1 }}>
    <Text style={styles.toggleLabel}>DNR (No Reanimar)</Text>
    <Text style={styles.toggleSubLabel}>El paciente tiene orden de no reanimación</Text>
  </View>
  <Switch
    value={dnr}
    onValueChange={setDnr}
    trackColor={{ false: COLORS.border, true: COLORS.danger + '80' }}
    thumbColor={dnr ? COLORS.danger : COLORS.surface}
  />
</View>
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/pacientes/AgregarPacienteScreen.tsx
git commit -m "feat: add DNR toggle to AgregarPacienteScreen"
```

---

## Task 9: DNR badge en PacienteCard y PerfilPacienteScreen

**Files:**
- Modify: `src/components/PacienteCard.tsx`
- Modify: `src/screens/pacientes/PerfilPacienteScreen.tsx`

- [ ] **Step 1: Agregar badge DNR en PacienteCard**

En `src/components/PacienteCard.tsx`, localizar el JSX dentro del `TouchableOpacity` y agregar un badge visible para pacientes con DNR. Localizar la sección de la `View style={styles.info}` y agregar junto a los otros badges:

```tsx
// Agregar debajo de la declaración esFallecido:
const tieneDnr = !!paciente.dnr;

// En el JSX, agregar una View de badges después del diagnóstico:
{(tieneDnr || paciente.riesgoCaida) && (
  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
    {tieneDnr && (
      <View style={styles.badgeDnr}>
        <Text style={styles.badgeDnrTexto}>DNR</Text>
      </View>
    )}
    {paciente.riesgoCaida && (
      <View style={styles.badgeCaida}>
        <Text style={styles.badgeCaidaTexto}>⚠ Caída</Text>
      </View>
    )}
  </View>
)}
```

Agregar los estilos al StyleSheet:
```typescript
badgeDnr: {
  backgroundColor: COLORS.danger,
  borderRadius: 6,
  paddingHorizontal: 6,
  paddingVertical: 2,
},
badgeDnrTexto: {
  color: '#fff',
  fontSize: 10,
  fontWeight: '800',
},
badgeCaida: {
  backgroundColor: COLORS.warning + '25',
  borderRadius: 6,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderWidth: 1,
  borderColor: COLORS.warning,
},
badgeCaidaTexto: {
  color: COLORS.warning,
  fontSize: 10,
  fontWeight: '700',
},
```

- [ ] **Step 2: Agregar badge DNR en PerfilPacienteScreen**

En `src/screens/pacientes/PerfilPacienteScreen.tsx`, localizar el header/sección de datos del paciente y agregar el badge DNR visible:

```tsx
{paciente.dnr && (
  <View style={styles.dnrBanner}>
    <MaterialCommunityIcons name="heart-off" size={18} color="#fff" />
    <Text style={styles.dnrBannerTexto}>PACIENTE CON ORDEN DNR — No Reanimar</Text>
  </View>
)}
```

Agregar el estilo:
```typescript
dnrBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: COLORS.danger,
  borderRadius: 10,
  padding: 12,
  marginBottom: 12,
},
dnrBannerTexto: {
  color: '#fff',
  fontSize: FONT_SIZES.sm,
  fontWeight: '800',
  flex: 1,
},
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PacienteCard.tsx src/screens/pacientes/PerfilPacienteScreen.tsx
git commit -m "feat: show DNR badge in PacienteCard and PerfilPacienteScreen"
```

---

## Task 10: Banner de alergias en pantallas clave

**Files:**
- Modify: `src/screens/signosVitales/RegistrarSignosScreen.tsx`
- Modify: `src/screens/medicamentos/ListaMedicamentosScreen.tsx`

- [ ] **Step 1: Agregar banner de alergias en RegistrarSignosScreen**

Localizar en `RegistrarSignosScreen.tsx` dónde se muestra el nombre del paciente (probablemente en un header o al inicio del ScrollView) y agregar inmediatamente debajo:

```tsx
{paciente?.alergias?.trim() ? (
  <View style={styles.alergiaBanner}>
    <MaterialCommunityIcons name="alert-circle" size={18} color="#E65100" />
    <Text style={styles.alergiaTexto} numberOfLines={2}>
      <Text style={{ fontWeight: '800' }}>Alergias: </Text>
      {paciente.alergias.trim()}
    </Text>
  </View>
) : null}
```

Agregar estilos:
```typescript
alergiaBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: '#FFF3E0',
  borderRadius: 10,
  padding: 10,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#FFCC80',
},
alergiaTexto: {
  flex: 1,
  fontSize: FONT_SIZES.sm,
  color: '#E65100',
},
```

- [ ] **Step 2: Agregar banner de alergias en ListaMedicamentosScreen**

Aplicar el mismo banner en `ListaMedicamentosScreen.tsx` al inicio del contenido, donde se muestra la info del paciente.

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/signosVitales/RegistrarSignosScreen.tsx src/screens/medicamentos/ListaMedicamentosScreen.tsx
git commit -m "feat: show allergy banner in vital signs and medication screens"
```

---

## Task 11: Autenticación biométrica

**Files:**
- Modify: `src/screens/configuracion/ConfiguracionHogarScreen.tsx`
- Modify: `src/screens/auth/LoginScreen.tsx`

- [ ] **Step 1: Agregar toggle biométrico en ConfiguracionHogarScreen**

Agregar al inicio de `ConfiguracionHogarScreen.tsx`:
```typescript
import * as LocalAuthentication from 'expo-local-authentication';
```

Agregar estado:
```typescript
const [biometricEnabled, setBiometricEnabled] = useState(false);
const [biometricSupported, setBiometricSupported] = useState(false);
```

En el `useEffect` que carga datos iniciales, agregar:
```typescript
const hasHardware = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();
setBiometricSupported(hasHardware && isEnrolled);
const enabled = await AsyncStorage.getItem('@biometric_enabled');
setBiometricEnabled(enabled === 'true');
```

Agregar toggle en el JSX, después del toggle de modo oscuro:
```tsx
{biometricSupported && (
  <View style={[styles.temaCard, { backgroundColor: colors.surface }]}>
    <MaterialCommunityIcons name="fingerprint" size={22} color={biometricEnabled ? COLORS.primary : COLORS.textSecondary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.temaTitulo}>Acceso biométrico</Text>
      <Text style={styles.temaSubtitulo}>Huella dactilar o Face ID para iniciar sesión</Text>
    </View>
    <Switch
      value={biometricEnabled}
      onValueChange={async (val) => {
        setBiometricEnabled(val);
        await AsyncStorage.setItem('@biometric_enabled', String(val));
      }}
      trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
      thumbColor={biometricEnabled ? COLORS.primary : COLORS.surface}
    />
  </View>
)}
```

- [ ] **Step 2: Agregar botón biométrico en LoginScreen**

Agregar al inicio de `LoginScreen.tsx`:
```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

Agregar estado:
```typescript
const [biometricAvailable, setBiometricAvailable] = useState(false);
```

Agregar `useEffect` al inicio del componente:
```typescript
useEffect(() => {
  (async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const enabled = await AsyncStorage.getItem('@biometric_enabled');
    setBiometricAvailable(hasHardware && isEnrolled && enabled === 'true');
  })();
}, []);
```

Agregar función de login biométrico:
```typescript
async function handleBiometricLogin() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirmar identidad',
    fallbackLabel: 'Usar contraseña',
  });
  if (!result.success) return;
  const sesion = await AsyncStorage.getItem('@sesion_usuario');
  if (!sesion) {
    Alert.alert('Sin sesión previa', 'Iniciá sesión con usuario y contraseña primero.');
    return;
  }
  const ok = await login(JSON.parse(sesion).usuario ?? '', '');
  if (!ok) {
    Alert.alert('Error', 'No se pudo restaurar la sesión. Iniciá sesión manualmente.');
  }
}
```

Agregar botón visible en el JSX, debajo del botón principal de login:
```tsx
{biometricAvailable && (
  <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
    <MaterialCommunityIcons name="fingerprint" size={24} color={COLORS.primary} />
    <Text style={styles.biometricTexto}>Entrar con biometría</Text>
  </TouchableOpacity>
)}
```

Agregar estilos:
```typescript
biometricBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 14,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: COLORS.primary,
  marginTop: 12,
},
biometricTexto: {
  fontSize: FONT_SIZES.md,
  fontWeight: '700',
  color: COLORS.primary,
},
```

- [ ] **Step 3: Actualizar AuthContext para aceptar login con usuario vacío desde sesión guardada**

En `src/context/AuthContext.tsx`, localizar la función `login` y actualizar para que si `password` está vacío busque la sesión guardada:

```typescript
// Al inicio de la función login:
async function login(usuario: string, password: string): Promise<boolean> {
  // Biometric path: restaurar última sesión guardada
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
      } catch { /* ignorar */ }
    }
    return false;
  }
  // Ruta normal: validar contra BD
  // ... (mantener el resto del código existente)
```

- [ ] **Step 4: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/configuracion/ConfiguracionHogarScreen.tsx src/screens/auth/LoginScreen.tsx src/context/AuthContext.tsx
git commit -m "feat: add biometric authentication support"
```

---

## Task 12: Banner de cumpleaños e indicador de críticos en Dashboard UI

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

> **Nota:** Las notificaciones de cumpleaños ya se crean en el código existente. Este task agrega el banner visual en la pantalla.

- [ ] **Step 1: Calcular cumpleaños de hoy para el banner**

En `DashboardScreen.tsx`, agregar este cálculo junto a las otras variables de estadísticas (cerca de `const hoy = new Date().toDateString()`):

```typescript
const cumpleaniosHoy = useMemo(() => {
  const ahora = new Date();
  return pacientes.filter(p => {
    if (p.fallecido || !p.fechaNacimiento) return false;
    const fn = p.fechaNacimiento.slice(5, 10); // MM-DD
    const cumple = `${ahora.getFullYear()}-${fn}`;
    return new Date(cumple).toDateString() === ahora.toDateString();
  });
}, [pacientes]);
```

- [ ] **Step 2: Agregar banners en el JSX del ScrollView**

Localizar en el JSX el inicio del `ScrollView` (después del `Animated.View` del banner de actualización) y agregar los banners de cumpleaños y críticos antes de la sección "Resumen General":

```tsx
{/* Banner cumpleaños */}
{cumpleaniosHoy.map(p => (
  <View key={p.id} style={styles.bannerCumple}>
    <Text style={styles.bannerCumpleTexto}>
      🎂 ¡Hoy cumple años {p.nombre} {p.apellido}!
    </Text>
  </View>
))}

{/* Banner de pacientes críticos */}
{alertas.conAnomalias.filter(a => a.critico).length > 0 && (
  <TouchableOpacity
    style={styles.bannerCritico}
    onPress={() => navigation.navigate('ClinicaDashboard')}
    activeOpacity={0.85}
  >
    <MaterialCommunityIcons name="alert-circle" size={18} color="#fff" />
    <Text style={styles.bannerCriticoTexto}>
      {alertas.conAnomalias.filter(a => a.critico).length} paciente(s) con signos críticos — Ver detalle
    </Text>
    <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
  </TouchableOpacity>
)}
```

Agregar estilos:
```typescript
bannerCumple: {
  backgroundColor: '#FFF8E1',
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: '#FFE082',
},
bannerCumpleTexto: {
  fontSize: FONT_SIZES.sm,
  color: '#E65100',
  fontWeight: '700',
  textAlign: 'center',
},
bannerCritico: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: COLORS.danger,
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
},
bannerCriticoTexto: {
  flex: 1,
  color: '#fff',
  fontWeight: '700',
  fontSize: FONT_SIZES.sm,
},
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: add birthday and critical patient banners to dashboard"
```

---

## Task 13: Acciones rápidas y botón EMERGENCIA en Dashboard

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Agregar sección de acciones rápidas y botón emergencia**

En `DashboardScreen.tsx`, agregar la sección de acciones rápidas después de las `statsGrid` y antes del estado clínico. Solo para `!isAseo`:

```tsx
{!isAseo && (
  <>
    <Text style={styles.seccion}>Acciones Rápidas</Text>
    <View style={styles.accionesGrid}>
      <TouchableOpacity
        style={[styles.accionBtn, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('SignosVitales')}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="heart-pulse" size={24} color={COLORS.secondaryLight} />
        <Text style={[styles.accionTexto, { color: COLORS.secondaryLight }]}>Registrar{'\n'}Signos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.accionBtn, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('Medicamentos')}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="pill" size={24} color={COLORS.warningLight} />
        <Text style={[styles.accionTexto, { color: COLORS.warningLight }]}>Medicamentos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.accionBtn, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('Handover')}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="transfer" size={24} color="#6A1B9A" />
        <Text style={[styles.accionTexto, { color: '#6A1B9A' }]}>Nota de{'\n'}Turno</Text>
      </TouchableOpacity>

      {isAdmin && (
        <TouchableOpacity
          style={[styles.accionBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Infracciones')}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="alert-decagram" size={24} color={COLORS.danger} />
          <Text style={[styles.accionTexto, { color: COLORS.danger }]}>Infracciones</Text>
        </TouchableOpacity>
      )}
    </View>

    {/* Botón EMERGENCIA */}
    <TouchableOpacity
      style={styles.emergenciaBtn}
      onPress={() => navigation.navigate('Emergencia')}
      activeOpacity={0.85}
    >
      <MaterialCommunityIcons name="phone-alert" size={24} color="#fff" />
      <Text style={styles.emergenciaBtnTexto}>EMERGENCIA</Text>
    </TouchableOpacity>
  </>
)}
```

Agregar estilos:
```typescript
accionesGrid: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 12,
  flexWrap: 'wrap',
},
accionBtn: {
  flex: 1,
  minWidth: '22%',
  borderRadius: 12,
  padding: 12,
  alignItems: 'center',
  gap: 6,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.07,
  shadowRadius: 3,
  borderWidth: 1,
  borderColor: COLORS.border,
},
accionTexto: {
  fontSize: FONT_SIZES.xs,
  fontWeight: '700',
  textAlign: 'center',
  lineHeight: 15,
},
emergenciaBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  backgroundColor: COLORS.danger,
  borderRadius: 14,
  paddingVertical: 16,
  marginBottom: 16,
  elevation: 3,
},
emergenciaBtnTexto: {
  color: '#fff',
  fontSize: FONT_SIZES.lg,
  fontWeight: '900',
  letterSpacing: 1,
},
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Test manual**

Ejecutar `npx expo start` y verificar:
- Dashboard muestra acciones rápidas con íconos
- Botón EMERGENCIA rojo visible al fondo
- Toca EMERGENCIA → navega a EmergenciaScreen
- Toca un protocolo → se expande con pasos numerados
- Botón "Llamar a Emergencias" usa el número de config

- [ ] **Step 4: Commit final Capa 1**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: add quick actions and emergency button to dashboard"
```
