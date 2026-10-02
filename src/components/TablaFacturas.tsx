'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Factura } from '@/lib/types';
import { nuevoId, useDatos } from '@/components/DataProvider';
import { FormFactura } from '@/components/Formularios';
import { ArchivoFactura, EstadoPago } from '@/components/ArchivoFactura';
import { obraBase } from '@/lib/calc';
import { clp, fecha, num } from '@/lib/format';

export default function TablaFacturas({ facturas, mostrarObra = false }: { facturas: Factura[]; mostrarObra?: boolean }) {
  const { datos, modoEdicion, nombreObra, eliminarFactura } = useDatos();
  const [editando, setEditando] = useState<{ f: Factura; modo: 'editar' | 'duplicar' } | null>(null);
  const v = datos.config.valorAI;

  if (facturas.length === 0) return <p className="vacio">Sin facturas registradas.</p>;

  const ordenadas = [...facturas].sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '') || a.codigo.localeCompare(b.codigo));
  const totAI = facturas.reduce((s, f) => s + f.ai, 0);
  const pagAI = facturas.filter((f) => f.pagada).reduce((s, f) => s + f.ai, 0);

  const duplicar = (f: Factura) =>
    setEditando({
      f: { ...f, id: nuevoId('F'), numeroFactura: '', archivo: null, pagada: false, fechaPago: null },
      modo: 'duplicar',
    });

  return (
    <>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Fecha</th>
              {mostrarObra && <th>Obra</th>}
              <th>Código</th>
              <th>Código SENCE</th>
              <th>N° factura</th>
              <th className="num"># AI</th>
              <th className="num">Monto</th>
              <th>Fondos</th>
              <th>Pago</th>
              {modoEdicion && <th className="no-print">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((f) => (
              <tr key={f.id}>
                <td><ArchivoFactura factura={f} /></td>
                <td className="nowrap">{fecha(f.fecha)}</td>
                {mostrarObra && (
                  <td><Link className="link-obra" href={`/obras/${encodeURIComponent(obraBase(f.obra || f.codigo))}`}>{nombreObra(obraBase(f.obra || f.codigo))}</Link></td>
                )}
                <td>{f.codigo}</td>
                <td>{f.codigoSence || '—'}</td>
                <td>{f.numeroFactura || '—'}</td>
                <td className="num">{num(f.ai)}</td>
                <td className="num nowrap">{clp(f.ai * v)}</td>
                <td><span className={'chip ' + (f.observacion === 'Fondos 2025' ? 'chip-gris' : 'chip-azul')}>{f.observacion}</span></td>
                <td><EstadoPago factura={f} /></td>
                {modoEdicion && (
                  <td className="no-print">
                    <div className="acciones-fila">
                      <button type="button" className="btn btn-ghost btn-sm" title="Editar" aria-label="Editar factura" onClick={() => setEditando({ f, modo: 'editar' })}>✏️</button>
                      <button type="button" className="btn btn-ghost btn-sm" title="Duplicar" aria-label="Duplicar factura" onClick={() => duplicar(f)}>⧉</button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Eliminar"
                        aria-label="Eliminar factura"
                        onClick={() => confirm(`¿Eliminar la factura ${f.codigo} N° ${f.numeroFactura || '—'}?`) && eliminarFactura(f.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={mostrarObra ? 6 : 5}>Total ({facturas.length} facturas)</td>
              <td className="num">{num(totAI)}</td>
              <td className="num nowrap">{clp(totAI * v)}</td>
              <td />
              <td className="nowrap small">Pagado {clp(pagAI * v)}</td>
              {modoEdicion && <td className="no-print" />}
            </tr>
          </tfoot>
        </table>
      </div>
      {editando && <FormFactura inicial={editando.f} modo={editando.modo} onCerrar={() => setEditando(null)} />}
    </>
  );
}
