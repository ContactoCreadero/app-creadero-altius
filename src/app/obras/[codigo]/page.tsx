'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDatos } from '@/components/DataProvider';
import { Anillo, Cargando, Kpi, Seccion } from '@/components/UI';
import TablaActividades from '@/components/TablaActividades';
import TablaFacturas from '@/components/TablaFacturas';
import { FormActividad, FormFactura, nuevaActividad, nuevaFactura } from '@/components/Formularios';
import type { Actividad, Factura } from '@/lib/types';
import { porObra } from '@/lib/calc';
import { INICIATIVAS } from '@/lib/constants';
import { clp, num } from '@/lib/format';

export default function ObraDetallePage() {
  const params = useParams<{ codigo: string }>();
  const codigo = decodeURIComponent(params.codigo ?? '');
  const { datos, cargado, nombreObra, modoEdicion } = useDatos();
  const [nuevaAct, setNuevaAct] = useState<Actividad | null>(null);
  const [nuevaFac, setNuevaFac] = useState<Factura | null>(null);
  if (!cargado) return <Cargando />;

  const o = porObra(datos).find((x) => x.obra === codigo);
  if (!o) {
    return (
      <div className="pagina">
        <Seccion titulo="Obra no encontrada">
          <p>No hay información para la obra «{codigo}».</p>
          <Link href="/obras" className="btn btn-ghost">← Volver a obras</Link>
        </Seccion>
      </div>
    );
  }
  const v = datos.config.valorAI;
  const dif = o.diferenciaAI;
  const orden = new Map(INICIATIVAS.map((i, n) => [i.id, n]));
  const acts = [...o.actividades].sort(
    (a, b) => (orden.get(a.iniciativaId)! - orden.get(b.iniciativaId)!) || (a.fechaInicio ?? '9').localeCompare(b.fechaInicio ?? '9'),
  );
  const charlasR = acts.reduce((s, a) => s + a.charlasRealizadas, 0);
  const charlasP = acts.reduce((s, a) => s + a.charlasProgramadas, 0);

  const pagadas = o.facturas.filter((f) => f.pagada);
  const pagadoAI = pagadas.reduce((s, f) => s + f.ai, 0);
  const porPagarAI = o.facturadoAI - pagadoAI;
  const conDocumento = o.facturas.filter((f) => f.archivo).length;

  // Código sugerido para una nueva factura: obra + siguiente correlativo (ej. ZEN2)
  const sugerirCodigo = () => {
    const usados = new Set(o.facturas.map((f) => f.codigo.toUpperCase()));
    if (!usados.has(o.obra)) return o.obra;
    let n = 1;
    while (usados.has(`${o.obra}${n}`)) n++;
    return `${o.obra}${n}`;
  };

  return (
    <div className="pagina">
      <div className="no-print"><Link href="/obras" className="volver">← Todas las obras</Link></div>

      <section className="hero tarjeta">
        <div className="hero-anillo"><Anillo valor={o.avance} tamano={140} grosor={14} etiqueta="avance obra" /></div>
        <div className="hero-texto">
          <span className="eyebrow">Obra</span>
          <h2>{nombreObra(o.obra)}{nombreObra(o.obra) !== o.obra && <span className="muted"> ({o.obra})</span>}</h2>
          <p>
            {num(o.utilizadoAI)} de {num(o.programadoAI)} AI ejecutadas ({clp(o.utilizadoAI * v)}) en {o.iniciativas} iniciativas.
            {charlasP > 0 && <> {charlasR} de {charlasP} charlas realizadas.</>}
          </p>
        </div>
      </section>

      <div className="kpis">
        <Kpi titulo="Ejecutado (utilizado)" valor={clp(o.utilizadoAI * v)} detalle={`${num(o.utilizadoAI)} AI`} tono="rojo" />
        <Kpi titulo="Facturado" valor={clp(o.facturadoAI * v)} detalle={`${num(o.facturadoAI)} AI · ${o.facturas.length} facturas`} tono="azul" />
        {dif >= 0 ? (
          <Kpi titulo="Por facturar" valor={clp(dif * v)} detalle={`${num(dif)} AI ejecutadas sin facturar`} tono="ambar" />
        ) : (
          <Kpi titulo="Saldo disponible" valor={clp(-dif * v)} detalle={`${num(-dif)} AI facturadas aún no utilizadas`} tono="verde" />
        )}
        <Kpi
          titulo="Facturas pagadas"
          valor={`${pagadas.length} / ${o.facturas.length}`}
          detalle={o.facturas.length ? `Pagado ${clp(pagadoAI * v)} · por pagar ${clp(porPagarAI * v)}` : 'Sin facturas'}
          tono="verde"
        />
      </div>

      <Seccion
        titulo="Facturas de la obra"
        subtitulo={`${o.facturas.length} facturas · ${conDocumento} con documento · haz clic en la miniatura para ampliarla`}
        acciones={
          modoEdicion ? (
            <button type="button" className="btn btn-primario btn-sm no-print" onClick={() => setNuevaFac(nuevaFactura(sugerirCodigo()))}>
              + Nueva factura
            </button>
          ) : undefined
        }
      >
        <TablaFacturas facturas={o.facturas} />
      </Seccion>

      <Seccion
        titulo="Actividades realizadas en la obra"
        subtitulo={`${acts.length} actividades registradas`}
        acciones={
          modoEdicion ? (
            <button type="button" className="btn btn-primario btn-sm no-print" onClick={() => setNuevaAct(nuevaActividad('mantencion', o.obra))}>
              + Nueva actividad
            </button>
          ) : undefined
        }
      >
        <TablaActividades actividades={acts} mostrarIniciativa mostrarObra={false} />
      </Seccion>

      {nuevaAct && <FormActividad inicial={nuevaAct} modo="nuevo" onCerrar={() => setNuevaAct(null)} />}
      {nuevaFac && <FormFactura inicial={nuevaFac} modo="nuevo" onCerrar={() => setNuevaFac(null)} />}
    </div>
  );
}
