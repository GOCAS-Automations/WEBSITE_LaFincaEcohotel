/**
 * La COTIZACIÓN: qué se cobra por cada noche y cuánto suma.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA
 * ---------------------------------------------------------------------------
 * Cada noche se cobra con la tarifa que le corresponde a su fecha
 * (§3 de `docs/DATOS_CLIENTE.md`):
 *
 *   · Noche **entre semana** → plan Entre Semana. Precio `precio_noche`, o
 *     `precio_noche_1_persona` si viaja una sola persona.
 *   · Noche de **fin de semana o festivo** → el plan que el huésped elija
 *     entre los de fin de semana (hoy: Estándar o Premium). Esa elección
 *     aplica a TODAS las noches de fin de semana de la estadía.
 *
 * Una estadía mixta se desglosa: jueves→sábado = 1 noche Entre Semana +
 * 2 noches del plan de fin de semana elegido.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO SE MIRA EL NOMBRE DEL PLAN
 * ---------------------------------------------------------------------------
 * «Entre Semana», «Estándar» y «Premium» son nombres que el hotel edita desde
 * el panel. Una regla escrita contra el texto «Estándar» dejaría de aplicarse
 * **en silencio** el día que lo renombren, y el sitio empezaría a cobrar
 * sábados a precio de martes. La categoría de un plan sale de
 * `planes.tipo` y `planes.dias_aplica`, que son datos estructurados.
 *
 * Lo que distingue a Estándar de Premium NO es estructural —los dos cubren
 * viernes a domingo—, así que este módulo no intenta adivinarlo: trata a los
 * planes de fin de semana como una **lista de opciones** y el huésped elige
 * una. Hoy son dos; si el hotel añade una tercera, aparece sola.
 *
 * ---------------------------------------------------------------------------
 * MÓDULO PURO
 * ---------------------------------------------------------------------------
 * Entra la lista de noches (de `noches.ts`), la cabaña con sus tarifas y la
 * elección del huésped; sale el desglose. Ni red, ni fechas del sistema, ni
 * formato de moneda: los precios son **enteros COP**, como manda `CLAUDE.md`.
 * Formatear es trabajo de quien lo pinta.
 */

import {
  contarPorTipo,
  etiquetaTipoNoche,
  type Noche,
  type TipoNoche,
} from "./noches";

/* ===========================================================================
 * Lo que este módulo necesita saber del catálogo
 * ======================================================================== */

/** Lo mínimo de un plan para clasificarlo. Es un subconjunto de `Plan`. */
export type PlanCotizable = {
  nombre: string;
  /** `hospedaje` ocupa noches; `dia` (Día de Calma) no. */
  tipo?: string | null;
  /** Días ISO en que aplica: `[1,2,3,4]` o `[5,6,7]`. */
  dias_aplica?: number[] | null;
};

/** Una tarifa publicada: un plan con su precio para una cabaña concreta. */
export type TarifaCotizable = {
  plan: PlanCotizable;
  /** Precio por noche para dos personas, entero COP. */
  precio_noche: number;
  /** Precio por noche si viaja una sola persona. `null` = se cobra igual. */
  precio_noche_1_persona: number | null;
};

/** Una cabaña con las tarifas que tiene cargadas. */
export type CabanaCotizable = {
  slug: string;
  nombre: string;
  tarifas: TarifaCotizable[];
};

/* ===========================================================================
 * Categoría de un plan
 * ======================================================================== */

/**
 * A qué tipo de noche sirve un plan.
 *
 * · `entre_semana` / `fin_de_semana` — cubre noches de ese tipo.
 * · `dia` — no ocupa noche (Día de Calma).
 * · `cualquiera` — no declara días; se acepta para los dos tipos.
 */
export type CategoriaPlan = TipoNoche | "dia" | "cualquiera";

export function categoriaDePlan(plan: PlanCotizable): CategoriaPlan {
  if (plan.tipo === "dia") return "dia";

  const dias = plan.dias_aplica ?? [];
  if (dias.length === 0 || dias.length === 7) return "cualquiera";

  /* Con que aparezca un viernes, un sábado o un domingo, el plan es de fin de
     semana: no existe un plan del hotel que mezcle los dos bloques. */
  const cubreFinDeSemana = dias.some((dia) => dia >= 5);
  const cubreEntreSemana = dias.some((dia) => dia <= 4);
  if (cubreFinDeSemana && !cubreEntreSemana) return "fin_de_semana";
  if (cubreEntreSemana && !cubreFinDeSemana) return "entre_semana";
  return "cualquiera";
}

/** ¿Este plan sirve para una noche de este tipo? */
export function planCubre(plan: PlanCotizable, tipo: TipoNoche): boolean {
  const categoria = categoriaDePlan(plan);
  return categoria === tipo || categoria === "cualquiera";
}

/**
 * Los planes de fin de semana del catálogo, en el orden en que vienen.
 *
 * Son los que el huésped elige cuando su estadía toca viernes, sábado, domingo
 * o festivo. Hoy: Estándar y Premium.
 */
export function planesDeFinDeSemana<T extends PlanCotizable>(planes: T[]): T[] {
  return planes.filter((plan) => categoriaDePlan(plan) === "fin_de_semana");
}

/** El plan de entre semana del catálogo. Hoy solo hay uno. */
export function planDeEntreSemana<T extends PlanCotizable>(
  planes: T[],
): T | null {
  return planes.find((plan) => categoriaDePlan(plan) === "entre_semana") ?? null;
}

/* ===========================================================================
 * Elegibilidad de una cabaña
 * ======================================================================== */

/** ¿Esta cabaña tiene alguna tarifa que cubra noches de este tipo? */
export function cabanaCubre(cabana: CabanaCotizable, tipo: TipoNoche): boolean {
  return cabana.tarifas.some((tarifa) => planCubre(tarifa.plan, tipo));
}

export type Elegibilidad =
  | { elegible: true }
  | { elegible: false; motivo: string; faltan: TipoNoche[] };

/**
 * ¿Se puede ofrecer esta cabaña para estas noches?
 *
 * Solo si tiene tarifa para **todos** los tipos de noche de la estadía. La
 * Cabaña 02 solo se vende con el plan Estándar (§2 de `docs/DATOS_CLIENTE.md`),
 * así que no tiene tarifa de Entre Semana y no puede ofrecerse a quien llega un
 * martes. El motivo se devuelve escrito en español para poder mostrarlo: una
 * cabaña que desaparece sin explicación se lee como un error del sitio.
 */
export function elegibilidadDeCabana(
  cabana: CabanaCotizable,
  noches: Noche[],
): Elegibilidad {
  const cuenta = contarPorTipo(noches);
  const faltan: TipoNoche[] = [];

  if (cuenta.entre_semana > 0 && !cabanaCubre(cabana, "entre_semana")) {
    faltan.push("entre_semana");
  }
  if (cuenta.fin_de_semana > 0 && !cabanaCubre(cabana, "fin_de_semana")) {
    faltan.push("fin_de_semana");
  }

  if (faltan.length === 0) return { elegible: true };

  const listado = faltan
    .map((tipo) => etiquetaTipoNoche(tipo, true))
    .join(" ni ");

  return {
    elegible: false,
    faltan,
    motivo: `La ${cabana.nombre} no se ofrece para ${listado}.`,
  };
}

/** Las cabañas que se pueden ofrecer para estas noches. */
export function cabanasElegibles<T extends CabanaCotizable>(
  cabanas: T[],
  noches: Noche[],
): T[] {
  if (noches.length === 0) return cabanas;
  return cabanas.filter((cabana) => elegibilidadDeCabana(cabana, noches).elegible);
}

/* ===========================================================================
 * La cotización
 * ======================================================================== */

/** Una línea del desglose: una noche, su plan y su precio. */
export type LineaNoche = {
  fecha: string;
  tipo: TipoNoche;
  /** Nombre del festivo si lo es, para explicar por qué cuesta lo que cuesta. */
  festivo: string | null;
  /** Nombre del plan que se le aplicó. */
  plan: string;
  /** Precio de esa noche, entero COP. */
  precio: number;
  /** Cierto si se cobró la tarifa de una sola persona. */
  tarifaUnaPersona: boolean;
};

export type Cotizacion =
  | {
      posible: true;
      lineas: LineaNoche[];
      /** Suma de las líneas, entero COP. */
      total: number;
      noches: number;
      /** Cuántas noches de cada tipo. */
      porTipo: Record<TipoNoche, number>;
      /** Los planes que intervienen, sin repetir y en el orden en que salen. */
      planes: string[];
    }
  | { posible: false; motivo: string };

export type EntradaCotizacion = {
  noches: Noche[];
  cabana: CabanaCotizable;
  /**
   * Nombre del plan de fin de semana elegido. Solo hace falta si la estadía
   * tiene noches de fin de semana. Si llega `null` y hacen falta, se cotiza con
   * el primero que la cabaña tenga disponible, y quien lo pinta debe dejar
   * claro cuál es (la interfaz lo preselecciona explícitamente).
   */
  planFinDeSemana?: string | null;
  /** Cuántas personas. Uno o dos: las cabañas son para dos. */
  adultos: number;
};

/**
 * El desglose noche por noche y el total.
 *
 * Devuelve `posible: false` con un motivo en español cuando falta una tarifa;
 * nunca lanza y nunca inventa un precio. Es preferible mandar a esa persona a
 * WhatsApp que enseñarle un número que después hay que corregir.
 */
export function cotizar({
  noches,
  cabana,
  planFinDeSemana = null,
  adultos,
}: EntradaCotizacion): Cotizacion {
  if (noches.length === 0) {
    return { posible: false, motivo: "Elige las fechas de tu estadía." };
  }

  const cuenta = contarPorTipo(noches);

  /* --- La tarifa de cada tipo de noche -------------------------------- */

  const tarifaEntreSemana =
    cuenta.entre_semana > 0
      ? (cabana.tarifas.find((tarifa) => planCubre(tarifa.plan, "entre_semana")) ??
        null)
      : null;

  if (cuenta.entre_semana > 0 && !tarifaEntreSemana) {
    return {
      posible: false,
      motivo: `La ${cabana.nombre} no se ofrece para noches entre semana. Elige otra cabaña o unas fechas de fin de semana.`,
    };
  }

  const tarifasFinDeSemana = cabana.tarifas.filter((tarifa) =>
    planCubre(tarifa.plan, "fin_de_semana"),
  );

  let tarifaFinDeSemana: TarifaCotizable | null = null;
  if (cuenta.fin_de_semana > 0) {
    if (tarifasFinDeSemana.length === 0) {
      return {
        posible: false,
        motivo: `La ${cabana.nombre} no se ofrece para noches de fin de semana o festivo.`,
      };
    }
    tarifaFinDeSemana = planFinDeSemana
      ? (tarifasFinDeSemana.find(
          (tarifa) => tarifa.plan.nombre === planFinDeSemana,
        ) ?? null)
      : tarifasFinDeSemana[0];

    if (!tarifaFinDeSemana) {
      return {
        posible: false,
        motivo: `La ${cabana.nombre} no tiene el plan ${planFinDeSemana} disponible. Elige otro plan u otra cabaña.`,
      };
    }
  }

  /* --- El desglose ----------------------------------------------------- */

  const lineas: LineaNoche[] = noches.map((noche) => {
    const tarifa =
      noche.tipo === "entre_semana" ? tarifaEntreSemana! : tarifaFinDeSemana!;
    const { precio, unaPersona } = precioDeTarifa(tarifa, adultos);
    return {
      fecha: noche.fecha,
      tipo: noche.tipo,
      festivo: noche.festivo,
      plan: tarifa.plan.nombre,
      precio,
      tarifaUnaPersona: unaPersona,
    };
  });

  const total = lineas.reduce((suma, linea) => suma + linea.precio, 0);

  const planes: string[] = [];
  for (const linea of lineas) {
    if (!planes.includes(linea.plan)) planes.push(linea.plan);
  }

  return {
    posible: true,
    lineas,
    total,
    noches: lineas.length,
    porTipo: cuenta,
    planes,
  };
}

/**
 * El precio de una noche con esa tarifa.
 *
 * La tarifa de una sola persona se aplica siempre que exista y viaje una sola
 * persona. Hoy solo la publica el plan Entre Semana ($200.000 frente a
 * $350.000), pero la regla se escribe sobre el DATO y no sobre el nombre del
 * plan: si mañana el hotel carga una para Estándar, funciona sola.
 */
function precioDeTarifa(
  tarifa: TarifaCotizable,
  adultos: number,
): { precio: number; unaPersona: boolean } {
  if (adultos === 1 && typeof tarifa.precio_noche_1_persona === "number") {
    return { precio: tarifa.precio_noche_1_persona, unaPersona: true };
  }
  return { precio: tarifa.precio_noche, unaPersona: false };
}

/* ===========================================================================
 * El desglose en texto (para el mensaje de WhatsApp)
 * ======================================================================== */

/**
 * El desglose escrito, una línea por noche.
 *
 * Va tal cual en el mensaje de WhatsApp: el equipo del hotel recibe la
 * solicitud con las cuentas hechas y no tiene que preguntar nada de vuelta.
 * El formateo de la moneda entra por parámetro para que este módulo siga sin
 * dependencias (y para poder probarlo con números planos).
 */
export function desgloseEnTexto(
  cotizacion: Extract<Cotizacion, { posible: true }>,
  formatearMoneda: (valor: number) => string,
  formatearFecha: (fecha: string) => string,
): string[] {
  const lineas = cotizacion.lineas.map((linea) => {
    const etiqueta = linea.festivo
      ? `${formatearFecha(linea.fecha)} (${linea.festivo})`
      : formatearFecha(linea.fecha);
    return `• ${etiqueta} — ${linea.plan}: ${formatearMoneda(linea.precio)}`;
  });
  lineas.push(`Total: ${formatearMoneda(cotizacion.total)}`);
  return lineas;
}
