import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin } from '@/lib/auth';
import { guardarConfigDB, validarConfig } from '@/lib/db';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Guardar parámetros del programa (solo administrador).
export async function PUT(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const config = validarConfig(await req.json());
    await guardarConfigDB(config);
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    return errorServidor(e);
  }
}
