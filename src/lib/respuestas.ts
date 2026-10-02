// Respuestas estándar de las rutas API.
import { NextResponse } from 'next/server';

export const noAutorizado = () =>
  NextResponse.json({ ok: false, error: 'Requiere ingresar como administrador' }, { status: 401 });

export function errorServidor(e: unknown) {
  const msg = e instanceof Error ? e.message : 'Error desconocido';
  console.error('[API]', msg);
  // Errores de validación → 400; el resto → 500
  const esValidacion = /inválid|Falta/i.test(msg);
  return NextResponse.json({ ok: false, error: msg }, { status: esValidacion ? 400 : 500 });
}
