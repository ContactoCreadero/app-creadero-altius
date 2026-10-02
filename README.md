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

## Base de datos (Neon)

`.env.local` debe tener `ADMIN_PASSWORD`, `ALTIUS_PASSWORD`, `DATABASE_URL` y las variables `R2_*` (ver `.env.example`).

Para una base de datos **nueva y vacía** (una sola vez):

```powershell
npm.cmd run db:init
```

Crea las tablas y carga los datos del Excel (`scripts/datos-excel.json`).
Si la base ya tiene datos, no modifica nada.

## Pantallas

| Sección        | Contenido                                                                 |
|----------------|---------------------------------------------------------------------------|
| Resumen        | Avance general, KPIs, avance por iniciativa y por obra, pendientes         |
| Iniciativas    | Tablas por iniciativa (como la hoja E°Avance), filtros por obra y estado   |
| Obras          | Tarjeta por obra y detalle: actividades + facturas + balance (hojas Fac)   |
| Facturación    | Ejecutado vs facturado, balance por obra, listado de facturas             |
| Administración | Parámetros (valor AI, fecha de corte), nombres de obras, restaurar datos   |

## Usuarios

La página de inicio muestra dos perfiles. Sin ingresar no se ve ningún dato (la API también lo exige).

- **Creadero (Administrador):** contraseña `ADMIN_PASSWORD`. Agrega, edita (✏️), duplica (⧉) y
  elimina (🗑️) actividades y facturas, sube documentos y marca pagos. Sesión de 12 horas.
- **ALTIUS (Visualización):** contraseña `ALTIUS_PASSWORD` (opcional; si no se define, entra sin
  contraseña). Solo lectura. Sesión de 30 días.

Las contraseñas se validan en el servidor (`/api/login`) y la sesión queda en una cookie segura.

## Fórmulas replicadas del Excel

- AI utilizadas = AI programadas × % avance  (columna J = H × I)
- Total programado = Σ AI programadas (S93) · Total ejecutado = Σ AI utilizadas (U93)
- Monto = AI × $160.000 (configurable en Administración)
- Saldo por facturar = AI ejecutadas − AI facturadas (T122 / T123)
- Balance por obra = ejecutado en la obra − facturado con sus códigos SENCE (hojas Fac)

## Estado de esta versión

- Datos en Neon (tablas `configuracion`, `actividades`, `facturas`), vía rutas `/api/*`.
- Toda modificación exige sesión de administrador, validada en el servidor.
- Documentos de facturas en Cloudflare R2 (bucket privado). El navegador del administrador los
  sube directo a R2 con un enlace firmado (`/api/archivos`); para verlos, `/api/archivos/[id]`
  redirige a un enlace firmado de 5 minutos. La miniatura se guarda en la base de datos.
- El bucket R2 necesita una regla CORS que permita `PUT` y `GET` desde el dominio de la app.
- El logo de Creadero se carga desde www.creadero.cl (requiere internet).
