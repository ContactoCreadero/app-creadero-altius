import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin } from '@/lib/auth';
import { guardarActividadDB, validarActividad } from '@/lib/db';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Crear o actualizar una actividad (solo administrador).
export async function POST(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const actividad = validarActividad(await req.json());
    await guardarActividadDB(actividad);
    return NextResponse.json({ ok: true, actividad });
  } catch (e) {
    return errorServidor(e);
  }
}
