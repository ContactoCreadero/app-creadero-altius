# App Creadero · Estado de Avance ALTIUS

Aplicación para mostrar a ALTIUS Constructora el estado de avance del
**Programa de Capacitación 2026 · Red ALTIUS**: charlas, iniciativas, obras,
AI utilizadas, montos, facturación y saldo por facturar.

Datos iniciales tomados del Excel `EstadoAvanceProgCap2026Red_Altius_2.xlsx`.

## Ejecutar en tu computador (PowerShell)

Desde la carpeta del proyecto (`app-creadero-altius`):

```powershell
npm.cmd install
npm.cmd run dev
```

Luego abre: http://localhost:3000

## Pantallas

| Sección        | Contenido                                                                 |
|----------------|---------------------------------------------------------------------------|
| Resumen        | Avance general, KPIs, avance por iniciativa y por obra, pendientes         |
| Iniciativas    | Tablas por iniciativa (como la hoja E°Avance), filtros por obra y estado   |
| Obras          | Tarjeta por obra y detalle: actividades + facturas + balance (hojas Fac)   |
| Facturación    | Ejecutado vs facturado, balance por obra, listado de facturas             |
| Administración | Parámetros (valor AI, fecha de corte), nombres de obras, restaurar datos   |

## Roles

- **Cliente (visualizador):** vista por defecto, solo lectura.
- **Administrador:** botón "🔐 Ingresar como administrador". La contraseña se define en
  `.env.local` (variable `ADMIN_PASSWORD`) y se valida en el servidor (`/api/login`).
  Permite agregar, editar (✏️), duplicar (⧉) y eliminar (🗑️) actividades y facturas,
  subir el documento de cada factura (imagen o PDF) y marcarla como pagada / no pagada.

## Fórmulas replicadas del Excel

- AI utilizadas = AI programadas × % avance  (columna J = H × I)
- Total programado = Σ AI programadas (S93) · Total ejecutado = Σ AI utilizadas (U93)
- Monto = AI × $160.000 (configurable en Administración)
- Saldo por facturar = AI ejecutadas − AI facturadas (T122 / T123)
- Balance por obra = ejecutado en la obra − facturado con sus códigos SENCE (hojas Fac)

## Estado de esta versión (local)

- Los datos se guardan **temporalmente en el navegador** (localStorage).
  Se reemplazará por Neon (base de datos) en una próxima iteración.
- Los documentos de facturas se guardan en el navegador (IndexedDB). Luego: Cloudflare R2.
- El ingreso de administrador ya se valida en el servidor; al conectar Neon, también
  se validarán en el servidor cada guardado y eliminación.
- El logo de Creadero se carga desde www.creadero.cl (requiere internet).
