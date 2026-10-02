import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin } from '@/lib/auth';
import { eliminarActividadDB } from '@/lib/db';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Eliminar una actividad (solo administrador).
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const { id } = await ctx.params;
    await eliminarActividadDB(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorServidor(e);
  }
}
