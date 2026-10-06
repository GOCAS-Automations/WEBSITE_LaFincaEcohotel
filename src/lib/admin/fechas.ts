/**
 * Aritmética de fechas del panel.
 *
 * Las fechas de negocio (entrada, salida, bloqueos) son columnas `date` de
 * Postgres: llegan como "AAAA-MM-DD" y se tratan SIEMPRE como texto. Pasarlas
 * por `Date` metería husos horarios en el problema y en Colombia (UTC-5) una
 * reserva del día 12 se mostraría como el 11. Cuando hace falta calcular se usa
 * `Date.UTC`, que es un calendario puro, y se vuelve a texto enseguida.
 *
 * Este módulo es puro: no importa nada de Node ni de React, así que sirve tanto
 * en componentes de servidor como en el navegador (el calendario es cliente).
 *
 * Lo que ya existía para el sitio público vive en `@/lib/utils/formato`; aquí
 * solo se añade lo que el panel necesita de más (rejilla de mes, `daterange`).
 */

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Cabecera del calendario: la semana empieza en lunes (convención de Colombia). */
export const DIAS_SEMANA_CORTOS = [
  "lun",
  "mar",
  "mié",
  "jue",
  "vie",
  "sáb",
  "dom",
];

/** Inicial de cada día, para el calendario mensual del panel. */
export const DIAS_SEMANA_INICIAL = ["L", "M", "M", "J", "V", "S", "D"];

export function esFechaISO(valor: string): boolean {
  if (!FECHA_ISO.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  // Rechaza el 31 de febrero y compañía.
  const prueba = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    prueba.getUTCFullYear() === anio &&
    prueba.getUTCMonth() === mes - 1 &&
    prueba.getUTCDate() === dia
  );
}

/** Hoy en Colombia (UTC-5, sin horario de verano), como "AAAA-MM-DD". */
export function hoyISO(): string {
  const bogota = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}

/** Suma días a una fecha ISO sin tocar husos horarios. */
export function sumarDiasISO(iso: string, dias: number): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Noches entre dos fechas ISO, con la salida exclusiva. */
export function nochesEntre(inicio: string, fin: string): number {
  const [ai, mi, di] = inicio.split("-").map(Number);
  const [af, mf, df] = fin.split("-").map(Number);
  return Math.round(
    (Date.UTC(af, mf - 1, df) - Date.UTC(ai, mi - 1, di)) / 86_400_000,
  );
}

/**
 * ¿Se cruzan dos rangos medio-abiertos [inicio, fin)?
 * Comparar cadenas ISO equivale a comparar cronológicamente.
 */
export function seCruzan(
  aInicio: string,
  aFin: string,
  bInicio: string,
  bFin: string,
): boolean {
  return aInicio < bFin && bInicio < aFin;
}

/** "2026-08-12" → "12 ago 2026". */
export function fechaCorta(iso: string): string {
  if (!FECHA_ISO.test(iso)) return iso;
  const [anio, mes, dia] = iso.split("-");
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1]} ${anio}`;
}

/** "2026-08-12" → "12 de agosto de 2026". */
export function fechaLarga(iso: string): string {
  if (!FECHA_ISO.test(iso)) return iso;
  const [anio, mes, dia] = iso.split("-");
  return `${Number(dia)} de ${MESES_LARGOS[Number(mes) - 1]} de ${anio}`;
}

/** "12 – 15 ago 2026" (omite el mes y el año repetidos). */
export function rangoCorto(inicio: string, fin: string): string {
  if (!FECHA_ISO.test(inicio) || !FECHA_ISO.test(fin)) {
    return `${inicio} – ${fin}`;
  }
  const [anioI, mesI, diaI] = inicio.split("-");
  const [anioF, mesF] = fin.split("-");
  const izquierda =
    anioI === anioF && mesI === mesF
      ? `${Number(diaI)}`
      : `${Number(diaI)} ${MESES_CORTOS[Number(mesI) - 1]}`;
  return `${izquierda} – ${fechaCorta(fin)}`;
}

/**
 * Fecha y hora legibles, SIEMPRE en hora de Colombia: "12 ago 2026, 14:35".
 * Nunca la del dispositivo — un dato que se lea distinto según dónde esté quien
 * mira no es un dato.
 */
export function fechaHora(valor: string | null): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  const bogota = new Date(fecha.getTime() - 5 * 60 * 60 * 1000);
  const dia = bogota.getUTCDate();
  const mes = MESES_CORTOS[bogota.getUTCMonth()];
  const anio = bogota.getUTCFullYear();
  const hh = String(bogota.getUTCHours()).padStart(2, "0");
  const mm = String(bogota.getUTCMinutes()).padStart(2, "0");
  return `${dia} ${mes} ${anio}, ${hh}:${mm}`;
}

/* ---------------------------------------------------------------------------
 * `daterange` de Postgres
 * ------------------------------------------------------------------------- */

/**
 * Lee el `daterange` de Postgres. Postgres normaliza siempre los rangos de
 * fechas a la forma canónica `[inicio,fin)`; aun así se contempla `(inicio,fin]`
 * por robustez.
 */
export function leerRangoFechas(
  crudo: unknown,
): { inicio: string; fin: string } | null {
  if (typeof crudo !== "string") return null;
  const coincidencia =
    /^([[(])(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})([\])])$/.exec(crudo.trim());
  if (!coincidencia) return null;
  const [, abre, crudoInicio, crudoFin, cierra] = coincidencia;
  return {
    inicio: abre === "(" ? sumarDiasISO(crudoInicio, 1) : crudoInicio,
    fin: cierra === "]" ? sumarDiasISO(crudoFin, 1) : crudoFin,
  };
}

/** Arma el literal `daterange` medio-abierto que espera Postgres. */
export function aRangoFechas(inicio: string, fin: string): string {
  return `[${inicio},${fin})`;
}

/* ---------------------------------------------------------------------------
 * Rejilla del calendario mensual
 * ------------------------------------------------------------------------- */

/** Un mes concreto. `mes` va de 1 a 12 (no del 0 al 11 de `Date`). */
export type AnioMes = { anio: number; mes: number };

export function mesDe(iso: string): AnioMes {
  const [anio, mes] = iso.split("-").map(Number);
  return { anio, mes };
}

/** Desplaza un mes hacia adelante o hacia atrás, normalizando el año. */
export function sumarMeses({ anio, mes }: AnioMes, delta: number): AnioMes {
  const indice = anio * 12 + (mes - 1) + delta;
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

/** "Septiembre 2026". */
export function tituloMes({ anio, mes }: AnioMes): string {
  const nombre = MESES_LARGOS[mes - 1] ?? "";
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** Clave "AAAA-MM" para las URLs del calendario. */
export function claveMes({ anio, mes }: AnioMes): string {
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}`;
}

/** Lee "AAAA-MM" de la URL; si no es válida, devuelve el mes de hoy. */
export function leerClaveMes(valor: string | null | undefined): AnioMes {
  if (typeof valor === "string" && /^\d{4}-\d{2}$/.test(valor)) {
    const [anio, mes] = valor.split("-").map(Number);
    if (mes >= 1 && mes <= 12 && anio >= 2000 && anio <= 2100) {
      return { anio, mes };
    }
  }
  return mesDe(hoyISO());
}

/** Fecha ISO de un día concreto de un mes. */
export function isoDe({ anio, mes }: AnioMes, dia: number): string {
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Cuántos días tiene el mes (día 0 del siguiente = último del actual). */
export function diasDelMes({ anio, mes }: AnioMes): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Índice del día de la semana empezando en lunes (0 = lunes, 6 = domingo). */
export function indiceDiaSemana(iso: string): number {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return (new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() + 6) % 7;
}

/** Todos los días de un mes, en orden, como fechas ISO. */
export function diasDeMes(objetivo: AnioMes): string[] {
  const total = diasDelMes(objetivo);
  return Array.from({ length: total }, (_, i) => isoDe(objetivo, i + 1));
}

/** ¿Es sábado o domingo? El calendario tiñe esas columnas. */
export function esFinDeSemana(iso: string): boolean {
  return indiceDiaSemana(iso) >= 5;
}

/* ---------------------------------------------------------------------------
 * Fechas numéricas `dd/mm/aaaa` (2026-10-05)
 *
 * Lo nuevo del panel (el calendario del mes, el Resumen, los mensajes de
 * choque) ya escribe las fechas así. El resto del sitio pasará a este formato
 * en una ronda aparte.
 * ------------------------------------------------------------------------- */

/** "2026-12-15" → "15/12/2026". */
export function fechaNumerica(iso: string): string {
  if (!FECHA_ISO.test(iso)) return iso;
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** "2026-12-15" → "mar 15/12/2026". */
export function fechaConDia(iso: string): string {
  if (!FECHA_ISO.test(iso)) return iso;
  return `${DIAS_SEMANA_CORTOS[indiceDiaSemana(iso)]} ${fechaNumerica(iso)}`;
}

/** "mar 13/10/2026 al vie 16/10/2026" (la salida es el día en que se va). */
export function rangoConDias(inicio: string, fin: string): string {
  return `${fechaConDia(inicio)} al ${fechaConDia(fin)}`;
}
