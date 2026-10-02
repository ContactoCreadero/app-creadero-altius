import { NextResponse } from 'next/server';
import { COOKIE_ADMIN } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true, rol: 'cliente' });
  res.cookies.set(COOKIE_ADMIN, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
