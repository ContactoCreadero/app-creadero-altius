'use client';

import type { EstadoActividad } from '@/lib/types';
import { ETIQUETA_ESTADO } from '@/lib/calc';
import { pct } from '@/lib/format';

export function Kpi({
  titulo,
  valor,
  detalle,
  tono = 'neutro',
  icono,
}: {
  titulo: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  tono?: 'neutro' | 'rojo' | 'azul' | 'verde' | 'ambar';
  icono?: string;
}) {
  return (
    <div className={`kpi kpi-${tono}`}>
      <div className="kpi-titulo">
        {icono && <span className="kpi-icono" aria-hidden>{icono}</span>}
        {titulo}
      </div>
      <div className="kpi-valor">{valor}</div>
      {detalle && <div className="kpi-detalle">{detalle}</div>}
    </div>
  );
}

/** Barra de progreso: fondo = programado, relleno = ejecutado. */
export function Barra({ valor, alto = 10, tono = 'rojo' }: { valor: number; alto?: number; tono?: 'rojo' | 'verde' | 'ambar' | 'azul' }) {
  const v = Math.max(0, Math.min(1, valor || 0));
  return (
    <div className="barra" style={{ height: alto }} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`barra-relleno barra-${tono}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/** Anillo de avance general. */
export function Anillo({ valor, tamano = 168, grosor = 16, etiqueta }: { valor: number; tamano?: number; grosor?: number; etiqueta?: string }) {
  const r = (tamano - grosor) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div className="anillo" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden>
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="var(--pista)" strokeWidth={grosor} />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          stroke="var(--rojo)"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
        />
      </svg>
      <div className="anillo-centro">
        <span className="anillo-valor">{pct(v, 1)}</span>
        {etiqueta && <span className="anillo-etiqueta">{etiqueta}</span>}
      </div>
    </div>
  );
}

export function ChipEstado({ estado }: { estado: EstadoActividad }) {
  return <span className={`chip chip-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

export function Seccion({
  titulo,
  subtitulo,
  acciones,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="tarjeta">
      <div className="tarjeta-cabecera">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p className="sub">{subtitulo}</p>}
        </div>
        {acciones && <div className="tarjeta-acciones">{acciones}</div>}
      </div>
      {children}
    </section>
  );
}

export function Leyenda({ items }: { items: { color: string; texto: string }[] }) {
  return (
    <div className="leyenda">
      {items.map((i) => (
        <span key={i.texto} className="leyenda-item">
          <span className="leyenda-color" style={{ background: i.color }} />
          {i.texto}
        </span>
      ))}
    </div>
  );
}

export function Cargando() {
  return <div className="cargando">Cargando…</div>;
}
