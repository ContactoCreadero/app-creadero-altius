'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Actividad } from '@/lib/types';
import { aiUtilizado, estadoActividad } from '@/lib/calc';
import { INICIATIVA_POR_ID } from '@/lib/constants';
import { clp, fecha, num, pct } from '@/lib/format';
import { nuevoId, useDatos } from '@/components/DataProvider';
import { Barra, ChipEstado } from '@/components/UI';
import { FormActividad } from '@/components/Formularios';

export default function TablaActividades({
  actividades,
  mostrarIniciativa = false,
  mostrarObra = true,
  mostrarPeriodo = false,
  conTotales = true,
}: {
  actividades: Actividad[];
  mostrarIniciativa?: boolean;
  mostrarObra?: boolean;
  mostrarPeriodo?: boolean;
  conTotales?: boolean;
}) {
  const { datos, modoEdicion, nombreObra, eliminarActividad } = useDatos();
  const [editando, setEditando] = useState<{ a: Actividad; modo: 'editar' | 'duplicar' } | null>(null);
  const v = datos.config.valorAI;

  const totProg = actividades.reduce((s, a) => s + a.aiProgramado, 0);
  const totUtil = actividades.reduce((s, a) => s + aiUtilizado(a), 0);
  const totCharlasP = actividades.reduce((s, a) => s + a.charlasProgramadas, 0);
  const totCharlasR = actividades.reduce((s, a) => s + a.charlasRealizadas, 0);
  const conPersonas = actividades.filter((a) => a.personas != null);
  const totPersonas = conPersonas.reduce((s, a) => s + (a.personas ?? 0), 0);

  if (actividades.length === 0) return <p className="vacio">No hay actividades para los filtros seleccionados.</p>;

  return (
    <>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              {mostrarIniciativa && <th>Iniciativa</th>}
              {mostrarPeriodo && <th>Mes</th>}
              {mostrarObra && <th>Obra</th>}
              <th>Fechas</th>
              <th>Programado</th>
              <th>Ejecutado</th>
              <th className="num">Charlas</th>
              <th className="num">Personas</th>
              <th className="num">AI prog.</th>
              <th style={{ minWidth: 110 }}>Avance</th>
              <th className="num">AI utiliz.</th>
              <th className="num">Monto utiliz.</th>
              <th>Estado</th>
              {modoEdicion && <th className="no-print">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {actividades.map((a) => {
              const e = estadoActividad(a);
              return (
                <tr key={a.id}>
                  {mostrarIniciativa && <td className="col-iniciativa">{INICIATIVA_POR_ID[a.iniciativaId]?.nombre}{a.periodo ? ` · ${a.periodo}` : ''}</td>}
                  {mostrarPeriodo && <td>{a.periodo ?? '—'}</td>}
                  {mostrarObra && (
                    <td>
                      {a.iniciativaId === 'otras' ? (
                        <strong>{nombreObra(a.obra)}</strong>
                      ) : (
                        <Link className="link-obra" href={`/obras/${encodeURIComponent(a.obra)}`}>{nombreObra(a.obra)}</Link>
                      )}
                    </td>
                  )}
                  <td className="nowrap fechas">
                    {a.fechaInicio ? fecha(a.fechaInicio) : <span className="muted">Por definir</span>}
                    {a.fechaTermino && <div className="muted">al {fecha(a.fechaTermino)}</div>}
                  </td>
                  <td className="detalle">{a.detalleProgramado}</td>
                  <td className="detalle">
                    {a.detalleEjecutado}
                    {a.observacion && <div className="obs">● {a.observacion}</div>}
                  </td>
                  <td className="num nowrap">{a.charlasRealizadas}/{a.charlasProgramadas}</td>
                  <td className="num">{a.personas ?? <span className="muted">—</span>}</td>
                  <td className="num">{num(a.aiProgramado)}</td>
                  <td>
                    <div className="avance-celda">
                      <Barra valor={a.avance} alto={8} tono={e === 'realizada' ? 'verde' : e === 'parcial' ? 'ambar' : 'rojo'} />
                      <span>{pct(a.avance)}</span>
                    </div>
                  </td>
                  <td className="num"><strong>{num(aiUtilizado(a))}</strong></td>
                  <td className="num nowrap">{clp(aiUtilizado(a) * v)}</td>
                  <td><ChipEstado estado={e} /></td>
                  {modoEdicion && (
                    <td className="no-print">
                      <div className="acciones-fila">
                        <button type="button" className="btn btn-ghost btn-sm" title="Editar" aria-label="Editar actividad" onClick={() => setEditando({ a, modo: 'editar' })}>✏️</button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Duplicar"
                          aria-label="Duplicar actividad"
                          onClick={() => setEditando({ a: { ...a, id: nuevoId('A'), filaExcel: undefined }, modo: 'duplicar' })}
                        >
                          ⧉
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Eliminar"
                          aria-label="Eliminar actividad"
                          onClick={() => confirm(`¿Eliminar la actividad de ${nombreObra(a.obra)}? Esta acción no se puede deshacer.`) && eliminarActividad(a.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {conTotales && (
            <tfoot>
              <tr>
                <td colSpan={(mostrarIniciativa ? 1 : 0) + (mostrarPeriodo ? 1 : 0) + (mostrarObra ? 1 : 0) + 3}>
                  Total ({actividades.length} actividades)
                </td>
                <td className="num nowrap">{totCharlasR}/{totCharlasP}</td>
                <td className="num">{conPersonas.length ? totPersonas : '—'}</td>
                <td className="num">{num(totProg)}</td>
                <td>{pct(totProg ? totUtil / totProg : 0, 1)}</td>
                <td className="num">{num(totUtil)}</td>
                <td className="num nowrap">{clp(totUtil * v)}</td>
                <td />
                {modoEdicion && <td className="no-print" />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {editando && <FormActividad inicial={editando.a} modo={editando.modo} onCerrar={() => setEditando(null)} />}
    </>
  );
}
