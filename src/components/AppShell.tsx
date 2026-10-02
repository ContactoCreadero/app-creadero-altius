'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDatos } from '@/components/DataProvider';
import { LogoAltius, LogoCreadero } from '@/components/Logos';
import { fechaLarga } from '@/lib/format';

const NAV = [
  { href: '/', label: 'Resumen' },
  { href: '/iniciativas', label: 'Iniciativas' },
  { href: '/obras', label: 'Obras' },
  { href: '/facturacion', label: 'Facturación' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { datos, modoEdicion, salir } = useDatos();
  const items = modoEdicion ? [...NAV, { href: '/admin', label: 'Administración' }] : NAV;

  const activo = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="shell">
      <header className="cabecera">
        <div className="cabecera-inner">
          <div className="cabecera-logo">
            <LogoCreadero height={38} />
          </div>
          <div className="cabecera-titulo">
            <span className="eyebrow">Estado de avance</span>
            <h1>{datos.config.programa}</h1>
            <span className="corte">Información al {fechaLarga(datos.config.fechaCorte)}</span>
          </div>
          <div className="cabecera-cliente">
            <span className="eyebrow">Cliente</span>
            <LogoAltius height={44} />
          </div>
        </div>
      </header>

      <nav className="nav no-print" aria-label="Secciones">
        <div className="nav-inner">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={'nav-link' + (activo(it.href) ? ' activo' : '')}>
              {it.label}
            </Link>
          ))}
          <span className="nav-spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            🖨️ Imprimir / PDF
          </button>
          <span className={modoEdicion ? 'badge-admin' : 'badge-cliente'}>
            {modoEdicion ? '👤 Creadero · Administrador' : '👤 ALTIUS · Visualización'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => salir()} title="Cerrar sesión y volver a la pantalla de ingreso">
            Salir
          </button>
        </div>
      </nav>

      {modoEdicion && (
        <div className="banner-edicion no-print">
          <strong>Modo administrador.</strong> Puedes agregar, editar, duplicar y eliminar información y subir facturas.
          Los cambios quedan visibles de inmediato para ALTIUS.
        </div>
      )}

      <main className="contenido">{children}</main>

      <footer className="pie">
        <div className="pie-inner">
          <span>
            Elaborado por <strong>Creadero Consultoría y Capacitación</strong> · OTEC con franquicia SENCE
          </span>
          <span>{modoEdicion ? 'Vista administrador' : 'Vista cliente (solo lectura)'}</span>
        </div>
      </footer>
    </div>
  );
}
