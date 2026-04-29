import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES, SIGNO_RANGOS } from '../../theme';
import { SignoVital, Paciente, Incumplimiento } from '../../types';
import { obtenerIncumplimientos } from '../../storage/incumplimientos';

// ── Tipos locales ──────────────────────────────────────────────────────────────
type AlertaSignoTipo = 'en_curso' | 'incumplimiento' | 'proxima' | 'sin_toma';
type AlertaSigno = {
  paciente: Paciente; tipo: AlertaSignoTipo;
  tomaNombre?: string; horaFin?: string; horaInicio?: string;
  minutosRestantes?: number; minutosParaInicio?: number;
};
type EstadoClinico = 'critico' | 'alerta' | 'ok';

// ── Helpers ────────────────────────────────────────────────────────────────────
function detectarAnomalias(signo: SignoVital): string[] {
  const result: string[] = [];
  const chk = (val: string, key: keyof typeof SIGNO_RANGOS, nombre: string) => {
    if (!val) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const r = SIGNO_RANGOS[key];
    if (num < r.normal[0] || num > r.normal[1]) result.push(nombre);
  };
  chk(signo.presionSistolica,   'presionSistolica',   'P/A Sistólica');
  chk(signo.presionDiastolica,  'presionDiastolica',  'P/A Diastólica');
  chk(signo.frecuenciaCardiaca, 'frecuenciaCardiaca', 'Frec. Cardíaca');
  chk(signo.temperatura,        'temperatura',        'Temperatura');
  chk(signo.saturacionOxigeno,  'saturacionOxigeno',  'SpO2');
  chk(signo.glucosa,            'glucosa',            'Glucosa');
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
    chk(signo.temperatura,      'temperatura') ||
    chk(signo.saturacionOxigeno,'saturacionOxigeno') ||
    chk(signo.glucosa,          'glucosa')
  );
}

function colorEstado(e: EstadoClinico) {
  return e === 'critico' ? COLORS.danger : e === 'alerta' ? COLORS.warning : COLORS.secondaryLight;
}
function bgEstado(e: EstadoClinico) {
  return e === 'critico' ? '#FFEBEE' : e === 'alerta' ? '#FFF8E1' : '#E8F5E9';
}
function iconoEstado(e: EstadoClinico): string {
  return e === 'critico' ? 'alert-circle' : e === 'alerta' ? 'alert' : 'check-circle';
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function ClinicaDashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { pacientes, signosVitales, medicamentos, horarios, administraciones } = useApp();
  const [incumplimientosDB, setIncumplimientosDB] = useState<Incumplimiento[]>([]);
  const [refrescando, setRefrescando] = useState(false);

  const cargarIncumplimientos = useCallback(async () => {
    try { setIncumplimientosDB(await obtenerIncumplimientos(30)); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { cargarIncumplimientos(); }, [cargarIncumplimientos]));

  async function refrescar() {
    setRefrescando(true);
    await cargarIncumplimientos();
    setRefrescando(false);
  }

  const hoy    = new Date().toDateString();
  const hoyISO = new Date().toISOString().slice(0, 10);
  const signosHoy         = signosVitales.filter(s => new Date(s.createdAt).toDateString() === hoy);
  const medicamentosActivos = medicamentos.filter(m => m.activo);

  // ── Alertas clínicas ─────────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const conSignosHoy = new Set(signosHoy.map(s => s.pacienteId));

    const ultimoSigno = new Map<string, SignoVital>();
    signosVitales.forEach(s => {
      const actual = ultimoSigno.get(s.pacienteId);
      if (!actual || new Date(s.createdAt) > new Date(actual.createdAt)) ultimoSigno.set(s.pacienteId, s);
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

    const adminHoy    = administraciones.filter(a => new Date(a.createdAt).toDateString() === hoy);
    const adminHoyIds = new Set(adminHoy.map(a => a.medicamentoId));
    const dosisPorPaciente = new Map<string, { paciente: Paciente; meds: string[] }>();
    medicamentosActivos.filter(m => !adminHoyIds.has(m.id)).forEach(m => {
      const paciente = pacientes.find(p => p.id === m.pacienteId);
      if (!paciente) return;
      if (!dosisPorPaciente.has(m.pacienteId)) dosisPorPaciente.set(m.pacienteId, { paciente, meds: [] });
      dosisPorPaciente.get(m.pacienteId)!.meds.push(m.nombre);
    });
    const dosisPendientes = Array.from(dosisPorPaciente.values());

    const ahora      = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const alertasSignos: AlertaSigno[] = [];

    pacientes.filter(p => !p.fallecido && (!p.fechaIngreso || p.fechaIngreso.slice(0, 10) <= hoyISO)).forEach(p => {
      const tomasPaciente = horarios[p.id] ?? [];
      if (tomasPaciente.length === 0) {
        if (!conSignosHoy.has(p.id)) alertasSignos.push({ paciente: p, tipo: 'sin_toma' });
        return;
      }

      let enCurso: AlertaSigno | null = null;
      let incumplimiento: AlertaSigno | null = null;
      let proxima: AlertaSigno | null = null;

      tomasPaciente.forEach(t => {
        const yaRegistrada = signosHoy.some(s => s.pacienteId === p.id && s.tomaNombre === t.nombre);
        if (yaRegistrada) return;
        const [hIni, mIni] = t.horaInicio.split(':').map(Number);
        const [hFin, mFin] = t.horaFin.split(':').map(Number);
        const inicio = hIni * 60 + mIni;
        const fin    = hFin * 60 + mFin;
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

    const prioridad: Record<AlertaSignoTipo, number> = { en_curso: 0, incumplimiento: 1, sin_toma: 2, proxima: 3 };
    alertasSignos.sort((a, b) => prioridad[a.tipo] - prioridad[b.tipo]);

    return { alertasSignos, conAnomalias, dosisPendientes, ultimoSigno };
  }, [pacientes, signosVitales, medicamentos, signosHoy, horarios, administraciones]);

  // ── Infracciones de medicamentos ─────────────────────────────────────────────
  const infraccionesMeds = useMemo(() => {
    type InfMed = { paciente: Paciente; detalle: string; fechaLabel: string; fechaISO: string };
    const result: InfMed[] = [];
    const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0);
    for (let dias = 1; dias <= 7; dias++) {
      const fecha     = new Date(hoyDate); fecha.setDate(hoyDate.getDate() - dias);
      const fechaStr  = fecha.toDateString();
      const fechaISO  = fecha.toISOString().slice(0, 10);
      const fechaLabel = fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
      const ante1 = new Date(fecha); ante1.setDate(fecha.getDate() - 1);
      const ante2 = new Date(fecha); ante2.setDate(fecha.getDate() - 2);
      medicamentosActivos.forEach(m => {
        if (administraciones.some(a => a.medicamentoId === m.id && new Date(a.createdAt).toDateString() === fechaStr)) return;
        const activo = administraciones.some(a =>
          a.medicamentoId === m.id && (
            new Date(a.createdAt).toDateString() === ante1.toDateString() ||
            new Date(a.createdAt).toDateString() === ante2.toDateString()
          )
        );
        if (!activo) return;
        const paciente = pacientes.find(p => p.id === m.pacienteId);
        if (!paciente || paciente.fallecido) return;
        if (paciente.fechaIngreso && paciente.fechaIngreso.slice(0, 10) > fechaISO) return;
        result.push({ paciente, detalle: m.nombre, fechaLabel, fechaISO });
      });
    }
    return result.sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));
  }, [pacientes, medicamentosActivos, administraciones]);

  // ── Semáforo por paciente ────────────────────────────────────────────────────
  const estadoPacientes = useMemo(() => {
    const incPendientes = incumplimientosDB.filter(i =>
      !i.requerimientoEstado || i.requerimientoEstado === 'pendiente' || i.requerimientoEstado === 'rechazado'
    );
    return pacientes
      .filter(p => !p.fallecido && (!p.fechaIngreso || p.fechaIngreso.slice(0, 10) <= hoyISO))
      .map(p => {
        const ultimoSigno = alertas.ultimoSigno.get(p.id);
        const anomaliaCritica = alertas.conAnomalias.some(a => a.critico && a.paciente.id === p.id);
        const incumplimiento  = incPendientes.some(i => i.pacienteId === p.id);
        const alertaSigno     = alertas.alertasSignos.find(a => a.paciente.id === p.id);
        const dosis           = alertas.dosisPendientes.some(d => d.paciente.id === p.id);
        const anomalia        = alertas.conAnomalias.some(a => !a.critico && a.paciente.id === p.id);

        let estado: EstadoClinico = 'ok';
        let detalle = '';
        if (anomaliaCritica)                         { estado = 'critico'; detalle = 'Valores críticos'; }
        else if (incumplimiento)                     { estado = 'critico'; detalle = 'Incumplimiento pendiente'; }
        else if (alertaSigno?.tipo === 'incumplimiento') { estado = 'alerta'; detalle = `Toma ${alertaSigno.tomaNombre} sin registrar`; }
        else if (dosis)                              { estado = 'alerta'; detalle = 'Dosis sin administrar'; }
        else if (anomalia)                           { estado = 'alerta'; detalle = 'Valores alterados'; }
        else if (alertaSigno?.tipo === 'sin_toma')   { estado = 'alerta'; detalle = 'Sin signos hoy'; }
        else if (alertaSigno?.tipo === 'en_curso')   { estado = 'alerta'; detalle = `Toma en curso — ${alertaSigno.minutosRestantes} min`; }

        return { paciente: p, estado, detalle };
      })
      .sort((a, b) => {
        const orden: Record<EstadoClinico, number> = { critico: 0, alerta: 1, ok: 2 };
        return orden[a.estado] - orden[b.estado];
      });
  }, [pacientes, alertas, incumplimientosDB, hoyISO]);

  const conteos = useMemo(() => ({
    criticos: estadoPacientes.filter(e => e.estado === 'critico').length,
    alertas:  estadoPacientes.filter(e => e.estado === 'alerta').length,
    ok:       estadoPacientes.filter(e => e.estado === 'ok').length,
  }), [estadoPacientes]);

  const hayAlertas     = alertas.alertasSignos.some(a => a.tipo !== 'sin_toma') || alertas.conAnomalias.length > 0 || alertas.dosisPendientes.length > 0;
  const medsSinDosisHoy = alertas.dosisPendientes.reduce((acc, { meds }) => acc + meds.length, 0);
  const incPendientes   = incumplimientosDB.filter(i => !i.requerimientoEstado || i.requerimientoEstado === 'pendiente' || i.requerimientoEstado === 'rechazado');
  const totalPendientes = incPendientes.length + infraccionesMeds.length;
  const totalTodas      = incumplimientosDB.length + infraccionesMeds.length;
  const MAX = 5;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >

      {/* ── Barra resumen ─────────────────────────────────────────────────── */}
      <View style={styles.summaryBar}>
        <View style={[styles.summaryItem, { backgroundColor: '#FFEBEE' }]}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.danger} />
          <Text style={[styles.summaryNum, { color: COLORS.danger }]}>{conteos.criticos}</Text>
          <Text style={styles.summaryLabel}>Críticos</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={[styles.summaryItem, { backgroundColor: '#FFF8E1' }]}>
          <MaterialCommunityIcons name="alert" size={24} color={COLORS.warning} />
          <Text style={[styles.summaryNum, { color: COLORS.warning }]}>{conteos.alertas}</Text>
          <Text style={styles.summaryLabel}>Alertas</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={[styles.summaryItem, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.secondaryLight} />
          <Text style={[styles.summaryNum, { color: COLORS.secondaryLight }]}>{conteos.ok}</Text>
          <Text style={styles.summaryLabel}>OK</Text>
        </View>
      </View>

      {/* ── Semáforo por paciente ──────────────────────────────────────────── */}
      {estadoPacientes.length > 0 && (
        <>
          <Text style={styles.seccion}>Estado por paciente</Text>
          <View style={styles.semaforoGrid}>
            {estadoPacientes.map(({ paciente, estado, detalle }) => (
              <TouchableOpacity
                key={paciente.id}
                style={[styles.semaforoCard, { backgroundColor: bgEstado(estado), borderColor: colorEstado(estado) + '50' }]}
                onPress={() => navigation.navigate('Pacientes', {
                  screen: 'PerfilPaciente',
                  params: { pacienteId: paciente.id },
                })}
                activeOpacity={0.75}
              >
                <View style={[styles.semaforoIcono, { backgroundColor: colorEstado(estado) + '25' }]}>
                  <MaterialCommunityIcons name={iconoEstado(estado) as any} size={18} color={colorEstado(estado)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.semaforoNombre} numberOfLines={1}>
                    {paciente.nombre} {paciente.apellido}
                  </Text>
                  <Text style={styles.semaforoHab}>Hab. {paciente.habitacion || 'S/A'}</Text>
                  <Text style={[styles.semaforoDetalle, { color: detalle ? colorEstado(estado) : COLORS.secondaryLight }]} numberOfLines={1}>
                    {detalle || 'Todo en orden'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Alertas clínicas ───────────────────────────────────────────────── */}
      {pacientes.length > 0 && (
        <>
          <View style={styles.alertasTitulo}>
            <MaterialCommunityIcons
              name={hayAlertas ? 'alert-circle' : 'check-circle'}
              size={20}
              color={hayAlertas ? COLORS.danger : COLORS.secondaryLight}
            />
            <Text style={[styles.seccion, { marginBottom: 0, color: hayAlertas ? COLORS.danger : COLORS.secondaryLight }]}>
              Alertas Clínicas
            </Text>
          </View>

          {/* Signos Vitales */}
          {alertas.alertasSignos.filter(a => a.tipo !== 'sin_toma').length > 0 && (
            <>
              <View style={styles.alertaSubtitulo}>
                <MaterialCommunityIcons name="heart-pulse" size={15} color={COLORS.warning} />
                <Text style={[styles.alertaSubtituloTexto, { color: COLORS.warning }]}>
                  Signos Vitales ({alertas.alertasSignos.filter(a => a.tipo !== 'sin_toma').length})
                </Text>
              </View>
              {alertas.alertasSignos.map((alerta, i) => {
                const { paciente, tipo, tomaNombre, minutosRestantes, minutosParaInicio, horaInicio, horaFin } = alerta;
                const nombre = `${paciente.nombre} ${paciente.apellido}`;

                if (tipo === 'sin_toma') return null;

                if (tipo === 'en_curso') {
                  const mins = minutosRestantes ?? 0;
                  return (
                    <TouchableOpacity
                      key={`sv-${paciente.id}-${i}`}
                      style={[styles.alertaCard, { borderLeftColor: COLORS.primary, borderLeftWidth: 3, backgroundColor: '#E3F2FD' }]}
                      onPress={() => navigation.navigate('SignosVitales', { screen: 'RegistrarSignos', params: { pacienteId: paciente.id, pacienteNombre: nombre, tomaInicial: tomaNombre } })}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.alertaIcono, { backgroundColor: '#BBDEFB' }]}>
                        <MaterialCommunityIcons name="clock-check-outline" size={22} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.alertaTitulo, { color: COLORS.primary }]}>{nombre}</Text>
                        <Text style={styles.alertaDetalle}>
                          {tomaNombre}  •  {mins < 60 ? `Quedan ${mins} min` : `Quedan ${Math.floor(mins / 60)}h ${mins % 60}min`}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  );
                }

                if (tipo === 'incumplimiento') {
                  return (
                    <TouchableOpacity
                      key={`sv-${paciente.id}-${i}`}
                      style={[styles.alertaCard, styles.alertaDanger]}
                      onPress={() => navigation.navigate('SignosVitales', { screen: 'RegistrarSignos', params: { pacienteId: paciente.id, pacienteNombre: nombre, tomaInicial: tomaNombre } })}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.alertaIcono, { backgroundColor: '#FFEBEE' }]}>
                        <MaterialCommunityIcons name="alert-circle" size={22} color={COLORS.danger} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.alertaTitulo, { color: COLORS.danger }]}>{nombre}</Text>
                        <Text style={styles.alertaDetalle}>
                          Incumplimiento — {tomaNombre}{horaFin ? `  •  Venció a las ${horaFin}` : ''}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  );
                }

                const mins = minutosParaInicio ?? 0;
                return (
                  <View
                    key={`sv-${paciente.id}-${i}`}
                    style={[styles.alertaCard, { borderLeftColor: COLORS.border, borderLeftWidth: 3, backgroundColor: COLORS.surface }]}
                  >
                    <View style={[styles.alertaIcono, { backgroundColor: COLORS.background }]}>
                      <MaterialCommunityIcons name="clock-time-four-outline" size={22} color={COLORS.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertaTitulo, { color: COLORS.textPrimary }]}>{nombre}</Text>
                      <Text style={styles.alertaDetalle}>
                        {tomaNombre} inicia a las {horaInicio}  •  Faltan {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}min` : ''}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Anomalías */}
          {alertas.conAnomalias.map(({ paciente, anomalias, critico }) => (
            <TouchableOpacity
              key={paciente.id}
              style={[styles.alertaCard, critico ? styles.alertaDanger : styles.alertaCaution]}
              onPress={() => navigation.navigate('SignosVitales', { screen: 'HistorialSignos', params: { pacienteId: paciente.id, pacienteNombre: `${paciente.nombre} ${paciente.apellido}` } })}
              activeOpacity={0.8}
            >
              <View style={[styles.alertaIcono, { backgroundColor: critico ? '#FFEBEE' : '#FFF8E1' }]}>
                <MaterialCommunityIcons name={critico ? 'alert' : 'alert-outline'} size={22} color={critico ? COLORS.danger : COLORS.warningLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertaTitulo, { color: critico ? COLORS.danger : COLORS.warningLight }]}>
                  {critico ? 'Valores críticos' : 'Valores alterados'} — {paciente.nombre} {paciente.apellido}
                </Text>
                <Text style={styles.alertaDetalle}>{anomalias.join('  •  ')}</Text>
                <Text style={styles.alertaContador}>Último registro</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={critico ? COLORS.danger : COLORS.warningLight} />
            </TouchableOpacity>
          ))}

          {/* Todo en orden */}
          {!hayAlertas && (
            <View style={[styles.alertaCard, styles.alertaOk]}>
              <View style={[styles.alertaIcono, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.secondaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertaTitulo, { color: COLORS.secondary }]}>Todo en orden</Text>
                <Text style={styles.alertaDetalle}>Todos los signos registrados, sin anomalías y todas las dosis al día.</Text>
              </View>
            </View>
          )}

          {/* Dosis pendientes */}
          {alertas.dosisPendientes.length > 0 && (
            <>
              <View style={styles.alertaSubtitulo}>
                <MaterialCommunityIcons name="pill-off" size={15} color={COLORS.warning} />
                <Text style={[styles.alertaSubtituloTexto, { color: COLORS.warning }]}>
                  Dosis sin registrar hoy ({medsSinDosisHoy})
                </Text>
              </View>
              {alertas.dosisPendientes.slice(0, 5).map(({ paciente, meds }) => (
                <TouchableOpacity
                  key={paciente.id}
                  style={[styles.alertaCard, styles.alertaWarning]}
                  onPress={() => navigation.navigate('Medicamentos', { screen: 'ListaMedicamentos', params: { pacienteId: paciente.id, pacienteNombre: `${paciente.nombre} ${paciente.apellido}` } })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.alertaIcono, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialCommunityIcons name="pill-off" size={22} color={COLORS.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertaTitulo, { color: COLORS.warning }]}>{paciente.nombre} {paciente.apellido}</Text>
                    <Text style={styles.alertaDetalle} numberOfLines={2}>{meds.join(', ')}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.warning} />
                </TouchableOpacity>
              ))}
              {alertas.dosisPendientes.length > 5 && (
                <Text style={styles.alertaMas}>y {alertas.dosisPendientes.length - 5} paciente(s) más</Text>
              )}
            </>
          )}
        </>
      )}

      {/* ── Infracciones ───────────────────────────────────────────────────── */}
      {pacientes.length > 0 && (
        <>
          <View style={styles.alertasTitulo}>
            <MaterialCommunityIcons
              name={totalPendientes > 0 ? 'shield-alert' : 'shield-check'}
              size={20}
              color={totalPendientes > 0 ? '#E65100' : COLORS.secondaryLight}
            />
            <Text style={[styles.seccion, { marginBottom: 0, color: totalPendientes > 0 ? '#E65100' : COLORS.secondaryLight }]}>
              Infracciones pendientes
            </Text>
          </View>

          {totalPendientes === 0 ? (
            <View style={[styles.alertaCard, styles.alertaOk]}>
              <View style={[styles.alertaIcono, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="shield-check" size={22} color={COLORS.secondaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertaTitulo, { color: COLORS.secondary }]}>Sin infracciones pendientes</Text>
                <Text style={styles.alertaDetalle}>Todas las tomas y dosis están al día.</Text>
              </View>
            </View>
          ) : (
            <>
              {incPendientes.length > 0 && (
                <>
                  <View style={styles.alertaSubtitulo}>
                    <MaterialCommunityIcons name="heart-pulse" size={15} color="#E65100" />
                    <Text style={[styles.alertaSubtituloTexto, { color: '#E65100' }]}>
                      Signos sin registrar ({incPendientes.length})
                    </Text>
                  </View>
                  {incPendientes.slice(0, MAX).map((inc) => {
                    const paciente = pacientes.find(p => p.id === inc.pacienteId);
                    if (!paciente) return null;
                    const fechaLabel = inc.fecha === hoyISO
                      ? 'hoy'
                      : new Date(inc.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <TouchableOpacity
                        key={inc.id}
                        style={[styles.alertaCard, styles.infraccionCardSignos]}
                        onPress={() => navigation.navigate('Infracciones', { autoAbrirPacienteId: inc.pacienteId, autoAbrirDetalle: inc.detalle, autoAbrirTipo: inc.tipo })}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.alertaIcono, { backgroundColor: '#FBE9E7' }]}>
                          <MaterialCommunityIcons name="heart-pulse" size={20} color="#E65100" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.alertaTitulo, { color: '#BF360C' }]}>
                            {paciente.nombre} {paciente.apellido}  •  Toma {inc.detalle}
                          </Text>
                          <Text style={styles.alertaDetalle}>
                            Venció a las {inc.horaFin || '—'}  •  {fechaLabel}
                            {inc.requerimientoEstado === 'pendiente' ? '  •  Solicitud enviada' : ''}
                            {inc.requerimientoEstado === 'rechazado' ? '  •  Solicitud rechazada' : ''}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#E65100" />
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {infraccionesMeds.length > 0 && (
                <>
                  <View style={styles.alertaSubtitulo}>
                    <MaterialCommunityIcons name="pill-off" size={15} color="#F57F17" />
                    <Text style={[styles.alertaSubtituloTexto, { color: '#F57F17' }]}>
                      Dosis no administradas ({infraccionesMeds.length})
                    </Text>
                  </View>
                  {infraccionesMeds.slice(0, MAX).map((inf, idx) => (
                    <TouchableOpacity
                      key={`inf-med-${inf.paciente.id}-${inf.detalle}-${idx}`}
                      style={[styles.alertaCard, styles.infraccionCardMeds]}
                      onPress={() => navigation.navigate('Infracciones', { autoAbrirPacienteId: inf.paciente.id, autoAbrirDetalle: inf.detalle, autoAbrirTipo: 'medicamento' })}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.alertaIcono, { backgroundColor: '#FFF8E1' }]}>
                        <MaterialCommunityIcons name="pill-off" size={20} color="#F57F17" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.alertaTitulo, { color: '#E65100' }]}>{inf.paciente.nombre} {inf.paciente.apellido}</Text>
                        <Text style={styles.alertaDetalle}>{inf.detalle}  •  {inf.fechaLabel}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#F57F17" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.verTodasBtn}
            onPress={() => navigation.navigate('Infracciones')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#C62828" />
            <Text style={styles.verTodasTexto}>
              Ver todas las infracciones{totalTodas > 0 ? ` (${totalTodas})` : ''}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#C62828" />
          </TouchableOpacity>
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  seccion: {
    fontSize: FONT_SIZES.md, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: 10, marginTop: 4,
  },

  // Barra resumen
  summaryBar: {
    flexDirection: 'row', borderRadius: 16, overflow: 'hidden',
    marginBottom: 20, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  summaryItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 4,
  },
  summaryDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  summaryNum: { fontSize: FONT_SIZES.xxl, fontWeight: '800' },
  summaryLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },

  // Semáforo grid
  semaforoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  semaforoCard: {
    width: '47%', borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  semaforoIcono: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  semaforoNombre: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textPrimary },
  semaforoHab: { fontSize: 10, color: COLORS.textSecondary },
  semaforoDetalle: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  // Alertas
  alertasTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  alertaSubtitulo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 4 },
  alertaSubtituloTexto: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  alertaMas: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 8, marginTop: -4 },
  alertaCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1,
  },
  alertaWarning: { backgroundColor: '#FFFDE7', borderColor: '#FFD54F' },
  alertaDanger:  { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
  alertaCaution: { backgroundColor: '#FFF8E1', borderColor: '#FFCA28' },
  alertaOk:      { backgroundColor: '#F1F8E9', borderColor: '#A5D6A7' },
  infraccionCardSignos: { backgroundColor: '#FBE9E7', borderColor: '#FFAB91' },
  infraccionCardMeds:   { backgroundColor: '#FFF8E1', borderColor: '#FFE082' },
  alertaIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  alertaTitulo: { fontSize: FONT_SIZES.sm, fontWeight: '700', marginBottom: 2 },
  alertaDetalle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 16 },
  alertaContador: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary, marginTop: 3 },

  verTodasBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 8, marginBottom: 8, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#EF9A9A',
    backgroundColor: '#FFF5F5',
  },
  verTodasTexto: { fontSize: FONT_SIZES.sm, color: '#C62828', fontWeight: '600', flex: 1, textAlign: 'center' },
});
