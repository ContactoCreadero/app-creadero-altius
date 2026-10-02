'use client';

// Almacén de datos y sesión de la aplicación.
// • Sesión: Creadero (administrador) o Altius (visualización), validada en el servidor (/api/session, /api/login).
//   Sin sesión se muestra la pantalla de ingreso y no se cargan datos.
// • Datos: base de datos Neon a través de las rutas /api/* (las que modifican exigen administrador).
// • Documentos de facturas: Cloudflare R2.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Actividad, Configuracion, Datos, Factura, Rol } from '@/lib/types';
import { CONFIG_INICIAL } from '@/lib/constants';
import PantallaIngreso from '@/components/PantallaIngreso';

export type UsuarioIngreso = 'creadero' | 'altius';

interface Ctx {
  datos: Datos;
  cargado: boolean;
  rol: Rol;
  /** true cuando ingresó Creadero (administrador) */
  modoEdicion: boolean;
  salir: () => Promise<void>;
  guardarActividad: (a: Actividad) => Promise<boolean>;
  eliminarActividad: (id: string) => Promise<boolean>;
  guardarFactura: (f: Factura) => Promise<boolean>;
  eliminarFactura: (id: string) => Promise<boolean>;
  guardarConfig: (c: Configuracion) => Promise<boolean>;
  recargar: () => Promise<void>;
  nombreObra: (codigo: string) => string;
}

const DataContext = createContext<Ctx | null>(null);

const VACIO: Datos = { config: CONFIG_INICIAL, actividades: [], facturas: [] };

async function llamar(url: string, method: string, body?: unknown): Promise<{ ok: boolean; error?: string; status?: number; [k: string]: unknown }> {
  try {
    const r = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) return { ok: false, status: r.status, error: j?.error || `Error ${r.status}` };
    return j;
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor' };
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [cargado, setCargado] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [rol, setRol] = useState<Rol | null>(null);
  const [sesionRevisada, setSesionRevisada] = useState(false);
  const [altiusRequierePassword, setAltiusRequierePassword] = useState(true);

  const recargar = useCallback(async () => {
    const r = await llamar('/api/datos', 'GET');
    if (r.ok && r.datos) {
      const d = r.datos as Datos;
      setDatos({ ...d, config: { ...CONFIG_INICIAL, ...d.config } });
      setErrorCarga('');
    } else if (r.status === 401) {
      setRol(null); // la sesión venció
    } else {
      setErrorCarga(r.error || 'No se pudieron cargar los datos');
    }
  }, []);

  // 1) ¿Quién ingresó?
  const revisarSesion = useCallback(async () => {
    try {
      const j = await fetch('/api/session', { cache: 'no-store' }).then((r) => r.json());
      setAltiusRequierePassword(j?.altiusRequierePassword !== false);
      setRol(j?.rol === 'admin' || j?.rol === 'cliente' ? j.rol : null);
    } catch {
      setRol(null);
    } finally {
      setSesionRevisada(true);
    }
  }, []);

  useEffect(() => {
    revisarSesion();
  }, [revisarSesion]);

  // 2) Con sesión, cargar los datos
  useEffect(() => {
    if (!rol) {
      setCargado(false);
      return;
    }
    setCargado(false);
    recargar().finally(() => setCargado(true));
  }, [rol, recargar]);

  const ingresar = useCallback(async (usuario: UsuarioIngreso, password: string) => {
    const r = await llamar('/api/login', 'POST', { usuario, password });
    if (r.ok) {
      setRol(r.rol === 'admin' ? 'admin' : 'cliente');
      return { ok: true };
    }
    return { ok: false, error: r.error || 'No se pudo ingresar' };
  }, []);

  const salir = useCallback(async () => {
    await llamar('/api/logout', 'POST');
    setDatos(VACIO);
    setRol(null);
  }, []);

  /** Resultado de una operación de guardado. Si la sesión de administrador venció, vuelve a revisar la sesión. */
  const resultado = useCallback(
    (r: { ok: boolean; error?: string; status?: number }) => {
      if (r.ok) return true;
      alert('No se pudo guardar: ' + (r.error || 'error desconocido'));
      if (r.status === 401) revisarSesion();
      return false;
    },
    [revisarSesion],
  );

  const value = useMemo<Ctx>(() => {
    const upsert = <T extends { id: string }>(lista: T[], item: T) =>
      lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];

    return {
      datos,
      cargado,
      rol: rol ?? 'cliente',
      modoEdicion: rol === 'admin',
      salir,
      recargar,
      guardarActividad: async (a) => {
        const r = await llamar('/api/actividades', 'POST', a);
        if (!resultado(r)) return false;
        const guardada = r.actividad as Actividad;
        setDatos((d) => ({ ...d, actividades: upsert(d.actividades, guardada) }));
        return true;
      },
      eliminarActividad: async (id) => {
        const r = await llamar(`/api/actividades/${encodeURIComponent(id)}`, 'DELETE');
        if (!resultado(r)) return false;
        setDatos((d) => ({ ...d, actividades: d.actividades.filter((a) => a.id !== id) }));
        return true;
      },
      guardarFactura: async (f) => {
        const r = await llamar('/api/facturas', 'POST', f);
        if (!resultado(r)) return false;
        const guardada = r.factura as Factura;
        setDatos((d) => ({ ...d, facturas: upsert(d.facturas, guardada) }));
        return true;
      },
      eliminarFactura: async (id) => {
        const r = await llamar(`/api/facturas/${encodeURIComponent(id)}`, 'DELETE');
        if (!resultado(r)) return false;
        setDatos((d) => ({ ...d, facturas: d.facturas.filter((x) => x.id !== id) }));
        return true;
      },
      guardarConfig: async (c) => {
        const r = await llamar('/api/config', 'PUT', c);
        if (!resultado(r)) return false;
        setDatos((d) => ({ ...d, config: r.config as Configuracion }));
        return true;
      },
      nombreObra: (codigo) => datos.config.nombresObras[codigo] || codigo,
    };
  }, [datos, cargado, rol, salir, recargar, resultado]);

  // Aún revisando la sesión
  if (!sesionRevisada) return <div className="cargando">Cargando…</div>;

  // Sin sesión: pantalla de ingreso (Creadero / Altius)
  if (!rol) return <PantallaIngreso ingresar={ingresar} altiusRequierePassword={altiusRequierePassword} />;

  if (cargado && errorCarga) {
    return (
      <div className="error-carga">
        <h2>No se pudieron cargar los datos</h2>
        <p>{errorCarga}</p>
        <button type="button" className="btn btn-primario" onClick={() => location.reload()}>Reintentar</button>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDatos(): Ctx {
  const c = useContext(DataContext);
  if (!c) throw new Error('useDatos debe usarse dentro de DataProvider');
  return c;
}

export function nuevoId(prefijo: string): string {
  return prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
