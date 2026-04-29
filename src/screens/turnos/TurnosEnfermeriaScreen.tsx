import React, { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Alert, Modal, ScrollView,
  TouchableOpacity, TouchableWithoutFeedback,
} from 'react-native';
import { Text, Button, TextInput, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Usuario, TurnoEnfermeria, Paciente } from '../../types';
import { obtenerUsuarios } from '../../storage/usuarios';
import { obtenerTurnos, guardarTurno, actualizarTurno, eliminarTurno } from '../../storage/turnos';
import { obtenerPacientes, obtenerSignos, obtenerMedicamentos } from '../../storage';
import { obtenerAdministraciones } from '../../storage/administraciones';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONT_SIZES } from '../../theme';
import { useEliminar } from '../../hooks/useEliminar';
import FeedbackEliminar from '../../components/FeedbackEliminar';

// ── helpers ────────────────────────────────────────────────────────────────────
function isoADisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayAIso(display: string): string {
  const partes = display.replace(/\D/g, '');
  if (partes.length < 8) return '';
  return `${partes.slice(4, 8)}-${partes.slice(2, 4)}-${partes.slice(0, 2)}`;
}

function autoFormatFecha(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function estadoTurno(t: TurnoEnfermeria): 'activo' | 'proximo' | 'finalizado' {
  const h = hoy();
  if (t.fechaFin < h) return 'finalizado';
  if (t.fechaInicio > h) return 'proximo';
  return 'activo';
}

// ── tipos ──────────────────────────────────────────────────────────────────────
type Duracion = TurnoEnfermeria['duracion'];

const DURACIONES: { valor: Duracion; horas: string; color: string; bg: string }[] = [
  { valor: '8h',  horas: '8 horas',  color: '#1565C0', bg: '#E3F2FD' },
  { valor: '12h', horas: '12 horas', color: '#6A1B9A', bg: '#F3E5F5' },
  { valor: '24h', horas: '24 horas', color: '#AD1457', bg: '#FCE4EC' },
];

// ── componente tarjeta de enfermero ────────────────────────────────────────────
interface EnfermeroCardProps {
  enfermero: Usuario;
  turnos: TurnoEnfermeria[];
  onAsignar: () => void;
  onEditarTurno: (t: TurnoEnfermeria) => void;
  onEliminarTurno: (t: TurnoEnfermeria) => void;
}

function EnfermeroCard({ enfermero, turnos, onAsignar, onEditarTurno, onEliminarTurno }: EnfermeroCardProps) {
  const { colors } = useAppTheme();
  const turnosOrdenados = [...turnos].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  const activo = turnosOrdenados.find(t => estadoTurno(t) === 'activo');
  const proximo = turnosOrdenados.find(t => estadoTurno(t) === 'proximo');
  const destacado = activo ?? proximo;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Cabecera enfermero */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <MaterialCommunityIcons name="account-heart" size={22} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNombre}>{enfermero.nombre} {enfermero.apellido}</Text>
          <Text style={styles.cardUsuario}>@{enfermero.usuario}</Text>
        </View>
        <TouchableOpacity style={styles.btnAsignar} onPress={onAsignar} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus-circle-outline" size={16} color={COLORS.white} />
          <Text style={styles.btnAsignarTexto}>Asignar</Text>
        </TouchableOpacity>
      </View>

      {/* Turno destacado */}
      {destacado ? (
        <View style={[styles.turnoDestacado, { borderLeftColor: activo ? '#2E7D32' : '#1565C0' }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.turnoRow}>
              <View style={[styles.estadoBadge, { backgroundColor: activo ? '#E8F5E9' : '#E3F2FD' }]}>
                <Text style={[styles.estadoTexto, { color: activo ? '#2E7D32' : '#1565C0' }]}>
                  {activo ? 'Activo' : 'Próximo'}
                </Text>
              </View>
              <Text style={styles.turnoDuracion}>{destacado.duracion}</Text>
            </View>
            <Text style={styles.turnoFechas}>
              {isoADisplay(destacado.fechaInicio)}  →  {isoADisplay(destacado.fechaFin)}
            </Text>
            {destacado.observaciones ? (
              <Text style={styles.turnoObs} numberOfLines={1}>{destacado.observaciones}</Text>
            ) : null}
          </View>
          <View style={styles.turnoAcciones}>
            <TouchableOpacity onPress={() => onEditarTurno(destacado)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEliminarTurno(destacado)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.sinTurno}>
          <MaterialCommunityIcons name="calendar-remove-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.sinTurnoTexto}>Sin turno asignado</Text>
        </View>
      )}

      {/* Historial compacto (últimos finalizados) */}
      {turnosOrdenados.filter(t => estadoTurno(t) === 'finalizado').slice(0, 2).map(t => (
        <View key={t.id} style={styles.turnoHistorial}>
          <MaterialCommunityIcons name="history" size={13} color={COLORS.textSecondary} />
          <Text style={styles.turnoHistorialTexto}>
            {t.duracion}  ·  {isoADisplay(t.fechaInicio)} – {isoADisplay(t.fechaFin)}
          </Text>
          <TouchableOpacity onPress={() => onEliminarTurno(t)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <MaterialCommunityIcons name="close" size={13} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// ── modal asignar/editar turno ─────────────────────────────────────────────────
interface TurnoModalProps {
  visible: boolean;
  enfermero: Usuario | null;
  turnoExistente: TurnoEnfermeria | null;
  onGuardar: (datos: Omit<TurnoEnfermeria, 'id' | 'createdAt'>) => Promise<void>;
  onCerrar: () => void;
}

function TurnoModal({ visible, enfermero, turnoExistente, onGuardar, onCerrar }: TurnoModalProps) {
  const insets = useSafeAreaInsets();
  const [duracion, setDuracion] = useState<Duracion>('8h');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      if (turnoExistente) {
        setDuracion(turnoExistente.duracion);
        setFechaInicio(isoADisplay(turnoExistente.fechaInicio));
        setFechaFin(isoADisplay(turnoExistente.fechaFin));
        setObservaciones(turnoExistente.observaciones);
      } else {
        setDuracion('8h');
        setFechaInicio('');
        setFechaFin('');
        setObservaciones('');
      }
    }
  }, [visible, turnoExistente]);

  async function handleGuardar() {
    const isoInicio = displayAIso(fechaInicio);
    const isoFin = displayAIso(fechaFin);
    if (!isoInicio || !isoFin) {
      Alert.alert('Fechas inválidas', 'Ingrese las fechas en formato DD/MM/AAAA.');
      return;
    }
    if (isoFin < isoInicio) {
      Alert.alert('Fechas inválidas', 'La fecha de fin no puede ser anterior al inicio.');
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        usuarioId: enfermero!.id,
        duracion,
        fechaInicio: isoInicio,
        fechaFin: isoFin,
        observaciones: observaciones.trim(),
      });
      onCerrar();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  if (!enfermero) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <TouchableWithoutFeedback onPress={onCerrar}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.modalHandle} />

        {/* Título */}
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitulo}>{turnoExistente ? 'Editar Turno' : 'Asignar Turno'}</Text>
            <Text style={styles.modalSubtitulo}>{enfermero.nombre} {enfermero.apellido}</Text>
          </View>
          <TouchableOpacity onPress={onCerrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Duración */}
          <Text style={styles.modalSeccion}>Duración del turno</Text>
          <View style={styles.duracionRow}>
            {DURACIONES.map(d => {
              const activo = duracion === d.valor;
              return (
                <TouchableOpacity
                  key={d.valor}
                  style={[styles.duracionChip, { borderColor: d.color, backgroundColor: activo ? d.bg : COLORS.surface }]}
                  onPress={() => setDuracion(d.valor)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={18}
                    color={d.color}
                  />
                  <View>
                    <Text style={[styles.duracionChipValor, { color: d.color, fontWeight: activo ? '800' : '600' }]}>
                      {d.valor}
                    </Text>
                    <Text style={[styles.duracionChipHoras, { color: d.color }]}>{d.horas}</Text>
                  </View>
                  {activo && (
                    <MaterialCommunityIcons name="check-circle" size={16} color={d.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fechas */}
          <Text style={styles.modalSeccion}>Período del turno</Text>
          <View style={styles.fechasRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Desde *"
                value={fechaInicio}
                onChangeText={v => setFechaInicio(autoFormatFecha(v))}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                style={styles.fechaInput}
                keyboardType="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
            </View>
            <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textSecondary} style={{ marginTop: 8 }} />
            <View style={{ flex: 1 }}>
              <TextInput
                label="Hasta *"
                value={fechaFin}
                onChangeText={v => setFechaFin(autoFormatFecha(v))}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                style={styles.fechaInput}
                keyboardType="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
            </View>
          </View>

          {/* Observaciones */}
          <TextInput
            label="Observaciones (opcional)"
            value={observaciones}
            onChangeText={setObservaciones}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={[styles.fechaInput, { marginTop: 4 }]}
            multiline
            numberOfLines={2}
            placeholder="Ej: Turno de reemplazo, guardia especial..."
          />

          {/* Botones */}
          <View style={styles.modalBotones}>
            <Button mode="outlined" onPress={onCerrar} style={styles.botonCancelar}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleGuardar}
              loading={guardando}
              disabled={guardando}
              style={styles.botonGuardar}
              icon="check"
            >
              {turnoExistente ? 'Actualizar' : 'Asignar'}
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── checklist turno activo ─────────────────────────────────────────────────────
interface ChecklistTurno {
  sinSignosHoy: Paciente[];
  medicamentosPendientes: number;
  cargandoChecklist: boolean;
}

// ── pantalla principal ─────────────────────────────────────────────────────────
export default function TurnosEnfermeriaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { eliminando, exito, ejecutarEliminacion } = useEliminar();
  const [enfermeros, setEnfermeros] = useState<Usuario[]>([]);
  const [turnos, setTurnos] = useState<TurnoEnfermeria[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [enfermeroSeleccionado, setEnfermeroSeleccionado] = useState<Usuario | null>(null);
  const [turnoEditar, setTurnoEditar] = useState<TurnoEnfermeria | null>(null);
  const [checklist, setChecklist] = useState<ChecklistTurno>({ sinSignosHoy: [], medicamentosPendientes: 0, cargandoChecklist: false });
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [usuarios, allTurnos] = await Promise.all([obtenerUsuarios(), obtenerTurnos()]);
      setEnfermeros(usuarios.filter(u => u.rol === 'enfermero' && u.activo !== false));
      setTurnos(allTurnos);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarChecklist = useCallback(async () => {
    setChecklist(prev => ({ ...prev, cargandoChecklist: true }));
    try {
      const hoyISO = new Date().toISOString().slice(0, 10);
      const hoyStr = new Date().toDateString();
      const [pacientes, administraciones, medicamentos] = await Promise.all([
        obtenerPacientes(),
        obtenerAdministraciones(),
        obtenerMedicamentos(),
      ]);
      const pacientesActivos = pacientes.filter(p => !p.fallecido);

      // Pacientes sin signos hoy: cargar signos y verificar
      const signos = await obtenerSignos();
      const conSignosHoy = new Set(
        signos
          .filter(s => new Date(s.createdAt).toDateString() === hoyStr)
          .map(s => s.pacienteId)
      );
      const sinSignosHoy = pacientesActivos.filter(p => !conSignosHoy.has(p.id));

      // Medicamentos pendientes hoy
      const medsActivos = medicamentos.filter(m => m.activo);
      const adminsHoy = new Set(
        administraciones
          .filter(a => a.createdAt.slice(0, 10) === hoyISO)
          .map(a => a.medicamentoId)
      );
      const medicamentosPendientes = medsActivos.filter(m => !adminsHoy.has(m.id)).length;

      setChecklist({ sinSignosHoy, medicamentosPendientes, cargandoChecklist: false });
    } catch {
      setChecklist(prev => ({ ...prev, cargandoChecklist: false }));
    }
  }, []);

  useFocusEffect(useCallback(() => {
    cargar();
    cargarChecklist();
  }, [cargar, cargarChecklist]));

  function abrirAsignar(enfermero: Usuario) {
    setEnfermeroSeleccionado(enfermero);
    setTurnoEditar(null);
    setModalVisible(true);
  }

  function abrirEditar(enfermero: Usuario, turno: TurnoEnfermeria) {
    setEnfermeroSeleccionado(enfermero);
    setTurnoEditar(turno);
    setModalVisible(true);
  }

  function confirmarEliminar(turno: TurnoEnfermeria, enfermero: Usuario) {
    ejecutarEliminacion(
      'Eliminar turno',
      `¿Eliminar el turno ${turno.duracion} (${isoADisplay(turno.fechaInicio)} – ${isoADisplay(turno.fechaFin)}) de ${enfermero.nombre}?`,
      async () => {
        await eliminarTurno(turno.id);
        setTurnos(prev => prev.filter(t => t.id !== turno.id));
      },
    );
  }

  async function handleGuardar(datos: Omit<TurnoEnfermeria, 'id' | 'createdAt'>) {
    if (turnoEditar) {
      await actualizarTurno(turnoEditar.id, {
        duracion: datos.duracion,
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        observaciones: datos.observaciones,
      });
      setTurnos(prev => prev.map(t =>
        t.id === turnoEditar.id ? { ...t, ...datos } : t
      ));
    } else {
      const nuevo = await guardarTurno(datos);
      setTurnos(prev => [nuevo, ...prev]);
    }
  }

  const turnosPorEnfermero = (id: string) => turnos.filter(t => t.usuarioId === id);

  // resumen header
  const totalActivos = turnos.filter(t => estadoTurno(t) === 'activo').length;
  const totalProximos = turnos.filter(t => estadoTurno(t) === 'proximo').length;

  async function generarPDFResumen() {
    setGenerandoPDF(true);
    try {
      const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      const filasEnfermeros = enfermeros.map(e => {
        const ts = turnosPorEnfermero(e.id);
        const activo = ts.find(t => estadoTurno(t) === 'activo');
        const proximo = ts.find(t => estadoTurno(t) === 'proximo');
        const destBadge = activo
          ? `<span style="color:#2E7D32;font-weight:bold">Activo (${activo.duracion})</span>`
          : proximo
          ? `<span style="color:#1565C0;font-weight:bold">Próximo (${proximo.duracion})</span>`
          : '<span style="color:#9E9E9E">Sin turno</span>';
        return `<tr><td>${e.nombre} ${e.apellido}</td><td>@${e.usuario}</td><td>${destBadge}</td><td>${activo ? `${isoADisplay(activo.fechaInicio)} – ${isoADisplay(activo.fechaFin)}` : '—'}</td></tr>`;
      }).join('');

      const filasSinSignos = checklist.sinSignosHoy.map(p =>
        `<tr><td>${p.nombre} ${p.apellido}</td><td>${p.habitacion}</td><td style="color:#E65100">Pendiente</td></tr>`
      ).join('');

      const html = `
        <html><head><meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1A1A2E; }
          h1 { color: #1565C0; font-size: 20px; margin-bottom: 4px; }
          h2 { color: #1565C0; font-size: 15px; margin: 20px 0 8px; border-bottom: 2px solid #E3F2FD; padding-bottom: 4px; }
          .meta { color: #5A6A7E; font-size: 12px; margin-bottom: 20px; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; }
          .stat { background: #F4F6F9; border-radius: 8px; padding: 12px 20px; text-align: center; }
          .stat-num { font-size: 24px; font-weight: bold; color: #1565C0; }
          .stat-label { font-size: 11px; color: #5A6A7E; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #E3F2FD; color: #1565C0; padding: 8px; text-align: left; }
          td { padding: 7px 8px; border-bottom: 1px solid #EEE; }
          .ok { color: #2E7D32; font-weight: bold; }
          .warn { color: #E65100; font-weight: bold; }
        </style></head>
        <body>
          <h1>Reporte de Turno de Enfermería</h1>
          <p class="meta">Generado el ${fecha} a las ${hora}</p>
          <div class="stats">
            <div class="stat"><div class="stat-num">${totalActivos}</div><div class="stat-label">Turnos activos</div></div>
            <div class="stat"><div class="stat-num">${totalProximos}</div><div class="stat-label">Próximos</div></div>
            <div class="stat"><div class="stat-num">${enfermeros.length}</div><div class="stat-label">Enfermeros</div></div>
          </div>
          <h2>Estado de turnos</h2>
          <table><thead><tr><th>Enfermero</th><th>Usuario</th><th>Estado</th><th>Período</th></tr></thead>
          <tbody>${filasEnfermeros}</tbody></table>
          <h2>Checklist del turno</h2>
          <table><thead><tr><th>Ítem</th><th>Estado</th></tr></thead>
          <tbody>
            <tr><td>Pacientes sin signos vitales hoy</td><td class="${checklist.sinSignosHoy.length === 0 ? 'ok' : 'warn'}">${checklist.sinSignosHoy.length === 0 ? '✓ Todos registrados' : `${checklist.sinSignosHoy.length} pendientes`}</td></tr>
            <tr><td>Medicamentos pendientes de administrar</td><td class="${checklist.medicamentosPendientes === 0 ? 'ok' : 'warn'}">${checklist.medicamentosPendientes === 0 ? '✓ Todos administrados' : `${checklist.medicamentosPendientes} pendientes`}</td></tr>
          </tbody></table>
          ${checklist.sinSignosHoy.length > 0 ? `
          <h2>Pacientes sin signos hoy</h2>
          <table><thead><tr><th>Paciente</th><th>Habitación</th><th>Estado</th></tr></thead>
          <tbody>${filasSinSignos}</tbody></table>` : ''}
        </body></html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Reporte de turno' });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally {
      setGenerandoPDF(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      {/* Resumen */}
      <View style={[styles.resumenBar, { backgroundColor: colors.surface }]}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: '#2E7D32' }]}>{totalActivos}</Text>
          <Text style={styles.resumenLabel}>Activos hoy</Text>
        </View>
        <View style={styles.resumenDivisor} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: '#1565C0' }]}>{totalProximos}</Text>
          <Text style={styles.resumenLabel}>Próximos</Text>
        </View>
        <View style={styles.resumenDivisor} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNum, { color: COLORS.primary }]}>{enfermeros.length}</Text>
          <Text style={styles.resumenLabel}>Enfermeros</Text>
        </View>
      </View>

      {/* Checklist turno activo */}
      {(totalActivos > 0) && (
        <View style={[styles.checklistCard, { backgroundColor: colors.surface }]}>
          <View style={styles.checklistHeader}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={COLORS.primary} />
            <Text style={styles.checklistTitulo}>Checklist del turno</Text>
            <TouchableOpacity onPress={generarPDFResumen} disabled={generandoPDF} style={styles.btnPDF} activeOpacity={0.8}>
              <MaterialCommunityIcons name="file-pdf-box" size={16} color="#fff" />
              <Text style={styles.btnPDFTexto}>{generandoPDF ? 'Generando...' : 'PDF'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons
              name={checklist.sinSignosHoy.length === 0 ? 'check-circle' : 'alert-circle'}
              size={18}
              color={checklist.sinSignosHoy.length === 0 ? '#2E7D32' : '#E65100'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemLabel}>Signos vitales hoy</Text>
              <Text style={[styles.checkItemVal, { color: checklist.sinSignosHoy.length === 0 ? '#2E7D32' : '#E65100' }]}>
                {checklist.sinSignosHoy.length === 0
                  ? 'Todos los pacientes registrados'
                  : `${checklist.sinSignosHoy.length} paciente(s) sin registro: ${checklist.sinSignosHoy.slice(0, 2).map(p => p.nombre).join(', ')}${checklist.sinSignosHoy.length > 2 ? '...' : ''}`}
              </Text>
            </View>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons
              name={checklist.medicamentosPendientes === 0 ? 'check-circle' : 'pill-off'}
              size={18}
              color={checklist.medicamentosPendientes === 0 ? '#2E7D32' : '#7B1FA2'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemLabel}>Medicamentos</Text>
              <Text style={[styles.checkItemVal, { color: checklist.medicamentosPendientes === 0 ? '#2E7D32' : '#7B1FA2' }]}>
                {checklist.medicamentosPendientes === 0
                  ? 'Todos administrados hoy'
                  : `${checklist.medicamentosPendientes} medicamento(s) pendientes de administrar`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={enfermeros}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        onRefresh={cargar}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>No hay enfermeros registrados</Text>
          </View>
        }
        renderItem={({ item: enfermero }) => (
          <EnfermeroCard
            enfermero={enfermero}
            turnos={turnosPorEnfermero(enfermero.id)}
            onAsignar={() => abrirAsignar(enfermero)}
            onEditarTurno={t => abrirEditar(enfermero, t)}
            onEliminarTurno={t => confirmarEliminar(t, enfermero)}
          />
        )}
      />

      <TurnoModal
        visible={modalVisible}
        enfermero={enfermeroSeleccionado}
        turnoExistente={turnoEditar}
        onGuardar={handleGuardar}
        onCerrar={() => setModalVisible(false)}
      />

      <FeedbackEliminar eliminando={eliminando} exito={exito} />
    </View>
  );
}

// ── estilos ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  resumenBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, paddingVertical: 14,
    elevation: 2,
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenNum: { fontSize: 24, fontWeight: '800' },
  resumenLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  resumenDivisor: { width: 1, height: 36, backgroundColor: COLORS.border },

  lista: { padding: 16, gap: 12 },

  // Checklist
  checklistCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    borderRadius: 14, padding: 14, elevation: 2,
  },
  checklistHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  checklistTitulo: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  btnPDF: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#C62828', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  btnPDFTexto: { fontSize: FONT_SIZES.xs, color: '#fff', fontWeight: '700' },
  checkItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  checkItemLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  checkItemVal: { fontSize: FONT_SIZES.xs, marginTop: 2 },

  // Card enfermero
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    elevation: 2, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center',
  },
  cardNombre: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  cardUsuario: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
  btnAsignar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  btnAsignarTexto: { fontSize: FONT_SIZES.xs, color: COLORS.white, fontWeight: '700' },

  // Turno destacado
  turnoDestacado: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background,
    borderLeftWidth: 3, marginHorizontal: 14,
    marginBottom: 10, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 10,
  },
  turnoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  estadoBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  estadoTexto: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  turnoDuracion: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.textPrimary },
  turnoFechas: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  turnoObs: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  turnoAcciones: { gap: 12 },

  // Sin turno
  sinTurno: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginBottom: 12,
    backgroundColor: COLORS.background, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  sinTurnoTexto: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // Historial
  turnoHistorial: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingBottom: 8,
  },
  turnoHistorialTexto: {
    flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
  },

  // Vacío
  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },

  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    elevation: 20,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitulo: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary },
  modalSubtitulo: { fontSize: FONT_SIZES.sm, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  modalSeccion: {
    fontSize: FONT_SIZES.xs, fontWeight: '700',
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },

  // Duración
  duracionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  duracionChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 2, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 8,
  },
  duracionChipValor: { fontSize: FONT_SIZES.md, textAlign: 'center' },
  duracionChipHoras: { fontSize: 10, textAlign: 'center' },

  // Fechas
  fechasRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  fechaInput: { backgroundColor: COLORS.surface },

  // Botones modal
  modalBotones: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 8 },
  botonCancelar: { flex: 1, borderColor: COLORS.border },
  botonGuardar: { flex: 2, backgroundColor: COLORS.primary },
});
