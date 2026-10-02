import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ADMIN, esTokenAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Indica al navegador si la sesión actual es de administrador (validado en el servidor).
export async function GET(req: NextRequest) {
  const admin = esTokenAdmin(req.cookies.get(COOKIE_ADMIN)?.value);
  return NextResponse.json({ rol: admin ? 'admin' : 'cliente' });
}
