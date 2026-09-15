/**
 * EL DÍA DE CALMA: un día en La Finca, sin hospedaje.
 *
 * ---------------------------------------------------------------------------
 * LO QUE DICE EL CLIENTE (§3 de `docs/DATOS_CLIENTE.md`)
 * ---------------------------------------------------------------------------
 * · Horario **10:00 a. m. – 5:00 p. m.**, sin noche y sin cabaña.
 * · **$250.000 para dos personas**, con almuerzo a la carta, refrigerio y
 *   acceso a piscina, turco, decks, senderos y salón.
 * · **Una o dos personas por reserva** (confirmado el 2026-09-15). No existe la
 *   «persona adicional»: quien venga en grupo hace varias reservas.
 * · **Cupo máximo de 10 personas por día** en todo el hotel, sumando todas las
 *   reservas de día de esa fecha.
 * · **Nunca se le llama «pasadía»**: el hotel rechaza esa palabra.
 *
 * ---------------------------------------------------------------------------
 * EL CIERRE ES EL MISMO QUE EL DEL HOSPEDAJE
 * ---------------------------------------------------------------------------
 * Desde el 2026-09-15 (segunda ronda) el Día de Calma **se reserva y se paga
 * por el sitio**: resumen con total, deslizante de anticipo de 50 a 100 % y el
 * mismo botón final que el hospedaje, con una sola costura de Wompi para los
 * dos (`src/components/sitio/selector-reserva.tsx`). El total sale de
 * `resumenDePago()` igual que el de una estadía.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO SE INVENTA
 * ---------------------------------------------------------------------------
 * El hotel **no ha confirmado** si el Día de Calma pide el mismo mínimo del
 * 50 % que el hospedaje. Mientras no lo diga se aplica esa misma regla —es la
 * única que el hotel ha publicado— y el sitio lo escribe en la propia pantalla
 * en vez de dejar el cierre a medias. La política de cancelación del plan de
 * día sigue sin confirmar y esa sí se remite a WhatsApp. Ver los `TODO` de
 * abajo y §3 de `docs/DATOS_CLIENTE.md`.
 *
 * ---------------------------------------------------------------------------
 * MÓDULO PURO
 * ---------------------------------------------------------------------------
 * Ni red ni fechas del sistema: entran la fecha, cuántas personas y lo que ya
 * está vendido de ese día; sale la cotización. El cupo real se consulta en el
 * servidor (`/api/dia-de-calma/cupo`) y lo ÚLTIMO que manda es el trigger
 * `reservas_cupo_dia_de_calma` de la base (migración 009).
 */

import type { FechaISO } from "../utils/formato";

/* ===========================================================================
 * El cupo
 * ======================================================================== */

/**
 * Cuántas personas caben en un Día de Calma, sumando todas las reservas de
 * ese día.
 *
 * ⚠️ **Si el hotel cambia este número hay que tocar DOS sitios**: esta
 * constante y la del trigger `validar_cupo_dia_de_calma()` en
 * `supabase/migrations/009_dia_de_calma_y_extras_por_noche.sql`. La base es la
 * que decide; esta constante solo sirve para explicarlo antes de intentarlo.
 */
export const CUPO_DIA_DE_CALMA = 10;

/** Cuántas personas cubre el precio publicado del plan. */
export const PERSONAS_INCLUIDAS_DIA = 2;

/**
 * Cuántos adultos admite UNA reserva de Día de Calma.
 *
 * Decisión del cliente (2026-09-15): el Día de Calma se vende **para una o dos
 * personas**, nunca más. El cupo de {@link CUPO_DIA_DE_CALMA} personas por día
 * sigue siendo de toda la finca y lo llenan varias reservas distintas; lo que
 * desaparece es la pregunta por la «persona adicional», que el hotel nunca
 * llegó a tarifar.
 */
export const MAX_PERSONAS_POR_RESERVA_DIA = 2;

/** El horario del plan, por si el panel no lo tiene escrito. */
export const HORARIO_DIA_POR_DEFECTO = "10:00 a. m. – 5:00 p. m.";

export type CupoDelDia = {
  fecha: FechaISO;
  /** Personas ya reservadas ese día. */
  usado: number;
  /** Personas que todavía caben. */
  restante: number;
  lleno: boolean;
};

/** Normaliza lo que devuelve el servidor, sin dejar números imposibles. */
export function cupoDelDia(fecha: FechaISO, usado: number): CupoDelDia {
  const ocupado = Math.max(0, Math.min(CUPO_DIA_DE_CALMA, Math.round(usado)));
  const restante = CUPO_DIA_DE_CALMA - ocupado;
  return { fecha, usado: ocupado, restante, lleno: restante <= 0 };
}

/** «Quedan 3 cupos para ese día». En español y sin jerga de sistemas. */
export function textoCupo(restante: number): string {
  if (restante <= 0) {
    return "Ese día ya está completo. Elige otra fecha.";
  }
  if (restante === 1) return "Queda 1 cupo para ese día.";
  return `Quedan ${restante} cupos para ese día.`;
}

/**
 * Las cantidades de personas que se pueden elegir con el cupo que queda.
 *
 * Nunca más de {@link MAX_PERSONAS_POR_RESERVA_DIA}: el plan se vende para una
 * o dos personas. Si del día quedara un solo cupo, la única opción es 1.
 */
export function opcionesDePersonas(restante: number): number[] {
  const tope = Math.max(
    0,
    Math.min(MAX_PERSONAS_POR_RESERVA_DIA, CUPO_DIA_DE_CALMA, restante),
  );
  return Array.from({ length: tope }, (_, indice) => indice + 1);
}

/* ===========================================================================
 * La cotización
 * ======================================================================== */

export type CotizacionDia = {
  fecha: FechaISO;
  personas: number;
  /**
   * Total en COP enteros. `null` cuando todavía no se puede calcular: o el
   * hotel no ha publicado la tarifa, o son más personas de las que cubre el
   * precio publicado.
   */
  precio: number | null;
  /** Personas que cubre el precio publicado. */
  personasIncluidas: number;
  /** Explicación en español cuando `precio` es `null`, o aviso útil. */
  nota: string | null;
  /** Cierto cuando el problema es de cupo y no de precio. */
  sinCupo: boolean;
};

export type EntradaCotizacionDia = {
  fecha: FechaISO;
  personas: number;
  /** `planes.precio_base` del Día de Calma. `null` si no está publicado. */
  precioBase: number | null;
  /** Cupo que queda ese día; `null` si todavía no se ha consultado. */
  restante?: number | null;
};

/**
 * Cuánto cuesta un Día de Calma.
 *
 * Nunca lanza y nunca estima: si no hay un precio publicado que cubra a esas
 * personas, devuelve `precio: null` con el motivo escrito. Enseñar un número
 * que después hay que corregir es peor que mandar a esa persona a WhatsApp.
 */
export function cotizarDiaDeCalma({
  fecha,
  personas,
  precioBase,
  restante = null,
}: EntradaCotizacionDia): CotizacionDia {
  /* Una o dos personas, nunca más: el plan no se vende para grupos (decisión
     del cliente, 2026-09-15). Un número mayor —de un enlace viejo o de un
     formulario manipulado— se recorta en vez de cotizarse. */
  const cantidad = Math.min(
    MAX_PERSONAS_POR_RESERVA_DIA,
    Math.max(1, Math.round(personas)),
  );
  const base = {
    fecha,
    personas: cantidad,
    personasIncluidas: PERSONAS_INCLUIDAS_DIA,
  };

  if (typeof restante === "number" && cantidad > restante) {
    return {
      ...base,
      precio: null,
      sinCupo: true,
      nota:
        restante <= 0
          ? "Ese día ya está completo. Elige otra fecha."
          : `Para ese día ${textoCupo(restante).toLowerCase()} Elige menos personas u otra fecha.`,
    };
  }

  if (typeof precioBase !== "number") {
    return {
      ...base,
      precio: null,
      sinCupo: false,
      nota: "Estamos actualizando la tarifa del Día de Calma. Escríbenos y te la confirmamos.",
    };
  }

  /*
    YA NO HAY «PERSONA ADICIONAL».
    Aquí vivía la pregunta por la tercera persona en adelante, sin tarifa
    publicada y resuelta con un «te lo confirmamos por WhatsApp». El cliente
    cerró el asunto el 2026-09-15: el Día de Calma es para una o dos personas,
    así que `cantidad` nunca pasa de dos y el precio publicado siempre aplica.
  */

  /*
    Una sola persona paga lo mismo que dos: el hotel no publicó tarifa
    individual para este plan, y cobrar la mitad sería inventarla.
    TODO confirmar si existe una tarifa para una sola persona.
  */
  return {
    ...base,
    precio: precioBase,
    sinCupo: false,
    nota:
      cantidad === 1
        ? `El plan se vende para ${PERSONAS_INCLUIDAS_DIA} personas; viniendo sola o solo, el valor es el mismo.`
        : null,
  };
}

/* ===========================================================================
 * Lo que todavía no ha confirmado el hotel
 * ===========================================================================
 *
 * TODO (Amapola):
 *   · ¿El Día de Calma pide el mismo anticipo mínimo del 50 % que el
 *     hospedaje? Hasta que lo confirme, el sitio aplica esa misma regla y lo
 *     dice en pantalla: es la única que el hotel ha publicado, y un cierre sin
 *     anticipo obligaba a pedirlo después por WhatsApp.
 *   · Política de cancelación del Día de Calma. Esta sí sigue sin cifra: el
 *     sitio dice «te lo confirmamos por WhatsApp».
 *   · ¿Se puede añadir jacuzzi al Día de Calma y a qué precio?
 *
 * Cerrado el 2026-09-15: el valor por persona adicional ya no hace falta,
 * porque el plan se vende solo para una o dos personas.
 */
