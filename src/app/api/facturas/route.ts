import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin } from '@/lib/auth';
import { guardarFacturaDB, validarFactura } from '@/lib/db';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Crear o actualizar una factura (solo administrador).
export async function POST(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const factura = validarFactura(await req.json());
    await guardarFacturaDB(factura);
    return NextResponse.json({ ok: true, factura });
  } catch (e) {
    return errorServidor(e);
  }
}
