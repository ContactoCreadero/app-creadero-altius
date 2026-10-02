'use client';

// Almacén de datos de la aplicación.
// Los datos se leen y guardan en la base de datos Neon a través de las rutas /api/*.
// Las rutas que modifican datos exigen sesión de administrador (validado en el servidor).
// Los documentos de facturas aún se guardan en este navegador (IndexedDB) hasta conectar Cloudflare R2.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Actividad, Configuracion, Datos, Factura, Rol } from '@/lib/types';
import { CONFIG_INICIAL } from '@/lib/constants';
import { eliminarArchivo } from '@/lib/archivos';

interface Ctx {
  datos: Datos;
  cargado: boolean;
  rol: Rol;
  /** true cuando el usuario ingresó como administrador */
  modoEdicion: boolean;
  ingresarAdmin: (password: string) => Promise<{ ok: boolean; error?: string }>;
  salirAdmin: () => Promise<void>;
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

async function llamar(url: string, method: string, body?: unknown): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  try {
    const r = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) return { ok: false, error: j?.error || `Error ${r.status}` };
    return j;
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor' };
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [cargado, setCargado] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [rol, setRol] = useState<Rol>('cliente');

  const recargar = useCallback(async () => {
    const r = await llamar('/api/datos', 'GET');
    if (r.ok && r.datos) {
      const d = r.datos as Datos;
      setDatos({ ...d, config: { ...CONFIG_INICIAL, ...d.config } });
      setErrorCarga('');
    } else {
      setErrorCarga(r.error || 'No se pudieron cargar los datos');
    }
  }, []);

  useEffect(() => {
    Promise.all([
      recargar(),
      fetch('/api/session', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => setRol(j?.rol === 'admin' ? 'admin' : 'cliente'))
        .catch(() => setRol('cliente')),
    ]).finally(() => setCargado(true));
  }, [recargar]);

  const ingresarAdmin = useCallback(async (password: string) => {
    const r = await llamar('/api/login', 'POST', { password });
    if (r.ok) {
      setRol('admin');
      return { ok: true };
    }
    return { ok: false, error: r.error || 'No se pudo ingresar' };
  }, []);

  const salirAdmin = useCallback(async () => {
    await llamar('/api/logout', 'POST');
    setRol('cliente');
  }, []);

  /** Si el servidor rechaza por sesión vencida, vuelve a vista cliente y avisa. */
  const resultado = useCallback((r: { ok: boolean; error?: string }) => {
    if (r.ok) return true;
    if (/administrador/i.test(r.error || '')) setRol('cliente');
    alert('No se pudo guardar: ' + (r.error || 'error desconocido'));
    return false;
  }, []);

  const value = useMemo<Ctx>(() => {
    const upsert = <T extends { id: string }>(lista: T[], item: T) =>
      lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];

    return {
      datos,
      cargado,
      rol,
      modoEdicion: rol === 'admin',
      ingresarAdmin,
      salirAdmin,
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
        const anterior = datos.facturas.find((x) => x.id === f.id);
        const r = await llamar('/api/facturas', 'POST', f);
        if (!resultado(r)) return false;
        if (anterior?.archivo && anterior.archivo.id !== f.archivo?.id) eliminarArchivo(anterior.archivo.id);
        const guardada = r.factura as Factura;
        setDatos((d) => ({ ...d, facturas: upsert(d.facturas, guardada) }));
        return true;
      },
      eliminarFactura: async (id) => {
        const f = datos.facturas.find((x) => x.id === id);
        const r = await llamar(`/api/facturas/${encodeURIComponent(id)}`, 'DELETE');
        if (!resultado(r)) return false;
        if (f?.archivo) eliminarArchivo(f.archivo.id);
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
  }, [datos, cargado, rol, ingresarAdmin, salirAdmin, recargar, resultado]);

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
