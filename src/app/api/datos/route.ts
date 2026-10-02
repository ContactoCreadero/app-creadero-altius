import { NextResponse } from 'next/server';
import { leerDatos } from '@/lib/db';
import { errorServidor } from '@/lib/respuestas';

export const dynamic = 'force-dynamic';

// Lectura de todos los datos (vista cliente y administrador).
export async function GET() {
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
