'use client';

import Link from 'next/link';
import { useDatos } from '@/components/DataProvider';
import { Barra, Cargando, Seccion } from '@/components/UI';
import { ChipEmpresa } from '@/components/EmpresaUI';
import { porObra, desgloseSaldo, redondear, type FilaObra } from '@/lib/calc';
import { EMPRESAS } from '@/lib/constants';
import { clp, num, pct } from '@/lib/format';
import type { Empresa } from '@/lib/types';

export default function ObrasPage() {
  const { datos, cargado, nombreObra, empresaDeObra } = useDatos();
  if (!cargado) return <Cargando />;
  const obras = porObra(datos);
  const v = datos.config.valorAI;
  const { porFacturar, disponible } = desgloseSaldo(obras);

  // Obras agrupadas por empresa (SpA, S.A., Corporativo y, si hubiera, sin clasificar)
  const grupos: { id: Empresa | 'sin'; nombre: string; obras: FilaObra[] }[] = [
    ...EMPRESAS.map((e) => ({ id: e.id, nombre: e.nombreLargo, obras: obras.filter((o) => empresaDeObra(o.obra) === e.id) })),
    { id: 'sin' as const, nombre: 'Sin clasificar', obras: obras.filter((o) => !empresaDeObra(o.obra)) },
  ].filter((g) => g.obras.length > 0);

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

      {grupos.map((g) => {
        const prog = g.obras.reduce((s, o) => s + o.programadoAI, 0);
        const util = redondear(g.obras.reduce((s, o) => s + o.utilizadoAI, 0));
        const fact = g.obras.reduce((s, o) => s + o.facturadoAI, 0);
        return (
          <section key={g.id} className="grupo-empresa">
            <div className="grupo-empresa-cabecera">
              <h2>
                {g.nombre} <span className="muted small">· {g.obras.length} {g.obras.length === 1 ? 'obra' : 'obras'}</span>
              </h2>
              <span className="muted small">
                Avance <strong>{pct(prog ? util / prog : 0, 1)}</strong> · Ejecutado {clp(util * v)} · Facturado {clp(fact * v)} · Saldo{' '}
                {clp(redondear(util - fact) * v)}
              </span>
            </div>
            <div className="grid-obras">
              {g.obras.map((o) => {
                const dif = o.diferenciaAI;
                return (
                  <Link key={o.obra} href={`/obras/${encodeURIComponent(o.obra)}`} className="tarjeta obra-card">
                    <div className="obra-card-cabecera">
                      <h3>
                        {nombreObra(o.obra)} <ChipEmpresa obra={o.obra} />
                      </h3>
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
          </section>
        );
      })}
    </div>
  );
}
