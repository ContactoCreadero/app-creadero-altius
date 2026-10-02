'use client';

// Almacén de datos de la aplicación.
// TEMPORAL (versión local): los datos se guardan en el navegador (localStorage) y los archivos
// de facturas en IndexedDB. En la siguiente etapa se conectará a Neon (datos) y Cloudflare R2 (archivos).
// El rol de administrador SÍ se valida en el servidor (/api/login, /api/session).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Actividad, Configuracion, Datos, Factura, Rol } from '@/lib/types';
import { CONFIG_INICIAL, STORAGE_KEY } from '@/lib/constants';
import { ACTIVIDADES_INICIALES, FACTURAS_INICIALES } from '@/data/seed';
import { borrarTodosLosArchivos, eliminarArchivo } from '@/lib/archivos';

const normalizarFactura = (f: Factura): Factura => ({
  ...f,
  pagada: f.pagada ?? false,
  fechaPago: f.fechaPago ?? null,
  archivo: f.archivo ?? null,
});

const DATOS_INICIALES: Datos = {
  config: CONFIG_INICIAL,
  actividades: ACTIVIDADES_INICIALES,
  facturas: FACTURAS_INICIALES.map(normalizarFactura),
};

interface Ctx {
  datos: Datos;
  cargado: boolean;
  rol: Rol;
  /** true cuando el usuario ingresó como administrador */
  modoEdicion: boolean;
  ingresarAdmin: (password: string) => Promise<{ ok: boolean; error?: string }>;
  salirAdmin: () => Promise<void>;
  guardarActividad: (a: Actividad) => void;
  eliminarActividad: (id: string) => void;
  guardarFactura: (f: Factura) => void;
  eliminarFactura: (id: string) => void;
  guardarConfig: (c: Configuracion) => void;
  restaurarDatosExcel: () => void;
  nombreObra: (codigo: string) => string;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos>(DATOS_INICIALES);
  const [cargado, setCargado] = useState(false);
  const [rol, setRol] = useState<Rol>('cliente');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const g = JSON.parse(raw) as Datos;
        if (g && Array.isArray(g.actividades) && Array.isArray(g.facturas) && g.config) {
          setDatos({ ...g, config: { ...CONFIG_INICIAL, ...g.config }, facturas: g.facturas.map(normalizarFactura) });
        }
      }
    } catch {
      /* si falla, se usan los datos del Excel */
    }
    // Rol validado por el servidor (cookie de sesión)
    fetch('/api/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setRol(j?.rol === 'admin' ? 'admin' : 'cliente'))
      .catch(() => setRol('cliente'))
      .finally(() => setCargado(true));
  }, []);

  const persistir = useCallback((nuevo: Datos) => {
    setDatos(nuevo);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
    } catch {
      alert('No se pudo guardar en este navegador (espacio lleno).');
    }
  }, []);

  const ingresarAdmin = useCallback(async (password: string) => {
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        setRol('admin');
        return { ok: true };
      }
      return { ok: false, error: j?.error || 'No se pudo ingresar' };
    } catch {
      return { ok: false, error: 'No se pudo conectar con el servidor' };
    }
  }, []);

  const salirAdmin = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    setRol('cliente');
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
      guardarActividad: (a) => persistir({ ...datos, actividades: upsert(datos.actividades, a) }),
      eliminarActividad: (id) => persistir({ ...datos, actividades: datos.actividades.filter((a) => a.id !== id) }),
      guardarFactura: (f) => {
        const anterior = datos.facturas.find((x) => x.id === f.id);
        if (anterior?.archivo && anterior.archivo.id !== f.archivo?.id) eliminarArchivo(anterior.archivo.id);
        persistir({ ...datos, facturas: upsert(datos.facturas, normalizarFactura(f)) });
      },
      eliminarFactura: (id) => {
        const f = datos.facturas.find((x) => x.id === id);
        if (f?.archivo) eliminarArchivo(f.archivo.id);
        persistir({ ...datos, facturas: datos.facturas.filter((x) => x.id !== id) });
      },
      guardarConfig: (c) => persistir({ ...datos, config: c }),
      restaurarDatosExcel: () => {
        borrarTodosLosArchivos();
        persistir(DATOS_INICIALES);
      },
      nombreObra: (codigo) => datos.config.nombresObras[codigo] || codigo,
    };
  }, [datos, cargado, rol, persistir, ingresarAdmin, salirAdmin]);

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
