// Conexión a la base de datos (Neon PostgreSQL) — solo se usa en el servidor.
// La URL de conexión se define en .env.local (local) y en Vercel (producción): DATABASE_URL=...

import { Pool } from 'pg';
import type { Actividad, ArchivoMeta, Configuracion, Datos, Factura, IniciativaId } from '@/lib/types';

const globalParaPool = globalThis as unknown as { __poolAltius?: Pool };

export function db(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta configurar DATABASE_URL en el archivo .env.local');
  }
  if (!globalParaPool.__poolAltius) {
    globalParaPool.__poolAltius = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  }
  return globalParaPool.__poolAltius;
}

/* ---------------- Lectura ---------------- */

const SELECT_ACTIVIDADES = `
  SELECT id, iniciativa_id, periodo, obra, fecha_inicio::text AS fecha_inicio, fecha_termino::text AS fecha_termino,
         detalle_programado, detalle_ejecutado, ai_programado::float8 AS ai_programado, avance::float8 AS avance,
         charlas_programadas, charlas_realizadas, personas, observacion, fila_excel
  FROM actividades ORDER BY orden, creado_en, id`;

const SELECT_FACTURAS = `
  SELECT id, fecha::text AS fecha, codigo, obra, codigo_sence, ai::float8 AS ai, numero_factura, observacion,
         pagada, fecha_pago::text AS fecha_pago, archivo
  FROM facturas ORDER BY fecha NULLS LAST, codigo, id`;

type Fila = Record<string, unknown>;

function filaActividad(r: Fila): Actividad {
  return {
    id: String(r.id),
    iniciativaId: r.iniciativa_id as IniciativaId,
    periodo: (r.periodo as string) ?? null,
    obra: String(r.obra),
    fechaInicio: (r.fecha_inicio as string) ?? null,
    fechaTermino: (r.fecha_termino as string) ?? null,
    detalleProgramado: String(r.detalle_programado ?? ''),
    detalleEjecutado: String(r.detalle_ejecutado ?? ''),
    aiProgramado: Number(r.ai_programado),
    avance: Number(r.avance),
    charlasProgramadas: Number(r.charlas_programadas),
    charlasRealizadas: Number(r.charlas_realizadas),
    personas: r.personas == null ? null : Number(r.personas),
    observacion: String(r.observacion ?? ''),
    filaExcel: r.fila_excel == null ? undefined : Number(r.fila_excel),
  };
}

function filaFactura(r: Fila): Factura {
  return {
    id: String(r.id),
    fecha: (r.fecha as string) ?? null,
    codigo: String(r.codigo),
    obra: String(r.obra),
    codigoSence: String(r.codigo_sence ?? ''),
    ai: Number(r.ai),
    numeroFactura: String(r.numero_factura ?? ''),
    observacion: String(r.observacion ?? ''),
    pagada: !!r.pagada,
    fechaPago: (r.fecha_pago as string) ?? null,
    archivo: (r.archivo as ArchivoMeta) ?? null,
  };
}

export async function leerDatos(): Promise<Datos> {
  const pool = db();
  const [conf, acts, facs] = await Promise.all([
    pool.query('SELECT datos FROM configuracion WHERE id = 1'),
    pool.query(SELECT_ACTIVIDADES),
    pool.query(SELECT_FACTURAS),
  ]);
  return {
    config: conf.rows[0]?.datos as Configuracion,
    actividades: acts.rows.map(filaActividad),
    facturas: facs.rows.map(filaFactura),
  };
}

/* ---------------- Validación (todo lo que llega del navegador se revisa aquí) ---------------- */

const INICIATIVAS_VALIDAS: IniciativaId[] = ['verano', 'nocel', 'habitos', 'alcohol', 'mantencion', 'otras'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const texto = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fechaONull = (v: unknown) => (typeof v === 'string' && FECHA.test(v) ? v : null);
const numero = (v: unknown, min = 0, max = 1e9) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error('Valor numérico inválido');
  return n;
};
const idValido = (v: unknown) => {
  const s = texto(v, 80);
  if (!/^[A-Za-z0-9_-]{2,80}$/.test(s)) throw new Error('Identificador inválido');
  return s;
};

export function validarActividad(x: unknown): Actividad {
  const a = (x ?? {}) as Record<string, unknown>;
  const iniciativaId = a.iniciativaId as IniciativaId;
  if (!INICIATIVAS_VALIDAS.includes(iniciativaId)) throw new Error('Iniciativa inválida');
  const obra = texto(a.obra, 40).toUpperCase();
  if (!obra) throw new Error('Falta la obra');
  return {
    id: idValido(a.id),
    iniciativaId,
    periodo: iniciativaId === 'mantencion' ? texto(a.periodo, 20) || null : null,
    obra,
    fechaInicio: fechaONull(a.fechaInicio),
    fechaTermino: fechaONull(a.fechaTermino),
    detalleProgramado: texto(a.detalleProgramado),
    detalleEjecutado: texto(a.detalleEjecutado),
    aiProgramado: numero(a.aiProgramado, 0, 100000),
    avance: numero(a.avance, 0, 1),
    charlasProgramadas: Math.round(numero(a.charlasProgramadas ?? 0, 0, 10000)),
    charlasRealizadas: Math.round(numero(a.charlasRealizadas ?? 0, 0, 10000)),
    personas: a.personas == null || a.personas === '' ? null : Math.round(numero(a.personas, 0, 1000000)),
    observacion: texto(a.observacion),
    filaExcel: a.filaExcel == null ? undefined : Math.round(numero(a.filaExcel, 0, 100000)),
  };
}

function validarArchivo(x: unknown): ArchivoMeta | null {
  if (!x || typeof x !== 'object') return null;
  const a = x as Record<string, unknown>;
  const miniatura = typeof a.miniatura === 'string' && a.miniatura.startsWith('data:image/') && a.miniatura.length < 400_000 ? a.miniatura : '';
  return {
    id: idValido(a.id),
    nombre: texto(a.nombre, 200),
    tipo: texto(a.tipo, 100),
    tamano: numero(a.tamano ?? 0, 0, 50 * 1024 * 1024),
    fechaSubida: texto(a.fechaSubida, 40),
    miniatura,
  };
}

export function validarFactura(x: unknown): Factura {
  const f = (x ?? {}) as Record<string, unknown>;
  const codigo = texto(f.codigo, 40).toUpperCase();
  if (!codigo) throw new Error('Falta el código');
  const pagada = f.pagada === true;
  return {
    id: idValido(f.id),
    fecha: fechaONull(f.fecha),
    codigo,
    obra: codigo.replace(/\d+$/, ''),
    codigoSence: texto(f.codigoSence, 40),
    ai: numero(f.ai, 0, 100000),
    numeroFactura: texto(f.numeroFactura, 40),
    observacion: texto(f.observacion, 60),
    pagada,
    fechaPago: pagada ? fechaONull(f.fechaPago) : null,
    archivo: validarArchivo(f.archivo),
  };
}

export function validarConfig(x: unknown): Configuracion {
  const c = (x ?? {}) as Record<string, unknown>;
  const nombres: Record<string, string> = {};
  if (c.nombresObras && typeof c.nombresObras === 'object') {
    for (const [k, v] of Object.entries(c.nombresObras as Record<string, unknown>).slice(0, 300)) {
      const nombre = texto(v, 120);
      if (nombre) nombres[texto(k, 40).toUpperCase()] = nombre;
    }
  }
  const fechaCorte = fechaONull(c.fechaCorte);
  if (!fechaCorte) throw new Error('Fecha de corte inválida');
  return {
    cliente: texto(c.cliente, 120),
    programa: texto(c.programa, 200),
    anio: Math.round(numero(c.anio ?? 2026, 2000, 2100)),
    valorAI: numero(c.valorAI, 0, 100_000_000),
    fechaCorte,
    nombresObras: nombres,
  };
}

/* ---------------- Escritura ---------------- */

export async function guardarActividadDB(a: Actividad): Promise<void> {
  await db().query(
    `INSERT INTO actividades (id, iniciativa_id, periodo, obra, fecha_inicio, fecha_termino, detalle_programado,
       detalle_ejecutado, ai_programado, avance, charlas_programadas, charlas_realizadas, personas, observacion, fila_excel, orden)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, COALESCE((SELECT MAX(orden) + 1 FROM actividades), 1))
     ON CONFLICT (id) DO UPDATE SET
       iniciativa_id = EXCLUDED.iniciativa_id, periodo = EXCLUDED.periodo, obra = EXCLUDED.obra,
       fecha_inicio = EXCLUDED.fecha_inicio, fecha_termino = EXCLUDED.fecha_termino,
       detalle_programado = EXCLUDED.detalle_programado, detalle_ejecutado = EXCLUDED.detalle_ejecutado,
       ai_programado = EXCLUDED.ai_programado, avance = EXCLUDED.avance,
       charlas_programadas = EXCLUDED.charlas_programadas, charlas_realizadas = EXCLUDED.charlas_realizadas,
       personas = EXCLUDED.personas, observacion = EXCLUDED.observacion, actualizado_en = now()`,
    [a.id, a.iniciativaId, a.periodo, a.obra, a.fechaInicio, a.fechaTermino, a.detalleProgramado, a.detalleEjecutado,
     a.aiProgramado, a.avance, a.charlasProgramadas, a.charlasRealizadas, a.personas, a.observacion, a.filaExcel ?? null],
  );
}

export async function eliminarActividadDB(id: string): Promise<void> {
  await db().query('DELETE FROM actividades WHERE id = $1', [id]);
}

export async function guardarFacturaDB(f: Factura): Promise<void> {
  await db().query(
    `INSERT INTO facturas (id, fecha, codigo, obra, codigo_sence, ai, numero_factura, observacion, pagada, fecha_pago, archivo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET
       fecha = EXCLUDED.fecha, codigo = EXCLUDED.codigo, obra = EXCLUDED.obra, codigo_sence = EXCLUDED.codigo_sence,
       ai = EXCLUDED.ai, numero_factura = EXCLUDED.numero_factura, observacion = EXCLUDED.observacion,
       pagada = EXCLUDED.pagada, fecha_pago = EXCLUDED.fecha_pago, archivo = EXCLUDED.archivo, actualizado_en = now()`,
    [f.id, f.fecha, f.codigo, f.obra, f.codigoSence, f.ai, f.numeroFactura, f.observacion, !!f.pagada, f.fechaPago ?? null,
     f.archivo ? JSON.stringify(f.archivo) : null],
  );
}

export async function eliminarFacturaDB(id: string): Promise<void> {
  await db().query('DELETE FROM facturas WHERE id = $1', [id]);
}

export async function guardarConfigDB(c: Configuracion): Promise<void> {
  await db().query(
    `INSERT INTO configuracion (id, datos) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_en = now()`,
    [JSON.stringify(c)],
  );
}
