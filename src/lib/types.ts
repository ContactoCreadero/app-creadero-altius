// Tipos de datos de la aplicación.
// Reflejan la estructura del Excel "Estado de Avance Programa de Capacitación 2026 - Red ALTIUS".

export type IniciativaId = 'verano' | 'nocel' | 'habitos' | 'alcohol' | 'mantencion' | 'otras';

export interface Iniciativa {
  id: IniciativaId;
  nombre: string; // nombre en la hoja E°Avance
  alias: string; // nombre usado en las hojas "Fac"
  descripcion: string;
}

/** Una fila de la hoja E°Avance (una iniciativa realizada en una obra). */
export interface Actividad {
  id: string;
  iniciativaId: IniciativaId;
  periodo: string | null; // mes (solo "Mantención Obras Grandes")
  obra: string; // código de obra: FUR, BECA, OLI, ...
  fechaInicio: string | null; // ISO yyyy-mm-dd; null = fecha por definir ("xx-xx-2026")
  fechaTermino: string | null; // ISO; null = sin fecha (en el Excel aparecía "Ok" o vacío)
  detalleProgramado: string;
  detalleEjecutado: string;
  aiProgramado: number; // columna "Total #AI"
  avance: number; // 0 a 1 (columna "Porcentaje de avance")
  charlasProgramadas: number;
  charlasRealizadas: number;
  personas: number | null; // personas capacitadas (no existe en el Excel; se registra en la app)
  observacion: string;
  filaExcel?: number;
}

/** Una fila de la tabla de facturación (parte inferior de E°Avance + hojas Fac). */
export interface Factura {
  id: string;
  fecha: string | null; // ISO
  codigo: string; // OLI4, BECA1, BSF, ...
  obra: string; // código base de obra (sin número)
  codigoSence: string;
  ai: number; // participantes facturados (#AI)
  numeroFactura: string;
  observacion: string; // "Fondos 2025" / "Fondos 2026"
  pagada?: boolean; // estado de pago (por defecto: no pagada)
  fechaPago?: string | null; // ISO
  archivo?: ArchivoMeta | null; // documento de la factura (imagen o PDF)
}

/**
 * Datos del archivo subido. El archivo original se guarda aparte
 * en Cloudflare R2 (bucket privado); aquí solo se guardan sus datos y la miniatura.
 */
export interface ArchivoMeta {
  id: string;
  nombre: string;
  tipo: string; // MIME: image/jpeg, application/pdf, ...
  tamano: number; // bytes
  fechaSubida: string; // ISO
  miniatura: string; // imagen pequeña (data URL JPEG) para la vista previa
}

/** cliente = ALTIUS (visualización) · admin = Creadero (administrador) */
export type Rol = 'cliente' | 'admin';

export interface Configuracion {
  cliente: string;
  programa: string;
  anio: number;
  valorAI: number; // $ por AI (Excel: 160.000)
  fechaCorte: string; // ISO, "Nivel de avance al ..."
  nombresObras: Record<string, string>; // código → nombre completo (editable)
}

export interface Datos {
  config: Configuracion;
  actividades: Actividad[];
  facturas: Factura[];
}

export type EstadoActividad = 'realizada' | 'parcial' | 'pendiente';
