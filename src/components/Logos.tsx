'use client';

import { useEffect, useRef, useState } from 'react';
import { LOGO_CREADERO } from '@/lib/constants';

/* eslint-disable @next/next/no-img-element */

/**
 * Logo Creadero (el publicado en www.creadero.cl).
 * Si no carga (por ejemplo, sin internet), muestra el nombre en texto.
 */
export function LogoCreadero({ height = 40 }: { height?: number }) {
  const [fallo, setFallo] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Por si la imagen falló antes de que React tomara el control de la página
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFallo(true);
  }, []);

  if (fallo) {
    return (
      <span className="logo-texto" style={{ fontSize: Math.round(height * 0.55) }}>
        CREADERO
      </span>
    );
  }
  return (
    <img
      ref={ref}
      src={LOGO_CREADERO}
      alt="Creadero Consultoría y Capacitación"
      style={{ height, width: 'auto', display: 'block' }}
      onError={() => setFallo(true)}
    />
  );
}

export function LogoAltius({ height = 40 }: { height?: number }) {
  return (
    <img
      src="/logo-altius.png"
      alt="ALTIUS Constructora"
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}
