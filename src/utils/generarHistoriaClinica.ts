import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Paciente, Medicamento, SignoVital, RegistroMedico, AdministracionMedicamento } from '../types';
import { HogarInfo } from '../storage/hogar';

async function logoADataUri(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    let localUri = uri;
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
      const tmpPath = `${FileSystem.cacheDirectory}logo_hogar_${Date.now()}.${ext}`;
      const resultado = await FileSystem.downloadAsync(uri, tmpPath);
      if (resultado.status !== 200) return null;
      const info = await FileSystem.getInfoAsync(tmpPath);
      if (!info.exists) return null;
      localUri = tmpPath;
    }
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = localUri.split('?')[0].split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}


function esc(str: string | undefined | null): string {
  if (!str) return '—';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtFecha(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtFechaHora(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcEdad(fechaNac: string): string {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

function buildHeader(hogar: HogarInfo, logoDataUri: string | null): string {
  const linea2 = [hogar.direccion, hogar.ciudad, hogar.provincia].filter(Boolean).join(' — ');
  const linea3 = [hogar.telefono, hogar.email].filter(Boolean).join('   |   ');
  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" class="header-logo" alt="Logo"/>`
    : `<div class="header-logo-placeholder"><span>🏥</span></div>`;
  return `
    <div class="page-header">
      <div class="header-inner">
        ${logoHtml}
        <div class="header-texto">
          <div class="header-nombre">${esc(hogar.nombre)}</div>
          ${linea2 ? `<div class="header-datos">${esc(linea2)}</div>` : ''}
          ${linea3 ? `<div class="header-datos">${esc(linea3)}</div>` : ''}
        </div>
        <div class="header-badge">HISTORIA<br/>CLÍNICA</div>
      </div>
    </div>
  `;
}

function buildPatientBanner(p: Paciente): string {
  return `
    <table class="patient-banner">
      <tr>
        <td><b>Apellido y Nombre:</b><br>${esc(p.apellido)}, ${esc(p.nombre)}</td>
        <td><b>Identificación:</b><br>${esc(p.dni)}</td>
        <td><b>Edad:</b><br>${calcEdad(p.fechaNacimiento)}</td>
        <td><b>Habitación:</b><br>${esc(p.habitacion)}</td>
        <td><b>Tipo de Afiliación:</b><br>${esc(p.obraSocial)}</td>
        <td><b>EPS:</b><br>${esc(p.eps)}</td>
      </tr>
    </table>
  `;
}

function buildSeccionMedicamentos(meds: Medicamento[]): string {
  if (meds.length === 0) return '<p class="sin-datos">Sin medicamentos registrados.</p>';
  const activos = meds.filter(m => m.activo);
  const inactivos = meds.filter(m => !m.activo);

  const filas = (lista: Medicamento[], badge: string) => lista.map(m => `
    <tr>
      <td>${esc(m.nombre)} <span class="badge ${badge}">${badge === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
      <td>${esc(m.dosis)}</td>
      <td>${esc(m.frecuencia)}</td>
      <td>${esc(m.horario)}</td>
      <td>${esc(m.viaAdministracion)}</td>
      <td>${esc(m.observaciones)}</td>
    </tr>
  `).join('');

  return `
    <table class="tabla">
      <thead>
        <tr>
          <th>Medicamento</th><th>Dosis</th><th>Frecuencia</th>
          <th>Horario</th><th>Vía</th><th>Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${filas(activos, 'activo')}
        ${filas(inactivos, 'inactivo')}
      </tbody>
    </table>
  `;
}

function buildSeccionSignos(signos: SignoVital[]): string {
  if (signos.length === 0) return '<p class="sin-datos">Sin registros de signos vitales.</p>';
  return `
    <table class="tabla">
      <thead>
        <tr>
          <th>Fecha / Hora</th><th>P/A (mmHg)</th><th>FC (lpm)</th>
          <th>Temp (°C)</th><th>SpO2 (%)</th><th>Glucosa (mg/dL)</th>
          <th>Peso (kg)</th><th>Toma</th><th>Registrado por</th>
        </tr>
      </thead>
      <tbody>
        ${signos.map(s => `
          <tr>
            <td>${fmtFechaHora(s.createdAt)}</td>
            <td>${s.presionSistolica ? `${esc(s.presionSistolica)}/${esc(s.presionDiastolica)}` : '—'}</td>
            <td>${esc(s.frecuenciaCardiaca)}</td>
            <td>${esc(s.temperatura)}</td>
            <td>${esc(s.saturacionOxigeno)}</td>
            <td>${esc(s.glucosa)}</td>
            <td>${esc(s.peso)}</td>
            <td>${esc(s.tomaNombre)}</td>
            <td>${esc(s.registradoPor)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildSeccionRegistros(registros: RegistroMedico[]): string {
  if (registros.length === 0) return '<p class="sin-datos">Sin registros médicos.</p>';
  return `
    <table class="tabla">
      <thead>
        <tr><th>Fecha</th><th>Tipo</th><th>Título</th><th>Descripción</th><th>Registrado por</th></tr>
      </thead>
      <tbody>
        ${registros.map(r => `
          <tr>
            <td>${fmtFechaHora(r.createdAt)}</td>
            <td><span class="badge tipo-${r.tipo.toLowerCase()}">${esc(r.tipo)}</span></td>
            <td><b>${esc(r.titulo)}</b></td>
            <td>${esc(r.descripcion)}</td>
            <td>${esc(r.registradoPor)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildSeccionAdministraciones(admins: AdministracionMedicamento[]): string {
  if (admins.length === 0) return '<p class="sin-datos">Sin dosis administradas registradas.</p>';
  return `
    <table class="tabla">
      <thead>
        <tr><th>Fecha / Hora</th><th>Medicamento</th><th>Dosis</th><th>Nº Dosis</th><th>Administrado por</th><th>Observaciones</th></tr>
      </thead>
      <tbody>
        ${admins.map(a => `
          <tr>
            <td>${fmtFechaHora(a.createdAt)}</td>
            <td>${esc(a.medicamentoNombre)}</td>
            <td>${esc(a.dosis)}</td>
            <td>${a.numeroDosis != null && a.totalDiarias != null ? `${a.numeroDosis}/${a.totalDiarias}` : '—'}</td>
            <td>${esc(a.firmante)}</td>
            <td>${esc(a.notas)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildCSS(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #1a1a2e;
      padding-top: 100px;
      padding-bottom: 40px;
    }

    /* ── Encabezado fijo en cada página ── */
    .page-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #1565C0;
      color: white;
      padding: 8px 20px;
      border-bottom: 3px solid #0D47A1;
    }
    .header-inner {
      display: flex; align-items: center; gap: 12px;
    }
    .header-logo {
      width: 52px; height: 52px;
      border-radius: 6px; object-fit: cover;
      border: 2px solid rgba(255,255,255,0.4);
      flex-shrink: 0;
    }
    .header-logo-placeholder {
      width: 52px; height: 52px; border-radius: 6px;
      background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; flex-shrink: 0;
    }
    .header-texto { flex: 1; }
    .header-nombre {
      font-size: 15px; font-weight: bold; letter-spacing: 0.5px;
    }
    .header-datos {
      font-size: 9px; opacity: 0.85; margin-top: 1px;
    }
    .header-badge {
      font-size: 9px; font-weight: bold; letter-spacing: 1.5px;
      text-transform: uppercase; text-align: center;
      background: rgba(255,255,255,0.18); border-radius: 6px;
      padding: 6px 10px; line-height: 1.5; flex-shrink: 0;
    }

    /* ── Pie de página ── */
    .page-footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      font-size: 8px; color: #888;
      border-top: 1px solid #ddd;
      padding: 8px 20px;
      display: flex; justify-content: space-between;
    }

    /* ── Banner del paciente ── */
    .patient-banner {
      width: 100%;
      background: #E3F2FD;
      border: 1px solid #90CAF9;
      border-radius: 4px;
      margin: 16px 0 20px;
      border-collapse: collapse;
    }
    .patient-banner td {
      padding: 8px 14px;
      font-size: 10px;
      border-right: 1px solid #BBDEFB;
      vertical-align: top;
    }
    .patient-banner td:last-child { border-right: none; }

    /* ── Secciones ── */
    .seccion {
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .seccion-titulo {
      font-size: 12px; font-weight: bold;
      color: white; background: #1565C0;
      padding: 5px 12px; border-radius: 4px 4px 0 0;
      margin-bottom: 0;
    }
    .seccion-body {
      border: 1px solid #dde3ea;
      border-top: none;
      border-radius: 0 0 4px 4px;
      padding: 10px;
    }

    /* ── Tablas ── */
    .tabla {
      width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 4px;
    }
    .tabla thead tr { background: #f0f4f8; }
    .tabla th {
      text-align: left; padding: 5px 8px;
      border: 1px solid #dde3ea;
      font-size: 9px; color: #5a6a7e; font-weight: bold;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .tabla td {
      padding: 5px 8px; border: 1px solid #eef0f3; vertical-align: top;
    }
    .tabla tr:nth-child(even) td { background: #fafbfc; }

    /* ── Badges ── */
    .badge {
      display: inline-block; padding: 1px 6px; border-radius: 8px;
      font-size: 8px; font-weight: bold; margin-left: 4px;
    }
    .badge.activo { background: #E8F5E9; color: #2E7D32; }
    .badge.inactivo { background: #EEEEEE; color: #757575; }
    .badge.tipo-nota { background: #E3F2FD; color: #1565C0; }
    .badge.tipo-diagnóstico { background: #F3E5F5; color: #7B1FA2; }
    .badge.tipo-procedimiento { background: #E0F2F1; color: #00695C; }
    .badge.tipo-alergia { background: #FFEBEE; color: #C62828; }
    .badge.tipo-observación { background: #FFF3E0; color: #E65100; }

    .sin-datos { color: #888; font-style: italic; padding: 6px 0; }

    /* ── Sección de datos personales ── */
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px;
    }
    .info-row { display: flex; gap: 6px; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
    .info-label { font-weight: bold; color: #5a6a7e; min-width: 140px; }
    .info-valor { color: #1a1a2e; }

    /* ── Pie de cada sección ── */
    .seccion-count {
      font-size: 8px; color: #888; text-align: right;
      padding-top: 4px;
    }
  `;
}

export async function generarYCompartirPDF(
  paciente: Paciente,
  hogar: HogarInfo,
  medicamentos: Medicamento[],
  signos: SignoVital[],
  registros: RegistroMedico[],
  administraciones: AdministracionMedicamento[],
): Promise<void> {
  const fechaEmision = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const medsPaciente    = medicamentos.filter(m => m.pacienteId === paciente.id);
  const signosPaciente  = signos.filter(s => s.pacienteId === paciente.id);
  const regPaciente     = registros.filter(r => r.pacienteId === paciente.id);
  const adminPaciente   = administraciones.filter(a => a.pacienteId === paciente.id);

  const logoDataUri = await logoADataUri(hogar.logoUri);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Historia Clínica — ${esc(paciente.apellido)}, ${esc(paciente.nombre)}</title>
  <style>${buildCSS()}</style>
</head>
<body>

  ${buildHeader(hogar, logoDataUri)}

  <div class="page-footer">
    <span>Historia Clínica — ${esc(paciente.apellido)}, ${esc(paciente.nombre)} — ID ${esc(paciente.dni)}</span>
    <span>Emitido: ${fechaEmision}</span>
  </div>

  ${buildPatientBanner(paciente)}

  <!-- DATOS PERSONALES -->
  <div class="seccion">
    <div class="seccion-titulo">Datos Personales</div>
    <div class="seccion-body">
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Apellido y Nombre:</span><span class="info-valor">${esc(paciente.apellido)}, ${esc(paciente.nombre)}</span></div>
        <div class="info-row"><span class="info-label">Identificación:</span><span class="info-valor">${esc(paciente.dni)}</span></div>
        <div class="info-row"><span class="info-label">Fecha de nacimiento:</span><span class="info-valor">${fmtFecha(paciente.fechaNacimiento)}</span></div>
        <div class="info-row"><span class="info-label">Edad:</span><span class="info-valor">${calcEdad(paciente.fechaNacimiento)}</span></div>
        <div class="info-row"><span class="info-label">Habitación:</span><span class="info-valor">${esc(paciente.habitacion)}</span></div>
        <div class="info-row"><span class="info-label">Tipo de Afiliación:</span><span class="info-valor">${esc(paciente.obraSocial)}</span></div>
        <div class="info-row"><span class="info-label">EPS:</span><span class="info-valor">${esc(paciente.eps)}</span></div>
        <div class="info-row"><span class="info-label">Médico responsable:</span><span class="info-valor">${esc(paciente.medicoResponsable)}</span></div>
        <div class="info-row"><span class="info-label">Diagnóstico principal:</span><span class="info-valor">${esc(paciente.diagnosticoPrincipal)}</span></div>
        <div class="info-row"><span class="info-label">Alergias:</span><span class="info-valor">${esc(paciente.alergias)}</span></div>
        <div class="info-row">
          <span class="info-label">Contacto familiar:</span>
          <span class="info-valor">${esc(paciente.contactoFamiliar?.nombre)} (${esc(paciente.contactoFamiliar?.relacion)}) — ${esc(paciente.contactoFamiliar?.telefono)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- MEDICAMENTOS -->
  <div class="seccion">
    <div class="seccion-titulo">Medicamentos (${medsPaciente.length})</div>
    <div class="seccion-body">
      ${buildSeccionMedicamentos(medsPaciente)}
    </div>
  </div>

  <!-- ADMINISTRACIÓN DE DOSIS -->
  <div class="seccion">
    <div class="seccion-titulo">Historial de Dosis Administradas (${adminPaciente.length})</div>
    <div class="seccion-body">
      ${buildSeccionAdministraciones(adminPaciente)}
    </div>
  </div>

  <!-- SIGNOS VITALES -->
  <div class="seccion">
    <div class="seccion-titulo">Signos Vitales (${signosPaciente.length} registros)</div>
    <div class="seccion-body">
      ${buildSeccionSignos(signosPaciente)}
    </div>
  </div>

  <!-- REGISTROS MÉDICOS -->
  <div class="seccion">
    <div class="seccion-titulo">Registros Médicos (${regPaciente.length})</div>
    <div class="seccion-body">
      ${buildSeccionRegistros(regPaciente)}
    </div>
  </div>

</body>
</html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const nombreArchivo = `Historia_${paciente.apellido}_${paciente.nombre}_${new Date().toISOString().slice(0, 10)}.pdf`
    .replace(/\s+/g, '_');

  // Renombrar para que el archivo tenga nombre descriptivo al compartir
  const dirParts = uri.split('/');
  dirParts[dirParts.length - 1] = nombreArchivo;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Historia Clínica — ${paciente.nombre} ${paciente.apellido}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
