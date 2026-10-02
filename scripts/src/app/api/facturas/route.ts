import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin } from '@/lib/auth';
import { archivoIdDeFactura, guardarFacturaDB, validarFactura } from '@/lib/db';
import { borrarArchivoR2 } from '@/lib/r2';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Crear o actualizar una factura (solo administrador).
// Si el documento se reemplazó o se quitó, el archivo anterior se borra de R2.
export async function POST(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const factura = validarFactura(await req.json());
    const anterior = await archivoIdDeFactura(factura.id);
    await guardarFacturaDB(factura);
    if (anterior && anterior !== factura.archivo?.id) await borrarArchivoR2(anterior);
    return NextResponse.json({ ok: true, factura });
  } catch (e) {
    return errorServidor(e);
  }
}
