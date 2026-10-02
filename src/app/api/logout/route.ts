import { NextResponse } from 'next/server';
import { COOKIE_ADMIN, COOKIE_CLIENTE } from '@/lib/auth';

// Cierra la sesión (Creadero o Altius) y vuelve a la pantalla de ingreso.
export async function POST() {
  const res = NextResponse.json({ ok: true, rol: null });
  res.cookies.set(COOKIE_ADMIN, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(COOKIE_CLIENTE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
