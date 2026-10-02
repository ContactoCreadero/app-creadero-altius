'use client';

import { useEffect, useState } from 'react';
import { useDatos } from '@/components/DataProvider';
import { Cargando, Seccion } from '@/components/UI';
import LoginAdmin from '@/components/LoginAdmin';
import type { Configuracion } from '@/lib/types';
import { obraBase } from '@/lib/calc';
import { clp } from '@/lib/format';

export default function AdminPage() {
  const { datos, cargado, modoEdicion, guardarConfig, restaurarDatosExcel } = useDatos();
  const [login, setLogin] = useState(false);
  const [c, setC] = useState<Configuracion>(datos.config);
  const [ok, setOk] = useState('');

  useEffect(() => setC(datos.config), [datos.config]);

  if (!cargado) return <Cargando />;
  if (!modoEdicion) {
    return (
      <div className="pagina">
        <Seccion titulo="Administración" subtitulo="Sección de uso interno de Creadero.">
          <button type="button" className="btn btn-primario" onClick={() => setLogin(true)}>🔐 Ingresar como administrador</button>
        </Seccion>
        {login && <LoginAdmin onCerrar={() => setLogin(false)} />}
      </div>
    );
  }

  const obras = [...new Set([...datos.actividades.map((a) => a.obra), ...datos.facturas.map((f) => obraBase(f.obra || f.codigo))])].sort();

  const guardar = () => {
    guardarConfig({ ...c, valorAI: Number(c.valorAI) || 0 });
    setOk('Cambios guardados.');
    setTimeout(() => setOk(''), 2500);
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

      <Seccion titulo="Nombres de obras" subtitulo="El Excel solo trae códigos. Si completas el nombre, se mostrará en lugar del código.">
        <div className="form-grid form-grid-3">
          {obras.map((o) => (
            <label key={o} className="campo"><span>{o}</span>
              <input
                value={c.nombresObras[o] ?? ''}
                placeholder={o}
                onChange={(e) => {
                  const n = { ...c.nombresObras };
                  if (e.target.value.trim()) n[o] = e.target.value;
                  else delete n[o];
                  setC({ ...c, nombresObras: n });
                }}
              />
            </label>
          ))}
        </div>
      </Seccion>

      <div className="acciones-fijas">
        {ok && <span className="txt-verde">{ok}</span>}
        <button type="button" className="btn btn-primario" onClick={guardar}>Guardar cambios</button>
      </div>

      <Seccion titulo="Datos" subtitulo="Versión local: los datos se guardan en este navegador hasta conectar la base de datos (Neon).">
        <p>
          Actividades registradas: <strong>{datos.actividades.length}</strong> · Facturas: <strong>{datos.facturas.length}</strong>
        </p>
        <button
          type="button"
          className="btn btn-peligro"
          onClick={() => {
            if (confirm('¿Volver a los datos originales del Excel? Se perderán los cambios y los documentos de facturas subidos en este navegador.')) restaurarDatosExcel();
          }}
        >
          Restaurar datos del Excel
        </button>
      </Seccion>
    </div>
  );
}
