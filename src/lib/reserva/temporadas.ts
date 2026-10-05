/**
 * LAS TEMPORADAS: tarifas para fechas concretas.
 *
 * ---------------------------------------------------------------------------
 * LAS REGLAS (decididas con Cesar, 2026-10-05)
 * ---------------------------------------------------------------------------
 * 1. **La temporada cambia el precio, nunca qué plan corresponde a una noche.**
 *    El tipo de noche (entre semana / fin de semana o festivo) sigue eligiendo
 *    el plan; la temporada solo dice cuánto cuesta esa noche en ese plan.
 * 2. **Una temporada nunca habilita un plan que la cabaña no tiene en su
 *    tarifa base.** Los precios de temporada se cuelgan de las tarifas base
 *    que ya existen (`temporadasDeTarifa`): si la Cabaña 02 no tiene Entre
 *    Semana, una temporada de «todas» con precio de Entre Semana no tiene a
 *    qué colgarse y la 02 sigue sin ofrecerse entre semana.
 * 3. **Precedencia por noche:** temporada de esa cabaña concreta > temporada
 *    de todas las cabañas > tarifa base. Plan por plan: si la temporada no
 *    fija precio para un plan, ese plan sigue con lo que hubiera debajo.
 * 4. **Sin solapes** de dos temporadas del mismo alcance en el mismo plan. Lo
 *    garantiza la base (`tarifas_temporadas_sin_cruce`, migración 017); aquí
 *    está la misma comprobación para poder explicarla en el panel con nombres.
 * 5. **Precio de 1 persona:** si el plan lo tiene en la base, la temporada
 *    pide los dos precios o ninguno.
 *
 * Las fechas siguen la convención del proyecto: `[desde, hasta)`. `desde` es
 * la primera noche y `hasta` el día siguiente a la última, igual que una
 * estadía con llegada y salida. El panel las pide como «Primera noche» y
 * «Última noche», ambas incluidas.
 *
 * Módulo puro: sin red, sin reloj del sistema y con enteros COP.
 */

import { fechaCorta } from "../admin/fechas";
import type { FechaISO } from "../utils/formato";
import { esFechaISO, sumarDias } from "./noches";

/* ===========================================================================
 * Tipos
 * ======================================================================== */

/** El precio que una temporada fija para un plan. */
export type PrecioDeTemporada = {
  planId: string;
  /** Precio por noche para dos personas, entero COP. */
  precio_noche: number;
  /** Precio si viaja una persona. `null` = se cobra `precio_noche`. */
  precio_noche_1_persona: number | null;
};

/** Una temporada tal como la guarda la base, con sus precios. */
export type Temporada = {
  id: string;
  nombre: string;
  /** La cabaña a la que se limita; `null` = todas las cabañas. */
  alojamientoId: string | null;
  /** Primera noche (incluida). */
  desde: FechaISO;
  /** Día siguiente a la última noche (excluido). */
  hasta: FechaISO;
  precios: PrecioDeTemporada[];
};

/**
 * Lo que una tarifa (cabaña × plan) necesita saber de una temporada para
 * cotizar. Es lo que viaja al navegador junto a la tarifa base.
 */
export type TemporadaDeTarifa = {
  nombre: string;
  desde: FechaISO;
  hasta: FechaISO;
  /** Cierto si es de esta cabaña concreta: gana a una de todas. */
  deCabana: boolean;
  precio_noche: number;
  precio_noche_1_persona: number | null;
};

/* ===========================================================================
 * Fechas
 * ======================================================================== */

/**
 * Lee el `daterange` de Postgres (`"[2026-12-01,2027-01-09)"`).
 *
 * Postgres lo devuelve siempre en la forma canónica `[desde,hasta)`; aun así
 * se aceptan los otros cierres para no depender de ello.
 */
export function leerNoches(
  crudo: unknown,
): { desde: FechaISO; hasta: FechaISO } | null {
  if (typeof crudo !== "string") return null;
  const partes =
    /^([[(])(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})([\])])$/.exec(crudo.trim());
  if (!partes) return null;
  const [, abre, inicio, fin, cierra] = partes;
  return {
    desde: abre === "(" ? sumarDias(inicio, 1) : inicio,
    hasta: cierra === "]" ? sumarDias(fin, 1) : fin,
  };
}

/** La última noche incluida de una temporada. */
export function ultimaNoche(temporada: { hasta: FechaISO }): FechaISO {
  return sumarDias(temporada.hasta, -1);
}

/** ¿La noche de esta fecha cae dentro de la temporada? */
export function cubreNoche(
  temporada: { desde: FechaISO; hasta: FechaISO },
  fecha: FechaISO,
): boolean {
  return temporada.desde <= fecha && fecha < temporada.hasta;
}

/** ¿Se cruzan dos rangos `[desde, hasta)`? Tocarse en el borde no es cruzarse. */
export function seCruzanNoches(
  a: { desde: FechaISO; hasta: FechaISO },
  b: { desde: FechaISO; hasta: FechaISO },
): boolean {
  return a.desde < b.hasta && b.desde < a.hasta;
}

/** Un año de temporada como máximo: más que eso es casi seguro un error de tecleo. */
export const MAXIMO_NOCHES_TEMPORADA = 366;

export type FechasDeTemporada =
  | { valido: true; desde: FechaISO; hasta: FechaISO }
  | { valido: false; motivo: string };

/**
 * Valida «Primera noche» y «Última noche» (ambas incluidas) y las pasa a la
 * convención `[desde, hasta)`.
 */
export function fechasDeTemporada(
  primeraNoche: string,
  ultimaNocheIncluida: string,
): FechasDeTemporada {
  if (!esFechaISO(primeraNoche)) {
    return { valido: false, motivo: "Escribe la primera noche de la temporada." };
  }
  if (!esFechaISO(ultimaNocheIncluida)) {
    return { valido: false, motivo: "Escribe la última noche de la temporada." };
  }
  if (ultimaNocheIncluida < primeraNoche) {
    return {
      valido: false,
      motivo:
        "La última noche no puede ser anterior a la primera. Revisa las dos fechas.",
    };
  }
  const hasta = sumarDias(ultimaNocheIncluida, 1);
  if (contarNochesEntre(primeraNoche, hasta) > MAXIMO_NOCHES_TEMPORADA) {
    return {
      valido: false,
      motivo:
        "Una temporada puede durar como máximo un año. Revisa el año de las fechas.",
    };
  }
  return { valido: true, desde: primeraNoche, hasta };
}

function contarNochesEntre(desde: FechaISO, hasta: FechaISO): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000,
  );
}

/** Cuántas noches cubre la temporada. */
export function nochesDeTemporada(temporada: {
  desde: FechaISO;
  hasta: FechaISO;
}): number {
  return contarNochesEntre(temporada.desde, temporada.hasta);
}

/* ===========================================================================
 * Qué temporada manda en cada noche
 * ======================================================================== */

/**
 * Las temporadas que afectan a una tarifa concreta (cabaña × plan).
 *
 * Solo las que fijan precio para ESE plan y son de ESA cabaña o de todas. Se
 * llama una vez por tarifa base existente; por eso una temporada nunca crea
 * una tarifa que la cabaña no tenga (regla 2).
 */
export function temporadasDeTarifa(
  temporadas: readonly Temporada[],
  alojamientoId: string,
  planId: string,
): TemporadaDeTarifa[] {
  const resultado: TemporadaDeTarifa[] = [];
  for (const temporada of temporadas) {
    const deCabana = temporada.alojamientoId === alojamientoId;
    if (!deCabana && temporada.alojamientoId !== null) continue;
    const precio = temporada.precios.find((item) => item.planId === planId);
    if (!precio) continue;
    resultado.push({
      nombre: temporada.nombre,
      desde: temporada.desde,
      hasta: temporada.hasta,
      deCabana,
      precio_noche: precio.precio_noche,
      precio_noche_1_persona: precio.precio_noche_1_persona,
    });
  }
  return resultado;
}

/**
 * La temporada que manda en una noche: la de la cabaña, si la hay; si no, la
 * de todas; si no, ninguna (se cobra la base).
 *
 * La base impide dos del mismo alcance cruzadas en el mismo plan, así que
 * nunca debería haber empate. Si lo hubiera (datos cargados a mano), gana la
 * que empezó más tarde —la más específica en el tiempo—, y siempre la misma.
 */
export function temporadaDeNoche<T extends TemporadaDeTarifa>(
  temporadas: readonly T[] | null | undefined,
  fecha: FechaISO,
): T | null {
  if (!temporadas || temporadas.length === 0) return null;
  let ganadora: T | null = null;
  for (const temporada of temporadas) {
    if (!cubreNoche(temporada, fecha)) continue;
    if (
      !ganadora ||
      (temporada.deCabana && !ganadora.deCabana) ||
      (temporada.deCabana === ganadora.deCabana &&
        temporada.desde > ganadora.desde)
    ) {
      ganadora = temporada;
    }
  }
  return ganadora;
}

/* ===========================================================================
 * Solapes (regla 4), para explicarlos en el panel
 * ======================================================================== */

export type CruceDeTemporadas = {
  temporada: Temporada;
  /** Los planes en los que chocan. */
  planIds: string[];
};

/**
 * Con qué temporadas chocaría una nueva (o una editada).
 *
 * Chocan si son del mismo alcance (las dos de todas, o las dos de la misma
 * cabaña), sus noches se cruzan y fijan precio a algún plan en común. Una de
 * cabaña y una de todas no chocan: gana la de cabaña.
 */
export function crucesDeTemporada(
  candidata: {
    id?: string | null;
    alojamientoId: string | null;
    desde: FechaISO;
    hasta: FechaISO;
    planIds: readonly string[];
  },
  existentes: readonly Temporada[],
): CruceDeTemporadas[] {
  const cruces: CruceDeTemporadas[] = [];
  for (const temporada of existentes) {
    if (candidata.id && temporada.id === candidata.id) continue;
    if (temporada.alojamientoId !== candidata.alojamientoId) continue;
    if (!seCruzanNoches(temporada, candidata)) continue;
    const planIds = temporada.precios
      .map((precio) => precio.planId)
      .filter((planId) => candidata.planIds.includes(planId));
    if (planIds.length > 0) cruces.push({ temporada, planIds });
  }
  return cruces;
}

/* ===========================================================================
 * Precios de una temporada (regla 5), para el panel
 * ======================================================================== */

/** Un plan de hospedaje tal como lo ofrece el formulario. */
export type PlanParaTemporada = {
  planId: string;
  nombre: string;
  /** ¿Tiene precio de 1 persona en su tarifa base (dentro del alcance)? */
  tieneUnaPersona: boolean;
};

/** Lo que llega del formulario para un plan; `null` = campo vacío. */
export type ValoresDePlan = {
  planId: string;
  precio: number | null;
  precioUnaPersona: number | null;
};

/** El precio base de un plan en una cabaña, como referencia en el formulario. */
export type BaseDeCabana = {
  alojamientoId: string;
  cabana: string;
  precio: number;
  precioUnaPersona: number | null;
};

/** Un plan de hospedaje con sus precios base, cabaña por cabaña. */
export type PlanConBases = {
  planId: string;
  nombre: string;
  bases: BaseDeCabana[];
};

/**
 * Los planes a los que se puede poner precio con un alcance dado: los que
 * tienen tarifa base en esa cabaña (o en alguna, si es para todas). Una
 * temporada nunca habilita un plan que la cabaña no tiene.
 */
export function planesDelAlcance(
  planes: readonly PlanConBases[],
  alojamientoId: string | null,
): PlanDelAlcance[] {
  return planes
    .map((plan) => {
      const bases = alojamientoId
        ? plan.bases.filter((base) => base.alojamientoId === alojamientoId)
        : plan.bases;
      return {
        planId: plan.planId,
        nombre: plan.nombre,
        bases,
        tieneUnaPersona: bases.some((base) => base.precioUnaPersona !== null),
      };
    })
    .filter((plan) => plan.bases.length > 0);
}

/** Un plan con su referencia de precios base dentro de un alcance. */
export type PlanDelAlcance = PlanParaTemporada & { bases: BaseDeCabana[] };

export type ResultadoPrecios =
  | { valido: true; precios: PrecioDeTemporada[] }
  | { valido: false; motivo: string };

/**
 * Los precios que se guardan, o el primer problema explicado en español.
 *
 * · Plan en blanco (los dos campos vacíos) → no se guarda: usa la base.
 * · Si el plan tiene precio de 1 persona en la base, se piden los dos o
 *   ninguno. Si no lo tiene, la temporada tampoco puede inventarlo.
 * · Al menos un plan con precio: una temporada vacía no cambia nada.
 */
export function validarPreciosDeTemporada(
  planes: readonly PlanParaTemporada[],
  valores: readonly ValoresDePlan[],
): ResultadoPrecios {
  const precios: PrecioDeTemporada[] = [];

  for (const plan of planes) {
    const valor = valores.find((item) => item.planId === plan.planId);
    const precio = valor?.precio ?? null;
    const unaPersona = valor?.precioUnaPersona ?? null;

    if (precio === null && unaPersona === null) continue;

    if (precio === null) {
      return {
        valido: false,
        motivo: `Al plan «${plan.nombre}» le falta el precio para dos personas. Escríbelo, o borra también el de una persona para que en esas fechas use la base.`,
      };
    }
    if (precio <= 0 || (unaPersona !== null && unaPersona <= 0)) {
      return {
        valido: false,
        motivo: `Los precios del plan «${plan.nombre}» tienen que ser mayores que cero.`,
      };
    }
    if (plan.tieneUnaPersona && unaPersona === null) {
      return {
        valido: false,
        motivo: `El plan «${plan.nombre}» tiene precio para una persona en su tarifa base, así que la temporada necesita los dos: el de dos personas y el de una. Escribe los dos, o deja los dos vacíos para que en esas fechas use la base.`,
      };
    }
    if (!plan.tieneUnaPersona && unaPersona !== null) {
      return {
        valido: false,
        motivo: `El plan «${plan.nombre}» no tiene precio para una persona en su tarifa base: la temporada tampoco puede llevarlo. Deja vacío ese campo.`,
      };
    }

    precios.push({
      planId: plan.planId,
      precio_noche: precio,
      precio_noche_1_persona: plan.tieneUnaPersona ? unaPersona : null,
    });
  }

  if (precios.length === 0) {
    return {
      valido: false,
      motivo:
        "Escribe el precio de al menos un plan. Los planes que dejes en blanco usan su precio base en esas fechas.",
    };
  }

  return { valido: true, precios };
}

/* ===========================================================================
 * Textos
 * ======================================================================== */

export type EstadoTemporada = "activa" | "proxima" | "pasada";

/** Activa (hoy está dentro), próxima o pasada, según el «hoy» del hotel. */
export function estadoDeTemporada(
  temporada: { desde: FechaISO; hasta: FechaISO },
  hoy: FechaISO,
): EstadoTemporada {
  if (temporada.hasta <= hoy) return "pasada";
  if (temporada.desde > hoy) return "proxima";
  return "activa";
}

/** «1 dic 2026 – 8 ene 2027»: primera y última noche, las dos incluidas. */
export function rangoLegible(temporada: {
  desde: FechaISO;
  hasta: FechaISO;
}): string {
  const ultima = ultimaNoche(temporada);
  if (ultima === temporada.desde) return fechaCorta(temporada.desde);
  return `${fechaCorta(temporada.desde)} – ${fechaCorta(ultima)}`;
}

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

function diaYMes(fecha: FechaISO): string {
  const [, mes, dia] = fecha.split("-").map(Number);
  return `${dia} de ${MESES_LARGOS[mes - 1]}`;
}

/**
 * «del 1 de diciembre al 8 de enero», para el huésped.
 *
 * Sin año: lo que se enseña en la ficha son temporadas activas o próximas. Si
 * la temporada empieza dentro de más de un año, el año sí hace falta y se pone.
 */
export function periodoEnPalabras(
  temporada: { desde: FechaISO; hasta: FechaISO },
  hoy: FechaISO,
): string {
  const ultima = ultimaNoche(temporada);
  const lejos = temporada.desde > sumarDias(hoy, 330);
  const anio = (fecha: FechaISO) => (lejos ? ` de ${fecha.slice(0, 4)}` : "");
  if (ultima === temporada.desde) {
    return `el ${diaYMes(temporada.desde)}${anio(temporada.desde)}`;
  }
  return `del ${diaYMes(temporada.desde)}${anio(temporada.desde)} al ${diaYMes(ultima)}${anio(ultima)}`;
}

/**
 * La línea de la ficha pública de una cabaña: «Del 1 de diciembre al 8 de
 * enero aplican tarifas de temporada; al reservar ves el precio exacto de cada
 * noche». `null` si no hay temporadas activas ni próximas.
 */
export function avisoDeTemporadas(
  temporadas: readonly { desde: FechaISO; hasta: FechaISO }[],
  hoy: FechaISO,
): string | null {
  const vigentes = new Map<string, { desde: FechaISO; hasta: FechaISO }>();
  for (const temporada of temporadas) {
    if (estadoDeTemporada(temporada, hoy) === "pasada") continue;
    vigentes.set(`${temporada.desde}|${temporada.hasta}`, temporada);
  }
  if (vigentes.size === 0) return null;

  const periodos = [...vigentes.values()]
    .sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0))
    .map((temporada) => periodoEnPalabras(temporada, hoy));

  const unidos =
    periodos.length === 1
      ? periodos[0]
      : `${periodos.slice(0, -1).join(", ")} y ${periodos[periodos.length - 1]}`;

  return `${unidos.charAt(0).toUpperCase()}${unidos.slice(1)} aplican tarifas de temporada; al reservar ves el precio exacto de cada noche.`;
}

/* ===========================================================================
 * Diferencia con la base, para el panel
 * ======================================================================== */

/** Diferencia en porcentaje, redondeada a una cifra decimal. */
export function diferenciaPorcentual(base: number, nuevo: number): number {
  if (base <= 0) return 0;
  return Math.round(((nuevo - base) / base) * 1000) / 10;
}

function porcentajeConSigno(valor: number): string {
  const absoluto = Math.abs(valor).toLocaleString("es-CO", {
    maximumFractionDigits: 1,
  });
  if (valor > 0) return `+${absoluto} %`;
  if (valor < 0) return `−${absoluto} %`;
  return "0 %";
}

/**
 * «+15 % sobre la base», «−10 % bajo la base», «igual a la base».
 *
 * Con varias bases (una temporada de todas las cabañas cuando no cuestan lo
 * mismo) se da el rango: «+10 % a +15 % sobre la base, según la cabaña».
 * Sirve para detectar un cero de más antes de guardar.
 */
export function textoDiferencia(
  bases: readonly number[],
  nuevo: number | null,
): string | null {
  if (nuevo === null || bases.length === 0) return null;
  const diferencias = [...new Set(bases)]
    .map((base) => diferenciaPorcentual(base, nuevo))
    .sort((a, b) => a - b);
  const menor = diferencias[0];
  const mayor = diferencias[diferencias.length - 1];

  if (menor === mayor) {
    if (menor === 0) return "Igual a la base";
    return menor > 0
      ? `${porcentajeConSigno(menor)} sobre la base`
      : `${porcentajeConSigno(menor)} bajo la base`;
  }
  return `${porcentajeConSigno(menor)} a ${porcentajeConSigno(mayor)} frente a la base, según la cabaña`;
}
