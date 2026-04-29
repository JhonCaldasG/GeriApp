import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Paciente } from '../types';
import { HogarInfo } from '../storage/hogar';

function esc(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function uriToDataUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  try {
    let localUri = uri;
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
      const tmpPath = `${FileSystem.cacheDirectory}hoja_foto_${Date.now()}.${ext}`;
      const resultado = await FileSystem.downloadAsync(uri, tmpPath);
      if (resultado.status !== 200) return null;
      const info = await FileSystem.getInfoAsync(tmpPath);
      if (!info.exists) return null;
      localUri = tmpPath;
    }
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext  = localUri.split('?')[0].split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function generarHojaHabitacion(
  paciente: Paciente,
  hogar: HogarInfo,
  qrDataUri: string,
): Promise<void> {
  const [logoDataUri, fotoDataUri] = await Promise.all([
    uriToDataUri(hogar.logoUri),
    uriToDataUri(paciente.fotoUri ?? null),
  ]);

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" class="logo-img" alt="Logo"/>`
    : `<div class="logo-placeholder">🏥</div>`;

  const iniciales = `${paciente.nombre.charAt(0)}${paciente.apellido.charAt(0)}`.toUpperCase();

  const fotoHtml = fotoDataUri
    ? `<img src="${fotoDataUri}" class="paciente-foto" alt="Foto"/>`
    : `<div class="paciente-foto iniciales">${iniciales}</div>`;

  const direccionHogar = [hogar.direccion, hogar.ciudad, hogar.provincia].filter(Boolean).join(' — ');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    @page { size: letter landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      width: 279mm;
      height: 216mm;
      display: flex;
      flex-direction: column;
    }

    /* ── Encabezado ── */
    .encabezado {
      background: #1565C0;
      color: white;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 28px;
      flex-shrink: 0;
    }
    .logo-img {
      width: 90px; height: 90px;
      border-radius: 14px; object-fit: cover;
      border: 2px solid rgba(255,255,255,0.4);
      flex-shrink: 0;
    }
    .logo-placeholder {
      width: 90px; height: 90px;
      border-radius: 14px; font-size: 46px;
      background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .encabezado-texto { flex: 1; }
    .hogar-nombre { font-size: 30px; font-weight: bold; }
    .hogar-sub    { font-size: 14px; color: #cfe2ff; margin-top: 6px; }
    .badge-hoja {
      font-size: 11px; font-weight: bold; letter-spacing: 1.5px;
      text-transform: uppercase; text-align: center;
      background: rgba(255,255,255,0.18); border-radius: 8px;
      padding: 10px 16px; line-height: 1.6;
    }

    /* ── Cuerpo ── */
    .cuerpo {
      flex: 1;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      padding: 0;
    }

    /* Columna izquierda: identidad */
    .col-izq {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px 30px;
      gap: 14px;
      border-right: 1px solid #e0e7ef;
    }

    /* Columna derecha: QR */
    .col-der {
      width: 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      gap: 12px;
      background: #F8FAFF;
    }

    /* Foto / iniciales */
    .paciente-foto {
      width: 200px; height: 200px;
      border-radius: 50%;
      object-fit: cover;
      border: 5px solid #1565C0;
    }
    .paciente-foto.iniciales {
      background: #E3F2FD;
      display: flex; align-items: center; justify-content: center;
      font-size: 74px; font-weight: 900; color: #1565C0;
    }

    /* Nombre + habitación */
    .paciente-nombre {
      font-size: 46px;
      font-weight: 900;
      color: #1a1a2e;
      text-align: center;
      line-height: 1.15;
    }
    .habitacion-badge {
      background: #1565C0;
      color: white;
      font-size: 28px;
      font-weight: bold;
      border-radius: 40px;
      padding: 8px 40px;
    }

    /* Diagnóstico */
    .diagnostico-box {
      background: #F0F4FF;
      border-left: 5px solid #1565C0;
      border-radius: 0 10px 10px 0;
      padding: 12px 18px;
      width: 100%;
    }
    .diagnostico-label {
      font-size: 12px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 1px; color: #1565C0; margin-bottom: 4px;
    }
    .diagnostico-texto {
      font-size: 19px; font-weight: 600; color: #1a1a2e;
    }

    /* Alertas */
    .alertas {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 100%;
    }
    .alerta-box {
      border-radius: 8px;
      padding: 9px 24px;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
    }
    .alerta-caida {
      background: #FFF8E1;
      border: 2px solid #F9A825;
      color: #E65100;
    }
    .alerta-alergia {
      background: #FFEBEE;
      border: 2px solid #E53935;
      color: #C62828;
    }

    /* QR */
    .qr-img { width: 230px; height: 230px; }
    .qr-instruccion { font-size: 13px; color: #444; text-align: center; line-height: 1.5; }

    /* ── Pie ── */
    .pie {
      background: #f0f4f8;
      padding: 10px 28px;
      font-size: 10px; color: #444;
      display: flex; justify-content: space-between;
      flex-shrink: 0;
      border-top: 1px solid #dde3ea;
    }
  </style>
</head>
<body>

  <!-- Encabezado -->
  <div class="encabezado">
    ${logoHtml}
    <div class="encabezado-texto">
      <div class="hogar-nombre">${esc(hogar.nombre)}</div>
      ${direccionHogar ? `<div class="hogar-sub">${direccionHogar}</div>` : ''}
    </div>
    <div class="badge-hoja">HOJA DE<br/>HABITACIÓN</div>
  </div>

  <!-- Cuerpo -->
  <div class="cuerpo">

    <!-- Columna izquierda: identidad -->
    <div class="col-izq">
      ${fotoHtml}
      <div class="paciente-nombre">${esc(paciente.apellido)},<br/>${esc(paciente.nombre)}</div>
      <div class="habitacion-badge">HAB. ${paciente.habitacion ? esc(paciente.habitacion) : 'Sin asignar'}</div>

      ${paciente.diagnosticoPrincipal ? `
      <div class="diagnostico-box">
        <div class="diagnostico-label">Diagnóstico</div>
        <div class="diagnostico-texto">${esc(paciente.diagnosticoPrincipal)}</div>
      </div>
      ` : ''}

      ${(paciente.riesgoCaida || paciente.alergias) ? `
      <div class="alertas">
        ${paciente.riesgoCaida ? `<div class="alerta-box alerta-caida">⚠️ RIESGO DE CAÍDA</div>` : ''}
        ${paciente.alergias ? `<div class="alerta-box alerta-alergia">🚫 ALERGIAS: ${esc(paciente.alergias)}</div>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- Columna derecha: QR -->
    <div class="col-der">
      <img src="${qrDataUri}" class="qr-img" alt="QR Paciente"/>
      <div class="qr-instruccion">Escanee para acceder<br/>al perfil del paciente</div>
    </div>

  </div>

  <!-- Pie -->
  <div class="pie">
    <span>${esc(hogar.nombre)}${hogar.telefono ? ` — ${esc(hogar.telefono)}` : ''}${hogar.email ? ` — ${esc(hogar.email)}` : ''}</span>
    <span>Generado: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
  </div>

</body>
</html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Hoja de habitación — ${paciente.nombre} ${paciente.apellido}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
