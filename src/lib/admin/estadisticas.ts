/**
 * Las cifras del Resumen del panel, contando TODAS las reservas: las de la
 * base (sitio web y panel) y las que el hotel apunta a mano en su calendario
 * de Google.
 *
 * ---------------------------------------------------------------------------
 * SIN CONTAR DOS VECES
 * ---------------------------------------------------------------------------
 * Una misma estadía podría llegar por dos caminos. Se evita en tres capas:
 *
 *   1. **Lo que escribió el propio sitio en Google no entra.** Las reservas del
 *      panel se apuntan en el calendario del hotel con la marca
 *      `origen = lafinca-web`; `ocupacionDesdeEventos()` las descarta antes de
 *      llegar aquí, igual que hace la disponibilidad. Ya están en la base.
 *   2. **El mismo evento en dos calendarios** (el general y el de su cabaña)
 *      se une en uno en `ocupacionDesdeVariosCalendarios()`.
 *   3. **Una estadía apuntada a mano en Google que además está en la base**
 *      (misma cabaña, mismas fechas exactas) se cuenta una sola vez, como la
 *      de la base, que es la que tiene nombre, código y montos. Aquí, en
 *      {@link estadiasDelHotel}.
 *
 * Y las NOCHES se cuentan con un conjunto por cabaña: aunque dos fuentes se
 * pisen, una noche ocupada es una noche.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO SE INVENTA
 * ---------------------------------------------------------------------------
 * · **Los ingresos** solo existen para las reservas de la base: un evento de
 *   Google no tiene precio. Van aparte y se dice de dónde salen.
 * · **Un evento de Google que no dice qué cabaña** bloquea las cinco en la
 *   disponibilidad (es lo prudente para no vender dos veces), pero para estas
 *   cifras sería mentir decir que ocupó cinco cabañas: se cuenta como UNA
 *   reserva «sin cabaña», sale en las llegadas, y queda fuera del porcentaje
 *   de ocupación, que lo dice.
 *
 * Puro: sin red y sin reloj. Fechas `AAAA-MM-DD`, rangos `[entrada, salida)`.
 */

import { diasDeMes, sumarDiasISO, type AnioMes } from "./fechas";
import type { BloqueoAdmin, OpcionAlojamiento, ReservaAdmin } from "./tipos";
import { sinCabanaEnTitulo } from "./calendario-mes";
import {
  cabanasAfectadas,
  type DiaDeCalmaExterno,
  type OcupacionExterna,
} from "../reserva/calendario-externo";
import { ocupaCalendario } from "../reserva/holds";
import { tipoDeNoche, type TipoNoche } from "../reserva/noches";
import type { EstadoReserva } from "../tipos/basedatos";

/** De dónde salió una estadía. */
export type FuenteEstadia = "sitio" | "panel" | "calendario";

/** Una estadía (o un Día de Calma), venga de donde venga. */
export type Estadia = {
  clave: string;
  fuente: FuenteEstadia;
  /** Nombre del huésped; para Google, el título sin la mención de la cabaña. */
  nombre: string;
  /** «Cabaña 03», «Día de Calma» o «Sin cabaña». */
  cabana: string;
  alojamientoId: string | null;
  entrada: string;
  salida: string;
  /** Día de Calma: no ocupa cabaña. */
  esDia: boolean;
  /** Personas, si se saben (las de Google no lo dicen). */
  personas: number | null;
  /** Ficha de la reserva (solo las de la base). */
  href: string | null;
  estado: EstadoReserva | null;
  /** Evento de Google que no nombra cabaña. */
  sinCabana: boolean;
};

const ETIQUETA_FUENTE: Record<FuenteEstadia, string> = {
  sitio: "Sitio web",
  panel: "Panel",
  calendario: "Calendario del hotel",
};

export function etiquetaFuente(fuente: FuenteEstadia): string {
  return ETIQUETA_FUENTE[fuente];
}

/**
 * Las estadías de las dos fuentes, ya sin duplicados.
 *
 * De la base entran las que ocupan (`ocupaCalendario`: ni canceladas ni
 * solicitudes vencidas). De Google, todas las franjas que llegan —ya sin las
 * del propio sitio— salvo las que repiten una estadía de la base.
 */
export function estadiasDelHotel({
  reservas,
  franjas,
  diasDeCalma = [],
  alojamientos,
  ahora,
}: {
  reservas: ReservaAdmin[];
  franjas: OcupacionExterna[];
  /**
   * «Plan día» del calendario general del hotel (regla 2b de
   * `calendario-externo.ts`): entran como Día de Calma de 2 personas, sin
   * cabaña y sin contar como «evento sin cabaña».
   */
  diasDeCalma?: DiaDeCalmaExterno[];
  alojamientos: OpcionAlojamiento[];
  ahora: Date;
}): Estadia[] {
  const estadias: Estadia[] = [];
  /** cabaña|entrada|salida de cada estadía de la base, para no repetirla. */
  const deLaBase = new Set<string>();

  for (const reserva of reservas) {
    if (!ocupaCalendario(reserva, ahora)) continue;
    const esDia = reserva.tipo === "dia";
    if (!esDia && reserva.alojamiento_id) {
      deLaBase.add(`${reserva.alojamiento_id}|${reserva.entrada}|${reserva.salida}`);
    }
    estadias.push({
      clave: `reserva:${reserva.id}`,
      fuente: reserva.origen === "web" ? "sitio" : "panel",
      nombre: reserva.huesped_nombre,
      cabana: esDia ? "Día de Calma" : (reserva.alojamiento_nombre ?? "Sin cabaña"),
      alojamientoId: esDia ? null : reserva.alojamiento_id,
      entrada: reserva.entrada,
      salida: reserva.salida,
      esDia,
      personas: reserva.num_personas,
      href: `/admin/reservas/${reserva.id}`,
      estado: reserva.estado,
      sinCabana: false,
    });
  }

  const cabanas = alojamientos.map((cabana) => ({ id: cabana.id, nombre: cabana.nombre }));
  for (const franja of franjas) {
    const sinCabana = franja.cabana === null;
    /* La cabaña de la base a la que apunta el evento. Si nombra un número que
       no existe, `cabanasAfectadas` devuelve todas: se trata como sin cabaña. */
    const afectadas = sinCabana ? [] : cabanasAfectadas(franja, cabanas);
    const cabana = afectadas.length === 1 ? afectadas[0] : null;
    if (cabana && deLaBase.has(`${cabana.id}|${franja.inicio}|${franja.fin}`)) {
      continue;
    }
    estadias.push({
      clave: `google:${franja.eventoId}|${franja.inicio}|${franja.cabana ?? "todas"}`,
      fuente: "calendario",
      nombre: cabana ? sinCabanaEnTitulo(franja.titulo) : franja.titulo,
      cabana: cabana?.nombre ?? "Sin cabaña",
      alojamientoId: cabana?.id ?? null,
      entrada: franja.inicio,
      salida: franja.fin,
      esDia: false,
      personas: null,
      href: null,
      estado: null,
      sinCabana: cabana === null,
    });
  }

  for (const dia of diasDeCalma) {
    estadias.push({
      clave: `google-dia:${dia.eventoId}|${dia.inicio}`,
      fuente: "calendario",
      nombre: dia.titulo,
      cabana: "Día de Calma",
      alojamientoId: null,
      entrada: dia.inicio,
      salida: dia.fin,
      esDia: true,
      personas: dia.personas,
      href: null,
      estado: null,
      sinCabana: false,
    });
  }

  return estadias.sort(
    (a, b) =>
      a.entrada.localeCompare(b.entrada) ||
      a.cabana.localeCompare(b.cabana, "es") ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
}

export type OcupacionCabana = {
  id: string;
  nombre: string;
  /** Noches del mes con alguien durmiendo. */
  ocupadas: number;
  /** Noches que se podían vender: sin bloqueos ni noches que no ofrece. */
  disponibles: number;
};

export type ResumenDelHotel = {
  hoy: string;
  llegadasHoy: Estadia[];
  salidasHoy: Estadia[];
  /** Estadías con alguien durmiendo esta noche (sin Días de Calma). */
  enCasa: Estadia[];
  /** Personas del Día de Calma hoy. */
  personasDeDiaHoy: number;
  /** Llegadas de mañana a dentro de 7 días, en orden. */
  llegadasProximas: Estadia[];
  ocupacion: {
    porCabana: OcupacionCabana[];
    ocupadas: number;
    disponibles: number;
    /** Eventos sin cabaña con noches en el mes (no entran en el porcentaje). */
    sinCabana: number;
  };
  /** Reservas con llegada en el mes, por de dónde salieron. */
  porFuente: Record<FuenteEstadia, number>;
  /** De ellas, cuántas son de Día de Calma (sitio y panel). */
  diasDeCalma: number;
  /** Solo de la base: las de Google no tienen montos. */
  ingresos: {
    reservas: number;
    total: number;
    abonado: number;
    porCobrar: number;
  };
};

/** Porcentaje entero, sin dividir por cero. */
export function porcentaje(parte: number, todo: number): number {
  return todo > 0 ? Math.round((parte / todo) * 100) : 0;
}

export function resumirHotel({
  hoy,
  mes,
  alojamientos,
  reservas,
  bloqueos,
  franjas,
  diasDeCalma = [],
  tiposOfrecidos = {},
  ahora,
}: {
  hoy: string;
  mes: AnioMes;
  alojamientos: OpcionAlojamiento[];
  /** Reservas de la base que tocan el mes o los próximos 7 días. */
  reservas: ReservaAdmin[];
  /** Bloqueos que tocan el mes. */
  bloqueos: BloqueoAdmin[];
  /** Franjas de Google (ya sin las del propio sitio). */
  franjas: OcupacionExterna[];
  /** «Plan día» del calendario general del hotel: Día de Calma de 2 personas. */
  diasDeCalma?: DiaDeCalmaExterno[];
  /** Tipos de noche que vende cada cabaña (`null` o ausente = todos). */
  tiposOfrecidos?: Record<string, readonly TipoNoche[] | null>;
  ahora: Date;
}): ResumenDelHotel {
  const estadias = estadiasDelHotel({ reservas, franjas, diasDeCalma, alojamientos, ahora });
  const reservasPorId = new Map(reservas.map((reserva) => [`reserva:${reserva.id}`, reserva]));

  /* --- Hoy y los próximos 7 días --------------------------------------- */
  const enUnaSemana = sumarDiasISO(hoy, 7);
  const llegadasHoy = estadias.filter((estadia) => estadia.entrada === hoy);
  const salidasHoy = estadias.filter(
    (estadia) => !estadia.esDia && estadia.salida === hoy,
  );
  const enCasa = estadias.filter(
    (estadia) => !estadia.esDia && estadia.entrada <= hoy && hoy < estadia.salida,
  );
  const personasDeDiaHoy = estadias
    .filter((estadia) => estadia.esDia && estadia.entrada <= hoy && hoy < estadia.salida)
    .reduce((suma, estadia) => suma + (estadia.personas ?? 0), 0);
  const llegadasProximas = estadias.filter(
    (estadia) => estadia.entrada > hoy && estadia.entrada <= enUnaSemana,
  );

  /* --- La ocupación del mes, noche a noche ----------------------------- */
  const noches = diasDeMes(mes);
  const primerDia = noches[0];
  const finDeMes = sumarDiasISO(noches[noches.length - 1], 1);
  const ocupadasPorCabana = new Map<string, Set<string>>();
  for (const estadia of estadias) {
    if (estadia.esDia || !estadia.alojamientoId) continue;
    const conjunto = ocupadasPorCabana.get(estadia.alojamientoId) ?? new Set<string>();
    for (const noche of noches) {
      if (noche >= estadia.entrada && noche < estadia.salida) conjunto.add(noche);
    }
    ocupadasPorCabana.set(estadia.alojamientoId, conjunto);
  }
  const bloqueadasPorCabana = new Map<string, Set<string>>();
  for (const bloqueo of bloqueos) {
    const conjunto =
      bloqueadasPorCabana.get(bloqueo.alojamiento_id) ?? new Set<string>();
    for (const noche of noches) {
      if (noche >= bloqueo.inicio && noche < bloqueo.fin) conjunto.add(noche);
    }
    bloqueadasPorCabana.set(bloqueo.alojamiento_id, conjunto);
  }

  const porCabana: OcupacionCabana[] = [];
  for (const cabana of alojamientos) {
    const ocupadas = ocupadasPorCabana.get(cabana.id) ?? new Set<string>();
    /* Una cabaña pausada no se vende: solo cuenta si aun así tuvo gente. */
    if (!cabana.activo && ocupadas.size === 0) continue;
    const bloqueadas = bloqueadasPorCabana.get(cabana.id) ?? new Set<string>();
    const tipos = tiposOfrecidos[cabana.id] ?? null;
    let disponibles = 0;
    for (const noche of noches) {
      /* Una noche ocupada siempre cuenta como disponible: si alguien durmió,
         se podía vender. Así el porcentaje nunca pasa del 100 %. */
      if (ocupadas.has(noche)) {
        disponibles++;
        continue;
      }
      if (bloqueadas.has(noche)) continue;
      if (tipos && !tipos.includes(tipoDeNoche(noche))) continue;
      disponibles++;
    }
    porCabana.push({
      id: cabana.id,
      nombre: cabana.nombre,
      ocupadas: ocupadas.size,
      disponibles,
    });
  }

  const sinCabana = estadias.filter(
    (estadia) =>
      estadia.sinCabana && estadia.entrada < finDeMes && primerDia < estadia.salida,
  ).length;

  /* --- Reservas con llegada en el mes, por fuente ----------------------- */
  const delMes = estadias.filter(
    (estadia) => estadia.entrada >= primerDia && estadia.entrada < finDeMes,
  );
  const porFuente: Record<FuenteEstadia, number> = { sitio: 0, panel: 0, calendario: 0 };
  for (const estadia of delMes) porFuente[estadia.fuente]++;

  /* --- Ingresos: solo la base ------------------------------------------ */
  const ingresos = { reservas: 0, total: 0, abonado: 0, porCobrar: 0 };
  for (const estadia of delMes) {
    const reserva = reservasPorId.get(estadia.clave);
    if (!reserva) continue;
    ingresos.reservas++;
    ingresos.total += reserva.total;
    ingresos.abonado += reserva.monto_pagado;
    ingresos.porCobrar += Math.max(0, reserva.total - reserva.monto_pagado);
  }

  return {
    hoy,
    llegadasHoy,
    salidasHoy,
    enCasa,
    personasDeDiaHoy,
    llegadasProximas,
    ocupacion: {
      porCabana,
      ocupadas: porCabana.reduce((suma, cabana) => suma + cabana.ocupadas, 0),
      disponibles: porCabana.reduce((suma, cabana) => suma + cabana.disponibles, 0),
      sinCabana,
    },
    porFuente,
    diasDeCalma: delMes.filter((estadia) => estadia.esDia).length,
    ingresos,
  };
}
