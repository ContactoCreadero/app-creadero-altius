import { NextResponse } from 'next/server';
import {
  COOKIE_ADMIN,
  COOKIE_CLIENTE,
  DURACION_SESION_CLIENTE_SEG,
  DURACION_SESION_SEG,
  adminConfigurado,
  passwordValida,
  tokenAdmin,
  tokenCliente,
  type Usuario,
} from '@/lib/auth';

// Ingreso: { usuario: 'creadero' | 'altius', password }
export async function POST(req: Request) {
  let usuario: Usuario = 'creadero';
  let password = '';
  try {
    const body = await req.json();
    usuario = body?.usuario === 'altius' ? 'altius' : 'creadero';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    /* cuerpo inválido */
  }

  if (usuario === 'creadero' && !adminConfigurado()) {
    return NextResponse.json({ ok: false, error: 'Falta configurar ADMIN_PASSWORD en las variables de entorno' }, { status: 500 });
  }
  if (!passwordValida(usuario, password)) {
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const rol = usuario === 'creadero' ? 'admin' : 'cliente';
  const res = NextResponse.json({ ok: true, rol });
  const opciones = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
  // Se deja solo la sesión del usuario elegido
  if (rol === 'admin') {
    res.cookies.set(COOKIE_ADMIN, tokenAdmin()!, { ...opciones, maxAge: DURACION_SESION_SEG });
    res.cookies.set(COOKIE_CLIENTE, '', { ...opciones, maxAge: 0 });
  } else {
    res.cookies.set(COOKIE_CLIENTE, tokenCliente(), { ...opciones, maxAge: DURACION_SESION_CLIENTE_SEG });
    res.cookies.set(COOKIE_ADMIN, '', { ...opciones, maxAge: 0 });
  }
  return res;
}
