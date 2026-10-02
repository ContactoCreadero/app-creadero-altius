import type { Metadata } from 'next';
import './globals.css';
import { DataProvider } from '@/components/DataProvider';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Estado de Avance · Programa de Capacitación ALTIUS | Creadero',
  description: 'Seguimiento de charlas, capacitaciones, AI utilizadas y facturación del programa 2026 de ALTIUS Constructora.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  );
}
