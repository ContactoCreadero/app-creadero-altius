'use client';

import Link from 'next/link';
import { useDatos } from '@/components/DataProvider';
import { Anillo, Barra, Cargando, Kpi, Leyenda, Seccion } from '@/components/UI';
import { ChipEmpresa } from '@/components/EmpresaUI';
import type { Datos, FiltroEmpresa } from '@/lib/types';
import { BarraEstados, GraficoIniciativas, GraficoObras } from '@/components/Graficos';
import { calcularResumen, estadoActividad, porIniciativa, porObra, aiUtilizado } from '@/lib/calc';
import { EMPRESAS, INICIATIVA_POR_ID } from '@/lib/constants';
import { clp, clpCorto, fechaCorta, num, pct } from '@/lib/format';

export default function ResumenPage() {
  const { datos, datosCompletos, cargado, nombreObra, filtroEmpresa } = useDatos();
  if (!cargado) return <Cargando />;

  const r = calcularResumen(datos);
  const inis = porIniciativa(datos);
  const obras = porObra(datos).filter((o) => o.programadoAI > 0 && o.obra !== 'CORPORATIVO');
  const enCurso = datos.actividades
    .filter((a) => estadoActividad(a) !== 'realizada')
    .sort((a, b) => (a.fechaInicio ?? '9999').localeCompare(b.fechaInicio ?? '9999'));

  return (
    <div className="pagina">
      {/* Bloque principal */}
      <section className="hero tarjeta">
        <div className="hero-anillo">
          <Anillo valor={r.avance} etiqueta="avance general" />
        </div>
        <div className="hero-texto">
          <h2>Avance del programa</h2>
          <p>
            Se han ejecutado <strong>{num(r.utilizadoAI)} de {num(r.programadoAI)} AI</strong> programadas,
            equivalentes a <strong>{clp(r.montoUtilizado)}</strong> de un programa total de {clp(r.montoProgramado)}.
          </p>
          <BarraEstados realizadas={r.realizadas} parciales={r.parciales} pendientes={r.pendientes} />
        </div>
      </section>

      <div className="kpis">
        <Kpi icono="🎤" titulo="Charlas realizadas" valor={r.charlasRealizadas} detalle={`de ${r.charlasProgramadas} programadas`} tono="rojo" />
        <Kpi icono="✅" titulo="Actividades realizadas" valor={`${r.realizadas} / ${r.actividades}`} detalle={`${r.parciales} en curso · ${r.pendientes} pendientes`} tono="verde" />
        <Kpi icono="🏗️" titulo="Obras alcanzadas" valor={r.obras} detalle="obras con actividades en 2026" tono="azul" />
        <Kpi
          icono="👷"
          titulo="Personas capacitadas"
          valor={r.actividadesConPersonas ? r.personas.toLocaleString('es-CL') : '—'}
          detalle={r.actividadesConPersonas ? `registradas en ${r.actividadesConPersonas} ${r.actividadesConPersonas === 1 ? 'actividad' : 'actividades'}` : 'Pendiente de registrar asistencia'}
        />
        <Kpi icono="💰" titulo="Monto utilizado" valor={clpCorto(r.montoUtilizado)} detalle={`${pct(r.avance)} de ${clpCorto(r.montoProgramado)}`} tono="rojo" />
        <Kpi icono="🧾" titulo="Facturado" valor={clpCorto(r.facturadoMonto)} detalle={`${num(r.facturadoAI)} AI facturadas`} />
        <Kpi
          icono="📌"
          titulo="Saldo por facturar"
          valor={clpCorto(r.saldoMonto)}
          detalle={`${num(r.saldoAI)} AI ejecutadas aún no facturadas`}
          tono="ambar"
        />
        <Kpi icono="⏳" titulo="Por ejecutar" valor={`${num(r.porEjecutarAI)} AI`} detalle={clp(r.porEjecutarAI * datos.config.valorAI)} />
      </div>

      {filtroEmpresa === 'todas' && <ComparativoEmpresas datos={datosCompletos} />}

      <div className="grid-2">
        <Seccion
          titulo="Avance por iniciativa"
          subtitulo="AI ejecutadas sobre AI programadas"
          acciones={<Link href="/iniciativas" className="btn btn-ghost btn-sm no-print">Ver detalle →</Link>}
        >
          <GraficoIniciativas filas={inis} />
        </Seccion>

        <Seccion
          titulo="Avance por obra"
          subtitulo="AI ejecutadas / programadas en cada obra"
          acciones={<Link href="/obras" className="btn btn-ghost btn-sm no-print">Ver obras →</Link>}
        >
          <GraficoObras filas={obras} nombre={nombreObra} />
          <Leyenda items={[{ color: 'var(--rojo)', texto: 'Ejecutado' }, { color: 'var(--pista)', texto: 'Programado' }]} />
        </Seccion>
      </div>

      <Seccion titulo="Actividades en curso y pendientes" subtitulo={`${enCurso.length} actividades por completar`}>
        {enCurso.length === 0 ? (
          <p className="vacio">Todas las actividades programadas están realizadas. 🎉</p>
        ) : (
          <ul className="lista-pendientes">
            {enCurso.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{INICIATIVA_POR_ID[a.iniciativaId].nombre}</strong>
                  <span className="muted"> · {nombreObra(a.obra)}</span> <ChipEmpresa obra={a.obra} />
                  <div className="muted small">
                    {a.fechaInicio ? `Inicio ${fechaCorta(a.fechaInicio)}` : 'Fecha por definir'}
                    {a.detalleEjecutado && ` · Ejecutado: ${a.detalleEjecutado}`}
                    {a.observacion && ` · ${a.observacion}`}
                  </div>
                </div>
                <div className="pendiente-avance">
                  <strong>{pct(a.avance)}</strong>
                  <span className="muted small">{num(aiUtilizado(a))}/{num(a.aiProgramado)} AI</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <p className="nota">
        AI: unidad del programa. Cada AI equivale a {clp(datos.config.valorAI)}. AI utilizadas = AI programadas × % de avance.
      </p>
    </div>
  );
}

/** Cuadro comparativo SpA vs S.A. (se muestra con el filtro "Todas"). Clic en una fila = filtrar por esa empresa. */
function ComparativoEmpresas({ datos }: { datos: Datos }) {
  const { empresaDeObra, setFiltroEmpresa } = useDatos();
  const v = datos.config.valorAI;

  const subconjunto = (f: FiltroEmpresa): Datos => {
    const pasa = (codigo: string) => {
      const e = empresaDeObra(codigo);
      return f === 'sin' ? e === null : e === f;
    };
    return {
      ...datos,
      actividades: datos.actividades.filter((a) => pasa(a.obra)),
      facturas: datos.facturas.filter((x) => pasa(x.obra || x.codigo)),
    };
  };

  const filas: { id: FiltroEmpresa; nombre: string; d: Datos }[] = EMPRESAS.map((e) => ({
    id: e.id as FiltroEmpresa,
    nombre: e.nombreLargo,
    d: subconjunto(e.id),
  }));
  const sin = subconjunto('sin');
  if (sin.actividades.length || sin.facturas.length) filas.push({ id: 'sin', nombre: 'Sin clasificar', d: sin });
  const total = calcularResumen(datos);

  return (
    <Seccion titulo="Avance por empresa" subtitulo="Haz clic en una empresa para ver toda la app solo con sus obras">
      <div className="tabla-scroll">
        <table className="tabla tabla-empresas">
          <thead>
            <tr>
              <th>Empresa</th>
              <th className="num">Obras</th>
              <th className="num">Actividades</th>
              <th style={{ minWidth: 150 }}>Avance</th>
              <th className="num">AI ejec. / prog.</th>
              <th className="num">Monto utilizado</th>
              <th className="num">Facturado</th>
              <th className="num">Saldo por facturar</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const r = calcularResumen(f.d);
              return (
                <tr key={f.id} className="fila-clic" onClick={() => setFiltroEmpresa(f.id)} title={`Ver solo ${f.nombre}`}>
                  <td>
                    <strong>{f.nombre}</strong>
                  </td>
                  <td className="num">{new Set(f.d.actividades.map((a) => a.obra)).size}</td>
                  <td className="num">{r.realizadas} / {r.actividades}</td>
                  <td>
                    <div className="avance-celda">
                      <Barra valor={r.avance} alto={8} tono={r.avance >= 1 ? 'verde' : 'rojo'} />
                      <span>{pct(r.avance, 1)}</span>
                    </div>
                  </td>
                  <td className="num">{num(r.utilizadoAI)} / {num(r.programadoAI)}</td>
                  <td className="num nowrap">{clp(r.montoUtilizado)}</td>
                  <td className="num nowrap">{clp(r.facturadoMonto)}</td>
                  <td className="num nowrap"><strong>{clp(r.saldoMonto)}</strong></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{new Set(datos.actividades.map((a) => a.obra)).size}</td>
              <td className="num">{total.realizadas} / {total.actividades}</td>
              <td>{pct(total.avance, 1)}</td>
              <td className="num">{num(total.utilizadoAI)} / {num(total.programadoAI)}</td>
              <td className="num nowrap">{clp(total.utilizadoAI * v)}</td>
              <td className="num nowrap">{clp(total.facturadoMonto)}</td>
              <td className="num nowrap">{clp(total.saldoMonto)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Seccion>
  );
}
