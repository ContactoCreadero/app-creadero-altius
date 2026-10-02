// Almacenamiento de documentos en Cloudflare R2 — solo se usa en el servidor.
// Variables de entorno (.env.local y Vercel):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// (R2_ENDPOINT es opcional: solo para pruebas con otro servicio compatible con S3.)
//
// El bucket es PRIVADO: los archivos se suben y se leen con enlaces firmados de corta duración.

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const globalR2 = globalThis as unknown as { __r2Altius?: S3Client };

export const TAMANO_MAXIMO_ARCHIVO = 10 * 1024 * 1024; // 10 MB
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export function tipoPermitido(tipo: string): boolean {
  return TIPOS_PERMITIDOS.includes(tipo);
}

function config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || (!R2_ACCOUNT_ID && !R2_ENDPOINT)) {
    throw new Error('Falta configurar Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)');
  }
  return {
    bucket: R2_BUCKET,
    endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  };
}

function cliente(): S3Client {
  if (!globalR2.__r2Altius) {
    const c = config();
    globalR2.__r2Altius = new S3Client({
      region: 'auto',
      endpoint: c.endpoint,
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      forcePathStyle: true,
      // R2 no usa las sumas de verificación automáticas de S3 en enlaces firmados
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return globalR2.__r2Altius;
}

/** Ruta del archivo dentro del bucket. */
export function claveArchivo(id: string): string {
  return `facturas/${id}`;
}

/** Enlace firmado (5 min) para que el navegador del administrador suba el archivo directamente a R2. */
export async function urlSubida(id: string, tipo: string): Promise<string> {
  const c = config();
  return getSignedUrl(cliente(), new PutObjectCommand({ Bucket: c.bucket, Key: claveArchivo(id), ContentType: tipo }), {
    expiresIn: 300,
  });
}

/** Enlace firmado (5 min) para ver o descargar el archivo. */
export async function urlLectura(id: string, nombre: string, tipo: string, descargar: boolean): Promise<string> {
  const c = config();
  const nombreSeguro = nombre.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'factura';
  return getSignedUrl(
    cliente(),
    new GetObjectCommand({
      Bucket: c.bucket,
      Key: claveArchivo(id),
      ResponseContentType: tipo || undefined,
      ResponseContentDisposition: `${descargar ? 'attachment' : 'inline'}; filename="${nombreSeguro}"`,
    }),
    { expiresIn: 300 },
  );
}

export async function borrarArchivoR2(id: string): Promise<void> {
  try {
    const c = config();
    await cliente().send(new DeleteObjectCommand({ Bucket: c.bucket, Key: claveArchivo(id) }));
  } catch (e) {
    console.error('[R2] No se pudo borrar', id, e instanceof Error ? e.message : e);
  }
}
