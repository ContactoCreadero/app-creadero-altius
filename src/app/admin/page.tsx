'use client';

import { useEffect, useState } from 'react';
import { useDatos } from '@/components/DataProvider';
import { Cargando, Seccion } from '@/components/UI';
import type { Configuracion, Empresa } from '@/lib/types';
import { obraBase } from '@/lib/calc';
import { EMPRESAS } from '@/lib/constants';
import { clp } from '@/lib/format';

export default function AdminPage() {
  // Administración trabaja siempre con todos los datos (sin filtro de empresa)
  const { datosCompletos: datos, cargado, modoEdicion, guardarConfig, recargar, salir, empresasObras } = useDatos();
  const configConEmpresas = (): Configuracion => ({ ...datos.config, empresasObras: { ...empresasObras } });
  const [c, setC] = useState<Configuracion>(configConEmpresas);
  const [ok, setOk] = useState('');
  const [guardando, setGuardando] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setC(configConEmpresas()), [datos.config, empresasObras]);

  if (!cargado) return <Cargando />;
  if (!modoEdicion) {
    return (
      <div className="pagina">
        <Seccion titulo="Administración" subtitulo="Sección de uso exclusivo de Creadero.">
          <p>Para administrar, sal e ingresa con el perfil <strong>Creadero (Administrador)</strong>.</p>
          <button type="button" className="btn btn-primario" onClick={() => salir()}>Cambiar de usuario</button>
        </Seccion>
      </div>
    );
  }

  const conDatos = new Set([...datos.actividades.map((a) => a.obra), ...datos.facturas.map((f) => obraBase(f.obra || f.codigo))]);
  // Obras con datos + obras ya clasificadas que aún no tienen actividades (ej. ASF, SAP)
  const obras = [...new Set([...conDatos, ...Object.keys(c.empresasObras ?? {})])].sort();
  const empresas = c.empresasObras ?? {};
  const sinClasificar = obras.filter((o) => conDatos.has(o) && !empresas[o]);
  const pagadas = datos.facturas.filter((f) => f.pagada).length;
  const conDocumento = datos.facturas.filter((f) => f.archivo).length;

  const cambiarEmpresa = (obra: string, valor: string) => {
    const n = { ...empresas };
    if (valor === 'SpA' || valor === 'SA' || valor === 'Corporativo') n[obra] = valor as Empresa;
    else delete n[obra];
    setC({ ...c, empresasObras: n });
  };

  const cambiarNombre = (obra: string, valor: string) => {
    const n = { ...c.nombresObras };
    if (valor.trim()) n[obra] = valor;
    else delete n[obra];
    setC({ ...c, nombresObras: n });
  };

  const guardar = async () => {
    setGuardando(true);
    const exito = await guardarConfig({ ...c, valorAI: Number(c.valorAI) || 0 });
    setGuardando(false);
    if (exito) {
      setOk('Cambios guardados.');
      setTimeout(() => setOk(''), 2500);
    }
  };

  return (
    <div className="pagina">
      <Seccion titulo="Parámetros del programa" subtitulo="Se reflejan en todas las pantallas y cálculos.">
        <div className="form-grid">
          <label className="campo"><span>Cliente</span>
            <input value={c.cliente} onChange={(e) => setC({ ...c, cliente: e.target.value })} />
          </label>
          <label className="campo"><span>Nombre del programa (título)</span>
            <input value={c.programa} onChange={(e) => setC({ ...c, programa: e.target.value })} />
          </label>
          <label className="campo"><span>Valor por AI ($)</span>
            <input type="number" min={0} step={1000} value={c.valorAI} onChange={(e) => setC({ ...c, valorAI: Number(e.target.value) })} />
          </label>
          <label className="campo"><span>Fecha de corte del informe</span>
            <input type="date" value={c.fechaCorte} onChange={(e) => setC({ ...c, fechaCorte: e.target.value || c.fechaCorte })} />
          </label>
        </div>
        <p className="calculo">Valor actual: 1 AI = <strong>{clp(Number(c.valorAI) || 0)}</strong></p>
      </Seccion>

      <Seccion
        titulo="Obras: nombre y empresa"
        subtitulo="Clasifica cada obra en ALTIUS SpA, ALTIUS S.A. o Corporativo. El nombre completo es opcional: si lo completas, se muestra en lugar del código."
      >
        {sinClasificar.length > 0 && (
          <p className="aviso-sin-clasificar">
            ⚠️ {sinClasificar.length === 1 ? 'Hay 1 obra' : `Hay ${sinClasificar.length} obras`} con datos sin empresa asignada:{' '}
            <strong>{sinClasificar.join(', ')}</strong>
          </p>
        )}
        <div className="tabla-scroll">
          <table className="tabla tabla-obras-admin">
            <thead>
              <tr>
                <th>Código</th>
                <th>Empresa</th>
                <th>Nombre completo (opcional)</th>
                <th>Datos</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o) => (
                <tr key={o} className={!empresas[o] && conDatos.has(o) ? 'fila-alerta' : undefined}>
                  <td><strong>{o}</strong></td>
                  <td>
                    <select value={empresas[o] ?? ''} onChange={(e) => cambiarEmpresa(o, e.target.value)} aria-label={`Empresa de ${o}`}>
                      <option value="">Sin clasificar</option>
                      {EMPRESAS.map((e) => <option key={e.id} value={e.id}>{e.nombreLargo}</option>)}
                    </select>
                  </td>
                  <td>
                    <input value={c.nombresObras[o] ?? ''} placeholder={o} onChange={(e) => cambiarNombre(o, e.target.value)} aria-label={`Nombre de ${o}`} />
                  </td>
                  <td className="muted small">{conDatos.has(o) ? 'Con actividades o facturas' : 'Aún sin datos'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <div className="acciones-fijas">
        {ok && <span className="txt-verde">{ok}</span>}
        <button type="button" className="btn btn-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <Seccion titulo="Datos" subtitulo="La información se guarda en la base de datos y la ven todos los usuarios.">
        <p>
          Actividades: <strong>{datos.actividades.length}</strong> · Facturas: <strong>{datos.facturas.length}</strong>
          {' '}({pagadas} pagadas · {conDocumento} con documento)
        </p>
        <p className="nota">Los documentos de facturas se guardan en Cloudflare R2 (almacenamiento privado).</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => recargar()}>↻ Actualizar datos</button>
      </Seccion>
    </div>
  );
}
