/**
 * Qué días se pueden pulsar en el calendario del sitio público.
 *
 * ---------------------------------------------------------------------------
 * LA SEMÁNTICA HOTELERA, EXACTA
 * ---------------------------------------------------------------------------
 * Una estadía es el rango semiabierto `[llegada, salida)`: se duerme la noche
 * de la llegada y NO la de la salida (igual que en `noches.ts` y en la
 * restricción de exclusión de Postgres). De ahí salen las tres reglas:
 *
 *   · **Un día con la noche ocupada no puede ser llegada.** Si otra reserva
 *     tiene las noches del 10 y el 11, ni el 10 ni el 11 sirven para llegar.
 *   · **Un día puede ser salida si TODAS las noches entre la llegada y ese día
 *     están libres.** El rango no puede saltar por encima de una noche ocupada.
 *     Con la reserva del 10 y el 11, quien llega el 8 puede salir el 9 o el
 *     10 —sale la mañana en que el otro llega—, pero no el 11 ni después.
 *   · **Se puede llegar el día en que otro sale.** El 12 está libre: la noche
 *     del 12 no es de nadie, aunque esa mañana se vaya otro huésped.
 *
 * Una noche «bloqueada» no es solo una noche ocupada: también es una noche que
 * esa cabaña **no vende** (la 02 solo tiene tarifa de fin de semana, §2 de
 * `docs/DATOS_CLIENTE.md`). Para el calendario las dos son lo mismo: no se
 * puede dormir esa noche ahí. Por eso todo el módulo trabaja con un
 * `BloqueoDeNoche` —una función que dice si una noche está bloqueada y por
 * qué— y no con una lista de fechas.
 *
 * ---------------------------------------------------------------------------
 * ESTO ES EXPERIENCIA DE USO, NO SEGURIDAD
 * ---------------------------------------------------------------------------
 * El tachado evita que el huésped elija a ciegas y descubra después que no
 * hay sitio. Pero la ocupación se cargó hace un rato y puede haber cambiado:
 * la palabra final la tienen el servidor (`/api/reservar` vuelve a comprobar)
 * y, por debajo, la restricción de exclusión de Postgres. Nada de lo que
 * decida este módulo autoriza una reserva.
 *
 * Puro: sin red, sin reloj y sin React. El «hoy» llega como dato, calculado en
 * el servidor en hora de Bogotá.
 */

import type { FechaISO } from "../utils/formato";
import { planCubre, type PlanCotizable } from "./cotizacion";
import { cupoDelDia } from "./dia-de-calma";
import {
  etiquetaTipoNoche,
  MOTIVO_SIN_ANTELACION,
  sumarDias,
  tipoDeNoche,
  type TipoNoche,
} from "./noches";

/* ===========================================================================
 * Constantes
 * ======================================================================== */

/**
 * Tope de la ventana que acepta `/api/disponibilidad`, en días.
 *
 * Vive aquí y no en el route handler porque Next no deja exportar constantes
 * arbitrarias desde un `route.ts`, y el calendario necesita saberlo para
 * partir sus consultas. El endpoint lo importa de aquí: una sola cifra.
 */
export const MAXIMO_DIAS_DISPONIBILIDAD = 92;

/** Cuántos meses pide el calendario de una vez: el visible y el siguiente. */
export const MESES_POR_CONSULTA = 2;

/*
  Los MOTIVOS cortos. Van al `aria-label` de la casilla, detrás de la fecha:
  «lunes 12 de octubre — ocupado: esa noche ya está reservada». Empiezan en
  minúscula porque se leen como continuación de la fecha.
*/
export const MOTIVO_PASADO = "ya pasó";
export const MOTIVO_ANTES_DE_LLEGADA = "es anterior a la llegada";
export const MOTIVO_OCUPADA = "ocupado: esa noche ya está reservada";
export const MOTIVO_TODAS_OCUPADAS =
  "ocupado: esa noche no queda ninguna cabaña libre";
export const MOTIVO_TRAS_OCUPADA =
  "no se puede salir ese día: antes hay una noche ocupada";
export const MOTIVO_SIN_CUPO = "sin cupo: ese día ya está completo";

/** «no disponible: la Cabaña 02 no se ofrece para noches entre semana». */
export function motivoNoOfrecida(
  tipo: TipoNoche,
  nombreCabana?: string | null,
): string {
  const quien = nombreCabana ? `la ${nombreCabana}` : "esta cabaña";
  return `no disponible: ${quien} no se ofrece para ${etiquetaTipoNoche(tipo, true)}`;
}

/* ===========================================================================
 * Bloqueos de noche
 * ======================================================================== */

export type CausaBloqueo = "ocupada" | "no_ofrecida";

export type Bloqueo = { causa: CausaBloqueo; motivo: string };

/** Dice si esa noche está bloqueada (y por qué) o `null` si está libre. */
export type BloqueoDeNoche = (noche: FechaISO) => Bloqueo | null;

/** Ninguna noche bloqueada: el Día de Calma, o mientras no hay datos. */
export const SIN_BLOQUEO: BloqueoDeNoche = () => null;

/**
 * Los tipos de noche que vende una cabaña, según sus tarifas.
 *
 * La 02 solo tiene Estándar → `["fin_de_semana"]`. Si una cabaña no trae
 * ninguna tarifa (catálogo sin cargar) devuelve `null`: sin datos no se apaga
 * nada, y el cotizador ya explica que falta el precio. Apagar el calendario
 * entero por un dato ausente sería peor que no apagar nada.
 */
export function tiposOfrecidosDe(cabana: {
  tarifas: readonly { plan: PlanCotizable }[];
}): TipoNoche[] | null {
  if (cabana.tarifas.length === 0) return null;
  const tipos: TipoNoche[] = [];
  for (const tipo of ["entre_semana", "fin_de_semana"] as const) {
    if (cabana.tarifas.some((tarifa) => planCubre(tarifa.plan, tipo))) {
      tipos.push(tipo);
    }
  }
  return tipos;
}

/**
 * El bloqueo de UNA cabaña: sus noches ocupadas y las que no vende.
 *
 * `ocupadas` son fechas ISO de noches tomadas, tal cual las devuelve
 * `/api/disponibilidad`. `tiposOfrecidos` = `null` significa «vende todas».
 */
export function bloqueoDeCabana({
  ocupadas,
  tiposOfrecidos = null,
  nombreCabana = null,
  motivoOcupada = MOTIVO_OCUPADA,
}: {
  ocupadas: Iterable<FechaISO>;
  tiposOfrecidos?: readonly TipoNoche[] | null;
  nombreCabana?: string | null;
  motivoOcupada?: string;
}): BloqueoDeNoche {
  const conjunto = new Set(ocupadas);
  const tipos = tiposOfrecidos ? new Set(tiposOfrecidos) : null;
  return (noche) => {
    if (conjunto.has(noche)) return { causa: "ocupada", motivo: motivoOcupada };
    if (tipos) {
      const tipo = tipoDeNoche(noche);
      if (!tipos.has(tipo)) {
        return {
          causa: "no_ofrecida",
          motivo: motivoNoOfrecida(tipo, nombreCabana),
        };
      }
    }
    return null;
  };
}

/**
 * Las noches en que NINGUNA cabaña está libre.
 *
 * Es lo que tacha el módulo de la portada mientras no hay cabaña elegida: una
 * noche se apaga solo si está bloqueada en todas. Sin cabañas no se bloquea
 * nada (no hay datos, no se inventa una ocupación).
 */
export function bloqueoComun(
  bloqueos: readonly BloqueoDeNoche[],
  motivo: string = MOTIVO_TODAS_OCUPADAS,
): BloqueoDeNoche {
  if (bloqueos.length === 0) return SIN_BLOQUEO;
  return (noche) =>
    bloqueos.every((bloqueo) => bloqueo(noche) !== null)
      ? { causa: "ocupada", motivo }
      : null;
}

/** De una lista de fechas, las que están bloqueadas. Conserva el orden. */
export function nochesBloqueadas(
  fechas: Iterable<FechaISO>,
  bloqueo: BloqueoDeNoche,
): FechaISO[] {
  const resultado: FechaISO[] = [];
  for (const fecha of fechas) {
    if (bloqueo(fecha) !== null) resultado.push(fecha);
  }
  return resultado;
}

/**
 * La salida más tardía posible desde esta llegada.
 *
 * Es la primera noche bloqueada a partir de la llegada (incluida): se puede
 * salir la mañana de esa noche, no después. Si la noche de la propia llegada
 * está bloqueada, el tope ES la llegada y no hay salida válida.
 *
 * `null` = no hay ninguna noche bloqueada en el horizonte (un año, el mismo
 * tope que `validarRango`). Las noches que todavía no se han cargado cuentan
 * como libres: el servidor lo vuelve a comprobar.
 */
export function topeDeSalida(
  entrada: FechaISO,
  bloqueo: BloqueoDeNoche,
  horizonte = 366,
): FechaISO | null {
  let noche = entrada;
  for (let i = 0; i < horizonte; i++) {
    if (bloqueo(noche) !== null) return noche;
    noche = sumarDias(noche, 1);
  }
  return null;
}

/* ===========================================================================
 * Estado de un día del calendario
 * ======================================================================== */

/** Lo que el huésped lleva elegido. */
export type FaseCalendario = {
  entrada: FechaISO;
  salida: FechaISO;
  /** Día de Calma: una sola fecha, sin salida y sin noche. */
  diaUnico?: boolean;
};

export type ReglasCalendario = {
  /** El «hoy» del hotel, en Bogotá. El pasado se apaga. */
  hoy: FechaISO;
  /** Primera llegada elegible (antelación mínima). Por defecto, `hoy`. */
  minima?: FechaISO | null;
  /** Noches bloqueadas de la cabaña elegida. Por defecto, ninguna. */
  bloqueo?: BloqueoDeNoche;
  /** Días sin cupo del Día de Calma (solo cuenta con `diaUnico`). */
  sinCupo?: (dia: FechaISO) => boolean;
};

export type EstadoDia = {
  activable: boolean;
  /** Por qué no se puede pulsar, para el lector de pantalla. */
  motivo: string | null;
  /**
   * Apagado por OCUPACIÓN —noche tomada, noche que la cabaña no vende, día
   * sin cupo o salida inalcanzable— y no por el calendario en sí (pasado,
   * antelación). Se pinta tachado sobre fondo propio para que se distinga de
   * un día que simplemente ya pasó.
   */
  ocupado: boolean;
};

const LIBRE: EstadoDia = { activable: true, motivo: null, ocupado: false };

/** La primera fecha elegible: `minima` si va por delante de hoy. */
export function primeraElegible(
  hoy: FechaISO,
  minima?: FechaISO | null,
): FechaISO {
  return minima && minima > hoy ? minima : hoy;
}

/** ¿El siguiente clic pone la salida? Solo con llegada y sin salida. */
export function eligiendoSalida(fase: FaseCalendario): boolean {
  return Boolean(fase.entrada) && !fase.salida && !fase.diaUnico;
}

/**
 * Prepara la evaluación de los días para una fase concreta.
 *
 * Devuelve una función por día —el calendario la llama 42 veces por mes— y
 * el tope de salida ya calculado, para no recorrer las noches en cada casilla.
 *
 * Reglas, en orden:
 *   1. El pasado nunca se pulsa.
 *   2. Eligiendo salida: no antes de la llegada (ni ella misma) y no más allá
 *      del tope; el tope sí vale, porque esa mañana todavía no es de nadie.
 *   3. Eligiendo llegada: no antes de la antelación mínima; en modo día, no un
 *      día sin cupo; en hospedaje, no un día cuya noche está bloqueada.
 */
export function evaluadorDeDias(
  fase: FaseCalendario,
  reglas: ReglasCalendario,
): {
  estado: (dia: FechaISO) => EstadoDia;
  /** Última salida posible mientras se elige la salida; si no, `null`. */
  tope: FechaISO | null;
  primera: FechaISO;
} {
  const { hoy } = reglas;
  const bloqueo = reglas.bloqueo ?? SIN_BLOQUEO;
  const sinCupo = reglas.sinCupo ?? (() => false);
  const primera = primeraElegible(hoy, reglas.minima);
  const salidaEnCurso = eligiendoSalida(fase);
  const tope = salidaEnCurso ? topeDeSalida(fase.entrada, bloqueo) : null;

  const estado = (dia: FechaISO): EstadoDia => {
    if (dia < hoy) return { activable: false, motivo: MOTIVO_PASADO, ocupado: false };

    if (salidaEnCurso) {
      if (dia <= fase.entrada) {
        return { activable: false, motivo: MOTIVO_ANTES_DE_LLEGADA, ocupado: false };
      }
      if (tope !== null && dia > tope) {
        return { activable: false, motivo: MOTIVO_TRAS_OCUPADA, ocupado: true };
      }
      return LIBRE;
    }

    if (dia < primera) {
      return { activable: false, motivo: MOTIVO_SIN_ANTELACION, ocupado: false };
    }

    if (fase.diaUnico) {
      return sinCupo(dia)
        ? { activable: false, motivo: MOTIVO_SIN_CUPO, ocupado: true }
        : LIBRE;
    }

    const bloqueada = bloqueo(dia);
    return bloqueada
      ? { activable: false, motivo: bloqueada.motivo, ocupado: true }
      : LIBRE;
  };

  return { estado, tope, primera };
}

/* ===========================================================================
 * ¿Siguen valiendo unas fechas que ya estaban puestas?
 * ======================================================================== */

export type ResultadoFechas =
  | { valido: true }
  | {
      valido: false;
      causa: CausaBloqueo | "sin_cupo" | "antelacion";
      motivo: string;
      /** La primera noche (o el día) que falla. */
      fecha: FechaISO;
    };

/**
 * Comprueba fechas que llegaron de fuera del calendario: por la dirección
 * (`?entrada=&salida=` desde la portada o la ficha de una cabaña) o elegidas
 * para OTRA cabaña antes de cambiar de opinión.
 *
 * Aplica exactamente las reglas del calendario: si el calendario no las
 * habría dejado elegir, no valen. Sin llegada no hay nada que comprobar.
 */
export function validarFechas(
  fase: FaseCalendario,
  reglas: ReglasCalendario,
): ResultadoFechas {
  const { entrada, salida } = fase;
  if (!entrada) return { valido: true };

  const primera = primeraElegible(reglas.hoy, reglas.minima);
  if (entrada < primera) {
    return {
      valido: false,
      causa: "antelacion",
      motivo: entrada < reglas.hoy ? MOTIVO_PASADO : MOTIVO_SIN_ANTELACION,
      fecha: entrada,
    };
  }

  if (fase.diaUnico) {
    return reglas.sinCupo?.(entrada)
      ? { valido: false, causa: "sin_cupo", motivo: MOTIVO_SIN_CUPO, fecha: entrada }
      : { valido: true };
  }

  const bloqueo = reglas.bloqueo ?? SIN_BLOQUEO;
  /* Sin salida, solo la noche de la llegada; con salida, todas las de la
     estadía. Mismo tope de un año que `validarRango`. */
  const ultima = salida && salida > entrada ? salida : sumarDias(entrada, 1);
  let noche = entrada;
  for (let i = 0; i < 366 && noche < ultima; i++) {
    const bloqueada = bloqueo(noche);
    if (bloqueada) {
      return {
        valido: false,
        causa: bloqueada.causa,
        motivo: bloqueada.motivo,
        fecha: noche,
      };
    }
    noche = sumarDias(noche, 1);
  }
  return { valido: true };
}

/* ===========================================================================
 * Cupo del Día de Calma por día
 * ======================================================================== */

/**
 * Los días sin cupo, a partir de lo que devuelve `/api/disponibilidad` en su
 * campo `dia` (`{ "2026-10-10": 10 }` = diez personas ese día).
 */
export function diasSinCupo(
  usados: Readonly<Record<FechaISO, number>>,
): FechaISO[] {
  return Object.entries(usados)
    .filter(([fecha, cantidad]) => cupoDelDia(fecha, Number(cantidad)).lleno)
    .map(([fecha]) => fecha)
    .sort();
}

/* ===========================================================================
 * Ventanas de consulta, por meses
 * ======================================================================== */

/** `AAAA-MM` de una fecha `AAAA-MM-DD`. */
export function mesDe(fecha: FechaISO): string {
  return fecha.slice(0, 7);
}

/** Suma meses a un `AAAA-MM`. */
export function sumarMeses(mes: string, cantidad: number): string {
  const [anio, numero] = mes.split("-").map(Number);
  const total = anio * 12 + (numero - 1) + cantidad;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}`;
}

/** Todos los días de un `AAAA-MM`, en orden. */
export function diasDelMes(mes: string): FechaISO[] {
  const dias: FechaISO[] = [];
  const siguiente = `${sumarMeses(mes, 1)}-01`;
  for (let dia = `${mes}-01`; dia < siguiente; dia = sumarDias(dia, 1)) {
    dias.push(dia);
  }
  return dias;
}

export type VentanaConsulta = {
  /** Primer día consultado, incluido. */
  desde: FechaISO;
  /** Día siguiente al último consultado (rango semiabierto, como la API). */
  hasta: FechaISO;
  meses: string[];
};

/**
 * Qué meses hay que pedir para ver `mesVisible` sin esperas.
 *
 * Hacen falta el visible y el siguiente —así pasar de página no espera—. Se
 * empieza por el primero que falte y se pide de corrido hasta
 * {@link MESES_POR_CONSULTA} meses, parando en el primero que ya esté. Dos
 * meses son como mucho 62 días: siempre dentro de
 * {@link MAXIMO_DIAS_DISPONIBILIDAD}.
 *
 * `null` = ya está todo pedido.
 */
export function ventanaPorCargar(
  mesVisible: string,
  yaPedido: (mes: string) => boolean,
): VentanaConsulta | null {
  const necesarios = [mesVisible, sumarMeses(mesVisible, 1)];
  const primero = necesarios.find((mes) => !yaPedido(mes));
  if (!primero) return null;

  const meses = [primero];
  while (meses.length < MESES_POR_CONSULTA) {
    const siguiente = sumarMeses(meses[meses.length - 1], 1);
    if (yaPedido(siguiente)) break;
    meses.push(siguiente);
  }

  return {
    desde: `${meses[0]}-01`,
    hasta: `${sumarMeses(meses[meses.length - 1], 1)}-01`,
    meses,
  };
}

/** Lo que guarda la caché por cada mes consultado. */
export type OcupacionDelMes = {
  /** Noches ocupadas de ese mes, por `slug` de cabaña. */
  cabanas: Record<string, FechaISO[]>;
  /** Personas del Día de Calma por día de ese mes. */
  dia: Record<FechaISO, number>;
};

/**
 * Reparte la respuesta de `/api/disponibilidad` en un trozo por mes, para que
 * la caché pueda guardar cada mes por separado y saber cuáles ya tiene.
 */
export function repartirPorMes(
  respuesta: {
    cabanas?: { slug: string; ocupado?: string[] }[];
    dia?: Record<string, number>;
  },
  meses: readonly string[],
): Record<string, OcupacionDelMes> {
  const resultado: Record<string, OcupacionDelMes> = {};
  for (const mes of meses) resultado[mes] = { cabanas: {}, dia: {} };

  for (const cabana of respuesta.cabanas ?? []) {
    for (const mes of meses) resultado[mes].cabanas[cabana.slug] = [];
    for (const fecha of cabana.ocupado ?? []) {
      resultado[mesDe(fecha)]?.cabanas[cabana.slug]?.push(fecha);
    }
  }

  for (const [fecha, cantidad] of Object.entries(respuesta.dia ?? {})) {
    const trozo = resultado[mesDe(fecha)];
    if (trozo) trozo.dia[fecha] = Number(cantidad) || 0;
  }

  return resultado;
}
