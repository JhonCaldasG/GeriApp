import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';

export const SUPABASE_URL = 'https://ysnzxkmvgtxgijeixhkw.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzbnp4a212Z3R4Z2lqZWl4aGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjg2MzQsImV4cCI6MjA5MDY0NDYzNH0.9bYTaiw0GTwSYd2AA2a-Ur2IpDoYE_KkC4fGlBxNGjQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Sube una imagen local al Storage de Supabase.
 * @param localUri  URI local del archivo (file://...)
 * @param bucket    Nombre del bucket
 * @param path      Ruta dentro del bucket  ej: "pacientes/uuid/perfil/foto.jpg"
 * @returns         URL pública del archivo subido
 */
export async function uploadImagen(localUri: string, bucket: string, path: string): Promise<string> {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: 1, // FileSystemUploadType.BINARY_CONTENT
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'image/jpeg',
    },
  });
  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Upload failed: ${result.body}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
