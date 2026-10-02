import { NextResponse } from 'next/server';
import { COOKIE_ADMIN, DURACION_SESION_SEG, adminConfigurado, passwordValida, tokenAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  if (!adminConfigurado()) {
    return NextResponse.json(
      { ok: false, error: 'Falta configurar ADMIN_PASSWORD en el archivo .env.local' },
      { status: 500 },
    );
  }
  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    /* cuerpo inválido */
  }
  if (!passwordValida(password)) {
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, rol: 'admin' });
  res.cookies.set(COOKIE_ADMIN, tokenAdmin()!, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACION_SESION_SEG,
  });
  return res;
}
