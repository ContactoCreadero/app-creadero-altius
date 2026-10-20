'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useDatos } from '@/components/DataProvider';
import { Cargando, Kpi, Leyenda, Seccion } from '@/components/UI';
import TablaFacturas from '@/components/TablaFacturas';
import { ChipEmpresa } from '@/components/EmpresaUI';
import { FormFactura, nuevaFactura } from '@/components/Formularios';
import type { Empresa, Factura } from '@/lib/types';
import { calcularResumen, desgloseSaldo, porObra, redondear, type FilaObra } from '@/lib/calc';
import { EMPRESAS } from '@/lib/constants';
import { clp, fechaLarga, num, pct } from '@/lib/format';

export default function FacturacionPage() {
  const { datos, cargado, modoEdicion, nombreObra } = useDatos();
  const [nueva, setNueva] = useState<Factura | null>(null);
  if (!cargado) return <Cargando />;

  const r = calcularResumen(datos);
  const v = datos.config.valorAI;
  const obras = porObra(datos);
  const { porFacturar, disponible } = desgloseSaldo(obras);
  const fracFact = r.utilizadoAI ? Math.min(1, r.facturadoAI / r.utilizadoAI) : 0;
  const fondos2025 = datos.facturas.filter((f) => f.observacion === 'Fondos 2025').reduce((s, f) => s + f.ai, 0);
  const pagadas = datos.facturas.filter((f) => f.pagada);
  const pagadoAI = pagadas.reduce((s, f) => s + f.ai, 0);

  return (
    <div className="pagina">
      <div className="kpis">
        <Kpi icono="✅" titulo="Total ejecutado" valor={clp(r.montoUtilizado)} detalle={`${num(r.utilizadoAI)} AI al ${fechaLarga(datos.config.fechaCorte)}`} tono="rojo" />
        <Kpi icono="🧾" titulo="Total facturado" valor={clp(r.facturadoMonto)} detalle={`${num(r.facturadoAI)} AI · ${datos.facturas.length} facturas`} tono="azul" />
        <Kpi icono="📌" titulo="Saldo por facturar" valor={clp(r.saldoMonto)} detalle={`${num(r.saldoAI)} AI (ejecutado − facturado)`} tono="ambar" />
        <Kpi
          icono="💳"
          titulo="Facturas pagadas"
          valor={`${pagadas.length} / ${datos.facturas.length}`}
          detalle={`Pagado ${clp(pagadoAI * v)} · por pagar ${clp((r.facturadoAI - pagadoAI) * v)}`}
          tono="verde"
        />
      </div>

      <Seccion titulo="Ejecutado vs. facturado" subtitulo={`${pct(fracFact)} de lo ejecutado ya está facturado`}>
        <div className="segmentos segmentos-alto">
          <div className="segmento seg-azul" style={{ width: `${fracFact * 100}%` }} title={`Facturado: ${clp(r.facturadoMonto)}`} />
          <div className="segmento seg-ambar" style={{ width: `${(1 - fracFact) * 100}%` }} title={`Por facturar: ${clp(r.saldoMonto)}`} />
        </div>
        <Leyenda items={[{ color: 'var(--azul)', texto: `Facturado ${clp(r.facturadoMonto)}` }, { color: 'var(--ambar)', texto: `Saldo por facturar ${clp(r.saldoMonto)}` }]} />
        <p className="nota">
          Del total facturado, {num(fondos2025)} AI ({clp(fondos2025 * v)}) corresponden a fondos 2025. El saldo neto
          ({num(r.saldoAI)} AI) se compone de <strong>{num(porFacturar)} AI por facturar</strong> en obras con más
          ejecución que facturación, menos <strong>{num(disponible)} AI de saldo disponible</strong> en obras facturadas por
          sobre lo ejecutado.
        </p>
      </Seccion>

      <BalancePorObra obras={obras} totalEjecutado={r.utilizadoAI} totalFacturado={r.facturadoAI} valorAI={v} />

      <Seccion
        titulo="Facturas emitidas"
        subtitulo={`Cada AI se factura a ${clp(v)}`}
        acciones={modoEdicion ? <button type="button" className="btn btn-primario btn-sm no-print" onClick={() => setNueva(nuevaFactura())}>+ Nueva factura</button> : undefined}
      >
        <TablaFacturas facturas={datos.facturas} mostrarObra />
      </Seccion>

      {nueva && <FormFactura inicial={nueva} onCerrar={() => setNueva(null)} />}
    </div>
  );
}

/* =====================================================================
   Balance por obra: agrupado por empresa (por defecto) y ordenable
   ===================================================================== */

type CampoOrden = 'obra' | 'empresa' | 'ejecutado' | 'facturado' | 'diferencia' | 'situacion';

const CAMPOS_ORDEN: { id: CampoOrden; nombre: string }[] = [
  { id: 'obra', nombre: 'Obra (A–Z)' },
  { id: 'empresa', nombre: 'Empresa' },
  { id: 'ejecutado', nombre: 'AI ejecutadas' },
  { id: 'facturado', nombre: 'AI facturadas' },
  { id: 'diferencia', nombre: 'Diferencia (por facturar)' },
  { id: 'situacion', nombre: 'Situación' },
];

// Al elegir un campo, su dirección inicial más útil: textos A→Z, cifras de mayor a menor
const DIRECCION_INICIAL: Record<CampoOrden, 'asc' | 'desc'> = {
  obra: 'asc',
  empresa: 'asc',
  ejecutado: 'desc',
  facturado: 'desc',
  diferencia: 'desc',
  situacion: 'asc',
};

const ORDEN_EMPRESA: Record<string, number> = { SpA: 1, SA: 2, Corporativo: 3, sin: 4 };
// Por facturar → Cuadrado → Saldo disponible
const situacion = (o: FilaObra) => (o.diferenciaAI > 0 ? 1 : o.diferenciaAI === 0 ? 2 : 3);

function ChipSituacion({ dif }: { dif: number }) {
  if (dif > 0) return <span className="chip chip-parcial">Por facturar</span>;
  if (dif < 0) return <span className="chip chip-realizada">Saldo disponible</span>;
  return <span className="chip chip-gris">Cuadrado</span>;
}

function BalancePorObra({
  obras,
  totalEjecutado,
  totalFacturado,
  valorAI,
}: {
  obras: FilaObra[];
  totalEjecutado: number;
  totalFacturado: number;
  valorAI: number;
}) {
  const { nombreObra, empresaDeObra } = useDatos();
  const [agrupar, setAgrupar] = useState(true);
  const [campo, setCampo] = useState<CampoOrden>('ejecutado');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const elegirCampo = (c: CampoOrden) => {
    if (c === campo) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setCampo(c);
      setDir(DIRECCION_INICIAL[c]);
    }
  };

  const ordenadas = useMemo(() => {
    const valor = (o: FilaObra): number | string => {
      switch (campo) {
        case 'obra': return nombreObra(o.obra).toLowerCase();
        case 'empresa': return ORDEN_EMPRESA[empresaDeObra(o.obra) ?? 'sin'];
        case 'ejecutado': return o.utilizadoAI;
        case 'facturado': return o.facturadoAI;
        case 'diferencia': return o.diferenciaAI;
        case 'situacion': return situacion(o);
      }
    };
    const signo = dir === 'asc' ? 1 : -1;
    return [...obras].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      const c = typeof va === 'string' ? va.localeCompare(vb as string, 'es') : va - (vb as number);
      // desempate: mayor diferencia primero y luego nombre
      return c * signo || b.diferenciaAI - a.diferenciaAI || a.obra.localeCompare(b.obra);
    });
  }, [obras, campo, dir, nombreObra, empresaDeObra]);

  const grupos: { id: Empresa | 'sin'; nombre: string; obras: FilaObra[] }[] = agrupar
    ? [
        ...EMPRESAS.map((e) => ({ id: e.id, nombre: e.nombreLargo, obras: ordenadas.filter((o) => empresaDeObra(o.obra) === e.id) })),
        { id: 'sin' as const, nombre: 'Sin clasificar', obras: ordenadas.filter((o) => !empresaDeObra(o.obra)) },
      ].filter((g) => g.obras.length > 0)
    : [{ id: 'sin' as const, nombre: '', obras: ordenadas }];

  const flecha = (c: CampoOrden) => (campo === c ? (dir === 'asc' ? ' ▲' : ' ▼') : '');
  const encabezado = (c: CampoOrden, texto: string, esNum = false) => (
    <th
      key={texto}
      className={(esNum ? 'num ' : '') + 'th-orden' + (campo === c ? ' activo' : '')}
      aria-sort={campo === c ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => elegirCampo(c)} title="Ordenar por esta columna">
        {texto}
        <span className="th-flecha">{flecha(c)}</span>
      </button>
    </th>
  );

  const fila = (o: FilaObra) => (
    <tr key={o.obra}>
      <td><Link className="link-obra" href={`/obras/${encodeURIComponent(o.obra)}`}>{nombreObra(o.obra)}</Link></td>
      <td><ChipEmpresa obra={o.obra} /></td>
      <td className="num">{num(o.utilizadoAI)}</td>
      <td className="num">{o.facturadoAI ? num(o.facturadoAI) : '—'}</td>
      <td className="num"><strong>{num(o.diferenciaAI)}</strong></td>
      <td className="num nowrap">{clp(o.diferenciaAI * valorAI)}</td>
      <td><ChipSituacion dif={o.diferenciaAI} /></td>
    </tr>
  );

  const subtotal = (lista: FilaObra[]) => {
    const ej = redondear(lista.reduce((s, o) => s + o.utilizadoAI, 0));
    const fa = redondear(lista.reduce((s, o) => s + o.facturadoAI, 0));
    return { ej, fa, dif: redondear(ej - fa) };
  };

  return (
    <Seccion
      titulo="Balance por obra"
      subtitulo="Ejecutado (utilizado) comparado con lo facturado en cada obra"
      acciones={
        <div className="controles-balance no-print">
          <label className="check-agrupar">
            <input
              type="checkbox"
              checked={agrupar}
              onChange={(e) => {
                setAgrupar(e.target.checked);
                // al agrupar, ordenar por empresa no aplica: se vuelve a AI ejecutadas
                if (e.target.checked && campo === 'empresa') {
                  setCampo('ejecutado');
                  setDir('desc');
                }
              }}
            />
            Agrupar por empresa
          </label>
          <label className="orden-balance">
            <span>Ordenar por</span>
            <select value={campo} onChange={(e) => { const c = e.target.value as CampoOrden; setCampo(c); setDir(DIRECCION_INICIAL[c]); }}>
              {CAMPOS_ORDEN.filter((c) => !(agrupar && c.id === 'empresa')).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}
            title={dir === 'asc' ? 'Orden ascendente (clic para invertir)' : 'Orden descendente (clic para invertir)'}
          >
            {dir === 'asc' ? '▲ Ascendente' : '▼ Descendente'}
          </button>
        </div>
      }
    >
      <div className="tabla-scroll">
        <table className="tabla tabla-balance">
          <thead>
            <tr>
              {encabezado('obra', 'Obra')}
              {encabezado('empresa', 'Empresa')}
              {encabezado('ejecutado', 'AI ejecutadas', true)}
              {encabezado('facturado', 'AI facturadas', true)}
              {encabezado('diferencia', 'Diferencia AI', true)}
              {encabezado('diferencia', 'Diferencia $', true)}
              {encabezado('situacion', 'Situación')}
            </tr>
          </thead>
          {grupos.map((g) => {
            const st = subtotal(g.obras);
            return (
              <tbody key={g.id + g.nombre}>
                {agrupar && (
                  <tr className="fila-grupo">
                    <td colSpan={7}>
                      {g.nombre} <span className="muted small">· {g.obras.length} {g.obras.length === 1 ? 'obra' : 'obras'}</span>
                    </td>
                  </tr>
                )}
                {g.obras.map(fila)}
                {agrupar && (
                  <tr className="fila-subtotal">
                    <td colSpan={2}>Subtotal {g.nombre}</td>
                    <td className="num">{num(st.ej)}</td>
                    <td className="num">{num(st.fa)}</td>
                    <td className="num">{num(st.dif)}</td>
                    <td className="num nowrap">{clp(st.dif * valorAI)}</td>
                    <td><ChipSituacion dif={st.dif} /></td>
                  </tr>
                )}
              </tbody>
            );
          })}
          <tfoot>
            <tr>
              <td colSpan={2}>Total</td>
              <td className="num">{num(totalEjecutado)}</td>
              <td className="num">{num(totalFacturado)}</td>
              <td className="num">{num(redondear(totalEjecutado - totalFacturado))}</td>
              <td className="num nowrap">{clp(redondear(totalEjecutado - totalFacturado) * valorAI)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Seccion>
  );
}
