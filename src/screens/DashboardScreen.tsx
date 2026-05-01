import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Alert, RefreshControl, Animated } from 'react-native';
import QRScannerModal from '../components/QRScannerModal';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDrawer } from '../context/DrawerContext';
import { useApp } from '../context/AppContext';
import { useHogar } from '../context/HogarContext';
import { useAuth } from '../context/AuthContext';
import { useNotificaciones } from '../context/NotificacionesContext';
import { useAppTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES, SIGNO_RANGOS } from '../theme';
import { formatearFechaHora } from '../storage';
import { SignoVital, Paciente, Incumplimiento } from '../types';
import { obtenerIncumplimientos, registrarIncumplimiento } from '../storage/incumplimientos';
import { crearNotificacion } from '../storage/notificaciones';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Tarjeta de estadística clickable ──────────────────────────────────────────
interface StatCardProps {
  icono: string;
  valor: number;
  label: string;
  color: string;
  onPress: () => void;
}

function StatCard({ icono, valor, label, color, onPress }: StatCardProps) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderTopColor: color, backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.statIcono, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icono as any} size={24} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statValor, { color }]}>{valor}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color={color} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );
}

// ── Helpers de anomalías ───────────────────────────────────────────────────────
function detectarAnomalias(signo: SignoVital): string[] {
  const result: string[] = [];
  const chk = (val: string, key: keyof typeof SIGNO_RANGOS, nombre: string) => {
    if (!val) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const r = SIGNO_RANGOS[key];
    if (num < r.normal[0] || num > r.normal[1]) result.push(nombre);
  };
  chk(signo.presionSistolica, 'presionSistolica', 'P/A Sistólica');
  chk(signo.presionDiastolica, 'presionDiastolica', 'P/A Diastólica');
  chk(signo.frecuenciaCardiaca, 'frecuenciaCardiaca', 'Frec. Cardíaca');
  chk(signo.temperatura, 'temperatura', 'Temperatura');
  chk(signo.saturacionOxigeno, 'saturacionOxigeno', 'SpO2');
  chk(signo.glucosa, 'glucosa', 'Glucosa');
  return result;
}

function esCritico(signo: SignoVital): boolean {
  const chk = (val: string, key: keyof typeof SIGNO_RANGOS) => {
    if (!val) return false;
    const num = parseFloat(val);
    if (isNaN(num)) return false;
    const r = SIGNO_RANGOS[key];
    return num < r.caution[0] || num > r.caution[1];
  };
  return (
    chk(signo.presionSistolica, 'presionSistolica') ||
    chk(signo.temperatura, 'temperatura') ||
    chk(signo.saturacionOxigeno, 'saturacionOxigeno') ||
    chk(signo.glucosa, 'glucosa')
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { hogar } = useHogar();
  const { usuario, logout, isAdmin, isAseo, ultimoIngreso } = useAuth();
  const { openDrawer } = useDrawer();
  const { noLeidas } = useNotificaciones();
  const { pacientes, signosVitales, medicamentos, registros, horarios, administraciones, limpiezas, actividades,
          cargarPacientes, cargarSignos, cargarMedicamentos, cargarRegistros, cargarHorarios, cargarAdministraciones, cargarLimpiezas, cargarActividades } = useApp();

  const [refrescando, setRefrescando] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [tick, setTick] = useState(0);
  const [incumplimientosDB, setIncumplimientosDB] = useState<Incumplimiento[]>([]);

  // Carga incumplimientos de la BD
  const cargarIncumplimientos = useCallback(async () => {
    try {
      const data = await obtenerIncumplimientos(30);
      setIncumplimientosDB(data);
    } catch { /* silencioso */ }
  }, []);

  // Ref para evitar notificar el mismo incumplimiento más de una vez por sesión
  const notificadosRef = useRef<Set<string>>(new Set());
  const cumpleaniosNotifRef = useRef<Set<string> | null>(null);
  // Guard: verificación histórica solo una vez por día


  // Tick 30s: detecta incumplimientos de signos y medicamentos, los persiste y notifica
  useEffect(() => {
    const interval = setInterval(async () => {
      setTick(t => t + 1);
      if (isAseo || pacientes.length === 0) return;

      const ahora = new Date();
      const horaActualMin = ahora.getHours() * 60 + ahora.getMinutes();
      const hoyStr = ahora.toDateString();
      const hoyISO = ahora.toISOString().slice(0, 10);

      const nuevos: { tipo: string; descripcion: string }[] = [];
      const promises: Promise<void>[] = [];

      const pacientesActivos = pacientes.filter(
        p => !p.fallecido && (!p.fechaIngreso || p.fechaIngreso.slice(0, 10) <= hoyISO)
      );

      // ── Signos vitales: ventana de toma ya cerrada sin registro ──────────────
      pacientesActivos.forEach(p => {
        if (!horarios[p.id]?.length) return;
        (horarios[p.id]).forEach(t => {
          if (!t.horaFin) return;
          const [hFin, mFin] = t.horaFin.split(':').map(Number);
          if (isNaN(hFin) || isNaN(mFin)) return;
          if (horaActualMin <= hFin * 60 + mFin) return;
          const yaRegistrada = signosVitales.some(s =>
            s.pacienteId === p.id && s.tomaNombre === t.nombre &&
            new Date(s.createdAt).toDateString() === hoyStr
          );
          if (yaRegistrada) return;
          const key = `sv-${p.id}-${t.nombre}-${hoyISO}`;
          promises.push(registrarIncumplimiento({
            pacienteId: p.id, tipo: 'signos_vitales',
            detalle: t.nombre, horaFin: t.horaFin, fecha: hoyISO,
          }));
          if (!notificadosRef.current.has(key)) {
            notificadosRef.current.add(key);
            nuevos.push({ tipo: 'Signos Vitales', descripcion: `${p.nombre} ${p.apellido} — Toma ${t.nombre} (venció ${t.horaFin})` });
          }
        });
      });

      // ── Medicamentos: sin dosis al final del día (después de las 21:00) ──────
      const HORA_CIERRE_MEDS = 21;
      if (ahora.getHours() >= HORA_CIERRE_MEDS) {
        const hace3 = new Date(ahora); hace3.setDate(hace3.getDate() - 3);
        medicamentosActivos.forEach(m => {
          const tieneDosisHoy = administraciones.some(a =>
            a.medicamentoId === m.id && new Date(a.createdAt).toDateString() === hoyStr
          );
          if (tieneDosisHoy) return;
          // Solo flagear si se administró en los últimos 3 días (medicación activa)
          const activoRecientemente = administraciones.some(a =>
            a.medicamentoId === m.id &&
            new Date(a.createdAt) >= hace3 &&
            new Date(a.createdAt).toDateString() !== hoyStr
          );
          if (!activoRecientemente) return;
          const paciente = pacientesActivos.find(p => p.id === m.pacienteId);
          if (!paciente) return;
          const key = `med-${m.id}-${hoyISO}`;
          promises.push(registrarIncumplimiento({
            pacienteId: paciente.id, tipo: 'medicamento',
            detalle: m.nombre, fecha: hoyISO,
          }));
          if (!notificadosRef.current.has(key)) {
            notificadosRef.current.add(key);
            nuevos.push({ tipo: 'Medicamento', descripcion: `${paciente.nombre} ${paciente.apellido} — ${m.nombre} sin dosis hoy` });
          }
        });
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
        cargarIncumplimientos();
      }

    }, 30000);
    return () => clearInterval(interval);
  }, [pacientes, horarios, signosVitales, medicamentosActivos, administraciones, isAseo, cargarIncumplimientos]);

  // Verifica días anteriores (hasta 7 días atrás) y registra infracciones pendientes
  const verificarHistorico = useCallback(async () => {
    if (isAseo || pacientes.length === 0) return;
    const hoyISO = new Date().toISOString().slice(0, 10);

    const pacientesActivos = pacientes.filter(
      p => !p.fallecido && (!p.fechaIngreso || p.fechaIngreso.slice(0, 10) <= hoyISO)
    );
    const DIAS = 7;
    const promises: Promise<void>[] = [];

    for (let d = 1; d <= DIAS; d++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - d);
      const fechaISO = fecha.toISOString().slice(0, 10);
      const fechaStr = fecha.toDateString();

      // ── Signos vitales: tomas sin registro ese día ──────────────────────────
      pacientesActivos.forEach(p => {
        const admision = (p.fechaIngreso ?? p.createdAt).slice(0, 10);
        if (admision > fechaISO) return;
        if (!horarios[p.id]?.length) return;
        (horarios[p.id]).forEach(t => {
          if (!t.horaFin) return;
          // Only check days on or after the schedule entry was created
          if (t.createdAt.slice(0, 10) > fechaISO) return;
          const yaRegistrada = signosVitales.some(s =>
            s.pacienteId === p.id &&
            s.tomaNombre === t.nombre &&
            new Date(s.createdAt).toDateString() === fechaStr
          );
          if (!yaRegistrada) {
            promises.push(registrarIncumplimiento({
              pacienteId: p.id, tipo: 'signos_vitales',
              detalle: t.nombre, horaFin: t.horaFin, fecha: fechaISO,
            }));
          }
        });
      });

      // ── Medicamentos: sin dosis ese día ────────────────────────────────────
      medicamentosActivos.forEach(m => {
        // Solo desde la fecha en que se creó el medicamento
        if (m.createdAt && m.createdAt.slice(0, 10) > fechaISO) return;
        const tieneDosis = administraciones.some(a =>
          a.medicamentoId === m.id &&
          new Date(a.createdAt).toDateString() === fechaStr
        );
        if (tieneDosis) return;
        // Solo si el medicamento tuvo al menos una dosis registrada en algún momento
        const tuvoAlgunaDosis = administraciones.some(a => a.medicamentoId === m.id);
        if (!tuvoAlgunaDosis) return;
        const paciente = pacientesActivos.find(p => p.id === m.pacienteId);
        if (!paciente) return;
        promises.push(registrarIncumplimiento({
          pacienteId: paciente.id, tipo: 'medicamento',
          detalle: m.nombre, fecha: fechaISO,
        }));
      });
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
      cargarIncumplimientos();
    }
  }, [pacientes, horarios, signosVitales, medicamentosActivos, administraciones, isAseo, cargarIncumplimientos]);

  // Alerta de cumpleaños (7 días de anticipación) — persiste en AsyncStorage para no duplicar entre sesiones
  useEffect(() => {
    if (isAseo || pacientes.length === 0) return;

    async function procesarCumpleanos() {
      const hoy = new Date();
      const hoyISO = hoy.toISOString().slice(0, 10);
      const storageKey = `cumpleanos_notif_${hoyISO}`;

      // Cargar el set persistido para hoy (solo la primera vez por mount)
      if (cumpleaniosNotifRef.current === null) {
        try {
          const raw = await AsyncStorage.getItem(storageKey);
          cumpleaniosNotifRef.current = new Set(raw ? JSON.parse(raw) : []);
        } catch {
          cumpleaniosNotifRef.current = new Set();
        }
      }

      const notificados = cumpleaniosNotifRef.current;
      const nuevos: string[] = [];

      pacientes.filter(p => !p.fallecido && p.fechaNacimiento).forEach(p => {
        const nacimientoStr = p.fechaNacimiento.slice(5, 10); // MM-DD
        const cumpleAnio = new Date(`${hoy.getFullYear()}-${nacimientoStr}`);
        const diffDias = Math.round((cumpleAnio.getTime() - hoy.getTime()) / 86400000);
        if (diffDias < 0 || diffDias > 7) return;

        const key = `${p.id}`;
        if (notificados.has(key)) return;
        notificados.add(key);
        nuevos.push(key);

        const mensaje = diffDias === 0
          ? `¡Hoy es el cumpleaños de ${p.nombre} ${p.apellido}!`
          : `${p.nombre} ${p.apellido} cumple años en ${diffDias} día${diffDias !== 1 ? 's' : ''} (${nacimientoStr.split('-').reverse().join('/')})`;

        crearNotificacion({
          tipo: 'sistema',
          titulo: diffDias === 0 ? '🎂 Cumpleaños hoy' : '🎂 Próximo cumpleaños',
          mensaje,
          paraRol: 'admin',
        }).catch(() => {});
      });

      if (nuevos.length > 0) {
        AsyncStorage.setItem(storageKey, JSON.stringify([...notificados])).catch(() => {});
      }
    }

    procesarCumpleanos();
  }, [pacientes, isAseo]);

  const bannerOpacity = useRef(new Animated.Value(0)).current;

  function handleEscaneo(data: string) {
    setScannerVisible(false);
    const match = data.match(/hogargeriatrico:\/\/paciente\/(.+)/);
    const pacienteId = match ? match[1] : data;
    const paciente = pacientes.find(p => p.id === pacienteId);
    if (!paciente) {
      Alert.alert('QR no reconocido', 'El código no corresponde a ningún paciente registrado.');
      return;
    }
    if (isAseo) {
      navigation.navigate('Aseo', {
        screen: 'ListaLimpiezas',
        params: {
          pacienteId: paciente.id,
          pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
          habitacion: paciente.habitacion || 'Sin asignar',
        },
      });
    } else {
      navigation.navigate('Pacientes', {
        screen: 'PerfilPaciente',
        params: { pacienteId: paciente.id },
      });
    }
  }

  async function refrescar() {
    setRefrescando(true);
    await Promise.all([cargarPacientes(), cargarSignos(), cargarMedicamentos(), cargarRegistros(), cargarHorarios(), cargarAdministraciones(), cargarLimpiezas(), cargarActividades(), cargarIncumplimientos()]);
    verificarHistorico();
    setRefrescando(false);
    // Mostrar banner por 1.5s
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  useFocusEffect(useCallback(() => {
    refrescar();
    const intervalo = setInterval(refrescar, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, []));

  function confirmarLogout() {
    Alert.alert('Cerrar Sesión', '¿Desea cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
    ]);
  }

  // ── Estadísticas rápidas ───────────────────────────────────────────────────
  const hoy = new Date().toDateString();
  const signosHoy = signosVitales.filter(s => new Date(s.createdAt).toDateString() === hoy);
  const medicamentosActivos = medicamentos.filter(m => m.activo);

  // ── Alertas clínicas ───────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const conSignosHoy = new Set(signosHoy.map(s => s.pacienteId));

    // Último signo por paciente (para anomalías)
    const ultimoSigno = new Map<string, SignoVital>();
    signosVitales.forEach(s => {
      const actual = ultimoSigno.get(s.pacienteId);
      if (!actual || new Date(s.createdAt) > new Date(actual.createdAt)) {
        ultimoSigno.set(s.pacienteId, s);
      }
    });

    const conAnomalias: { paciente: Paciente; anomalias: string[]; critico: boolean }[] = [];
    pacientes.forEach(p => {
      const signo = ultimoSigno.get(p.id);
      if (signo) {
        const anomalias = detectarAnomalias(signo);
        if (anomalias.length > 0) conAnomalias.push({ paciente: p, anomalias, critico: esCritico(signo) });
      }
    });
    conAnomalias.sort((a, b) => (b.critico ? 1 : 0) - (a.critico ? 1 : 0));

    // Dosis pendientes
    const adminHoy = administraciones.filter(a => new Date(a.createdAt).toDateString() === hoy);
    const adminHoyIds = new Set(adminHoy.map(a => a.medicamentoId));
    const medsSinDosisHoy = medicamentosActivos.filter(m => !adminHoyIds.has(m.id));
    const dosisPorPaciente = new Map<string, { paciente: Paciente; meds: string[] }>();
    medsSinDosisHoy.forEach(m => {
      const paciente = pacientes.find(p => p.id === m.pacienteId);
      if (!paciente) return;
      if (!dosisPorPaciente.has(m.pacienteId)) dosisPorPaciente.set(m.pacienteId, { paciente, meds: [] });
      dosisPorPaciente.get(m.pacienteId)!.meds.push(m.nombre);
    });
    const dosisPendientes = Array.from(dosisPorPaciente.values());

    // ── Alertas de signos unificadas por paciente ──────────────────────────────
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    type AlertaSignoTipo = 'en_curso' | 'incumplimiento' | 'proxima' | 'sin_toma';
    type AlertaSigno = {
      paciente: Paciente; tipo: AlertaSignoTipo;
      tomaNombre?: string; horaFin?: string; horaInicio?: string;
      minutosRestantes?: number; minutosParaInicio?: number;
    };

    const alertasSignos: AlertaSigno[] = [];

    const hoyISO = new Date().toISOString().slice(0, 10);
    pacientes.filter(p => !p.fallecido && (!p.fechaIngreso || p.fechaIngreso.slice(0, 10) <= hoyISO)).forEach(p => {
      // Si ya tiene signos hoy sin toma (libre) o todas las tomas registradas → ok
      const tomasPaciente = horarios[p.id] ?? [];

      if (tomasPaciente.length === 0) {
        if (!conSignosHoy.has(p.id)) alertasSignos.push({ paciente: p, tipo: 'sin_toma' });
        return;
      }

      // Evaluar cada toma y quedarse con la de mayor prioridad
      let enCurso: AlertaSigno | null = null;
      let incumplimiento: AlertaSigno | null = null;
      let proxima: AlertaSigno | null = null;

      tomasPaciente.forEach(t => {
        const yaRegistrada = signosHoy.some(s => s.pacienteId === p.id && s.tomaNombre === t.nombre);
        if (yaRegistrada) return;
        const [hIni, mIni] = t.horaInicio.split(':').map(Number);
        const [hFin, mFin] = t.horaFin.split(':').map(Number);
        const inicio = hIni * 60 + mIni;
        const fin = hFin * 60 + mFin;
        if (horaActual >= inicio && horaActual <= fin) {
          if (!enCurso) enCurso = { paciente: p, tipo: 'en_curso', tomaNombre: t.nombre, horaFin: t.horaFin, minutosRestantes: fin - horaActual };
        } else if (horaActual > fin) {
          if (!incumplimiento) incumplimiento = { paciente: p, tipo: 'incumplimiento', tomaNombre: t.nombre, horaFin: t.horaFin };
        } else {
          const mpi = inicio - horaActual;
          if (!proxima || mpi < proxima.minutosParaInicio!) proxima = { paciente: p, tipo: 'proxima', tomaNombre: t.nombre, horaInicio: t.horaInicio, minutosParaInicio: mpi };
        }
      });

      const alerta = enCurso ?? incumplimiento ?? proxima;
      if (alerta) alertasSignos.push(alerta);
    });

    // Ordenar: en_curso → incumplimiento → proxima → sin_toma
    const prioridad: Record<AlertaSignoTipo, number> = { en_curso: 0, incumplimiento: 1, sin_toma: 2, proxima: 3 };
    alertasSignos.sort((a, b) => prioridad[a.tipo] - prioridad[b.tipo]);

    return { alertasSignos, conAnomalias, dosisPendientes };
  }, [pacientes, signosVitales, medicamentos, signosHoy, horarios, administraciones, tick]);

  // ── Infracciones ──────────────────────────────────────────────────────────
  // Signos vitales: vienen de la BD (incumplimientosDB)
  // Medicamentos: calculados (no hay tabla dedicada aún)

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const totalCriticos = alertas.conAnomalias.filter(a => a.critico).length +
    incumplimientosDB.filter(i => !i.requerimientoEstado || i.requerimientoEstado === 'pendiente').length;
  const totalAlertas = alertas.alertasSignos.filter(a => a.tipo !== 'proxima').length +
    alertas.dosisPendientes.length + alertas.conAnomalias.filter(a => !a.critico).length;
  const estadoColor = totalCriticos > 0 ? COLORS.danger : totalAlertas > 0 ? COLORS.warning : COLORS.secondaryLight;
  const estadoIcono = totalCriticos > 0 ? 'alert-circle' : totalAlertas > 0 ? 'alert' : 'check-circle';
  const estadoTexto = totalCriticos > 0
    ? `${totalCriticos} crítico${totalCriticos !== 1 ? 's' : ''}`
    : totalAlertas > 0
    ? `${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''}`
    : 'Todo en orden';

  const cumpleaniosHoy = useMemo(() => {
    const ahora = new Date();
    return pacientes.filter(p => {
      if (p.fallecido || !p.fechaNacimiento) return false;
      const fn = p.fechaNacimiento.slice(5, 10); // MM-DD
      const cumple = `${ahora.getFullYear()}-${fn}`;
      return new Date(cumple).toDateString() === ahora.toDateString();
    });
  }, [pacientes]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.banner, { opacity: bannerOpacity }]} pointerEvents="none">
        <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.white} />
        <Text style={styles.bannerTexto}>Datos actualizados</Text>
      </Animated.View>

    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >

      {/* Encabezado del hogar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} activeOpacity={0.7} style={styles.menuBtn}>
          <MaterialCommunityIcons name="menu" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo} numberOfLines={1}>{hogar.nombre}</Text>
          <Text style={styles.headerFecha}>{fechaHoy}</Text>
          {hogar.ciudad ? <Text style={styles.headerCiudad}>{hogar.ciudad}{hogar.provincia ? `, ${hogar.provincia}` : ''}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notificaciones')} style={styles.bellBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.white} />
          {noLeidas > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{noLeidas > 99 ? '99+' : noLeidas}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          {hogar.logoUri ? (
            <Image source={{ uri: hogar.logoUri }} style={styles.headerLogo} />
          ) : (
            <MaterialCommunityIcons name="hospital-building" size={32} color={COLORS.white} />
          )}
        </View>
      </View>

      {/* Barra de sesión */}
      <TouchableOpacity style={[styles.sesionBar, { backgroundColor: colors.surface }]} onPress={confirmarLogout} activeOpacity={0.7}>
        <MaterialCommunityIcons
          name={isAdmin ? 'shield-account' : 'account-heart'}
          size={20}
          color={isAdmin ? COLORS.primary : COLORS.secondaryLight}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.sesionNombre}>{usuario?.nombre} {usuario?.apellido}</Text>
          <Text style={styles.sesionRol}>{isAdmin ? 'Administrador' : isAseo ? 'Aseo' : 'Enfermero'}</Text>
          {ultimoIngreso && (
            <Text style={styles.sesionIngreso}>
              Último ingreso: {formatearFechaHora(ultimoIngreso)}
            </Text>
          )}
        </View>
        <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
        <Text style={styles.sesionCerrar}>Cerrar sesión</Text>
      </TouchableOpacity>

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

      {/* Estadísticas navegables */}
      <Text style={styles.seccion}>Resumen General</Text>

      {/* Botón QR centrado */}
      <TouchableOpacity style={styles.qrBoton} onPress={() => setScannerVisible(true)} activeOpacity={0.75}>
        <MaterialCommunityIcons name="qrcode-scan" size={28} color="#6A1B9A" />
        <Text style={styles.qrBotonTexto}>
          {isAseo ? 'Escanear zona de limpieza' : 'Escanear QR del paciente'}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#6A1B9A" />
      </TouchableOpacity>

      <View style={[styles.statsGrid, isAseo && { justifyContent: 'center' }]}>
        {!isAseo && (
          <StatCard
            icono="account-group"
            valor={pacientes.length}
            label="Pacientes"
            color={COLORS.primary}
            onPress={() => navigation.navigate('Pacientes')}
          />
        )}
        {!isAseo && (
          <StatCard
            icono="heart-pulse"
            valor={signosHoy.length}
            label="Signos hoy"
            color={COLORS.secondaryLight}
            onPress={() => navigation.navigate('SignosVitales')}
          />
        )}
        {!isAseo && (
          <StatCard
            icono="pill"
            valor={medicamentosActivos.length}
            label="Medicamentos"
            color={COLORS.warningLight}
            onPress={() => navigation.navigate('Medicamentos')}
          />
        )}
        {!isAseo && (
          <StatCard
            icono="clipboard-text"
            valor={registros.length}
            label="Registros"
            color={COLORS.primaryLight}
            onPress={() => navigation.navigate('Historial')}
          />
        )}
        {!isAseo && (
          <StatCard
            icono="gamepad-variant"
            valor={actividades.length}
            label="Actividades"
            color="#2E7D32"
            onPress={() => navigation.navigate('Actividades')}
          />
        )}
        {!isAseo && (
          <StatCard
            icono="notebook-edit-outline"
            valor={pacientes.length}
            label="Notas Enferm."
            color="#6A1B9A"
            onPress={() => navigation.navigate('Pacientes', {
              screen: 'ListaPacientes',
              params: { destino: 'NotasEnfermeria' },
            })}
          />
        )}
        {isAseo && (
          <StatCard
            icono="broom"
            valor={pacientes.length}
            label="Habitaciones"
            color={COLORS.primary}
            onPress={() => navigation.navigate('Aseo')}
          />
        )}
      </View>

      {!isAseo && (
        <>
          <Text style={styles.seccion}>Acciones Rápidas</Text>
          <View style={styles.accionesGrid}>
            <TouchableOpacity
              style={[styles.accionBtn, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('SignosVitales')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="heart-pulse" size={24} color={COLORS.secondaryLight ?? COLORS.secondary} />
              <Text style={[styles.accionTexto, { color: COLORS.secondaryLight ?? COLORS.secondary }]}>Registrar{'\n'}Signos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.accionBtn, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Medicamentos')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="pill" size={24} color={COLORS.warningLight ?? COLORS.warning} />
              <Text style={[styles.accionTexto, { color: COLORS.warningLight ?? COLORS.warning }]}>Medicamentos</Text>
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

        </>
      )}

      {/* ── ZONAS DE LIMPIEZA (solo aseo) ── */}
      {isAseo && (
        <>
          {(() => {
            const limpiezasHoy = limpiezas.filter(l => new Date(l.createdAt).toDateString() === hoy);
            const porTipo: Record<string, number> = {};
            limpiezasHoy.forEach(l => { porTipo[l.tipo] = (porTipo[l.tipo] ?? 0) + 1; });

            const ZONAS: { tipo: string; color: string; bg: string; icono: string }[] = [
              { tipo: 'Baño',       color: '#00695C',            bg: '#E0F2F1', icono: 'shower' },
              { tipo: 'Zona común', color: '#7B1FA2',            bg: '#F3E5F5', icono: 'sofa' },
              { tipo: 'Pasillo',    color: '#E65100',            bg: '#FFF3E0', icono: 'road-variant' },
              { tipo: 'Zona ropas', color: '#0277BD',            bg: '#E1F5FE', icono: 'washing-machine' },
              { tipo: 'General',    color: COLORS.textSecondary, bg: COLORS.background, icono: 'broom' },
              { tipo: 'Cocina',     color: '#C62828',            bg: '#FFEBEE', icono: 'chef-hat' },
            ];

            return (
              <>
                <View style={styles.zonasGrid}>
                  {ZONAS.map(z => (
                    <TouchableOpacity
                      key={z.tipo}
                      style={[styles.zonaCard, { borderLeftColor: z.color, backgroundColor: colors.surface }]}
                      activeOpacity={0.75}
                      onPress={() => navigation.navigate('Aseo', {
                        screen: 'RegistrarLimpiezaZona',
                        params: { tipo: z.tipo as any },
                      })}
                    >
                      <MaterialCommunityIcons name={z.icono as any} size={24} color={z.color} />
                      <Text style={[styles.zonaValor, { color: porTipo[z.tipo] ? z.color : COLORS.textSecondary }]}>
                        {porTipo[z.tipo] ?? 0}
                      </Text>
                      <Text style={styles.zonaLabel}>{z.tipo}</Text>
                      <MaterialCommunityIcons name="plus-circle-outline" size={16} color={z.color} style={{ marginTop: 2 }} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.seccion}>Últimas Limpiezas</Text>
                {limpiezas.length === 0 ? (
                  <View style={[styles.alertaCard, styles.alertaWarning]}>
                    <View style={[styles.alertaIcono, { backgroundColor: '#FFF3E0' }]}>
                      <MaterialCommunityIcons name="broom" size={22} color={COLORS.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertaTitulo, { color: COLORS.warning }]}>Sin registros hoy</Text>
                      <Text style={styles.alertaDetalle}>Aún no se han registrado limpiezas hoy.</Text>
                    </View>
                  </View>
                ) : limpiezas.slice(0, 5).map(l => {
                  const paciente = pacientes.find(p => p.id === l.pacienteId);
                  const zona = ZONAS.find(z => z.tipo === l.tipo) ?? ZONAS[4];
                  return (
                    <TouchableOpacity
                      key={l.id}
                      style={[styles.actividadCard, { backgroundColor: colors.surface }]}
                      activeOpacity={0.75}
                      onPress={() => paciente && navigation.navigate('Aseo', {
                        screen: 'ListaLimpiezas',
                        params: { pacienteId: paciente.id, pacienteNombre: `${paciente.nombre} ${paciente.apellido}`, habitacion: paciente.habitacion || 'Sin asignar' },
                      })}
                    >
                      <View style={[styles.actividadIcono, { backgroundColor: zona.bg }]}>
                        <MaterialCommunityIcons name={zona.icono as any} size={20} color={zona.color} />
                      </View>
                      <View style={styles.actividadInfo}>
                        <Text style={styles.actividadTitulo}>Hab. {paciente?.habitacion || 'Sin asignar'} — {l.tipo}</Text>
                        <Text style={styles.actividadDetalle}>{l.descripcion}</Text>
                        <Text style={styles.actividadFecha}>{formatearFechaHora(l.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            );
          })()}
        </>
      )}

      {/* ── ESTADO CLÍNICO ── */}
      {!isAseo && pacientes.length > 0 && (
        <TouchableOpacity
          style={[styles.clinicaCard, { backgroundColor: colors.surface, borderColor: estadoColor + '40' }]}
          onPress={() => navigation.navigate('ClinicaDashboard')}
          activeOpacity={0.8}
        >
          <View style={[styles.clinicaIcono, { backgroundColor: estadoColor + '18' }]}>
            <MaterialCommunityIcons name={estadoIcono as any} size={26} color={estadoColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clinicaTitulo}>Estado Clínico</Text>
            <Text style={[styles.clinicaEstado, { color: estadoColor }]}>{estadoTexto}</Text>
            <Text style={styles.clinicaSubtexto}>
              {totalCriticos > 0 || totalAlertas > 0
                ? `${totalCriticos} crítico${totalCriticos !== 1 ? 's' : ''}  •  ${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''}`
                : 'Todos los pacientes en orden'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={estadoColor} />
        </TouchableOpacity>
      )}


      <QRScannerModal
        visible={scannerVisible}
        onEscanear={handleEscaneo}
        onDismiss={() => setScannerVisible(false)}
      />

      {pacientes.length === 0 && (
        <View style={[styles.bienvenida, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="hand-wave" size={48} color={COLORS.primaryLight} />
          <Text style={styles.bienvenidaTitulo}>¡Bienvenido!</Text>
          <Text style={styles.bienvenidaTexto}>
            Comience agregando pacientes desde la pestaña "Pacientes".
          </Text>
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: 16,
    padding: 16, gap: 14, marginBottom: 12,
  },
  headerIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#F44336',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  headerLogo: { width: 56, height: 56, borderRadius: 28 },
  headerTitulo: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.white },
  headerFecha: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' },
  headerCiudad: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.7)' },

  // Sesión
  sesionBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    gap: 10, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sesionNombre: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  sesionRol: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  sesionIngreso: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
  sesionCerrar: { fontSize: FONT_SIZES.xs, color: COLORS.danger, fontWeight: '600' },

  // Sección
  seccion: {
    fontSize: FONT_SIZES.md, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: 10, marginTop: 4,
  },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 12, flexDirection: 'row', alignItems: 'center',
    width: '47%', borderTopWidth: 3, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 3,
  },
  statIcono: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statInfo: { flex: 1 },
  statValor: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', lineHeight: 26 },
  qrBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F3E5F5',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CE93D8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  qrBotonTexto: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#6A1B9A',
  },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

  // Tarjeta estado clínico
  clinicaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1.5, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  clinicaIcono: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  clinicaTitulo: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 2 },
  clinicaEstado: { fontSize: FONT_SIZES.md, fontWeight: '800', marginBottom: 2 },
  clinicaSubtexto: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

  // Zonas de limpieza
  zonasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  zonaCard: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, alignItems: 'center', width: '47%',
    borderLeftWidth: 4, gap: 4,
    elevation: 2,
  },
  zonaValor: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  zonaLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },

  // Card Actividades
  actividadesCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, marginBottom: 16, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#2E7D32',
  },
  actividadesHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  actividadesIcono: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
  },
  actividadesTitulo: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary },
  actividadesSubtitulo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  actividadesBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#2E7D32',
  },
  actividadesBotonTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#2E7D32' },
  actividadesVacio: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },
  actividadItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actividadItemDot: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  actividadItemNombre: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  actividadItemMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  actividadesRegistrarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D32', borderRadius: 10,
    paddingVertical: 10, marginTop: 12,
  },
  actividadesRegistrarTexto: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },

  // Actividad
  actividadCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, elevation: 1,
  },
  actividadIcono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actividadInfo: { flex: 1 },
  actividadTitulo: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  actividadDetalle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  actividadAnomalias: { fontSize: FONT_SIZES.xs, color: COLORS.danger, fontWeight: '600', marginTop: 2 },
  actividadFecha: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Bienvenida
  bienvenida: {
    alignItems: 'center', marginTop: 40, gap: 12, padding: 24,
    backgroundColor: COLORS.surface, borderRadius: 16,
  },
  bienvenidaTitulo: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.primary },
  bienvenidaTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center' },
  banner: {
    position: 'absolute', top: 60, alignSelf: 'center', zIndex: 99,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondaryLight, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 6,
  },
  bannerTexto: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.sm },

  // Banners de cumpleaños y críticos
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

  // Acciones rápidas
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
});
