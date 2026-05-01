import React from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity, TouchableNativeFeedback,
  Platform, StatusBar, StyleSheet,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, FONT_SIZES } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useHogarAcceso } from '../context/HogarAccesoContext';
import { DrawerProvider, useDrawer } from '../context/DrawerContext';
import CustomDrawer from '../components/CustomDrawer';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PlanesScreen from '../screens/auth/PlanesScreen';
import {
  PacientesStackParamList,
  SignosStackParamList,
  MedicamentosStackParamList,
  HistorialStackParamList,
  AseoStackParamList,
  ActividadesStackParamList,
} from '../types';

import NotificacionesScreen from '../screens/NotificacionesScreen';
import { useNotificaciones } from '../context/NotificacionesContext';
import LoginScreen from '../screens/auth/LoginScreen';
import GestionUsuariosScreen from '../screens/auth/GestionUsuariosScreen';
import ConfiguracionHogarScreen from '../screens/configuracion/ConfiguracionHogarScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ListaPacientesScreen from '../screens/pacientes/ListaPacientesScreen';
import AgregarPacienteScreen from '../screens/pacientes/AgregarPacienteScreen';
import PerfilPacienteScreen from '../screens/pacientes/PerfilPacienteScreen';
import PacientesSignosScreen from '../screens/signosVitales/PacientesSignosScreen';
import RegistrarSignosScreen from '../screens/signosVitales/RegistrarSignosScreen';
import HistorialSignosScreen from '../screens/signosVitales/HistorialSignosScreen';
import PacientesMedicamentosScreen from '../screens/medicamentos/PacientesMedicamentosScreen';
import ListaMedicamentosScreen from '../screens/medicamentos/ListaMedicamentosScreen';
import AgregarMedicamentoScreen from '../screens/medicamentos/AgregarMedicamentoScreen';
import HistorialAdministracionesScreen from '../screens/medicamentos/HistorialAdministracionesScreen';
import PacientesHistorialScreen from '../screens/historial/PacientesHistorialScreen';
import ListaHistorialScreen from '../screens/historial/ListaHistorialScreen';
import AgregarRegistroScreen from '../screens/historial/AgregarRegistroScreen';
import DetalleRegistroScreen from '../screens/historial/DetalleRegistroScreen';
import PacientesAseoScreen from '../screens/aseo/PacientesAseoScreen';
import ListaLimpiezasScreen from '../screens/aseo/ListaLimpiezasScreen';
import RegistrarLimpiezaScreen from '../screens/aseo/RegistrarLimpiezaScreen';
import RegistrarLimpiezaZonaScreen from '../screens/aseo/RegistrarLimpiezaZonaScreen';
import PacientesActividadesScreen from '../screens/actividades/PacientesActividadesScreen';
import ListaActividadesScreen from '../screens/actividades/ListaActividadesScreen';
import RegistrarActividadScreen from '../screens/actividades/RegistrarActividadScreen';
import TurnosEnfermeriaScreen from '../screens/turnos/TurnosEnfermeriaScreen';
import InfraccionesScreen from '../screens/infracciones/InfraccionesScreen';
import TimelineMedicamentosScreen from '../screens/medicamentos/TimelineMedicamentosScreen';
import NotasEvolucionScreen from '../screens/pacientes/NotasEvolucionScreen';
import AuditoriaScreen from '../screens/admin/AuditoriaScreen';
import EvaluacionClinicaScreen from '../screens/pacientes/EvaluacionClinicaScreen';
import DietaScreen from '../screens/pacientes/DietaScreen';
import IncidentesScreen from '../screens/pacientes/IncidentesScreen';
import AusenciasScreen from '../screens/pacientes/AusenciasScreen';
import GuardiaRapidaScreen from '../screens/GuardiaRapidaScreen';
import ClinicaDashboardScreen from '../screens/clinica/ClinicaDashboardScreen';
import ProtocolosScreen from '../screens/ProtocolosScreen';
import InventarioScreen from '../screens/inventario/InventarioScreen';
import AgregarInsumoScreen from '../screens/inventario/AgregarInsumoScreen';
import CitasMedicasScreen from '../screens/citas/CitasMedicasScreen';
import AgregarCitaScreen from '../screens/citas/AgregarCitaScreen';
import ListaEsperaScreen from '../screens/listaEspera/ListaEsperaScreen';
import AsistenciaScreen from '../screens/asistencia/AsistenciaScreen';
import MensajesScreen from '../screens/mensajes/MensajesScreen';
import ReportesMensualesScreen from '../screens/reportes/ReportesMensualesScreen';
import EstadisticasScreen from '../screens/reportes/EstadisticasScreen';

const Tab            = createBottomTabNavigator();
const AuthStack      = createNativeStackNavigator();
const PacientesStack = createNativeStackNavigator<PacientesStackParamList>();
const SignosStack    = createNativeStackNavigator<SignosStackParamList>();
const MedicamentosStack = createNativeStackNavigator<MedicamentosStackParamList>();
const HistorialStack = createNativeStackNavigator<HistorialStackParamList>();
const AseoStack      = createNativeStackNavigator<AseoStackParamList>();
const ActividadesStack = createNativeStackNavigator<ActividadesStackParamList>();

// ── Opciones de header ─────────────────────────────────────────────────────────
const headerOpts = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerStatusBarHeight: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : undefined,
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontSize: FONT_SIZES.lg, fontWeight: '700' as const },
  headerBackVisible: false,
  headerTitleAlign: 'center' as const,
  headerRight: () => <BellButton />,
};

// ── Botón hamburguesa ──────────────────────────────────────────────────────────
function MenuButton() {
  const { openDrawer } = useDrawer();
  if (Platform.OS === 'android') {
    return (
      <View style={navStyles.btnWrapper}>
        <TouchableNativeFeedback
          onPress={openDrawer}
          background={TouchableNativeFeedback.Ripple('rgba(255,255,255,0.4)', false)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={navStyles.btn}>
            <MaterialCommunityIcons name="menu" size={24} color={COLORS.white} />
          </View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity onPress={openDrawer} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={[navStyles.btnWrapper, navStyles.btn]}>
      <MaterialCommunityIcons name="menu" size={24} color={COLORS.white} />
    </TouchableOpacity>
  );
}

// ── Botón atrás ────────────────────────────────────────────────────────────────
function backButton(navigation: any, onPress?: () => void) {
  const handlePress = onPress ?? (() => navigation.goBack());
  if (Platform.OS === 'android') {
    return (
      <View style={navStyles.btnWrapper}>
        <TouchableNativeFeedback onPress={handlePress} background={TouchableNativeFeedback.Ripple('rgba(255,255,255,0.4)', false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={navStyles.btn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={[navStyles.btnWrapper, navStyles.btn]}>
      <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
    </TouchableOpacity>
  );
}

// ── Botón campana ──────────────────────────────────────────────────────────────
function BellButton() {
  const navigation = useNavigation<any>();
  const { noLeidas } = useNotificaciones();

  const handlePress = () => navigation.navigate('Notificaciones');

  if (Platform.OS === 'android') {
    return (
      <View style={[navStyles.btnWrapper, { marginRight: 4 }]}>
        <TouchableNativeFeedback
          onPress={handlePress}
          background={TouchableNativeFeedback.Ripple('rgba(255,255,255,0.4)', false)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={navStyles.btn}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.white} />
            {noLeidas > 0 && (
              <View style={navStyles.badge}>
                <Text style={navStyles.badgeText}>{noLeidas > 99 ? '99+' : String(noLeidas)}</Text>
              </View>
            )}
          </View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.6}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[navStyles.btnWrapper, navStyles.btn, { marginRight: 4 }]}
    >
      <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.white} />
      {noLeidas > 0 && (
        <View style={navStyles.badge}>
          <Text style={navStyles.badgeText}>{noLeidas > 99 ? '99+' : String(noLeidas)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const bellRight = () => <BellButton />;

const navStyles = StyleSheet.create({
  btnWrapper: { borderRadius: 18, overflow: 'hidden', marginLeft: 4 },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#F44336',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

const menuLeft = () => <MenuButton />;

// ── Stacks ─────────────────────────────────────────────────────────────────────
function PacientesNavigator() {
  return (
    <PacientesStack.Navigator screenOptions={headerOpts}>
      <PacientesStack.Screen name="ListaPacientes" component={ListaPacientesScreen}
        options={{ title: 'Pacientes', headerLeft: menuLeft }} />
      <PacientesStack.Screen name="AgregarPaciente" component={AgregarPacienteScreen}
        options={({ route, navigation }) => ({ title: route.params?.pacienteId ? 'Editar Paciente' : 'Nuevo Paciente', headerLeft: () => backButton(navigation) })} />
      <PacientesStack.Screen name="PerfilPaciente" component={PerfilPacienteScreen}
        options={({ navigation }) => ({ title: 'Perfil del Paciente', headerLeft: () => backButton(navigation) })} />
      <PacientesStack.Screen name="NotasEnfermeria" component={NotasEvolucionScreen}
        options={({ navigation }) => ({ title: 'Notas de Enfermería', headerLeft: () => backButton(navigation) })} />
      <PacientesStack.Screen name="EvaluacionClinica" component={EvaluacionClinicaScreen}
        options={({ navigation }) => ({ title: 'Evaluación Clínica', headerLeft: () => backButton(navigation) })} />
      <PacientesStack.Screen name="Dieta" component={DietaScreen}
        options={({ navigation }) => ({ title: 'Dieta y Nutrición', headerLeft: () => backButton(navigation) })} />
      <PacientesStack.Screen name="Incidentes" component={IncidentesScreen}
        options={({ navigation }) => ({ title: 'Incidentes y Caídas', headerLeft: () => backButton(navigation) })} />
      <PacientesStack.Screen name="Ausencias" component={AusenciasScreen}
        options={({ navigation }) => ({ title: 'Ausencias / Internaciones', headerLeft: () => backButton(navigation) })} />
    </PacientesStack.Navigator>
  );
}

function SignosNavigator() {
  return (
    <SignosStack.Navigator screenOptions={headerOpts}>
      <SignosStack.Screen name="PacientesSignos" component={PacientesSignosScreen}
        options={{ title: 'Signos Vitales', headerLeft: menuLeft }} />
      <SignosStack.Screen name="RegistrarSignos" component={RegistrarSignosScreen}
        options={({ navigation, route }) => ({ title: route.params?.signoId ? 'Editar Signos' : 'Registrar Signos', headerLeft: () => backButton(navigation) })} />
      <SignosStack.Screen name="HistorialSignos" component={HistorialSignosScreen}
        options={({ navigation }) => ({ title: 'Historial de Signos', headerLeft: () => backButton(navigation) })} />
    </SignosStack.Navigator>
  );
}

function MedicamentosNavigator() {
  return (
    <MedicamentosStack.Navigator screenOptions={headerOpts}>
      <MedicamentosStack.Screen name="PacientesMedicamentos" component={PacientesMedicamentosScreen}
        options={{ title: 'Medicamentos', headerLeft: menuLeft }} />
      <MedicamentosStack.Screen name="ListaMedicamentos" component={ListaMedicamentosScreen}
        options={({ navigation }) => ({ title: 'Medicamentos del Paciente', headerLeft: () => backButton(navigation) })} />
      <MedicamentosStack.Screen name="AgregarMedicamento" component={AgregarMedicamentoScreen}
        options={({ navigation }) => ({ title: 'Agregar Medicamento', headerLeft: () => backButton(navigation) })} />
      <MedicamentosStack.Screen name="HistorialAdministraciones" component={HistorialAdministracionesScreen}
        options={({ navigation }) => ({ title: 'Historial de Dosis', headerLeft: () => backButton(navigation) })} />
      <MedicamentosStack.Screen name="TimelineMedicamentos" component={TimelineMedicamentosScreen}
        options={({ navigation }) => ({ title: 'Timeline del Día', headerLeft: () => backButton(navigation) })} />
    </MedicamentosStack.Navigator>
  );
}

function HistorialNavigator() {
  return (
    <HistorialStack.Navigator screenOptions={headerOpts}>
      <HistorialStack.Screen name="PacientesHistorial" component={PacientesHistorialScreen}
        options={{ title: 'Historial Médico', headerLeft: menuLeft }} />
      <HistorialStack.Screen name="ListaHistorial" component={ListaHistorialScreen}
        options={({ navigation }) => ({ title: 'Registros del Paciente', headerLeft: () => backButton(navigation, () => navigation.navigate('PacientesHistorial')) })} />
      <HistorialStack.Screen name="AgregarRegistro" component={AgregarRegistroScreen}
        options={({ navigation }) => ({ title: 'Nuevo Registro', headerLeft: () => backButton(navigation) })} />
      <HistorialStack.Screen name="DetalleRegistro" component={DetalleRegistroScreen}
        options={({ navigation }) => ({ title: 'Detalle del Registro', headerLeft: () => backButton(navigation) })} />
    </HistorialStack.Navigator>
  );
}

function ActividadesNavigator() {
  return (
    <ActividadesStack.Navigator screenOptions={headerOpts}>
      <ActividadesStack.Screen name="PacientesActividades" component={PacientesActividadesScreen}
        options={{ title: 'Actividades', headerLeft: menuLeft }} />
      <ActividadesStack.Screen name="ListaActividades" component={ListaActividadesScreen}
        options={({ navigation }) => ({ title: 'Historial de Actividades', headerLeft: () => backButton(navigation) })} />
      <ActividadesStack.Screen name="RegistrarActividad" component={RegistrarActividadScreen}
        options={({ navigation }) => ({ title: 'Registrar Actividad', headerLeft: () => backButton(navigation) })} />
    </ActividadesStack.Navigator>
  );
}

function AseoNavigator() {
  return (
    <AseoStack.Navigator screenOptions={headerOpts}>
      <AseoStack.Screen name="PacientesAseo" component={PacientesAseoScreen}
        options={{ title: 'Aseo y Limpieza', headerLeft: menuLeft }} />
      <AseoStack.Screen name="ListaLimpiezas" component={ListaLimpiezasScreen}
        options={({ navigation }) => ({ title: 'Historial de Limpiezas', headerLeft: () => backButton(navigation, () => navigation.navigate('PacientesAseo')) })} />
      <AseoStack.Screen name="RegistrarLimpieza" component={RegistrarLimpiezaScreen}
        options={({ navigation }) => ({ title: 'Registrar Limpieza', headerLeft: () => backButton(navigation) })} />
      <AseoStack.Screen name="RegistrarLimpiezaZona" component={RegistrarLimpiezaZonaScreen}
        options={({ navigation, route }) => ({ title: `Registrar — ${route.params.tipo}`, headerLeft: () => backButton(navigation) })} />
    </AseoStack.Navigator>
  );
}

// ── App principal con tabs ocultos + drawer custom ─────────────────────────────
function AppTabs() {
  const { isAdmin, isAseo } = useAuth();
  const soloAseo = isAseo && !isAdmin;

  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
          <Tab.Screen name="Inicio" component={DashboardScreen} />
          {!soloAseo && <Tab.Screen name="Pacientes"     component={PacientesNavigator} />}
          {!soloAseo && <Tab.Screen name="SignosVitales" component={SignosNavigator} />}
          {!soloAseo && <Tab.Screen name="Medicamentos"  component={MedicamentosNavigator} />}
          {!soloAseo && <Tab.Screen name="Historial"     component={HistorialNavigator} />}
          {!soloAseo && <Tab.Screen name="Actividades"   component={ActividadesNavigator} />}
          {(isAdmin || isAseo) && <Tab.Screen name="Aseo" component={AseoNavigator} />}
          {!soloAseo && (
            <Tab.Screen name="ClinicaDashboard" component={ClinicaDashboardScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Estado Clínico', headerLeft: menuLeft }} />
          )}
          {!soloAseo && (
            <Tab.Screen name="Infracciones" component={InfraccionesScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Infracciones',
                headerLeft: menuLeft }} />
          )}
          {isAdmin && (
            <Tab.Screen name="Turnos" component={TurnosEnfermeriaScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Turnos de Enfermería',
                headerLeft: menuLeft }} />
          )}
          {isAdmin && (
            <Tab.Screen name="Usuarios" component={GestionUsuariosScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Gestión de Usuarios',
                headerLeft: menuLeft }} />
          )}
          {!soloAseo && (
            <Tab.Screen name="GuardiaRapida" component={GuardiaRapidaScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Guardia Rápida',
                headerLeft: menuLeft }} />
          )}
          {isAdmin && (
            <Tab.Screen name="Auditoria" component={AuditoriaScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Log de Auditoría',
                headerLeft: menuLeft }} />
          )}
          {isAdmin && (
            <Tab.Screen name="Configuracion" component={ConfiguracionHogarScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Configuración del Hogar',
                headerLeft: menuLeft }} />
          )}
          <Tab.Screen name="Notificaciones" component={NotificacionesScreen}
            options={{ headerShown: true, ...headerOpts, title: 'Notificaciones',
              headerLeft: menuLeft, headerRight: undefined }} />
          <Tab.Screen name="Protocolos" component={ProtocolosScreen}
            options={{ headerShown: true, ...headerOpts, title: 'Protocolos',
              headerLeft: menuLeft,
            }} />

          {/* Inventario — todos los roles */}
          {!soloAseo && (
            <Tab.Screen name="Inventario" component={InventarioScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Inventario de Insumos', headerLeft: menuLeft }} />
          )}
          {!soloAseo && (
            <Tab.Screen name="AgregarInsumo" component={AgregarInsumoScreen}
              options={({ route, navigation }) => ({ headerShown: true, ...headerOpts, title: (route.params as any)?.insumoId ? 'Editar Insumo' : 'Agregar Insumo', headerLeft: () => backButton(navigation) })} />
          )}

          {/* Citas médicas — todos los roles */}
          {!soloAseo && (
            <Tab.Screen name="Citas" component={CitasMedicasScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Citas Médicas', headerLeft: menuLeft }} />
          )}
          {!soloAseo && (
            <Tab.Screen name="AgregarCita" component={AgregarCitaScreen}
              options={({ route, navigation }) => ({ headerShown: true, ...headerOpts, title: (route.params as any)?.citaId ? 'Editar Cita' : 'Nueva Cita', headerLeft: () => backButton(navigation) })} />
          )}

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


          {/* Mensajes — todos */}
          {!soloAseo && (
            <Tab.Screen name="Mensajes" component={MensajesScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Mensajes Internos', headerLeft: menuLeft }} />
          )}

          {/* Reportes mensuales — admin + enfermero */}
          {!soloAseo && (
            <Tab.Screen name="ReportesMensuales" component={ReportesMensualesScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Reportes Mensuales', headerLeft: menuLeft }} />
          )}

          {/* Estadísticas — admin */}
          {isAdmin && (
            <Tab.Screen name="Estadisticas" component={EstadisticasScreen}
              options={{ headerShown: true, ...headerOpts, title: 'Estadísticas del Hogar', headerLeft: menuLeft }} />
          )}
        </Tab.Navigator>
        <CustomDrawer />
      </View>
    </DrawerProvider>
  );
}

const linking = {
  prefixes: [Linking.createURL('/'), 'hogargeriatrico://'],
  config: {
    screens: {
      Pacientes: {
        screens: {
          PerfilPaciente: 'paciente/:pacienteId',
        },
      },
    },
  },
};

function AuthNavigator() {
  const { desbloqueado } = useHogarAcceso();
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      initialRouteName={desbloqueado ? 'Login' : 'Welcome'}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Planes"  component={PlanesScreen} />
      <AuthStack.Screen name="Login"   component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {usuario ? <AppTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
