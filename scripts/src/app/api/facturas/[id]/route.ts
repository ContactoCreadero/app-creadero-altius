import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin } from '@/lib/auth';
import { archivoIdDeFactura, eliminarFacturaDB } from '@/lib/db';
import { borrarArchivoR2 } from '@/lib/r2';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Eliminar una factura y su documento (solo administrador).
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const { id } = await ctx.params;
    const archivoId = await archivoIdDeFactura(id);
    await eliminarFacturaDB(id);
    if (archivoId) await borrarArchivoR2(archivoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorServidor(e);
  }
}
