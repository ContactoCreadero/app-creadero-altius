'use client';

import Link from 'next/link';
import { useDatos } from '@/components/DataProvider';
import { Barra, Cargando, Seccion } from '@/components/UI';
import { porObra, desgloseSaldo } from '@/lib/calc';
import { clp, num, pct } from '@/lib/format';

export default function ObrasPage() {
  const { datos, cargado, nombreObra } = useDatos();
  if (!cargado) return <Cargando />;
  const obras = porObra(datos);
  const v = datos.config.valorAI;
  const { porFacturar, disponible } = desgloseSaldo(obras);

  return (
    <div className="pagina">
      <Seccion
        titulo="Obras"
        subtitulo="Avance y balance de cada obra: AI ejecutadas en la obra comparadas con las AI facturadas con sus códigos SENCE."
      >
        <div className="resumen-linea">
          <span><strong>{obras.length}</strong> obras / centros</span>
          <span>Por facturar en obras: <strong>{num(porFacturar)} AI</strong> ({clp(porFacturar * v)})</span>
          <span>Saldo disponible facturado: <strong>{num(disponible)} AI</strong> ({clp(disponible * v)})</span>
        </div>
      </Seccion>

      <div className="grid-obras">
        {obras.map((o) => {
          const dif = o.diferenciaAI;
          return (
            <Link key={o.obra} href={`/obras/${encodeURIComponent(o.obra)}`} className="tarjeta obra-card">
              <div className="obra-card-cabecera">
                <h3>{nombreObra(o.obra)}</h3>
                <span className="muted small">{o.actividades.length} actividades · {o.iniciativas} iniciativas</span>
              </div>
              <div className="obra-card-avance">
                <strong>{pct(o.avance)}</strong>
                <Barra valor={o.avance} alto={8} tono={o.avance >= 1 ? 'verde' : 'rojo'} />
              </div>
              <dl className="obra-card-datos">
                <div><dt>Ejecutado</dt><dd>{num(o.utilizadoAI)} / {num(o.programadoAI)} AI</dd></div>
                <div><dt>Facturado</dt><dd>{o.facturadoAI ? `${num(o.facturadoAI)} AI` : '—'}</dd></div>
                <div>
                  <dt>{dif >= 0 ? 'Por facturar' : 'Saldo disponible'}</dt>
                  <dd className={dif >= 0 ? 'txt-ambar' : 'txt-verde'}>{num(Math.abs(dif))} AI · {clp(Math.abs(dif) * v)}</dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
