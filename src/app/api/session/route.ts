import { NextResponse, type NextRequest } from 'next/server';
import { clienteRequierePassword, rolSesion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Indica al navegador quién ingresó (validado en el servidor) y si Altius requiere contraseña.
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { rol: rolSesion(req), altiusRequierePassword: clienteRequierePassword() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
