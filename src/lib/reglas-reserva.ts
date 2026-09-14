/**
 * La regla PLAN ↔ NOCHES de La Finca.
 *
 * ---------------------------------------------------------------------------
 * QUÉ DICE EL HOTEL (§3 de `docs/DATOS_CLIENTE.md`)
 * ---------------------------------------------------------------------------
 * · **Entre Semana** se vende de lunes a jueves.
 * · **Estándar** y **Premium**, de viernes a domingo y festivos.
 * · **Día de Calma** no ocupa noche: es de 10 a. m. a 5 p. m.
 *
 * Una noche se identifica por la fecha de su check-in, y un festivo cuenta
 * siempre como fin de semana (ver `festivos-colombia.ts`).
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO NO PUEDE VIVIR EN EL COMPONENTE
 * ---------------------------------------------------------------------------
 * La misma regla la necesitan tres sitios distintos: el calendario de la
 * portada, el de `/reservar` y —cuando exista— el motor que cobra. Si cada uno
 * la escribe a su manera, tarde o temprano uno deja reservar una noche que otro
 * rechaza. Aquí está una vez, es pura y está probada.
 *
 * ---------------------------------------------------------------------------
 * DE DÓNDE SALE LA RESTRICCIÓN DE CADA PLAN
 * ---------------------------------------------------------------------------
 * De `planes.dias_aplica` y `planes.tipo` en la base de datos, NO del nombre.
 * El nombre lo edita el cliente desde el panel: el día que «Estándar» pase a
 * llamarse «Fin de Semana», una regla escrita contra el nombre dejaría de
 * aplicarse en silencio y el sitio empezaría a vender sábados a precio de
 * martes.
 */

import { tipoDeNoche, type TipoDeNoche } from "./festivos-colombia";
import type { FechaISO } from "./utils/formato";

export type { TipoDeNoche };

/**
 * Lo que un plan permite.
 *
 * · `entre-semana` / `fin-de-semana` — solo admite noches de ese tipo.
 * · `sin-noches` — no ocupa cabaña (Día de Calma).
 * · `cualquiera` — no hay restricción declarada; se aceptan las dos, pero
 *   nunca mezcladas (ver `validarEstadia`).
 */
export type RestriccionPlan =
  | "entre-semana"
  | "fin-de-semana"
  | "sin-noches"
  | "cualquiera";

/** Lo mínimo que hace falta saber de un plan para aplicar la regla. */
export type PlanConReglas = {
  nombre: string;
  /** `hospedaje` ocupa noches; `dia` no. */
  tipo?: string | null;
  /** Días ISO en que aplica: `[1,2,3,4]` o `[5,6,7]`. */
  dias_aplica?: number[] | null;
};

export function restriccionDePlan(plan: PlanConReglas): RestriccionPlan {
  if (plan.tipo === "dia") return "sin-noches";

  const dias = plan.dias_aplica ?? [];
  if (dias.length === 0 || dias.length === 7) return "cualquiera";

  /* Con que aparezca un viernes, un sábado o un domingo, el plan es de fin de
     semana: no existe un plan del hotel que mezcle los dos bloques. */
  const tieneFinDeSemana = dias.some((dia) => dia >= 5);
  const tieneEntreSemana = dias.some((dia) => dia <= 4);
  if (tieneFinDeSemana && !tieneEntreSemana) return "fin-de-semana";
  if (tieneEntreSemana && !tieneFinDeSemana) return "entre-semana";
  return "cualquiera";
}

/** Las noches de una estadía `[entrada, salida)`, como fechas planas. */
export function nochesDe(entrada: FechaISO, salida: FechaISO): FechaISO[] {
  const noches: FechaISO[] = [];
  const cursor = new Date(`${entrada}T12:00:00Z`);
  const fin = new Date(`${salida}T12:00:00Z`);
  while (cursor < fin) {
    noches.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return noches;
}

/**
 * ¿Se puede DORMIR esta noche con este plan?
 *
 * `restriccion` es la del plan elegido. Sin plan elegido (`null`) no se
 * deshabilita nada: el visitante puede elegir las fechas primero y el plan
 * después, y son los PLANES los que se marcan como incompatibles.
 */
export function nochePermitida(
  fecha: FechaISO,
  restriccion: RestriccionPlan | null,
): boolean {
  if (restriccion === null || restriccion === "cualquiera") return true;
  if (restriccion === "sin-noches") return false;
  return tipoDeNoche(fecha) === restriccion;
}

export type ResultadoEstadia =
  | { valida: true; noches: number; tipo: TipoDeNoche }
  | { valida: false; motivo: string };

/**
 * Valida una estadía entera contra la regla del hotel.
 *
 * Dos cosas distintas se comprueban aquí:
 *
 *   1. **Que no sea mixta.** Un jueves→sábado tiene una noche de entre semana
 *      y dos de fin de semana. El hotel todavía no ha decidido cómo se cobra
 *      eso (`TODO` de §3 de `DATOS_CLIENTE.md`), así que en línea no se vende:
 *      es mejor mandar a esa persona a WhatsApp que cobrarle un precio que
 *      después hay que corregir.
 *   2. **Que encaje con el plan**, si ya hay uno elegido.
 *
 * Los mensajes van en español y dicen QUÉ hacer, no solo qué está mal.
 */
export function validarEstadia(
  entrada: FechaISO,
  salida: FechaISO,
  restriccion: RestriccionPlan | null = null,
): ResultadoEstadia {
  if (salida <= entrada) {
    return {
      valida: false,
      motivo: "La fecha de salida debe ser posterior a la de llegada.",
    };
  }

  const noches = nochesDe(entrada, salida);
  const tipos = noches.map(tipoDeNoche);
  const primero = tipos[0];

  if (tipos.some((tipo) => tipo !== primero)) {
    return {
      valida: false,
      motivo:
        "Esas fechas mezclan noches de entre semana con noches de fin de semana o festivo, y cada bloque tiene su propio plan. Elige fechas dentro de uno de los dos, o escríbenos por WhatsApp y te armamos la estadía.",
    };
  }

  if (
    restriccion &&
    restriccion !== "cualquiera" &&
    (restriccion === "sin-noches" || primero !== restriccion)
  ) {
    return {
      valida: false,
      motivo:
        restriccion === "entre-semana"
          ? "El plan Entre Semana solo cubre noches de lunes a jueves."
          : restriccion === "fin-de-semana"
            ? "Este plan solo cubre noches de viernes a domingo y festivos."
            : "Este plan no incluye hospedaje: es un plan de día.",
    };
  }

  return { valida: true, noches: noches.length, tipo: primero };
}

/**
 * ¿Es compatible este plan con unas fechas ya elegidas?
 *
 * Es la comprobación al revés, la que necesita `/reservar` cuando el visitante
 * llega con fechas puestas desde la portada: en vez de apagar días del
 * calendario, apaga los planes que no sirven para esas noches y explica por
 * qué.
 */
export function planCompatibleConFechas(
  plan: PlanConReglas,
  entrada: FechaISO | null,
  salida: FechaISO | null,
): { compatible: boolean; motivo: string | null } {
  if (!entrada || !salida || salida <= entrada) {
    return { compatible: true, motivo: null };
  }

  const resultado = validarEstadia(entrada, salida, restriccionDePlan(plan));
  if (resultado.valida) return { compatible: true, motivo: null };
  return { compatible: false, motivo: resultado.motivo };
}
