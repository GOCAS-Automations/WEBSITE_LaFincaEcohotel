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

/**
 * Fecha de hoy en Colombia, como `AAAA-MM-DD`.
 *
 * Es el «hoy» del HOTEL, el único que vale para decidir fechas de estadía. A
 * las 11 de la noche de Bogotá en Madrid ya es el día siguiente, así que el
 * reloj del navegador correría un día y dejaría reservar una noche que para el
 * hotel ya pasó. Colombia no tiene horario de verano, pero se resuelve con
 * `Intl` y la zona por nombre en vez de restar cinco horas a mano: así no hay
 * nada que corregir si algún día eso cambia.
 *
 * `ahora` se puede pasar para probar el cambio de día sin tocar el reloj del
 * sistema; en producción nadie lo pasa.
 */
export function hoyEnBogota(ahora: Date = new Date()): FechaISO {
  return formateadorFechaISO.format(ahora);
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

/* ---------------------------------------------------------------------------
 * Fechas PARA PERSONAS: siempre `dd/mm/aaaa` (regla de Cesar, 2026-10-05)
 *
 * Toda fecha que lee alguien —el sitio, el panel, los correos, el WhatsApp,
 * la descripción de los eventos de Google, los mensajes de error— pasa por
 * {@link formatearFecha} (`05/10/2026`) o {@link formatearFechaConDia}
 * (`lun 05/10/2026`). Nunca el formato de EE. UU. ni el del navegador.
 *
 * Solo llevan nombre de mes las cabeceras de calendario («octubre 2026») y el
 * selector de mes. Lo que es para máquinas (base de datos, URL, JSON-LD,
 * sitemap, `datetime` de `<time>`) sigue en ISO `AAAA-MM-DD`.
 *
 * SIN DESFASE DE UN DÍA: una fecha plana `AAAA-MM-DD` se corta como texto, sin
 * pasar por `Date`, así que da igual la zona del servidor o del navegador (en
 * Colombia, `new Date("2026-10-05")` es el 4 a las 7 de la noche). Un instante
 * (`Date` o marca con hora) se lleva al día de Bogotá con `aFechaISO()`.
 * ------------------------------------------------------------------------- */

const FECHA_PLANA = /^\d{4}-\d{2}-\d{2}$/;

/** Días de la semana abreviados, empezando en lunes (1 = lunes de `diaSemanaISO`). */
export const DIAS_SEMANA_CORTOS = [
  "lun",
  "mar",
  "mié",
  "jue",
  "vie",
  "sáb",
  "dom",
] as const;

/** La fecha plana `AAAA-MM-DD` de lo que llegue, o `null` si no se entiende. */
function fechaPlanaDe(fecha: FechaISO | Date): FechaISO | null {
  if (fecha instanceof Date) {
    return Number.isNaN(fecha.getTime()) ? null : aFechaISO(fecha);
  }
  if (FECHA_PLANA.test(fecha)) return fecha;
  /* Una marca con hora («2026-10-05T23:30:00-05:00»): su día en Bogotá. */
  const instante = new Date(fecha);
  return Number.isNaN(instante.getTime()) ? null : aFechaISO(instante);
}

/**
 * `"2026-10-05"` → `"05/10/2026"`. Con ceros, siempre.
 * Un texto que no es fecha se devuelve tal cual (mejor eso que «NaN/NaN»).
 */
export function formatearFecha(fecha: FechaISO | Date): string {
  const plana = fechaPlanaDe(fecha);
  if (!plana) return typeof fecha === "string" ? fecha : "";
  const [anio, mes, dia] = plana.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** `"2026-12-15"` → `"mar 15/12/2026"`. */
export function formatearFechaConDia(fecha: FechaISO | Date): string {
  const plana = fechaPlanaDe(fecha);
  if (!plana) return typeof fecha === "string" ? fecha : "";
  return `${DIAS_SEMANA_CORTOS[diaSemanaISO(plana) - 1]} ${formatearFecha(plana)}`;
}

/** `"13/10/2026 al 16/10/2026"`, para listados donde el día de la semana sobra. */
export function formatearRango(inicio: FechaISO, fin: FechaISO): string {
  return `${formatearFecha(inicio)} al ${formatearFecha(fin)}`;
}

/** `"mar 13/10/2026 al vie 16/10/2026"` (la salida es el día en que se va). */
export function formatearRangoConDias(inicio: FechaISO, fin: FechaISO): string {
  return `${formatearFechaConDia(inicio)} al ${formatearFechaConDia(fin)}`;
}

/** Hora y minutos de Bogotá, de 00 a 23 (el día lo pone `formatearFecha`). */
const formateadorHora = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONA_HORARIA,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Fecha y hora de un instante, SIEMPRE en hora de Colombia:
 * `"05/10/2026, 14:35"`. Nunca la del dispositivo: un dato que se lea
 * distinto según dónde esté quien mira no es un dato. `null` → `"—"`.
 */
export function formatearFechaHora(instante: string | Date | null | undefined): string {
  if (!instante) return "—";
  const momento = instante instanceof Date ? instante : new Date(instante);
  if (Number.isNaN(momento.getTime())) return String(instante);
  const partes = Object.fromEntries(
    formateadorHora.formatToParts(momento).map((parte) => [parte.type, parte.value]),
  );
  /* Algunos motores escriben la medianoche como «24»: es «00». */
  const hora = partes.hour === "24" ? "00" : partes.hour;
  return `${formatearFecha(momento)}, ${hora}:${partes.minute}`;
}

/**
 * Lo que escribe una persona, `dd/mm/aaaa`, a fecha plana `AAAA-MM-DD`.
 * Acepta `5/10/2026`, `05-10-2026`, `05.10.2026` y `05102026`; rechaza el 31/02 y
 * compañía, y los años de dos cifras (no se adivina el siglo). `null` si no
 * es una fecha.
 */
export function leerFechaNumerica(texto: string): FechaISO | null {
  const coincidencia =
    /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/.exec(texto) ??
    /^\s*(\d{2})(\d{2})(\d{4})\s*$/.exec(texto);
  if (!coincidencia) return null;
  const [dia, mes, anio] = coincidencia.slice(1).map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const prueba = new Date(Date.UTC(anio, mes - 1, dia));
  if (prueba.getUTCMonth() !== mes - 1 || prueba.getUTCDate() !== dia) return null;
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** `"15/12/2026 — 18/12/2026 · 3 noches"`. */
export function formatearEstadia(entrada: FechaISO, salida: FechaISO): string {
  const noches = contarNoches(entrada, salida);
  const etiqueta = noches === 1 ? "1 noche" : `${noches} noches`;
  return `${formatearFecha(entrada)} — ${formatearFecha(salida)} · ${etiqueta}`;
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
