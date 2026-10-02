// Autenticación del administrador (código de servidor).
// La contraseña se define en .env.local (local) y en las variables de entorno de Vercel (producción):
//   ADMIN_PASSWORD=...
// Nunca se escribe en el código ni se envía al navegador.

import { createHash, timingSafeEqual } from 'crypto';

export const COOKIE_ADMIN = 'altius_admin';
export const DURACION_SESION_SEG = 60 * 60 * 12; // 12 horas

export function adminConfigurado(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function passwordValida(intento: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = Buffer.from(intento);
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Valor de la cookie de sesión (derivado de la contraseña: si se cambia la contraseña, se cierran las sesiones). */
export function tokenAdmin(): string | null {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return null;
  return createHash('sha256').update('creadero-altius-admin:' + real).digest('hex');
}

export function esTokenAdmin(valor: string | undefined): boolean {
  const t = tokenAdmin();
  return !!t && !!valor && valor === t;
}

/** ¿La solicitud viene de un administrador con sesión válida? (se usa en todas las rutas que modifican datos) */
export function esAdmin(req: { cookies: { get(nombre: string): { value: string } | undefined } }): boolean {
  return esTokenAdmin(req.cookies.get(COOKIE_ADMIN)?.value);
}
