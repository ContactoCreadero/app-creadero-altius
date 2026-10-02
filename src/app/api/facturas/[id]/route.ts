import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin } from '@/lib/auth';
import { eliminarFacturaDB } from '@/lib/db';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Eliminar una factura (solo administrador).
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const { id } = await ctx.params;
    await eliminarFacturaDB(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorServidor(e);
  }
}
