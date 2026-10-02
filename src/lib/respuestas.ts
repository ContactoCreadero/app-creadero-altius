// Respuestas estándar de las rutas API.
import { NextResponse } from 'next/server';

/** Sin sesión de administrador (rutas que modifican datos) o sin sesión alguna (rutas de lectura). */
export const noAutorizado = () =>
  NextResponse.json({ ok: false, error: 'Requiere ingresar como administrador (Creadero)' }, { status: 401 });

export function errorServidor(e: unknown) {
  const msg = e instanceof Error ? e.message : 'Error desconocido';
  console.error('[API]', msg);
  // Errores de validación → 400; el resto → 500
  const esValidacion = /inválid|Falta/i.test(msg);
  return NextResponse.json({ ok: false, error: msg }, { status: esValidacion ? 400 : 500 });
}

/** Sin sesión (ni Creadero ni Altius): rutas de lectura. */
export const sinSesion = () => NextResponse.json({ ok: false, error: 'Debes ingresar a la aplicación' }, { status: 401 });
