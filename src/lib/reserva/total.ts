/**
 * EL TOTAL: noches + experiencias por noche, y cuánto se paga hoy.
 *
 * ---------------------------------------------------------------------------
 * LAS EXPERIENCIAS SE ELIGEN POR NOCHE
 * ---------------------------------------------------------------------------
 * En La Finca las experiencias se viven una noche concreta: la torta de
 * aniversario se sirve el sábado, el fondue el viernes. Por eso cada línea
 * lleva la **noche** a la que pertenece —la fecha de su check-in, igual que en
 * `noches.ts`— y el desglose se agrupa por noche.
 *
 * `noche: null` significa «para toda la estadía»: así se apuntan los
 * adicionales que no pertenecen a una noche (la segunda mascota) y así quedan
 * las reservas anteriores a la migración 009.
 *
 * ---------------------------------------------------------------------------
 * EL ANTICIPO
 * ---------------------------------------------------------------------------
 * El hotel pide un **mínimo del 50 %** para confirmar y el resto por link de
 * pago antes de la llegada (§5 de `docs/DATOS_CLIENTE.md`). Desde el 2026-09-15
 * el huésped elige con un control deslizante **cuánto adelanta, de 50 a 100 %**
 * de cinco en cinco. El saldo se calcula SIEMPRE como
 * `total − anticipo`, nunca como otro porcentaje: así las dos cifras suman
 * exactamente el total aunque el redondeo caiga en medio peso.
 *
 * ---------------------------------------------------------------------------
 * MÓDULO PURO
 * ---------------------------------------------------------------------------
 * Enteros COP, sin formato y sin red. Lo mismo vale para el navegador (mirar)
 * que para el servidor (cobrar), que es justo lo que hará falta cuando entre
 * Wompi.
 */

import type { FechaISO } from "../utils/formato";

/* ===========================================================================
 * Extras
 * ======================================================================== */

/** Un extra elegido, con su noche y su precio congelado. */
export type ExtraElegido = {
  extraId: string;
  nombre: string;
  /** Noche a la que se añade; `null` = para toda la estadía. */
  noche: FechaISO | null;
  cantidad: number;
  /** Precio unitario en COP enteros, congelado al reservar. */
  precioUnitario: number;
};

/** Una línea del desglose de extras, ya multiplicada. */
export type LineaExtra = ExtraElegido & {
  /** `cantidad × precioUnitario`, entero COP. */
  importe: number;
};

/** Descarta lo que no suma (cantidad 0) y calcula el importe de cada línea. */
export function lineasDeExtras(elegidos: ExtraElegido[]): LineaExtra[] {
  return elegidos
    .filter((extra) => extra.cantidad > 0)
    .map((extra) => ({
      ...extra,
      importe: extra.cantidad * extra.precioUnitario,
    }));
}

/** Lo que suman todas las experiencias y adicionales. */
export function totalExtras(elegidos: ExtraElegido[]): number {
  return lineasDeExtras(elegidos).reduce((suma, linea) => suma + linea.importe, 0);
}

/** Un grupo del desglose: una noche (o la estadía entera) con sus extras. */
export type GrupoDeExtras = {
  /** `null` = extras de toda la estadía. */
  noche: FechaISO | null;
  lineas: LineaExtra[];
  subtotal: number;
};

/**
 * Los extras agrupados por noche, en el orden de las noches de la estadía.
 *
 * Las noches se pasan por parámetro para que el desglose siga el orden real de
 * la estadía aunque el visitante haya ido y venido entre pasos. Lo que no
 * pertenece a ninguna noche va al final, en el grupo `noche: null`.
 */
export function agruparExtrasPorNoche(
  elegidos: ExtraElegido[],
  noches: FechaISO[],
): GrupoDeExtras[] {
  const lineas = lineasDeExtras(elegidos);
  const grupos: GrupoDeExtras[] = [];

  for (const noche of noches) {
    const propias = lineas.filter((linea) => linea.noche === noche);
    if (propias.length === 0) continue;
    grupos.push({
      noche,
      lineas: propias,
      subtotal: propias.reduce((suma, linea) => suma + linea.importe, 0),
    });
  }

  /* Las de una noche que ya no está en la estadía (se cambiaron las fechas)
     no se pierden en silencio: se muestran con su fecha para que quien mira
     entienda de dónde sale el total. */
  const huerfanas = lineas.filter(
    (linea) => linea.noche !== null && !noches.includes(linea.noche),
  );
  for (const linea of huerfanas) {
    const grupo = grupos.find((g) => g.noche === linea.noche);
    if (grupo) {
      grupo.lineas.push(linea);
      grupo.subtotal += linea.importe;
    } else {
      grupos.push({ noche: linea.noche, lineas: [linea], subtotal: linea.importe });
    }
  }

  const sinNoche = lineas.filter((linea) => linea.noche === null);
  if (sinNoche.length > 0) {
    grupos.push({
      noche: null,
      lineas: sinNoche,
      subtotal: sinNoche.reduce((suma, linea) => suma + linea.importe, 0),
    });
  }

  return grupos;
}

/* ===========================================================================
 * El anticipo
 * ======================================================================== */

/**
 * Cuánto se puede pagar por adelantado: **de 50 a 100 %**, de cinco en cinco.
 *
 * Antes eran dos botones (50 % o 100 %). El cliente pidió el 2026-09-15 que
 * fuera una escala continua: el 50 % sigue siendo el mínimo que confirma la
 * reserva —§5 de `docs/DATOS_CLIENTE.md`— y quien quiera adelantar más, puede.
 * El paso de 5 puntos evita porcentajes como «63 %», que no significan nada
 * para nadie y ensucian la ficha de la reserva.
 *
 * El mismo rango está escrito en la base: `reservas_porcentaje_anticipo_valido`
 * pasó a `check (porcentaje_anticipo between 50 and 100)` en la migración 010.
 */
export const ANTICIPO_MINIMO = 50;
export const ANTICIPO_MAXIMO = 100;
export const PASO_ANTICIPO = 5;

/** Un entero entre 50 y 100. No es una unión: el rango es continuo. */
export type PorcentajeAnticipo = number;

export const ANTICIPO_POR_DEFECTO: PorcentajeAnticipo = ANTICIPO_MINIMO;

export function esPorcentajeAnticipo(valor: unknown): valor is PorcentajeAnticipo {
  return (
    typeof valor === "number" &&
    Number.isInteger(valor) &&
    valor >= ANTICIPO_MINIMO &&
    valor <= ANTICIPO_MAXIMO
  );
}

/**
 * Lleva cualquier número al rango válido, redondeando al paso de 5.
 *
 * Es la puerta por la que entra lo que escribe un humano o lo que llega de un
 * formulario: nunca lanza y nunca devuelve algo que la base vaya a rechazar.
 */
export function normalizarPorcentajeAnticipo(valor: unknown): PorcentajeAnticipo {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return ANTICIPO_POR_DEFECTO;
  const alPaso = Math.round(numero / PASO_ANTICIPO) * PASO_ANTICIPO;
  return Math.min(ANTICIPO_MAXIMO, Math.max(ANTICIPO_MINIMO, alPaso));
}

/** Los valores que ofrece el control deslizante, de 50 a 100 de cinco en cinco. */
export function escalaDeAnticipo(): PorcentajeAnticipo[] {
  const valores: PorcentajeAnticipo[] = [];
  for (let v = ANTICIPO_MINIMO; v <= ANTICIPO_MAXIMO; v += PASO_ANTICIPO) {
    valores.push(v);
  }
  return valores;
}

export type Anticipo = {
  porcentaje: PorcentajeAnticipo;
  /** Lo que se paga ahora, entero COP. */
  anticipo: number;
  /** Lo que queda por pagar: `total − anticipo`. Nunca negativo. */
  saldo: number;
};

/**
 * Cuánto se paga ahora y cuánto después.
 *
 * El anticipo se redondea al peso y el saldo sale de una resta, así que
 * `anticipo + saldo === total` siempre, sin un peso perdido por el camino.
 */
export function calcularAnticipo(
  total: number,
  porcentaje: PorcentajeAnticipo = ANTICIPO_POR_DEFECTO,
): Anticipo {
  const base = Math.max(0, Math.round(total));
  const valido = normalizarPorcentajeAnticipo(porcentaje);
  const anticipo =
    valido >= ANTICIPO_MAXIMO ? base : Math.round((base * valido) / 100);
  return { porcentaje: valido, anticipo, saldo: base - anticipo };
}

/* ===========================================================================
 * El resumen completo
 * ======================================================================== */

export type ResumenDePago = {
  /** Lo que suman las noches (o el Día de Calma). */
  subtotalAlojamiento: number;
  subtotalExtras: number;
  total: number;
  porcentaje: PorcentajeAnticipo;
  anticipo: number;
  saldo: number;
  /** Los extras agrupados por noche, listos para pintar. */
  grupos: GrupoDeExtras[];
};

export type EntradaResumen = {
  subtotalAlojamiento: number;
  extras?: ExtraElegido[];
  /** Las noches de la estadía, para ordenar los grupos. */
  noches?: FechaISO[];
  porcentaje?: PorcentajeAnticipo;
};

/** El desglose entero: alojamiento + extras por noche, total y anticipo. */
export function resumenDePago({
  subtotalAlojamiento,
  extras = [],
  noches = [],
  porcentaje = ANTICIPO_POR_DEFECTO,
}: EntradaResumen): ResumenDePago {
  const alojamiento = Math.max(0, Math.round(subtotalAlojamiento));
  const subtotalExtras = totalExtras(extras);
  const total = alojamiento + subtotalExtras;
  const calculado = calcularAnticipo(total, porcentaje);
  const { anticipo, saldo } = calculado;

  return {
    subtotalAlojamiento: alojamiento,
    subtotalExtras,
    total,
    /* El porcentaje que sale es el YA normalizado (50–100, de cinco en cinco),
       no el que entró: es el que se va a guardar y el que se le enseña. */
    porcentaje: calculado.porcentaje,
    anticipo,
    saldo,
    grupos: agruparExtrasPorNoche(extras, noches),
  };
}

/* ===========================================================================
 * Texto en español
 * ======================================================================== */

/**
 * Cómo se le explica el anticipo al huésped.
 *
 * Sale de §5 de `docs/DATOS_CLIENTE.md`: el 50 % confirma la reserva y el
 * resto se paga **por link de pago enviado con anticipación**, porque en la
 * finca no hay datáfono ni se maneja efectivo.
 */
export function explicacionAnticipo(porcentaje: PorcentajeAnticipo): string {
  const valido = normalizarPorcentajeAnticipo(porcentaje);

  if (valido >= ANTICIPO_MAXIMO) {
    return "Pagas el total ahora y llegas sin nada pendiente.";
  }

  const cabeza =
    valido === ANTICIPO_MINIMO
      ? "Pagas la mitad ahora para confirmar tu reserva."
      : `Pagas el ${valido} % ahora para confirmar tu reserva. El hotel pide un mínimo del 50 %, así que estás adelantando más.`;

  return `${cabeza} El resto lo pagas antes de llegar, por un link de pago que te enviamos: en la finca no hay datáfono ni se maneja efectivo.`;
}
