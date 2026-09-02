/**
 * Utilidades de formato para La Finca Eco Hotel.
 *
 * Reglas del proyecto:
 * - Los precios son enteros en pesos colombianos (COP), nunca decimales.
 * - Las noches de estadía son fechas planas `AAAA-MM-DD` (tipo `date` en
 *   Postgres) y se interpretan en la zona horaria de Colombia.
 */

export const ZONA_HORARIA = "America/Bogota";

/** Fecha plana tal como la guarda Postgres: `AAAA-MM-DD`. */
export type FechaISO = string;

// ---------------------------------------------------------------------------
// Dinero
// ---------------------------------------------------------------------------

const formateadorCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formatea un entero COP: `450000` → `"$ 450.000"`. */
export function formatearCOP(valor: number): string {
  return formateadorCOP.format(Math.round(valor));
}

const formateadorNumero = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

/** Formatea un número sin símbolo de moneda: `450000` → `"450.000"`. */
export function formatearNumero(valor: number): string {
  return formateadorNumero.format(Math.round(valor));
}

/** Convierte pesos enteros a centavos (formato que exige Wompi). */
export function aCentavos(pesos: number): number {
  return Math.round(pesos) * 100;
}

// ---------------------------------------------------------------------------
// Fechas (zona America/Bogota)
// ---------------------------------------------------------------------------

const formateadorFechaISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Colombia, como `AAAA-MM-DD`. */
export function hoyEnBogota(): FechaISO {
  return formateadorFechaISO.format(new Date());
}

/**
 * Convierte una fecha plana `AAAA-MM-DD` a `Date` anclada al mediodía UTC.
 * El mediodía evita que un cambio de zona horaria corra el día.
 */
export function aFecha(fecha: FechaISO | Date): Date {
  if (fecha instanceof Date) return fecha;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
}

/** Convierte un `Date` a fecha plana `AAAA-MM-DD` en hora de Colombia. */
export function aFechaISO(fecha: Date): FechaISO {
  return formateadorFechaISO.format(fecha);
}

/** Suma (o resta, con números negativos) días a una fecha plana. */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const d = aFecha(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Noches entre dos fechas, con el rango `[entrada, salida)` propio de hotelería:
 * del 10 al 12 son 2 noches.
 */
export function contarNoches(entrada: FechaISO, salida: FechaISO): number {
  const ms = aFecha(salida).getTime() - aFecha(entrada).getTime();
  return Math.round(ms / 86_400_000);
}

const formateadorFechaLarga = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formateadorFechaCorta = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** `"2026-03-12"` → `"12 de marzo de 2026"`. */
export function formatearFecha(fecha: FechaISO | Date): string {
  return formateadorFechaLarga.format(aFecha(fecha));
}

/** `"2026-03-12"` → `"12 mar 2026"`. */
export function formatearFechaCorta(fecha: FechaISO | Date): string {
  return formateadorFechaCorta.format(aFecha(fecha));
}

/** `"12 de marzo — 14 de marzo de 2026 · 2 noches"`. */
export function formatearEstadia(entrada: FechaISO, salida: FechaISO): string {
  const noches = contarNoches(entrada, salida);
  const etiqueta = noches === 1 ? "1 noche" : `${noches} noches`;
  return `${formatearFechaCorta(entrada)} — ${formatearFechaCorta(salida)} · ${etiqueta}`;
}

/**
 * Día de la semana según ISO: 1 = lunes … 7 = domingo.
 * Coincide con el arreglo `dias_semana` de la tabla `tarifas`.
 */
export function diaSemanaISO(fecha: FechaISO | Date): number {
  const dia = aFecha(fecha).getUTCDay();
  return dia === 0 ? 7 : dia;
}

/** Lista las noches de una estadía `[entrada, salida)`. */
export function nochesDeEstadia(
  entrada: FechaISO,
  salida: FechaISO,
): FechaISO[] {
  const noches: FechaISO[] = [];
  let actual = entrada;
  while (actual < salida) {
    noches.push(actual);
    actual = sumarDias(actual, 1);
  }
  return noches;
}

/** Arma el literal `daterange` de Postgres: `[entrada,salida)`. */
export function aRangoFechas(entrada: FechaISO, salida: FechaISO): string {
  return `[${entrada},${salida})`;
}
