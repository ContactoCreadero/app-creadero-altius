// Archivos de facturas (imágenes / PDF).
// TEMPORAL (versión local): el archivo original se guarda en el navegador (IndexedDB).
// En la etapa de servicios se reemplazará por Cloudflare R2, manteniendo estas mismas funciones.

import type { ArchivoMeta } from '@/lib/types';

const DB = 'creadero-altius-archivos';
const STORE = 'archivos';
export const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB
export const TIPOS_ACEPTADOS = 'image/*,application/pdf';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modo);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function obtenerArchivo(id: string): Promise<Blob | null> {
  try {
    return ((await operar('readonly', (s) => s.get(id))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function eliminarArchivo(id: string): Promise<void> {
  try {
    await operar('readwrite', (s) => s.delete(id));
  } catch {
    /* sin acción */
  }
}

export async function borrarTodosLosArchivos(): Promise<void> {
  try {
    await operar('readwrite', (s) => s.clear());
  } catch {
    /* sin acción */
  }
}

/** Guarda el archivo y devuelve sus datos (incluida la miniatura). */
export async function subirArchivo(file: File): Promise<ArchivoMeta> {
  if (file.size > TAMANO_MAXIMO) throw new Error('El archivo supera los 10 MB.');
  const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const esImagen = file.type.startsWith('image/');
  if (!esPdf && !esImagen) throw new Error('Solo se aceptan imágenes (JPG, PNG) o PDF.');

  const miniatura = esPdf ? await miniaturaPdf(file) : await miniaturaImagen(file);
  const id = 'arch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  await operar('readwrite', (s) => s.put(file, id));
  return {
    id,
    nombre: file.name,
    tipo: esPdf ? 'application/pdf' : file.type,
    tamano: file.size,
    fechaSubida: new Date().toISOString(),
    miniatura,
  };
}

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
    await doc.cleanup?.();
    await loadingTask.destroy();
    return mini;
  } catch {
    return ''; // sin miniatura: se mostrará un ícono PDF
  }
}
