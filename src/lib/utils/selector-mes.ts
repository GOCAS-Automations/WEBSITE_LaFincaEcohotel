/**
 * El selector de mes y año de los calendarios: cuentas puras.
 *
 * Lo usan los dos calendarios que tienen flechas de mes:
 *
 *   · el de fechas del sitio (`calendario-fechas.tsx`: portada, `/reservar` y
 *     la reserva manual del panel), donde tocar el título del mes abre una
 *     rejilla de meses con cambio de año, como en iOS;
 *   · el de ocupación del panel (`/admin/reservas`).
 *
 * ---------------------------------------------------------------------------
 * UNA SOLA REGLA PARA LAS FLECHAS Y PARA EL SELECTOR
 * ---------------------------------------------------------------------------
 * El selector no puede llevar a un mes al que las flechas no llegan, ni al
 * revés: si no, quien salta a «marzo de 2029» encuentra un mes que no sabe
 * volver a pedir. Por eso las dos cosas preguntan aquí, con los mismos
 * {@link LimitesMes}.
 *
 * Los meses viajan como texto `AAAA-MM`: compararlos como cadenas ya es
 * compararlos en el tiempo, y no hay husos horarios de por medio.
 *
 * Puro: sin React, sin red y sin reloj. «Hoy» llega como dato.
 */

/** Un mes, como `AAAA-MM`. */
export type ClaveMes = string;

/** Primer y último mes a los que se puede ir, ambos incluidos. */
export type LimitesMes = { minimo: ClaveMes; maximo: ClaveMes };

/**
 * Cuántos meses hacia delante enseña el calendario de fechas del sitio,
 * contando el primero. Veinticuatro: dos años. Nadie reserva una cabaña con
 * más antelación, y un límite evita que las flechas lleven a años sin
 * festivos calculados ni tarifas.
 */
export const MESES_VISIBLES_CALENDARIO = 24;

/** Cuántos años hacia atrás y hacia delante recorre el calendario del panel. */
export const ANIOS_PANEL = 2;

const NOMBRES_MESES = [
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

const FORMA_CLAVE = /^(\d{4})-(\d{2})$/;

/** ¿Es un `AAAA-MM` con un mes del 1 al 12? */
export function esClaveMes(valor: unknown): valor is ClaveMes {
  if (typeof valor !== "string") return false;
  const coincidencia = FORMA_CLAVE.exec(valor);
  if (!coincidencia) return false;
  const mes = Number(coincidencia[2]);
  return mes >= 1 && mes <= 12;
}

/** `AAAA-MM` de un año y un mes (1–12). */
export function claveDe(anio: number, mes: number): ClaveMes {
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}`;
}

export function anioDe(clave: ClaveMes): number {
  return Number(clave.slice(0, 4));
}

/** Mes de 1 a 12. */
export function numeroDeMes(clave: ClaveMes): number {
  return Number(clave.slice(5, 7));
}

/** Suma (o resta) meses a un `AAAA-MM`, normalizando el año. */
export function moverMes(clave: ClaveMes, cantidad: number): ClaveMes {
  const total = anioDe(clave) * 12 + (numeroDeMes(clave) - 1) + cantidad;
  return claveDe(Math.floor(total / 12), (total % 12) + 1);
}

/** «octubre». */
export function nombreDeMes(clave: ClaveMes): string {
  return NOMBRES_MESES[numeroDeMes(clave) - 1] ?? "";
}

/** «octubre de 2026», para el lector de pantalla y los títulos. */
export function mesEnPalabras(clave: ClaveMes): string {
  return `${nombreDeMes(clave)} de ${anioDe(clave)}`;
}

/** ¿Está el mes dentro de los límites (incluidos)? */
export function mesPermitido(clave: ClaveMes, limites: LimitesMes): boolean {
  return clave >= limites.minimo && clave <= limites.maximo;
}

/** El mes más cercano dentro de los límites. */
export function acotarMes(clave: ClaveMes, limites: LimitesMes): ClaveMes {
  if (clave < limites.minimo) return limites.minimo;
  if (clave > limites.maximo) return limites.maximo;
  return clave;
}

/** ¿Hay mes anterior al que ir? Es lo que enciende la flecha «‹». */
export function puedeRetroceder(clave: ClaveMes, limites: LimitesMes): boolean {
  return clave > limites.minimo;
}

/** ¿Hay mes siguiente al que ir? Es lo que enciende la flecha «›». */
export function puedeAvanzar(clave: ClaveMes, limites: LimitesMes): boolean {
  return clave < limites.maximo;
}

/** Los años que ofrece el selector, en orden. */
export function aniosDelSelector(limites: LimitesMes): number[] {
  const anios: number[] = [];
  for (let anio = anioDe(limites.minimo); anio <= anioDe(limites.maximo); anio++) {
    anios.push(anio);
  }
  return anios;
}

export type MesDelSelector = {
  clave: ClaveMes;
  /** «octubre». */
  nombre: string;
  /** «oct». */
  corto: string;
  /** ¿Se puede elegir? Fuera de los límites, no. */
  permitido: boolean;
};

/** Los doce meses de un año, cada uno con si se puede elegir. */
export function mesesDelAnio(anio: number, limites: LimitesMes): MesDelSelector[] {
  return NOMBRES_MESES.map((nombre, indice) => {
    const clave = claveDe(anio, indice + 1);
    return {
      clave,
      nombre,
      corto: nombre.slice(0, 3),
      permitido: mesPermitido(clave, limites),
    };
  });
}

/**
 * Límites del calendario de fechas del sitio: desde el mes de la primera
 * fecha elegible —no se vuelve a un mes sin ningún día que elegir— y
 * {@link MESES_VISIBLES_CALENDARIO} meses en total.
 *
 * `primera` es una fecha `AAAA-MM-DD` (la llegada más temprana posible).
 */
export function limitesDelCalendario(
  primera: string,
  meses: number = MESES_VISIBLES_CALENDARIO,
): LimitesMes {
  const minimo = primera.slice(0, 7);
  return { minimo, maximo: moverMes(minimo, Math.max(1, meses) - 1) };
}

/**
 * Límites del calendario de ocupación del panel: de enero de hace
 * {@link ANIOS_PANEL} años a diciembre de dentro de otros tantos. El panel sí
 * mira hacia atrás —el historial de lo que se ocupó—, a diferencia del sitio.
 */
export function limitesDelPanel(
  hoy: string,
  anios: number = ANIOS_PANEL,
): LimitesMes {
  const anio = Number(hoy.slice(0, 4));
  return { minimo: claveDe(anio - anios, 1), maximo: claveDe(anio + anios, 12) };
}
