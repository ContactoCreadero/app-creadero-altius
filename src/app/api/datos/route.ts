import { NextResponse, type NextRequest } from 'next/server';
import { puedeVer } from '@/lib/auth';
import { leerDatos } from '@/lib/db';
import { errorServidor, sinSesion } from '@/lib/respuestas';

export const dynamic = 'force-dynamic';

// Lectura de todos los datos (requiere haber ingresado como Creadero o Altius).
export async function GET(req: NextRequest) {
  if (!puedeVer(req)) return sinSesion();
  try {
    const datos = await leerDatos();
    if (!datos.config) {
      return NextResponse.json(
        { ok: false, error: 'La base de datos está vacía. Ejecuta: npm.cmd run db:init' },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, datos }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorServidor(e);
  }
}
