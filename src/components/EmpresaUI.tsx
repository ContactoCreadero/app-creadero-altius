'use client';

// Componentes de la clasificación por empresa (SpA / S.A. / Corporativo).

import { useDatos } from '@/components/DataProvider';
import { EMPRESAS, NOMBRE_EMPRESA, NOMBRE_LARGO_EMPRESA } from '@/lib/constants';
import type { FiltroEmpresa } from '@/lib/types';

/** Etiqueta con la empresa de una obra. */
export function ChipEmpresa({ obra }: { obra: string }) {
  const { empresaDeObra } = useDatos();
  const e = empresaDeObra(obra);
  if (!e) return <span className="chip-empresa chip-empresa-sin" title="Obra sin clasificar">Sin clasificar</span>;
  return <span className={`chip-empresa chip-empresa-${e}`}>{NOMBRE_EMPRESA[e]}</span>;
}

/** Selector Todas · SpA · S.A. · Corporativo (y "Sin clasificar" solo si hay obras sin empresa). Visible para ambos perfiles. */
export function SelectorEmpresa() {
  const { filtroEmpresa, setFiltroEmpresa, datosCompletos, empresaDeObra } = useDatos();
  const haySinClasificar =
    datosCompletos.actividades.some((a) => !empresaDeObra(a.obra)) ||
    datosCompletos.facturas.some((f) => !empresaDeObra(f.obra || f.codigo));

  const opciones: { id: FiltroEmpresa; nombre: string }[] = [
    { id: 'todas', nombre: 'Todas' },
    ...EMPRESAS.map((e) => ({ id: e.id as FiltroEmpresa, nombre: e.nombre })),
    ...(haySinClasificar || filtroEmpresa === 'sin' ? [{ id: 'sin' as FiltroEmpresa, nombre: 'Sin clasificar' }] : []),
  ];

  return (
    <div className="selector-empresa" role="group" aria-label="Filtrar por empresa">
      <span className="selector-empresa-etiqueta">Empresa</span>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          className={'selector-empresa-opcion' + (filtroEmpresa === o.id ? ' activa' : '')}
          aria-pressed={filtroEmpresa === o.id}
          onClick={() => setFiltroEmpresa(o.id)}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

/** Texto del filtro activo (para encabezados e impresión). */
export function textoFiltroEmpresa(f: FiltroEmpresa): string {
  if (f === 'todas') return 'Todas las empresas';
  if (f === 'sin') return 'Obras sin clasificar';
  return NOMBRE_LARGO_EMPRESA[f];
}
