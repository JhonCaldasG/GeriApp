import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { HogarInfo } from '../storage/hogar';
import { LimpiezaRegistro } from '../types';

async function imageToDataUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  try {
    let localUri = uri;
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const dest = `${FileSystem.cacheDirectory}img_tmp_${Date.now()}.jpg`;
      const res = await FileSystem.downloadAsync(uri, dest);
      if (res.status !== 200) return null;
      localUri = res.uri;
    }
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) return null;
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    if (!base64) return null;
    const ext = localUri.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch { return null; }
}

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function generarReporteLimpieza(
  hogar: HogarInfo,
  pacienteNombre: string,
  habitacion: string,
  limpiezas: LimpiezaRegistro[],
  mes: number,        // 0-based
  año: number,
  fotoPaciente?: string | null,
  firmaNombre?: string,
  firmaCargo?: string,
): Promise<void> {

  const registros = limpiezas
    .filter(l => {
      const d = new Date(l.createdAt);
      return d.getMonth() === mes && d.getFullYear() === año;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const nombreMes = new Date(año, mes, 1).toLocaleDateString('es-AR', { month: 'long' });
  const periodo   = `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${año}`;
  const ahora     = new Date();
  const emision   = ahora.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const [logoDataUri] = await Promise.all([imageToDataUri(hogar.logoUri)]);

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" class="logo" alt="Logo"/>`
    : `<span class="logo-txt">🏥</span>`;

  // Generar filas
  let filasHtml = '';
  if (registros.length === 0) {
    filasHtml = `<tr><td colspan="7" class="sin-datos">Sin registros para el período seleccionado</td></tr>`;
  } else {
    registros.forEach((l, idx) => {
      const d    = new Date(l.createdAt);
      const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const hora  = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const fila  = idx % 2 === 0 ? '' : 'alt';
      filasHtml += `
        <tr class="${fila}">
          <td class="c-num">${idx + 1}</td>
          <td class="c-fecha">${fecha}</td>
          <td class="c-hora">${hora}</td>
          <td class="c-area">${esc(l.tipo) || '—'}</td>
          <td class="c-desc">${esc(l.descripcion) || '—'}</td>
          <td class="c-obs">${esc(l.observaciones) || '—'}</td>
          <td class="c-resp">${esc(l.realizadoPor) || '—'}</td>
        </tr>`;
    });
  }

  const totalDias = new Set(registros.map(l => new Date(l.createdAt).toDateString())).size;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #111;
    background: #fff;
    padding: 20px;
  }

  /* ── Encabezado ── */
  .encabezado {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 2px solid #1565C0;
    border-bottom: none;
    padding: 10px 14px;
    background: #1565C0;
    color: #fff;
  }
  .logo { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.4); }
  .logo-txt { font-size: 28px; }
  .enc-info { flex: 1; }
  .enc-hogar { font-size: 14px; font-weight: bold; }
  .enc-sub { font-size: 9px; opacity: 0.85; margin-top: 2px; }
  .enc-titulo {
    font-size: 13px; font-weight: bold; text-align: right;
    line-height: 1.4; min-width: 160px;
  }

  /* ── Info del residente ── */
  .info-residente {
    border: 2px solid #1565C0;
    border-bottom: none;
    display: flex;
  }
  .info-celda {
    flex: 1;
    padding: 6px 12px;
    border-right: 1px solid #aac;
  }
  .info-celda:last-child { border-right: none; }
  .info-lbl { font-size: 8px; text-transform: uppercase; letter-spacing: 0.6px; color: #555; font-weight: bold; }
  .info-val { font-size: 11px; font-weight: bold; color: #1565C0; margin-top: 1px; }

  /* ── Resumen ── */
  .resumen {
    border: 2px solid #1565C0;
    border-bottom: none;
    display: flex;
    background: #EEF4FF;
  }
  .res-celda {
    flex: 1; text-align: center;
    padding: 5px 8px;
    border-right: 1px solid #aac;
  }
  .res-celda:last-child { border-right: none; }
  .res-num  { font-size: 16px; font-weight: 800; color: #1565C0; }
  .res-lbl  { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.4px; }

  /* ── Tabla principal ── */
  table {
    width: 100%;
    border-collapse: collapse;
    border: 2px solid #1565C0;
  }
  thead tr {
    background: #1565C0;
    color: #fff;
  }
  th {
    padding: 7px 8px;
    font-size: 9px;
    font-weight: bold;
    text-align: left;
    letter-spacing: 0.3px;
    border-right: 1px solid rgba(255,255,255,0.25);
  }
  th:last-child { border-right: none; }
  td {
    padding: 5px 8px;
    border: 1px solid #C5D0E0;
    vertical-align: middle;
    font-size: 10px;
  }
  tr.alt td { background: #F4F7FF; }
  .sin-datos {
    text-align: center;
    padding: 20px;
    color: #888;
    font-style: italic;
    border: 1px solid #C5D0E0;
  }

  /* Anchos de columnas */
  .c-num   { width: 28px;  text-align: center; color: #888; font-size: 9px; }
  .c-fecha { width: 72px;  white-space: nowrap; }
  .c-hora  { width: 44px;  white-space: nowrap; font-weight: bold; color: #444; }
  .c-area  { width: 88px;  font-weight: bold; color: #1565C0; }
  .c-desc  { /* flex */ }
  .c-obs   { width: 120px; color: #555; font-style: italic; }
  .c-resp  { width: 110px; }

  /* ── Firma electrónica ── */
  .firma-wrapper {
    border: 2px solid #1565C0;
    border-top: none;
    padding: 12px 14px 10px;
  }
  .firma-titulo {
    font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px;
    color: #888; font-weight: bold; margin-bottom: 8px;
  }
  .firma-tabla { width: 100%; border-collapse: collapse; }
  .firma-tabla td { padding: 0; border: none; }
  .firma-bloque {
    border: 1px solid #C5D0E0;
    border-radius: 4px;
    padding: 8px 12px;
    margin-right: 10px;
  }
  .firma-bloque:last-child { margin-right: 0; }
  .firma-campo-lbl {
    font-size: 8px; text-transform: uppercase;
    letter-spacing: 0.6px; color: #888; font-weight: bold;
    margin-bottom: 4px;
  }
  .firma-campo-val {
    font-size: 11px; font-weight: bold; color: #111;
  }
  .firma-electro-lbl {
    font-size: 8px; color: #888; margin-top: 4px;
  }
  .firma-electro-val {
    font-size: 9px; color: #1565C0; font-weight: bold;
    letter-spacing: 0.2px;
  }

  /* ── Pie ── */
  .pie {
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #aaa;
  }
</style>
</head>
<body>

  <!-- Encabezado -->
  <div class="encabezado">
    ${logoHtml}
    <div class="enc-info">
      <div class="enc-hogar">${esc(hogar.nombre) || 'Hogar Geriátrico'}</div>
      ${hogar.direccion ? `<div class="enc-sub">${esc(hogar.direccion)}${hogar.ciudad ? ` · ${esc(hogar.ciudad)}` : ''}</div>` : ''}
      ${hogar.telefono  ? `<div class="enc-sub">Tel: ${esc(hogar.telefono)}</div>` : ''}
    </div>
    <div class="enc-titulo">PLANILLA DE CONTROL<br/>DE LIMPIEZA<br/>${periodo}</div>
  </div>

  <!-- Info residente -->
  <div class="info-residente">
    <div class="info-celda">
      <div class="info-lbl">Residente</div>
      <div class="info-val">${esc(pacienteNombre)}</div>
    </div>
    <div class="info-celda">
      <div class="info-lbl">Habitación</div>
      <div class="info-val">Hab. ${esc(habitacion)}</div>
    </div>
    <div class="info-celda">
      <div class="info-lbl">Período</div>
      <div class="info-val">${periodo}</div>
    </div>
    <div class="info-celda">
      <div class="info-lbl">Emisión</div>
      <div class="info-val">${emision}</div>
    </div>
  </div>

  <!-- Resumen -->
  <div class="resumen">
    <div class="res-celda">
      <div class="res-num">${registros.length}</div>
      <div class="res-lbl">Total registros</div>
    </div>
    <div class="res-celda">
      <div class="res-num">${totalDias}</div>
      <div class="res-lbl">Días con limpieza</div>
    </div>
    <div class="res-celda">
      <div class="res-num">${new Date(año, mes + 1, 0).getDate()}</div>
      <div class="res-lbl">Días del mes</div>
    </div>
    <div class="res-celda">
      <div class="res-num">${registros.length > 0 ? Math.round((totalDias / new Date(año, mes + 1, 0).getDate()) * 100) : 0}%</div>
      <div class="res-lbl">Cobertura</div>
    </div>
  </div>

  <!-- Tabla -->
  <table>
    <thead>
      <tr>
        <th class="c-num">N°</th>
        <th class="c-fecha">Fecha</th>
        <th class="c-hora">Hora</th>
        <th class="c-area">Área / Tipo</th>
        <th class="c-desc">Descripción</th>
        <th class="c-obs">Observaciones</th>
        <th class="c-resp">Realizado por</th>
      </tr>
    </thead>
    <tbody>
      ${filasHtml}
    </tbody>
  </table>

  <!-- Firma electrónica -->
  <div class="firma-wrapper">
    <div class="firma-titulo">✓ Firma electrónica — generado digitalmente por el sistema</div>
    <table class="firma-tabla">
      <tr>
        <td width="38%">
          <div class="firma-bloque">
            <div class="firma-campo-lbl">Nombre</div>
            <div class="firma-campo-val">${esc(firmaNombre) || '—'}</div>
            <div class="firma-electro-lbl">Firma electrónica</div>
            <div class="firma-electro-val">[${esc(firmaNombre) || 'Sistema'} · ${emision}]</div>
          </div>
        </td>
        <td width="28%">
          <div class="firma-bloque">
            <div class="firma-campo-lbl">Cargo</div>
            <div class="firma-campo-val">${esc(firmaCargo) || '—'}</div>
          </div>
        </td>
        <td width="34%">
          <div class="firma-bloque">
            <div class="firma-campo-lbl">Fecha y hora de emisión</div>
            <div class="firma-campo-val">${emision}</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Pie -->
  <div class="pie">
    <span>Planilla de Control de Limpieza · ${esc(pacienteNombre)} · ${periodo}</span>
    <span>${esc(hogar.nombre)} · Documento generado electrónicamente · No requiere firma manuscrita</span>
  </div>

</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Planilla Limpieza — ${pacienteNombre} — ${periodo}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
