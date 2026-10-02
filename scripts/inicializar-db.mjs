// =====================================================================
// Inicialización de la base de datos (se ejecuta UNA sola vez).
//
//   npm.cmd run db:init
//
// 1) Crea las tablas si no existen.
// 2) Carga los datos del Excel SOLO si las tablas están vacías.
//    Si ya hay datos, no modifica nada (es seguro ejecutarlo de nuevo).
// =====================================================================

import pg from 'pg';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ Falta DATABASE_URL en el archivo .env.local');
  process.exit(1);
}

const datos = JSON.parse(readFileSync(new URL('./datos-excel.json', import.meta.url), 'utf8'));
const pool = new pg.Pool({ connectionString: url, max: 1 });

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS configuracion (
  id             integer PRIMARY KEY CHECK (id = 1),
  datos          jsonb NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actividades (
  id                   text PRIMARY KEY,
  iniciativa_id        text NOT NULL,
  periodo              text,
  obra                 text NOT NULL,
  fecha_inicio         date,
  fecha_termino        date,
  detalle_programado   text NOT NULL DEFAULT '',
  detalle_ejecutado    text NOT NULL DEFAULT '',
  ai_programado        numeric(10,2) NOT NULL DEFAULT 0,
  avance               numeric(6,4) NOT NULL DEFAULT 0 CHECK (avance >= 0 AND avance <= 1),
  charlas_programadas  integer NOT NULL DEFAULT 0,
  charlas_realizadas   integer NOT NULL DEFAULT 0,
  personas             integer,
  observacion          text NOT NULL DEFAULT '',
  fila_excel           integer,
  orden                integer NOT NULL DEFAULT 0,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS actividades_obra_idx ON actividades (obra);

CREATE TABLE IF NOT EXISTS facturas (
  id              text PRIMARY KEY,
  fecha           date,
  codigo          text NOT NULL,
  obra            text NOT NULL,
  codigo_sence    text NOT NULL DEFAULT '',
  ai              numeric(10,2) NOT NULL DEFAULT 0,
  numero_factura  text NOT NULL DEFAULT '',
  observacion     text NOT NULL DEFAULT '',
  pagada          boolean NOT NULL DEFAULT false,
  fecha_pago      date,
  archivo         jsonb,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS facturas_obra_idx ON facturas (obra);
`;

async function main() {
  const c = await pool.connect();
  try {
    console.log('→ Creando tablas (si no existen)…');
    await c.query(ESQUEMA);

    const { rows } = await c.query(
      `SELECT (SELECT count(*) FROM actividades)::int AS a, (SELECT count(*) FROM facturas)::int AS f,
              (SELECT count(*) FROM configuracion)::int AS c`,
    );
    if (rows[0].a > 0 || rows[0].f > 0 || rows[0].c > 0) {
      console.log(`✓ La base ya tiene datos (${rows[0].a} actividades, ${rows[0].f} facturas). No se cargó nada.`);
      return;
    }

    console.log('→ Cargando datos del Excel…');
    await c.query('BEGIN');
    await c.query('INSERT INTO configuracion (id, datos) VALUES (1, $1)', [JSON.stringify(datos.config)]);
    let orden = 0;
    for (const a of datos.actividades) {
      orden++;
      await c.query(
        `INSERT INTO actividades (id, iniciativa_id, periodo, obra, fecha_inicio, fecha_termino, detalle_programado,
           detalle_ejecutado, ai_programado, avance, charlas_programadas, charlas_realizadas, personas, observacion, fila_excel, orden)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [a.id, a.iniciativaId, a.periodo, a.obra, a.fechaInicio, a.fechaTermino, a.detalleProgramado, a.detalleEjecutado,
         a.aiProgramado, a.avance, a.charlasProgramadas, a.charlasRealizadas, a.personas, a.observacion, a.filaExcel, orden],
      );
    }
    for (const f of datos.facturas) {
      await c.query(
        `INSERT INTO facturas (id, fecha, codigo, obra, codigo_sence, ai, numero_factura, observacion, pagada, fecha_pago, archivo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [f.id, f.fecha, f.codigo, f.obra, f.codigoSence, f.ai, f.numeroFactura, f.observacion, !!f.pagada, f.fechaPago, null],
      );
    }
    await c.query('COMMIT');

    const tot = await c.query(
      `SELECT (SELECT sum(ai_programado) FROM actividades)::float8 AS prog,
              (SELECT sum(ai_programado * avance) FROM actividades)::float8 AS util,
              (SELECT sum(ai) FROM facturas)::float8 AS fact`,
    );
    const t = tot.rows[0];
    console.log(`✓ Listo: ${datos.actividades.length} actividades y ${datos.facturas.length} facturas cargadas.`);
    console.log(`  Control: programado ${t.prog} AI · ejecutado ${Math.round(t.util * 10) / 10} AI · facturado ${t.fact} AI`);
    console.log('  (Excel: 509 · 484,7 · 226)');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

main()
  .catch((e) => {
    console.error('✗ Error:', e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
