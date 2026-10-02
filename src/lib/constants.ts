import type { Configuracion, Iniciativa, IniciativaId } from '@/lib/types';

export const INICIATIVAS: Iniciativa[] = [
  {
    id: 'verano',
    nombre: 'Actitud Preventiva / Trayecto',
    alias: 'Iniciativa Verano',
    descripcion: 'Campaña de verano: charlas, lienzos y stickers sobre actitud preventiva y accidentes de trayecto.',
  },
  {
    id: 'nocel',
    nombre: 'No Cel / Música',
    alias: 'Iniciativa no Cel / no música',
    descripcion: 'Campaña sobre el uso de celular y audífonos en obra.',
  },
  {
    id: 'habitos',
    nombre: 'Hábitos Saludables',
    alias: 'Hábitos Saludables',
    descripcion: 'Campaña de autocuidado y hábitos de vida saludable.',
  },
  {
    id: 'alcohol',
    nombre: 'Prevención Alcohol y Drogas',
    alias: 'Prev Alcohol y Drogas',
    descripcion: 'Campaña de prevención del consumo de alcohol y drogas.',
  },
  {
    id: 'mantencion',
    nombre: 'Mantención Obras Grandes',
    alias: 'Mantención Obras Grandes',
    descripcion: 'Charla mensual de mantención en obras de mayor tamaño.',
  },
  {
    id: 'otras',
    nombre: 'Otras actividades',
    alias: 'Otras actividades',
    descripcion: 'Cursos y actividades corporativas fuera de las campañas por obra.',
  },
];

export const INICIATIVA_POR_ID: Record<IniciativaId, Iniciativa> = Object.fromEntries(
  INICIATIVAS.map((i) => [i.id, i]),
) as Record<IniciativaId, Iniciativa>;

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const CONFIG_INICIAL: Configuracion = {
  cliente: 'ALTIUS Constructora',
  programa: 'Programa de Capacitación 2026 · Red ALTIUS',
  anio: 2026,
  valorAI: 160000,
  fechaCorte: '2026-09-30',
  // Nombres completos de obra: el Excel solo trae códigos. Se pueden completar en Administración.
  nombresObras: {},
};

// Logo Creadero: se usa el logo publicado en www.creadero.cl.
// (Si prefieres una copia local, guárdala como public/logo-creadero.png y cambia esta línea a '/logo-creadero.png'.)
export const LOGO_CREADERO =
  'https://static.wixstatic.com/media/129ed2_c724759518b34c6cb625dd7b836e061f~mv2.png/v1/fit/w_760,h_170,al_c,q_95/logo-creadero.png';

export const STORAGE_KEY = 'creadero-altius-datos-v1';
