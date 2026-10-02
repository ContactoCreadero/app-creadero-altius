// Formatos chilenos para números, montos, porcentajes y fechas.

const nf0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

export function clp(n: number): string {
  const r = Math.round(n);
  return (r < 0 ? '-$' : '$') + nf0.format(Math.abs(r));
}

/** Monto abreviado: $41,4 M */
export function clpCorto(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n < 0 ? '-$' : '$') + nf1.format(Math.abs(n) / 1_000_000) + ' M';
  return clp(n);
}

export function num(n: number): string {
  return nf1.format(Math.round(n * 10) / 10);
}

export function pct(x: number, decimales = 0): string {
  if (!isFinite(x)) return '—';
  return (x * 100).toLocaleString('es-CL', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }) + '%';
}

export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return 'Por definir';
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]}`;
}

export function fechaLarga(iso: string): string {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const [y, m, d] = iso.split('-');
  return `${Number(d)} de ${meses[Number(m) - 1]} de ${y}`;
}
