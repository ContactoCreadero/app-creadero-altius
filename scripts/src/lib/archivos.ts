// Documentos de facturas (imágenes / PDF) — lado del navegador.
// Los archivos se guardan en Cloudflare R2:
//   1) el servidor entrega un enlace firmado (/api/archivos, solo administrador),
//   2) el navegador sube el archivo directo a R2 con ese enlace,
//   3) para verlo se usa /api/archivos/[id], que redirige a un enlace firmado temporal.
// La miniatura se genera aquí y se guarda junto a los datos de la factura.

import type { ArchivoMeta } from '@/lib/types';

export const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB
export const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp,application/pdf';

/** Dirección para ver (o descargar) el documento. */
export function urlArchivo(id: string, descargar = false): string {
  return `/api/archivos/${encodeURIComponent(id)}${descargar ? '?descargar=1' : ''}`;
}

/** Borra un documento subido que finalmente no se asoció a una factura (por ejemplo, al cancelar). */
export async function eliminarArchivo(id: string): Promise<void> {
  try {
    await fetch(urlArchivo(id), { method: 'DELETE' });
  } catch {
    /* sin acción: el servidor lo rechaza si el documento sigue asociado */
  }
}

/** Sube el archivo a R2 y devuelve sus datos (incluida la miniatura). */
export async function subirArchivo(file: File): Promise<ArchivoMeta> {
  if (file.size > TAMANO_MAXIMO) throw new Error('El archivo supera los 10 MB.');
  const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const tipo = esPdf ? 'application/pdf' : file.type;
  if (!esPdf && !['image/jpeg', 'image/png', 'image/webp'].includes(tipo)) {
    throw new Error('Solo se aceptan imágenes JPG, PNG o PDF.');
  }

  const miniatura = esPdf ? await miniaturaPdf(file) : await miniaturaImagen(file);

  // 1) pedir enlace de subida
  const r = await fetch('/api/archivos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, tamano: file.size }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok) throw new Error(j?.error || 'No se pudo preparar la subida del archivo.');

  // 2) subir directo a R2
  let subida: Response;
  try {
    subida = await fetch(j.url as string, { method: 'PUT', headers: { 'Content-Type': tipo }, body: file });
  } catch {
    throw new Error('No se pudo subir el archivo al almacenamiento (revisa la configuración CORS del bucket R2).');
  }
  if (!subida.ok) throw new Error(`El almacenamiento rechazó el archivo (error ${subida.status}).`);

  return {
    id: j.id as string,
    nombre: file.name,
    tipo,
    tamano: file.size,
    fechaSubida: new Date().toISOString(),
    miniatura,
  };
}

/* ---------------- Miniaturas ---------------- */

const LADO_MINIATURA = 240;

function lienzoAMiniatura(origen: CanvasImageSource, ancho: number, alto: number): string {
  const escala = Math.min(1, LADO_MINIATURA / Math.max(ancho, alto));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(ancho * escala));
  c.height = Math.max(1, Math.round(alto * escala));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(origen, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

async function miniaturaImagen(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return lienzoAMiniatura(img, img.naturalWidth, img.naturalHeight);
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function miniaturaPdf(file: File): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const doc = await loadingTask.promise;
    const pagina = await doc.getPage(1);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: 600 / Math.max(base.width, base.height) });
    const c = document.createElement('canvas');
    c.width = Math.ceil(viewport.width);
    c.height = Math.ceil(viewport.height);
    await pagina.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport }).promise;
    const mini = lienzoAMiniatura(c, c.width, c.height);
    await loadingTask.destroy();
    return mini;
  } catch {
    return ''; // sin miniatura: se mostrará un ícono PDF
  }
}
