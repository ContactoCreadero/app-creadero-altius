'use client';

import { useEffect, useRef, useState } from 'react';
import type { Factura } from '@/lib/types';
import { useDatos } from '@/components/DataProvider';
import { TIPOS_ACEPTADOS, obtenerArchivo, subirArchivo } from '@/lib/archivos';
import { fecha } from '@/lib/format';

/* eslint-disable @next/next/no-img-element */

function hoyISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function tamanoLegible(b: number): string {
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}

/** Miniatura del documento de la factura + botones para subir / cambiar / quitar (solo administrador). */
export function ArchivoFactura({ factura }: { factura: Factura }) {
  const { modoEdicion, guardarFactura } = useDatos();
  const [viendo, setViendo] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const a = factura.archivo;

  const alElegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    try {
      const meta = await subirArchivo(file);
      guardarFactura({ ...factura, archivo: meta });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = () => {
    if (confirm('¿Quitar el documento de esta factura?')) guardarFactura({ ...factura, archivo: null });
  };

  return (
    <div className="archivo-celda">
      {a ? (
        <button type="button" className="miniatura" onClick={() => setViendo(true)} title={`Ver ${a.nombre}`}>
          {a.miniatura ? <img src={a.miniatura} alt={`Factura ${factura.numeroFactura}`} /> : <span className="miniatura-pdf">PDF</span>}
          <span className="miniatura-lupa" aria-hidden>🔍</span>
        </button>
      ) : (
        !modoEdicion && <span className="muted small">Sin documento</span>
      )}

      {modoEdicion && (
        <div className="archivo-acciones no-print">
          <input ref={input} type="file" accept={TIPOS_ACEPTADOS} onChange={alElegir} hidden />
          {subiendo ? (
            <span className="muted small">Subiendo…</span>
          ) : a ? (
            <>
              <button type="button" className="link-accion" onClick={() => input.current?.click()}>Cambiar</button>
              <button type="button" className="link-accion peligro" onClick={quitar}>Quitar</button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()}>📎 Subir factura</button>
          )}
        </div>
      )}

      {viendo && a && <VisorArchivo factura={factura} onCerrar={() => setViendo(false)} />}
    </div>
  );
}

/** Vista ampliada del documento (imagen o PDF). */
function VisorArchivo({ factura, onCerrar }: { factura: Factura; onCerrar: () => void }) {
  const a = factura.archivo!;
  const [url, setUrl] = useState<string | null>(null);
  const [faltante, setFaltante] = useState(false);
  const esPdf = a.tipo === 'application/pdf';
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    let objUrl: string | null = null;
    obtenerArchivo(a.id).then((blob) => {
      if (!blob) return setFaltante(true);
      objUrl = URL.createObjectURL(esPdf ? new Blob([blob], { type: 'application/pdf' }) : blob);
      setUrl(objUrl);
    });
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar.current();
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [a.id, esPdf]);

  return (
    <div className="visor-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="visor" role="dialog" aria-modal="true" aria-label="Documento de la factura">
        <div className="visor-cabecera">
          <div>
            <strong>Factura N° {factura.numeroFactura || '—'}</strong>
            <span className="muted small"> · {factura.codigo} · {a.nombre} ({tamanoLegible(a.tamano)})</span>
          </div>
          <div className="visor-botones">
            {url && <a className="btn btn-ghost btn-sm" href={url} download={a.nombre}>⬇️ Descargar</a>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCerrar}>✕ Cerrar</button>
          </div>
        </div>
        <div className="visor-cuerpo">
          {faltante ? (
            <div className="visor-aviso">
              {a.miniatura && <img src={a.miniatura} alt="Vista previa" />}
              <p>El archivo original no está guardado en este navegador (versión local). Al conectar el almacenamiento en la nube estará disponible desde cualquier equipo.</p>
            </div>
          ) : !url ? (
            <p className="muted">Cargando…</p>
          ) : esPdf ? (
            <iframe src={url} title={a.nombre} className="visor-pdf" />
          ) : (
            <img src={url} alt={a.nombre} className="visor-img" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Estado de pago. El administrador puede cambiarlo con un clic. */
export function EstadoPago({ factura }: { factura: Factura }) {
  const { modoEdicion, guardarFactura } = useDatos();
  const pagada = !!factura.pagada;
  const chip = (
    <span className={'chip ' + (pagada ? 'chip-pagada' : 'chip-nopagada')}>
      {pagada ? '✓ Pagada' : 'No pagada'}
    </span>
  );
  if (!modoEdicion) {
    return (
      <span className="estado-pago">
        {chip}
        {pagada && factura.fechaPago && <span className="muted small">{fecha(factura.fechaPago)}</span>}
      </span>
    );
  }
  return (
    <span className="estado-pago">
      <button
        type="button"
        className="chip-boton"
        title={pagada ? 'Marcar como no pagada' : 'Marcar como pagada (fecha de hoy)'}
        onClick={() =>
          guardarFactura({ ...factura, pagada: !pagada, fechaPago: pagada ? null : factura.fechaPago || hoyISO() })
        }
      >
        {chip}
      </button>
      {pagada && factura.fechaPago && <span className="muted small">{fecha(factura.fechaPago)}</span>}
    </span>
  );
}
