// Autenticación (código de servidor). Dos usuarios:
//   • Creadero (Administrador)  → contraseña ADMIN_PASSWORD
//   • Altius   (Visualización)  → contraseña ALTIUS_PASSWORD (opcional: si no se define, Altius entra sin contraseña)
// Se definen en .env.local (local) y en las variables de entorno de Vercel (producción).
// Nunca se escriben en el código ni se envían al navegador.

import { createHash, timingSafeEqual } from 'crypto';

export const COOKIE_ADMIN = 'altius_admin';
export const COOKIE_CLIENTE = 'altius_cliente';
export const DURACION_SESION_SEG = 60 * 60 * 12; // administrador: 12 horas
export const DURACION_SESION_CLIENTE_SEG = 60 * 60 * 24 * 30; // Altius: 30 días

export type Usuario = 'creadero' | 'altius';
export type RolSesion = 'admin' | 'cliente' | null;

type ReqConCookies = { cookies: { get(nombre: string): { value: string } | undefined } };

export function adminConfigurado(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

/** ¿Altius necesita contraseña para entrar? */
export function clienteRequierePassword(): boolean {
  return !!process.env.ALTIUS_PASSWORD;
}

function iguales(intento: string, real: string): boolean {
  const a = Buffer.from(intento);
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordValida(usuario: Usuario, intento: string): boolean {
  if (usuario === 'creadero') {
    const real = process.env.ADMIN_PASSWORD;
    return !!real && iguales(intento, real);
  }
  const real = process.env.ALTIUS_PASSWORD;
  return real ? iguales(intento, real) : true;
}

/** Valores de las cookies de sesión (derivados de las contraseñas: si se cambia una contraseña, se cierran sus sesiones). */
export function tokenAdmin(): string | null {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return null;
  return createHash('sha256').update('creadero-altius-admin:' + real).digest('hex');
}

export function tokenCliente(): string {
  return createHash('sha256')
    .update('creadero-altius-cliente:' + (process.env.ALTIUS_PASSWORD || 'sin-clave'))
    .digest('hex');
}

export function esTokenAdmin(valor: string | undefined): boolean {
  const t = tokenAdmin();
  return !!t && !!valor && valor === t;
}

/** ¿La solicitud viene de un administrador con sesión válida? (todas las rutas que modifican datos) */
export function esAdmin(req: ReqConCookies): boolean {
  return esTokenAdmin(req.cookies.get(COOKIE_ADMIN)?.value);
}

/** Rol de la sesión actual: admin, cliente (Altius) o null (sin ingresar). */
export function rolSesion(req: ReqConCookies): RolSesion {
  if (esAdmin(req)) return 'admin';
  if (req.cookies.get(COOKIE_CLIENTE)?.value === tokenCliente()) return 'cliente';
  return null;
}

/** ¿Puede ver los datos? (Creadero o Altius con sesión) — rutas de lectura */
export function puedeVer(req: ReqConCookies): boolean {
  return rolSesion(req) !== null;
}
