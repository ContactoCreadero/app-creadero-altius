'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDatos } from '@/components/DataProvider';
import { Cargando, Kpi, Leyenda, Seccion } from '@/components/UI';
import TablaFacturas from '@/components/TablaFacturas';
import { FormFactura, nuevaFactura } from '@/components/Formularios';
import type { Factura } from '@/lib/types';
import { calcularResumen, desgloseSaldo, porObra } from '@/lib/calc';
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

      <Seccion titulo="Balance por obra" subtitulo="Ejecutado (utilizado) comparado con lo facturado en cada obra">
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Obra</th>
                <th className="num">AI ejecutadas</th>
                <th className="num">AI facturadas</th>
                <th className="num">Diferencia AI</th>
                <th className="num">Diferencia $</th>
                <th>Situación</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o) => (
                <tr key={o.obra}>
                  <td><Link className="link-obra" href={`/obras/${encodeURIComponent(o.obra)}`}>{nombreObra(o.obra)}</Link></td>
                  <td className="num">{num(o.utilizadoAI)}</td>
                  <td className="num">{o.facturadoAI ? num(o.facturadoAI) : '—'}</td>
                  <td className="num"><strong>{num(o.diferenciaAI)}</strong></td>
                  <td className="num nowrap">{clp(o.diferenciaAI * v)}</td>
                  <td>
                    {o.diferenciaAI > 0 ? <span className="chip chip-parcial">Por facturar</span>
                      : o.diferenciaAI < 0 ? <span className="chip chip-realizada">Saldo disponible</span>
                      : <span className="chip chip-gris">Cuadrado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{num(r.utilizadoAI)}</td>
                <td className="num">{num(r.facturadoAI)}</td>
                <td className="num">{num(r.saldoAI)}</td>
                <td className="num nowrap">{clp(r.saldoMonto)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Seccion>

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
