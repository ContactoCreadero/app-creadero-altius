'use client';

import type { FilaIniciativa, FilaMes, FilaObra } from '@/lib/calc';
import { num, pct } from '@/lib/format';
import { Barra } from '@/components/UI';

/** Barras horizontales: AI ejecutadas vs programadas por iniciativa. */
export function GraficoIniciativas({ filas }: { filas: FilaIniciativa[] }) {
  return (
    <div className="hbars">
      {filas.map((f) => (
        <div key={f.id} className="hbar-fila">
          <div className="hbar-nombre">
            <span>{f.nombre}</span>
            <span className="muted">
              {f.realizadas}/{f.actividades} actividades
            </span>
          </div>
          <div className="hbar-barra">
            <Barra valor={f.avance} alto={14} tono={f.avance >= 1 ? 'verde' : 'rojo'} />
          </div>
          <div className="hbar-valor">
            <strong>{pct(f.avance)}</strong>
            <span className="muted">
              {num(f.utilizadoAI)} / {num(f.programadoAI)} AI
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Columnas por mes: AI programadas (fondo) y ejecutadas (relleno). */
export function GraficoMensual({ filas }: { filas: FilaMes[] }) {
  const max = Math.max(1, ...filas.map((f) => f.programadoAI));
  return (
    <div className="columnas" role="img" aria-label="AI programadas y ejecutadas por mes de inicio">
      {filas.map((f) => {
        const hP = (f.programadoAI / max) * 100;
        const hE = (f.utilizadoAI / max) * 100;
        return (
          <div key={f.clave} className="columna" title={`${f.etiqueta}: ${num(f.utilizadoAI)} de ${num(f.programadoAI)} AI · ${f.actividades} actividades`}>
            <span className="columna-valor">{num(f.utilizadoAI)}</span>
            <div className="columna-area">
              <div className="columna-prog" style={{ height: `${hP}%` }}>
                <div className="columna-ejec" style={{ height: hP ? `${(hE / hP) * 100}%` : 0 }} />
              </div>
            </div>
            <span className="columna-etiqueta">{f.etiqueta}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Barra segmentada del estado de las actividades. */
export function BarraEstados({ realizadas, parciales, pendientes }: { realizadas: number; parciales: number; pendientes: number }) {
  const total = realizadas + parciales + pendientes || 1;
  const seg = [
    { n: realizadas, cls: 'realizada', txt: 'Realizadas' },
    { n: parciales, cls: 'parcial', txt: 'En curso' },
    { n: pendientes, cls: 'pendiente', txt: 'Pendientes' },
  ];
  return (
    <div>
      <div className="segmentos">
        {seg.filter((s) => s.n > 0).map((s) => (
          <div key={s.cls} className={`segmento seg-${s.cls}`} style={{ width: `${(s.n / total) * 100}%` }} title={`${s.txt}: ${s.n}`} />
        ))}
      </div>
      <div className="segmentos-leyenda">
        {seg.map((s) => (
          <span key={s.cls}>
            <span className={`punto seg-${s.cls}`} /> {s.txt} <strong>{s.n}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranking compacto de obras por avance. */
export function GraficoObras({ filas, nombre }: { filas: FilaObra[]; nombre: (c: string) => string }) {
  const max = Math.max(1, ...filas.map((f) => f.programadoAI));
  return (
    <div className="obras-barras">
      {filas.map((f) => (
        <div key={f.obra} className="obra-barra-fila">
          <span className="obra-barra-nombre" title={nombre(f.obra)}>{nombre(f.obra)}</span>
          <div className="obra-barra-pista">
            <div className="obra-barra-prog" style={{ width: `${(f.programadoAI / max) * 100}%` }}>
              <div className="obra-barra-ejec" style={{ width: `${f.avance * 100}%` }} />
            </div>
          </div>
          <span className="obra-barra-valor">
            {num(f.utilizadoAI)}<span className="muted"> / {num(f.programadoAI)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
