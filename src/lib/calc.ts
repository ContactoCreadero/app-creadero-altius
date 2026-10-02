// Lógica de cálculo. Replica las fórmulas del Excel:
//   E°Avance  J = H × I          (AI utilizadas = AI programadas × % avance)
//   E°Avance  S93 = H92 + P92    (Total AI programadas, campañas + otras actividades)
//   E°Avance  U93 = J92 + R92    (Total AI ejecutadas al corte)
//   E°Avance  S94 / U94 = AI × 160.000 (montos en $)
//   Facturación I = #AI × 160.000 ; H122 / I122 = totales facturados
//   T122 = U93 − H122 ; T123 = U94 − I122  (saldo por facturar)
//   Hojas "Fac XXX": saldo por obra = facturado − utilizado
// En la app, el saldo por obra se calcula automáticamente con TODAS las actividades
// registradas para esa obra (en el Excel cada hoja Fac se armaba a mano).

import type { Actividad, Datos, EstadoActividad, Factura, IniciativaId } from '@/lib/types';
import { INICIATIVAS, MESES } from '@/lib/constants';

export function aiUtilizado(a: Actividad): number {
  return a.aiProgramado * a.avance;
}

export function estadoActividad(a: Actividad): EstadoActividad {
  if (a.avance >= 1) return 'realizada';
  if (a.avance > 0) return 'parcial';
  return 'pendiente';
}

export const ETIQUETA_ESTADO: Record<EstadoActividad, string> = {
  realizada: 'Realizada',
  parcial: 'En curso',
  pendiente: 'Pendiente',
};

/** Código base de obra a partir del código de factura: "OLI4" → "OLI", "BECA" → "BECA". */
export function obraBase(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\d+$/, '');
}

export interface Resumen {
  programadoAI: number;
  utilizadoAI: number;
  montoProgramado: number;
  montoUtilizado: number;
  avance: number; // ponderado por AI
  facturadoAI: number;
  facturadoMonto: number;
  saldoAI: number; // ejecutado − facturado (Excel T122)
  saldoMonto: number; // Excel T123
  porEjecutarAI: number; // programado − ejecutado
  actividades: number;
  realizadas: number;
  parciales: number;
  pendientes: number;
  charlasProgramadas: number;
  charlasRealizadas: number;
  personas: number;
  actividadesConPersonas: number;
  obras: number;
}

export function calcularResumen(d: Datos): Resumen {
  const v = d.config.valorAI;
  let programadoAI = 0, utilizadoAI = 0, realizadas = 0, parciales = 0, pendientes = 0;
  let charlasProgramadas = 0, charlasRealizadas = 0, personas = 0, actividadesConPersonas = 0;
  const obras = new Set<string>();
  for (const a of d.actividades) {
    programadoAI += a.aiProgramado;
    utilizadoAI += aiUtilizado(a);
    const e = estadoActividad(a);
    if (e === 'realizada') realizadas++;
    else if (e === 'parcial') parciales++;
    else pendientes++;
    charlasProgramadas += a.charlasProgramadas;
    charlasRealizadas += a.charlasRealizadas;
    if (a.personas != null) {
      personas += a.personas;
      actividadesConPersonas++;
    }
    if (a.iniciativaId !== 'otras') obras.add(a.obra);
  }
  const facturadoAI = d.facturas.reduce((s, f) => s + f.ai, 0);
  return {
    programadoAI,
    utilizadoAI: redondear(utilizadoAI),
    montoProgramado: programadoAI * v,
    montoUtilizado: redondear(utilizadoAI) * v,
    avance: programadoAI ? utilizadoAI / programadoAI : 0,
    facturadoAI,
    facturadoMonto: facturadoAI * v,
    saldoAI: redondear(utilizadoAI - facturadoAI),
    saldoMonto: redondear(utilizadoAI - facturadoAI) * v,
    porEjecutarAI: redondear(programadoAI - utilizadoAI),
    actividades: d.actividades.length,
    realizadas,
    parciales,
    pendientes,
    charlasProgramadas,
    charlasRealizadas,
    personas,
    actividadesConPersonas,
    obras: obras.size,
  };
}

export interface FilaIniciativa {
  id: IniciativaId;
  nombre: string;
  actividades: number;
  realizadas: number;
  programadoAI: number;
  utilizadoAI: number;
  avance: number;
}

export function porIniciativa(d: Datos): FilaIniciativa[] {
  return INICIATIVAS.map((ini) => {
    const acts = d.actividades.filter((a) => a.iniciativaId === ini.id);
    const programadoAI = acts.reduce((s, a) => s + a.aiProgramado, 0);
    const utilizadoAI = redondear(acts.reduce((s, a) => s + aiUtilizado(a), 0));
    return {
      id: ini.id,
      nombre: ini.nombre,
      actividades: acts.length,
      realizadas: acts.filter((a) => estadoActividad(a) === 'realizada').length,
      programadoAI,
      utilizadoAI,
      avance: programadoAI ? utilizadoAI / programadoAI : 0,
    };
  }).filter((f) => f.actividades > 0);
}

export interface FilaObra {
  obra: string;
  actividades: Actividad[];
  facturas: Factura[];
  programadoAI: number;
  utilizadoAI: number;
  facturadoAI: number;
  diferenciaAI: number; // utilizado − facturado: >0 por facturar, <0 saldo disponible
  avance: number;
  iniciativas: number;
}

export function porObra(d: Datos): FilaObra[] {
  const mapa = new Map<string, FilaObra>();
  const fila = (obra: string): FilaObra => {
    let f = mapa.get(obra);
    if (!f) {
      f = { obra, actividades: [], facturas: [], programadoAI: 0, utilizadoAI: 0, facturadoAI: 0, diferenciaAI: 0, avance: 0, iniciativas: 0 };
      mapa.set(obra, f);
    }
    return f;
  };
  for (const a of d.actividades) {
    const f = fila(a.obra);
    f.actividades.push(a);
    f.programadoAI += a.aiProgramado;
    f.utilizadoAI += aiUtilizado(a);
  }
  for (const fac of d.facturas) {
    const f = fila(obraBase(fac.obra || fac.codigo));
    f.facturas.push(fac);
    f.facturadoAI += fac.ai;
  }
  for (const f of mapa.values()) {
    f.utilizadoAI = redondear(f.utilizadoAI);
    f.diferenciaAI = redondear(f.utilizadoAI - f.facturadoAI);
    f.avance = f.programadoAI ? f.utilizadoAI / f.programadoAI : 0;
    f.iniciativas = new Set(f.actividades.map((a) => a.iniciativaId)).size;
  }
  return [...mapa.values()].sort((a, b) => b.programadoAI - a.programadoAI || a.obra.localeCompare(b.obra));
}

export interface FilaMes {
  clave: string;
  etiqueta: string;
  utilizadoAI: number;
  programadoAI: number;
  actividades: number;
}

/** Actividades agrupadas por mes de inicio. Las sin fecha van al final como "Por definir". */
export function porMes(d: Datos): FilaMes[] {
  const mapa = new Map<string, FilaMes>();
  for (const a of d.actividades) {
    const clave = a.fechaInicio ? a.fechaInicio.slice(0, 7) : 'zz';
    let f = mapa.get(clave);
    if (!f) {
      const etiqueta = a.fechaInicio ? MESES[Number(a.fechaInicio.slice(5, 7)) - 1].slice(0, 3) : 'S/F';
      f = { clave, etiqueta, utilizadoAI: 0, programadoAI: 0, actividades: 0 };
      mapa.set(clave, f);
    }
    f.utilizadoAI += aiUtilizado(a);
    f.programadoAI += a.aiProgramado;
    f.actividades++;
  }
  return [...mapa.values()]
    .map((f) => ({ ...f, utilizadoAI: redondear(f.utilizadoAI) }))
    .sort((a, b) => a.clave.localeCompare(b.clave));
}

export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Suma de diferencias positivas (por facturar) y negativas (saldo disponible) por obra. */
export function desgloseSaldo(obras: FilaObra[]) {
  let porFacturar = 0, disponible = 0;
  for (const o of obras) {
    if (o.diferenciaAI > 0) porFacturar += o.diferenciaAI;
    else disponible += -o.diferenciaAI;
  }
  return { porFacturar: redondear(porFacturar), disponible: redondear(disponible) };
}
