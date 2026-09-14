/**
 * Las NOCHES de una estadía, y de qué tipo es cada una.
 *
 * ---------------------------------------------------------------------------
 * EL MODELO (§3 de `docs/DATOS_CLIENTE.md`, decidido con Cesar el 2026-09-14)
 * ---------------------------------------------------------------------------
 * En La Finca **el plan es una consecuencia de la noche, no una elección
 * libre**. Cada noche se cobra con la tarifa que le corresponde a su fecha:
 *
 *   · Noche **entre semana** (lunes a jueves, no festiva) → plan Entre Semana.
 *   · Noche de **fin de semana o festivo** (viernes, sábado, domingo y
 *     cualquier festivo de Colombia) → el huésped elige Estándar o Premium.
 *
 * Una noche se identifica SIEMPRE por la fecha de su check-in: quien entra el
 * viernes y sale el sábado durmió «una noche de fin de semana», aunque el
 * sábado sea otro día. Es como lo cuenta el hotel y como lo cuenta la tabla
 * `tarifas`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO YA NO BLOQUEA FECHAS
 * ---------------------------------------------------------------------------
 * La versión anterior (`src/lib/reglas-reserva.ts`, retirado) prohibía las
 * estadías **mixtas**: un jueves→sábado se rechazaba porque mezclaba un tipo de
 * noche con el otro. Eso producía el fallo que reportó Cesar —elegir ciertas
 * fechas dejaba el plan congelado y ya no se podía cambiar—, y además no es lo
 * que hace el hotel: las mixtas se permiten y se **desglosan noche por noche**.
 *
 * Aquí no hay ninguna función que diga «no». Este módulo solo CLASIFICA. Quién
 * puede cobrar qué lo decide `cotizacion.ts`, y la interfaz nunca apaga un día
 * del calendario por culpa de un plan.
 *
 * ---------------------------------------------------------------------------
 * MÓDULO PURO
 * ---------------------------------------------------------------------------
 * Ni `Date.now()`, ni zona horaria, ni una sola lectura de la base: entran dos
 * fechas `AAAA-MM-DD` y sale una lista. Por eso se puede probar entero y correr
 * igual en el servidor (para cobrar) y en el navegador (para mostrar).
 * La aritmética va en UTC al mediodía, como en todo el proyecto: doce horas de
 * margen a cada lado, así que ningún desfase horario corre un día.
 */

import { esFestivo, nombreDelFestivo } from "../festivos-colombia";
import type { FechaISO } from "../utils/formato";

/* ===========================================================================
 * El interruptor de la víspera
 * ======================================================================== */

/**
 * ¿La **víspera** de un festivo entre semana se cobra como fin de semana?
 *
 * `TODO` (Amapola / Juan Camilo): dormir el domingo para disfrutar el lunes
 * festivo ya está cubierto —el domingo es fin de semana de todos modos—, pero
 * un miércoles víspera de un jueves festivo, no. El hotel **no lo ha
 * confirmado**, así que se deja en `false`: es la opción que no le cobra de más
 * a nadie. El día que lo confirme, se cambia esta constante y todo el sitio
 * —calendario, desglose, total y mensaje de WhatsApp— se entera a la vez.
 */
export const CONTAR_VISPERA = false;

/* ===========================================================================
 * Tipos
 * ======================================================================== */

/**
 * El tipo de una noche.
 *
 * Se escribe con guion bajo (`fin_de_semana`) a propósito, igual que las claves
 * de la base: son identificadores que viajan a `tarifas` y al desglose, no
 * texto para mostrar. Lo que ve el huésped sale de `etiquetaTipoNoche()`.
 */
export type TipoNoche = "entre_semana" | "fin_de_semana";

/** Una noche de la estadía, ya clasificada. */
export type Noche = {
  /** Fecha del check-in de esa noche, `AAAA-MM-DD`. */
  fecha: FechaISO;
  tipo: TipoNoche;
  /** Nombre del festivo si esa fecha lo es; `null` si no. */
  festivo: string | null;
  /**
   * Cierto si la fecha es víspera de un festivo entre semana. Se calcula
   * siempre —es información útil para explicar el desglose— pero solo cambia
   * el `tipo` cuando `CONTAR_VISPERA` está encendido.
   */
  vispera: boolean;
};

/* ===========================================================================
 * Aritmética de calendario (local y pura)
 * ======================================================================== */

function aUTC(fecha: FechaISO): Date {
  return new Date(`${fecha}T12:00:00Z`);
}

function aISO(fecha: Date): FechaISO {
  return fecha.toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha `AAAA-MM-DD`. */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const copia = aUTC(fecha);
  copia.setUTCDate(copia.getUTCDate() + dias);
  return aISO(copia);
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function diaDeLaSemana(fecha: FechaISO): number {
  const numero = aUTC(fecha).getUTCDay();
  return numero === 0 ? 7 : numero;
}

/** `AAAA-MM-DD` y además una fecha que existe (descarta `2026-02-31`). */
export function esFechaISO(valor: unknown): valor is FechaISO {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const fecha = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && aISO(fecha) === valor;
}

/* ===========================================================================
 * Clasificación
 * ======================================================================== */

/** ¿Esta fecha es víspera de un festivo que cae entre semana? */
export function esVisperaDeFestivo(fecha: FechaISO): boolean {
  const siguiente = sumarDias(fecha, 1);
  if (!esFestivo(siguiente)) return false;
  /* Si el festivo cae en sábado o domingo, la víspera es viernes o sábado:
     ya son fin de semana por su cuenta y no hay nada que decidir. */
  return diaDeLaSemana(siguiente) <= 4;
}

/**
 * Clasifica UNA noche por la fecha de su check-in.
 *
 * · **fin_de_semana**: viernes, sábado, domingo o cualquier festivo.
 * · **entre_semana**: lunes a jueves que no sea festivo.
 */
export function tipoDeNoche(fecha: FechaISO): TipoNoche {
  if (esFestivo(fecha)) return "fin_de_semana";
  if (diaDeLaSemana(fecha) >= 5) return "fin_de_semana";
  if (CONTAR_VISPERA && esVisperaDeFestivo(fecha)) return "fin_de_semana";
  return "entre_semana";
}

/**
 * Las noches de la estadía `[entrada, salida)`, en orden y ya clasificadas.
 *
 * El rango es **semiabierto**: se duerme la noche de la entrada y NO la de la
 * salida. Un jueves→sábado son dos noches (jueves y viernes), no tres.
 *
 * Si el rango está vacío o al revés devuelve `[]`, sin lanzar: un formulario a
 * medio llenar no es un error del programa. Quien necesite el motivo en
 * español tiene `validarRango()`.
 */
export function nochesDe(entrada: FechaISO, salida: FechaISO): Noche[] {
  if (!esFechaISO(entrada) || !esFechaISO(salida) || salida <= entrada) {
    return [];
  }

  const noches: Noche[] = [];
  let cursor = entrada;
  /* Tope de seguridad: un año. Nadie reserva más, y evita que una fecha
     absurda escrita a mano en la dirección deje el navegador colgado. */
  for (let i = 0; i < 366 && cursor < salida; i++) {
    noches.push({
      fecha: cursor,
      tipo: tipoDeNoche(cursor),
      festivo: nombreDelFestivo(cursor),
      vispera: esVisperaDeFestivo(cursor),
    });
    cursor = sumarDias(cursor, 1);
  }
  return noches;
}

/* ===========================================================================
 * Resúmenes
 * ======================================================================== */

/** Los tipos de noche que aparecen en la estadía, sin repetir y en orden fijo. */
export function tiposPresentes(noches: Noche[]): TipoNoche[] {
  const tipos: TipoNoche[] = [];
  if (noches.some((noche) => noche.tipo === "entre_semana")) {
    tipos.push("entre_semana");
  }
  if (noches.some((noche) => noche.tipo === "fin_de_semana")) {
    tipos.push("fin_de_semana");
  }
  return tipos;
}

/** Cuántas noches de cada tipo. */
export function contarPorTipo(noches: Noche[]): Record<TipoNoche, number> {
  return {
    entre_semana: noches.filter((n) => n.tipo === "entre_semana").length,
    fin_de_semana: noches.filter((n) => n.tipo === "fin_de_semana").length,
  };
}

/** ¿La estadía tiene al menos una noche de fin de semana o festivo? */
export function tieneFinDeSemana(noches: Noche[]): boolean {
  return noches.some((noche) => noche.tipo === "fin_de_semana");
}

/** ¿Mezcla los dos tipos? Se permite: solo sirve para explicar el desglose. */
export function esMixta(noches: Noche[]): boolean {
  return tiposPresentes(noches).length === 2;
}

/* ===========================================================================
 * Texto en español
 * ======================================================================== */

/** Cómo se llama cada tipo de noche cuando se le muestra al huésped. */
export function etiquetaTipoNoche(tipo: TipoNoche, plural = false): string {
  if (tipo === "entre_semana") {
    return plural ? "noches entre semana" : "noche entre semana";
  }
  return plural
    ? "noches de fin de semana o festivo"
    : "noche de fin de semana o festivo";
}

/** «1 noche entre semana y 2 noches de fin de semana o festivo». */
export function resumenEnPalabras(noches: Noche[]): string {
  const cuenta = contarPorTipo(noches);
  const partes: string[] = [];
  if (cuenta.entre_semana > 0) {
    partes.push(
      `${cuenta.entre_semana} ${etiquetaTipoNoche("entre_semana", cuenta.entre_semana !== 1)}`,
    );
  }
  if (cuenta.fin_de_semana > 0) {
    partes.push(
      `${cuenta.fin_de_semana} ${etiquetaTipoNoche("fin_de_semana", cuenta.fin_de_semana !== 1)}`,
    );
  }
  return partes.join(" y ");
}

/* ===========================================================================
 * Validación del rango (lo único que puede decir «no»)
 * ======================================================================== */

export type ResultadoRango =
  | { valido: true; noches: Noche[] }
  | { valido: false; motivo: string };

/**
 * Comprueba el rango en sí: que existan las dos fechas, que la salida sea
 * posterior a la llegada y que la estadía no sea absurdamente larga.
 *
 * **No valida planes.** Ninguna combinación de fechas está prohibida por el
 * plan: el plan sale de las noches, no al revés.
 */
export function validarRango(
  entrada: FechaISO | null | undefined,
  salida: FechaISO | null | undefined,
): ResultadoRango {
  if (!entrada || !salida) {
    return { valido: false, motivo: "Elige la fecha de llegada y la de salida." };
  }
  if (!esFechaISO(entrada) || !esFechaISO(salida)) {
    return { valido: false, motivo: "Esas fechas no son válidas." };
  }
  if (salida <= entrada) {
    return {
      valido: false,
      motivo: "La fecha de salida debe ser posterior a la de llegada.",
    };
  }

  const noches = nochesDe(entrada, salida);
  if (noches.length === 0) {
    return { valido: false, motivo: "Esas fechas no son válidas." };
  }
  if (noches.length >= 366) {
    return {
      valido: false,
      motivo:
        "Esa estadía es demasiado larga para reservarla por aquí. Escríbenos por WhatsApp y la armamos contigo.",
    };
  }

  return { valido: true, noches };
}
