import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { esAdmin } from '@/lib/auth';
import { TAMANO_MAXIMO_ARCHIVO, tipoPermitido, urlSubida } from '@/lib/r2';
import { errorServidor, noAutorizado } from '@/lib/respuestas';

// Prepara la subida de un documento: devuelve un enlace firmado para subirlo directo a R2 (solo administrador).
export async function POST(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  try {
    const body = (await req.json()) as { tipo?: unknown; tamano?: unknown };
    const tipo = typeof body.tipo === 'string' ? body.tipo : '';
    const tamano = Number(body.tamano);
    if (!tipoPermitido(tipo)) throw new Error('Tipo de archivo inválido: solo imágenes o PDF');
    if (!(tamano > 0 && tamano <= TAMANO_MAXIMO_ARCHIVO)) throw new Error('Tamaño inválido: máximo 10 MB');
    const id = 'arch_' + Date.now().toString(36) + randomBytes(6).toString('hex');
    const url = await urlSubida(id, tipo);
    return NextResponse.json({ ok: true, id, url });
  } catch (e) {
    return errorServidor(e);
  }
}
