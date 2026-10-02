import { NextResponse, type NextRequest } from 'next/server';
import { esAdmin, puedeVer } from '@/lib/auth';
import { buscarArchivoDB } from '@/lib/db';
import { borrarArchivoR2, urlLectura } from '@/lib/r2';
import { errorServidor, noAutorizado, sinSesion } from '@/lib/respuestas';

export const dynamic = 'force-dynamic';

// Ver o descargar un documento de factura (?descargar=1). Redirige a un enlace firmado de R2 de 5 minutos.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!puedeVer(req)) return sinSesion();
  try {
    const { id } = await ctx.params;
    const meta = await buscarArchivoDB(id);
    if (!meta) return NextResponse.json({ ok: false, error: 'Documento no encontrado' }, { status: 404 });
    const descargar = req.nextUrl.searchParams.get('descargar') === '1';
    const url = await urlLectura(id, meta.nombre, meta.tipo, descargar);
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorServidor(e);
  }
}

// Borrar un documento que se subió pero no quedó asociado a ninguna factura (solo administrador).
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const { id } = await ctx.params;
    if (!/^arch_[a-z0-9]+$/.test(id)) throw new Error('Identificador inválido');
    if (await buscarArchivoDB(id)) {
      return NextResponse.json({ ok: false, error: 'El documento está asociado a una factura' }, { status: 409 });
    }
    await borrarArchivoR2(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorServidor(e);
  }
}
