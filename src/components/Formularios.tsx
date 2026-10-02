'use client';

import { useRef, useState } from 'react';
import type { Actividad, ArchivoMeta, Factura, IniciativaId } from '@/lib/types';
import { INICIATIVAS, MESES } from '@/lib/constants';
import { nuevoId, useDatos } from '@/components/DataProvider';
import { obraBase } from '@/lib/calc';
import { clp } from '@/lib/format';
import { TIPOS_ACEPTADOS, eliminarArchivo, subirArchivo } from '@/lib/archivos';

/* eslint-disable @next/next/no-img-element */

export type ModoFormulario = 'nuevo' | 'editar' | 'duplicar';

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabecera">
          <h3>{titulo}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ etiqueta, children, ancho }: { etiqueta: string; children: React.ReactNode; ancho?: 'completo' }) {
  return (
    <label className={'campo' + (ancho === 'completo' ? ' campo-completo' : '')}>
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}

const aNumero = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(',', '.')));

const TITULOS: Record<ModoFormulario, string> = { nuevo: 'Nueva', editar: 'Editar', duplicar: 'Duplicar' };

/* =================== Actividades =================== */

export function nuevaActividad(iniciativaId: IniciativaId = 'mantencion', obra = ''): Actividad {
  return {
    id: nuevoId('A'),
    iniciativaId,
    periodo: null,
    obra,
    fechaInicio: null,
    fechaTermino: null,
    detalleProgramado: '',
    detalleEjecutado: '',
    aiProgramado: 0,
    avance: 0,
    charlasProgramadas: 0,
    charlasRealizadas: 0,
    personas: null,
    observacion: '',
  };
}

export function FormActividad({
  inicial,
  modo,
  onCerrar,
}: {
  inicial: Actividad;
  modo?: ModoFormulario;
  onCerrar: () => void;
}) {
  const { datos, guardarActividad, eliminarActividad, nombreObra } = useDatos();
  const existe = datos.actividades.some((a) => a.id === inicial.id);
  const m: ModoFormulario = modo ?? (existe ? 'editar' : 'nuevo');
  const [a, setA] = useState<Actividad>(inicial);
  const [avanceTxt, setAvanceTxt] = useState(String(Math.round(inicial.avance * 1000) / 10));
  const [personasTxt, setPersonasTxt] = useState(inicial.personas == null ? '' : String(inicial.personas));
  const [error, setError] = useState('');

  const obras = [...new Set([...datos.actividades.map((x) => x.obra), ...datos.facturas.map((f) => obraBase(f.obra || f.codigo))])].sort();
  const set = <K extends keyof Actividad>(k: K, v: Actividad[K]) => setA((p) => ({ ...p, [k]: v }));

  const guardar = () => {
    const avance = aNumero(avanceTxt) / 100;
    if (!a.obra.trim()) return setError('Indica la obra.');
    if (!(a.aiProgramado >= 0)) return setError('AI programadas debe ser un número.');
    if (!(avance >= 0 && avance <= 1)) return setError('El % de avance debe estar entre 0 y 100.');
    const personas = personasTxt.trim() === '' ? null : Math.max(0, Math.round(aNumero(personasTxt)));
    guardarActividad({
      ...a,
      obra: a.obra.trim().toUpperCase(),
      periodo: a.iniciativaId === 'mantencion' ? a.periodo : null,
      avance,
      personas,
    });
    onCerrar();
  };

  const utilizado = a.aiProgramado * (aNumero(avanceTxt) / 100);

  return (
    <Modal titulo={`${TITULOS[m]} actividad`} onCerrar={onCerrar}>
      {m === 'duplicar' && <p className="aviso-duplicar">Copia de la actividad seleccionada. Ajusta los datos y presiona Guardar para crearla.</p>}
      <div className="form-grid">
        <Campo etiqueta="Iniciativa">
          <select value={a.iniciativaId} onChange={(e) => set('iniciativaId', e.target.value as IniciativaId)}>
            {INICIATIVAS.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </Campo>
        {a.iniciativaId === 'mantencion' ? (
          <Campo etiqueta="Mes (período)">
            <select value={a.periodo ?? ''} onChange={(e) => set('periodo', e.target.value || null)}>
              <option value="">—</option>
              {MESES.map((mes) => <option key={mes} value={mes}>{mes}</option>)}
            </select>
          </Campo>
        ) : <div />}
        <Campo etiqueta="Obra (código)">
          <input list="lista-obras" value={a.obra} onChange={(e) => set('obra', e.target.value)} placeholder="Ej: ZEN" />
          <datalist id="lista-obras">
            {obras.map((o) => <option key={o} value={o}>{nombreObra(o)}</option>)}
          </datalist>
        </Campo>
        <Campo etiqueta="AI programadas">
          <input type="number" min={0} step="1" value={a.aiProgramado} onChange={(e) => set('aiProgramado', aNumero(e.target.value))} />
        </Campo>
        <Campo etiqueta="Fecha inicio">
          <input type="date" value={a.fechaInicio ?? ''} onChange={(e) => set('fechaInicio', e.target.value || null)} />
        </Campo>
        <Campo etiqueta="Fecha término">
          <input type="date" value={a.fechaTermino ?? ''} onChange={(e) => set('fechaTermino', e.target.value || null)} />
        </Campo>
        <Campo etiqueta="Detalle programado" ancho="completo">
          <input value={a.detalleProgramado} onChange={(e) => set('detalleProgramado', e.target.value)} placeholder="Ej: 2 Charlas, 2 lienzos, Stickers" />
        </Campo>
        <Campo etiqueta="Detalle ejecutado" ancho="completo">
          <input value={a.detalleEjecutado} onChange={(e) => set('detalleEjecutado', e.target.value)} />
        </Campo>
        <Campo etiqueta="Charlas programadas">
          <input type="number" min={0} value={a.charlasProgramadas} onChange={(e) => set('charlasProgramadas', aNumero(e.target.value))} />
        </Campo>
        <Campo etiqueta="Charlas realizadas">
          <input type="number" min={0} value={a.charlasRealizadas} onChange={(e) => set('charlasRealizadas', aNumero(e.target.value))} />
        </Campo>
        <Campo etiqueta="% de avance">
          <input type="number" min={0} max={100} step="5" value={avanceTxt} onChange={(e) => setAvanceTxt(e.target.value)} />
        </Campo>
        <Campo etiqueta="Personas capacitadas">
          <input type="number" min={0} value={personasTxt} onChange={(e) => setPersonasTxt(e.target.value)} placeholder="Sin registrar" />
        </Campo>
        <Campo etiqueta="Observación" ancho="completo">
          <input value={a.observacion} onChange={(e) => set('observacion', e.target.value)} placeholder="Ej: Charla extra 14/04" />
        </Campo>
      </div>
      <p className="calculo">
        AI utilizadas = {a.aiProgramado} × {avanceTxt || 0}% = <strong>{Math.round(utilizado * 100) / 100}</strong> AI
        {' · '}{clp(utilizado * datos.config.valorAI)}
      </p>
      {error && <p className="error">{error}</p>}
      <div className="modal-acciones">
        {m === 'editar' && (
          <button
            type="button"
            className="btn btn-peligro"
            onClick={() => {
              if (confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) {
                eliminarActividad(a.id);
                onCerrar();
              }
            }}
          >
            Eliminar
          </button>
        )}
        <span className="nav-spacer" />
        <button type="button" className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn btn-primario" onClick={guardar}>Guardar</button>
      </div>
    </Modal>
  );
}

/* =================== Facturas =================== */

export function nuevaFactura(codigoObra = ''): Factura {
  return {
    id: nuevoId('F'),
    fecha: null,
    codigo: codigoObra,
    obra: codigoObra ? obraBase(codigoObra) : '',
    codigoSence: '',
    ai: 0,
    numeroFactura: '',
    observacion: 'Fondos 2026',
    pagada: false,
    fechaPago: null,
    archivo: null,
  };
}

export function FormFactura({
  inicial,
  modo,
  onCerrar,
}: {
  inicial: Factura;
  modo?: ModoFormulario;
  onCerrar: () => void;
}) {
  const { datos, guardarFactura, eliminarFactura } = useDatos();
  const existe = datos.facturas.some((f) => f.id === inicial.id);
  const m: ModoFormulario = modo ?? (existe ? 'editar' : 'nuevo');
  const [f, setF] = useState<Factura>({ pagada: false, fechaPago: null, archivo: null, ...inicial });
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const subidosEnEsteFormulario = useRef<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Factura>(k: K, v: Factura[K]) => setF((p) => ({ ...p, [k]: v }));

  const elegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    setError('');
    try {
      const meta: ArchivoMeta = await subirArchivo(file);
      subidosEnEsteFormulario.current.push(meta.id);
      set('archivo', meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  // Al cancelar, se borran los archivos subidos en este formulario que no se guardaron
  const cancelar = () => {
    subidosEnEsteFormulario.current.forEach((id) => eliminarArchivo(id));
    onCerrar();
  };

  const guardar = () => {
    const codigo = f.codigo.trim().toUpperCase();
    if (!codigo) return setError('Indica el código (ej: ZEN2).');
    if (!(f.ai > 0)) return setError('Indica el número de AI facturadas.');
    // archivos subidos y reemplazados dentro del mismo formulario
    subidosEnEsteFormulario.current.filter((id) => id !== f.archivo?.id).forEach((id) => eliminarArchivo(id));
    guardarFactura({ ...f, codigo, obra: obraBase(codigo), fechaPago: f.pagada ? f.fechaPago : null });
    onCerrar();
  };

  return (
    <Modal titulo={`${TITULOS[m]} factura`} onCerrar={cancelar}>
      {m === 'duplicar' && <p className="aviso-duplicar">Copia de la factura seleccionada (sin documento ni N° de factura). Ajusta los datos y presiona Guardar.</p>}
      <div className="form-grid">
        <Campo etiqueta="Fecha facturación">
          <input type="date" value={f.fecha ?? ''} onChange={(e) => set('fecha', e.target.value || null)} />
        </Campo>
        <Campo etiqueta="N° factura">
          <input value={f.numeroFactura} onChange={(e) => set('numeroFactura', e.target.value)} />
        </Campo>
        <Campo etiqueta="Código (obra + correlativo)">
          <input value={f.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="Ej: ZEN2" />
        </Campo>
        <Campo etiqueta="Código SENCE">
          <input value={f.codigoSence} onChange={(e) => set('codigoSence', e.target.value)} />
        </Campo>
        <Campo etiqueta="# AI facturadas">
          <input type="number" min={0} value={f.ai} onChange={(e) => set('ai', aNumero(e.target.value))} />
        </Campo>
        <Campo etiqueta="Fondos">
          <select value={f.observacion} onChange={(e) => set('observacion', e.target.value)}>
            <option>Fondos 2025</option>
            <option>Fondos 2026</option>
          </select>
        </Campo>
        <Campo etiqueta="Estado de pago">
          <select value={f.pagada ? 'si' : 'no'} onChange={(e) => set('pagada', e.target.value === 'si')}>
            <option value="no">No pagada</option>
            <option value="si">Pagada</option>
          </select>
        </Campo>
        {f.pagada ? (
          <Campo etiqueta="Fecha de pago">
            <input type="date" value={f.fechaPago ?? ''} onChange={(e) => set('fechaPago', e.target.value || null)} />
          </Campo>
        ) : <div />}

        <div className="campo campo-completo">
          <span>Documento de la factura (imagen o PDF)</span>
          <div className="selector-archivo">
            <input ref={input} type="file" accept={TIPOS_ACEPTADOS} onChange={elegirArchivo} hidden />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()} disabled={subiendo}>
              📎 Seleccionar archivo
            </button>
            {subiendo ? (
              <span className="muted small">Procesando…</span>
            ) : f.archivo ? (
              <>
                {f.archivo.miniatura ? <img src={f.archivo.miniatura} alt="" className="miniatura-form" /> : <span className="miniatura-pdf chica">PDF</span>}
                <span className="small">{f.archivo.nombre}</span>
                <button type="button" className="link-accion peligro" onClick={() => set('archivo', null)}>Quitar</button>
              </>
            ) : (
              <span className="muted small">Ningún archivo seleccionado</span>
            )}
          </div>
        </div>
      </div>
      <p className="calculo">
        Monto = {f.ai} × {clp(datos.config.valorAI)} = <strong>{clp(f.ai * datos.config.valorAI)}</strong>
        {f.codigo && <> · se asigna a la obra <strong>{obraBase(f.codigo)}</strong></>}
      </p>
      {error && <p className="error">{error}</p>}
      <div className="modal-acciones">
        {m === 'editar' && (
          <button
            type="button"
            className="btn btn-peligro"
            onClick={() => {
              if (confirm('¿Eliminar esta factura?')) {
                eliminarFactura(f.id);
                onCerrar();
              }
            }}
          >
            Eliminar
          </button>
        )}
        <span className="nav-spacer" />
        <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>
        <button type="button" className="btn btn-primario" onClick={guardar} disabled={subiendo}>Guardar</button>
      </div>
    </Modal>
  );
}
