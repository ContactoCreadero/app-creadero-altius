'use client';

import { useMemo, useState } from 'react';
import { useDatos } from '@/components/DataProvider';
import { Barra, Cargando, Seccion } from '@/components/UI';
import TablaActividades from '@/components/TablaActividades';
import { FormActividad, nuevaActividad } from '@/components/Formularios';
import { INICIATIVAS, MESES } from '@/lib/constants';
import { aiUtilizado, estadoActividad } from '@/lib/calc';
import type { Actividad, EstadoActividad, IniciativaId } from '@/lib/types';
import { clp, num, pct } from '@/lib/format';

export default function IniciativasPage() {
  const { datos, cargado, modoEdicion, nombreObra } = useDatos();
  const [sel, setSel] = useState<IniciativaId | 'todas'>('todas');
  const [obra, setObra] = useState('');
  const [estado, setEstado] = useState<EstadoActividad | ''>('');
  const [nueva, setNueva] = useState<Actividad | null>(null);

  const obras = useMemo(() => [...new Set(datos.actividades.map((a) => a.obra))].sort(), [datos.actividades]);

  if (!cargado) return <Cargando />;

  const filtradas = datos.actividades.filter(
    (a) => (!obra || a.obra === obra) && (!estado || estadoActividad(a) === estado),
  );
  const visibles = INICIATIVAS.filter((i) => sel === 'todas' || i.id === sel);

  return (
    <div className="pagina">
      <div className="barra-filtros tarjeta no-print">
        <div className="pestanas">
          <button type="button" className={'pestana' + (sel === 'todas' ? ' activa' : '')} onClick={() => setSel('todas')}>Todas</button>
          {INICIATIVAS.map((i) => (
            <button key={i.id} type="button" className={'pestana' + (sel === i.id ? ' activa' : '')} onClick={() => setSel(i.id)}>
              {i.nombre}
            </button>
          ))}
        </div>
        <div className="filtros">
          <select value={obra} onChange={(e) => setObra(e.target.value)} aria-label="Filtrar por obra">
            <option value="">Todas las obras</option>
            {obras.map((o) => <option key={o} value={o}>{nombreObra(o)}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoActividad | '')} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="realizada">Realizadas</option>
            <option value="parcial">En curso</option>
            <option value="pendiente">Pendientes</option>
          </select>
          {modoEdicion && (
            <button type="button" className="btn btn-primario btn-sm" onClick={() => setNueva(nuevaActividad(sel === 'todas' ? 'mantencion' : sel))}>
              + Nueva actividad
            </button>
          )}
        </div>
      </div>

      {visibles.map((ini) => {
        const acts = filtradas.filter((a) => a.iniciativaId === ini.id);
        const todas = datos.actividades.filter((a) => a.iniciativaId === ini.id);
        if (todas.length === 0) return null;
        const prog = todas.reduce((s, a) => s + a.aiProgramado, 0);
        const util = todas.reduce((s, a) => s + aiUtilizado(a), 0);
        const av = prog ? util / prog : 0;
        const charlasP = todas.reduce((s, a) => s + a.charlasProgramadas, 0);
        const charlasR = todas.reduce((s, a) => s + a.charlasRealizadas, 0);
        const realizadas = todas.filter((a) => estadoActividad(a) === 'realizada').length;

        return (
          <Seccion key={ini.id} titulo={ini.nombre} subtitulo={ini.descripcion}>
            <div className="mini-kpis">
              <div>
                <span className="muted small">Avance</span>
                <strong className="grande">{pct(av, 1)}</strong>
                <Barra valor={av} alto={8} tono={av >= 1 ? 'verde' : 'rojo'} />
              </div>
              <div><span className="muted small">AI ejecutadas</span><strong className="grande">{num(util)} <span className="muted">/ {num(prog)}</span></strong></div>
              <div><span className="muted small">Monto utilizado</span><strong className="grande">{clp(util * datos.config.valorAI)}</strong></div>
              <div><span className="muted small">Actividades realizadas</span><strong className="grande">{realizadas} <span className="muted">/ {todas.length}</span></strong></div>
              {charlasP > 0 && <div><span className="muted small">Charlas</span><strong className="grande">{charlasR} <span className="muted">/ {charlasP}</span></strong></div>}
            </div>

            {ini.id === 'mantencion' ? (
              MESES.filter((m) => acts.some((a) => a.periodo === m)).map((m) => (
                <div key={m} className="subgrupo">
                  <h3 className="subgrupo-titulo">{m}</h3>
                  <TablaActividades actividades={acts.filter((a) => a.periodo === m)} />
                </div>
              )).concat(
                acts.some((a) => !a.periodo)
                  ? [<div key="sin" className="subgrupo"><h3 className="subgrupo-titulo">Sin mes asignado</h3><TablaActividades actividades={acts.filter((a) => !a.periodo)} /></div>]
                  : [],
              )
            ) : (
              <TablaActividades actividades={acts} />
            )}
            {ini.id === 'mantencion' && acts.length === 0 && <p className="vacio">No hay actividades para los filtros seleccionados.</p>}
          </Seccion>
        );
      })}

      {nueva && <FormActividad inicial={nueva} onCerrar={() => setNueva(null)} />}
    </div>
  );
}
