import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface ExcelHoja {
  nombre: string;
  datos?: Record<string, any>[];
  filas?: any[][];  // array-of-arrays para hojas con sección de encabezado + tabla
}

export async function exportarExcel(nombre: string, hojas: ExcelHoja[]): Promise<void> {
  const wb = XLSX.utils.book_new();

  hojas.forEach(hoja => {
    const ws = hoja.filas
      ? XLSX.utils.aoa_to_sheet(hoja.filas)
      : XLSX.utils.json_to_sheet(hoja.datos ?? []);
    XLSX.utils.book_append_sheet(wb, ws, hoja.nombre.slice(0, 31));
  });

  const bytes = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = FileSystem.documentDirectory + nombre + '.xlsx';

  await FileSystem.writeAsStringAsync(uri, bytes, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const puedeCompartir = await Sharing.isAvailableAsync();
  if (!puedeCompartir) throw new Error('Compartir no disponible en este dispositivo');

  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Exportar ${nombre}`,
    UTI: 'com.microsoft.excel.xlsx',
  });
}
