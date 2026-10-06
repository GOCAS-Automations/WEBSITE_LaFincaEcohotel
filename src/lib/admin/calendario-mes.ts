/**
 * El calendario de ocupación del panel (`/admin/reservas`), ya armado.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO ES UN MÓDULO PURO
 * ---------------------------------------------------------------------------
 * La misma ocupación se pinta de dos maneras: como cuadrícula del mes en
 * escritorio y como agenda día por día en el celular. Si cada vista decidiera
 * por su cuenta qué ocupa cada noche, tarde o temprano dirían cosas distintas.
 * Aquí se decide UNA vez —con las mismas reglas de siempre— y las dos vistas
 * solo dibujan.
 *
 * ---------------------------------------------------------------------------
 * QUÉ OCUPA CADA NOCHE, Y QUIÉN MANDA
 * ---------------------------------------------------------------------------
 * Tres fuentes, de abajo arriba:
 *
 *   1. **El calendario de Google del hotel.** Lo que el equipo apunta a mano.
 *      Un evento sin cabaña reconocible se pinta en todas, igual que bloquea
 *      todas en la disponibilidad (`cabanasAfectadas`).
 *   2. **Los bloqueos** del panel.
 *   3. **Las reservas** de la base (sitio web y panel). Mandan: son las que
 *      tienen nombre, código y teléfono. Una cancelada, o una solicitud cuyo
 *      hold venció, no ocupa (`ocupaCalendario`, la misma regla que el sitio).
 *
 * Los eventos que escribió el propio sitio (`origen = lafinca-web`) ya llegan
 * descartados de `ocupacionDesdeEventos`: son reservas de la base y pintarlos
 * otra vez sería verlas dos veces.
 *
 * Las noches seguidas de lo mismo se juntan en UNA barra, con su primer día y
 * cuántas noches dura. Así la barra lleva el nombre a lo ancho de toda la
 * estadía y no solo en su primera casilla.
 *
 * Fechas como texto `AAAA-MM-DD` y rangos `[entrada, salida)`, como en todo el
 * proyecto. Sin React, sin red, sin reloj: «hoy» y «ahora» llegan como datos.
 */

import {
  diasDeMes,
  esFinDeSemana,
  indiceDiaSemana,
  rangoConDias,
  sumarDiasISO,
  type AnioMes,
} from "./fechas";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  type BloqueoAdmin,
  type OpcionAlojamiento,
  type ReservaAdmin,
} from "./tipos";
import { nombreDelFestivo } from "../festivos-colombia";
import {
  cabanasAfectadas,
  diasDeCalmaPorFecha,
  personasDeDiaDeCalmaPorFecha,
  sumarPorFecha,
  type DiaDeCalmaExterno,
  type OcupacionExterna,
} from "../reserva/calendario-externo";
import { ocupaCalendario } from "../reserva/holds";
import type { EstadoReserva } from "../tipos/basedatos";

/** Abreviatura del día de la semana, de lunes (0) a domingo (6). */
const DIAS_CORTOS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export type DiaDelCalendario = {
  iso: string;
  numero: number;
  /** «lun», «mar»… */
  semana: string;
  /** Sábado o domingo. */
  finDeSemana: boolean;
  /** Nombre del festivo de Colombia, si lo es. */
  festivo: string | null;
  /** Fin de semana o festivo: la columna lleva un tono suave. */
  destacado: boolean;
  esHoy: boolean;
};

export type FuenteBarra = "reserva" | "bloqueo" | "google";

/** Un tramo continuo de noches ocupadas por lo mismo, en una cabaña. */
export type Barra = {
  clave: string;
  fuente: FuenteBarra;
  /** Índice (desde 0) del primer día del mes que cubre la barra. */
  inicio: number;
  /** Cuántas noches (columnas) cubre dentro del mes. */
  noches: number;
  /** La estadía empezó antes del mes / sigue después: el borde va recto. */
  continuaAntes: boolean;
  continuaDespues: boolean;
  /** Llegada y salida reales de la estadía, no recortadas al mes. */
  entrada: string;
  salida: string;
  /** Lo que se lee dentro de la barra: el huésped o el título del evento. */
  etiqueta: string;
  /** La frase completa, para el `title` y el lector de pantalla. */
  detalle: string;
  /** Ficha de la reserva; solo las de la base tienen. */
  href: string | null;
  estado: EstadoReserva | null;
  /** Evento de Google que no dice qué cabaña: se pinta en todas. */
  sinCabana: boolean;
};

export type FilaCabana = {
  id: string;
  nombre: string;
  activo: boolean;
  barras: Barra[];
};

export type CalendarioDelMes = {
  dias: DiaDelCalendario[];
  filas: FilaCabana[];
  /**
   * Personas del Día de Calma por fecha (solo las fechas con alguien). Incluye
   * los «plan día» del calendario del hotel, 2 cada uno (regla 2b de
   * `calendario-externo.ts`).
   */
  personasDeDia: Record<string, number>;
  /** Títulos de los «plan día» del calendario del hotel, por fecha. */
  diaDeCalmaDelHotel: Record<string, string[]>;
};

type Ocupante =
  | { fuente: "reserva"; reserva: ReservaAdmin }
  | { fuente: "bloqueo"; bloqueo: BloqueoAdmin }
  | { fuente: "google"; franja: OcupacionExterna };

function identidad(ocupante: Ocupante | undefined): string | null {
  if (!ocupante) return null;
  if (ocupante.fuente === "reserva") return `reserva:${ocupante.reserva.id}`;
  if (ocupante.fuente === "bloqueo") return `bloqueo:${ocupante.bloqueo.id}`;
  return `google:${ocupante.franja.eventoId}|${ocupante.franja.inicio}`;
}

function rangoDe(ocupante: Ocupante): { entrada: string; salida: string } {
  if (ocupante.fuente === "reserva") {
    return { entrada: ocupante.reserva.entrada, salida: ocupante.reserva.salida };
  }
  if (ocupante.fuente === "bloqueo") {
    return { entrada: ocupante.bloqueo.inicio, salida: ocupante.bloqueo.fin };
  }
  return { entrada: ocupante.franja.inicio, salida: ocupante.franja.fin };
}

/** La frase completa de una barra, en español y con fechas `dd/mm/aaaa`. */
function describir(ocupante: Ocupante): {
  etiqueta: string;
  detalle: string;
} {
  const { entrada, salida } = rangoDe(ocupante);
  const fechas = `del ${rangoConDias(entrada, salida)}`;
  if (ocupante.fuente === "reserva") {
    const { reserva } = ocupante;
    return {
      etiqueta: reserva.huesped_nombre || reserva.codigo,
      detalle: `${reserva.huesped_nombre} · ${reserva.codigo} · ${
        ETIQUETA_ESTADO[reserva.estado] ?? reserva.estado
      } · ${ETIQUETA_ORIGEN[reserva.origen] ?? reserva.origen} · ${fechas}`,
    };
  }
  if (ocupante.fuente === "bloqueo") {
    const motivo = ocupante.bloqueo.motivo?.trim() || "sin motivo";
    return {
      etiqueta: ocupante.bloqueo.motivo?.trim() || "Bloqueado",
      detalle: `Bloqueo: ${motivo} · ${fechas}`,
    };
  }
  const { franja } = ocupante;
  /* En la barra no hace falta repetir la cabaña: ya lo dice la fila. El
     título completo sigue en el detalle. */
  const etiqueta =
    franja.cabana !== null ? sinCabanaEnTitulo(franja.titulo) : franja.titulo;
  const aclaracion =
    franja.cabana === null
      ? " · el evento no dice qué cabaña, así que ocupa todas"
      : "";
  return {
    etiqueta: etiqueta || franja.titulo || "Ocupado",
    detalle: `Calendario del hotel: «${franja.titulo}» · ${fechas}${aclaracion}`,
  };
}

export function armarCalendarioMes({
  mes,
  hoy,
  alojamientos,
  reservas,
  bloqueos,
  franjas,
  personasDeDia,
  diasDeCalma = [],
  ahora,
}: {
  mes: AnioMes;
  /** Hoy en Bogotá, `AAAA-MM-DD`. */
  hoy: string;
  alojamientos: OpcionAlojamiento[];
  reservas: ReservaAdmin[];
  bloqueos: BloqueoAdmin[];
  /** Franjas del calendario de Google (vacío si no está conectado). */
  franjas: OcupacionExterna[];
  personasDeDia: Map<string, number> | Record<string, number>;
  /**
   * «Plan día» del calendario general del hotel: no ocupan cabaña (no salen
   * en ninguna fila) y suman a la fila del Día de Calma.
   */
  diasDeCalma?: DiaDeCalmaExterno[];
  /** Un solo instante para todo el mes: el hold vence igual en cada casilla. */
  ahora: Date;
}): CalendarioDelMes {
  const fechas = diasDeMes(mes);
  const posicion = new Map(fechas.map((dia, indice) => [dia, indice]));

  const dias: DiaDelCalendario[] = fechas.map((iso) => {
    const festivo = nombreDelFestivo(iso);
    const finDeSemana = esFinDeSemana(iso);
    return {
      iso,
      numero: Number(iso.slice(8, 10)),
      semana: DIAS_CORTOS[indiceDiaSemana(iso)],
      finDeSemana,
      festivo,
      destacado: finDeSemana || festivo !== null,
      esHoy: iso === hoy,
    };
  });

  /* Una ranura por noche y por cabaña; lo de arriba pisa lo de abajo. */
  const noches = new Map<string, (Ocupante | undefined)[]>(
    alojamientos.map((cabana) => [cabana.id, new Array(fechas.length)]),
  );
  const poner = (
    alojamientoId: string,
    entrada: string,
    salida: string,
    ocupante: Ocupante,
  ) => {
    const ranuras = noches.get(alojamientoId);
    if (!ranuras) return;
    for (const dia of fechas) {
      if (dia >= entrada && dia < salida) ranuras[posicion.get(dia)!] = ocupante;
    }
  };

  const cabanas = alojamientos.map((cabana) => ({
    id: cabana.id,
    nombre: cabana.nombre,
  }));
  /* Los eventos que no dicen cabaña van primero (debajo): si en una cabaña
     coinciden con uno que sí la nombra, se ve el que es de esa cabaña. */
  const ordenadas = [...franjas].sort(
    (a, b) => Number(a.cabana !== null) - Number(b.cabana !== null),
  );
  for (const franja of ordenadas) {
    for (const cabana of cabanasAfectadas(franja, cabanas)) {
      poner(cabana.id, franja.inicio, franja.fin, { fuente: "google", franja });
    }
  }
  for (const bloqueo of bloqueos) {
    poner(bloqueo.alojamiento_id, bloqueo.inicio, bloqueo.fin, {
      fuente: "bloqueo",
      bloqueo,
    });
  }
  for (const reserva of reservas) {
    /* Las de Día de Calma no ocupan cabaña: van en su propia fila. */
    if (reserva.tipo === "dia" || !reserva.alojamiento_id) continue;
    if (!ocupaCalendario(reserva, ahora)) continue;
    poner(reserva.alojamiento_id, reserva.entrada, reserva.salida, {
      fuente: "reserva",
      reserva,
    });
  }

  const filas: FilaCabana[] = alojamientos.map((cabana) => {
    const ranuras = noches.get(cabana.id) ?? [];
    const barras: Barra[] = [];
    let indice = 0;
    while (indice < fechas.length) {
      const ocupante = ranuras[indice];
      if (!ocupante) {
        indice++;
        continue;
      }
      const clave = identidad(ocupante);
      let fin = indice + 1;
      while (fin < fechas.length && identidad(ranuras[fin]) === clave) fin++;

      const { entrada, salida } = rangoDe(ocupante);
      const { etiqueta, detalle } = describir(ocupante);
      barras.push({
        clave: `${clave}|${indice}`,
        fuente: ocupante.fuente,
        inicio: indice,
        noches: fin - indice,
        continuaAntes: fechas[indice] > entrada,
        continuaDespues: salida > sumarDiasISO(fechas[fin - 1], 1),
        entrada,
        salida,
        etiqueta,
        detalle,
        href:
          ocupante.fuente === "reserva"
            ? `/admin/reservas/${ocupante.reserva.id}`
            : null,
        estado: ocupante.fuente === "reserva" ? ocupante.reserva.estado : null,
        sinCabana: ocupante.fuente === "google" && ocupante.franja.cabana === null,
      });
      indice = fin;
    }
    return { id: cabana.id, nombre: cabana.nombre, activo: cabana.activo, barras };
  });

  const primerDia = fechas[0];
  const finDelMes = sumarDiasISO(fechas[fechas.length - 1], 1);
  const personas: Record<string, number> = {};
  const entradas = Object.entries(
    sumarPorFecha(
      personasDeDia,
      personasDeDiaDeCalmaPorFecha(diasDeCalma, primerDia, finDelMes),
    ),
  );
  for (const [dia, cantidad] of entradas) {
    if (posicion.has(dia) && cantidad > 0) personas[dia] = cantidad;
  }
  const diaDeCalmaDelHotel = Object.fromEntries(
    Object.entries(diasDeCalmaPorFecha(diasDeCalma, primerDia, finDelMes)).map(
      ([dia, eventos]) => [dia, eventos.map((evento) => evento.titulo)],
    ),
  );

  return { dias, filas, personasDeDia: personas, diaDeCalmaDelHotel };
}


/**
 * Quita del título de un evento la mención de la cabaña: «Diana Montoya
 * cabaña 1» → «Diana Montoya». Si no queda nada, devuelve el título tal cual.
 */
export function sinCabanaEnTitulo(titulo: string): string {
  const limpio = titulo
    .replace(
      /[\s,;:·\-–—]*\(?\s*(?<!\p{L})(?:caba[ñn]a|cab\.?)\s*(?:n[°ºo.]\s*)?#?\s*0?\d{1,2}(?!\d)\s*\)?/giu,
      " ",
    )
    .replace(/\s{2,}/g, " ")
    /* Lo que separaba la cabaña del nombre («Cabaña 04 - Kelly») sobra. */
    .replace(/^[\s,;:·\-–—]+|[\s,;:·\-–—]+$/gu, "")
    .trim();
  return limpio || titulo;
}

/* ===========================================================================
 * Lo que pasa en un día concreto (la agenda del celular)
 * ======================================================================== */

export type EstadoCabanaEnDia = {
  id: string;
  nombre: string;
  activo: boolean;
  /** Lo que ocupa la noche de ese día, o `null` si está libre. */
  noche: Barra | null;
  /** ¿Esa estadía empieza ese día? */
  llega: boolean;
  /** Estadía que termina esa mañana (sale el huésped), si la hay. */
  sale: Barra | null;
};

/**
 * Cabaña por cabaña, qué pasa el día `indice` del mes: quién duerme esa
 * noche, si llega alguien y si sale alguien por la mañana.
 */
export function cabanasEnDia(
  calendario: Pick<CalendarioDelMes, "filas">,
  indice: number,
): EstadoCabanaEnDia[] {
  return calendario.filas.map((fila) => {
    const noche =
      fila.barras.find(
        (barra) => barra.inicio <= indice && indice < barra.inicio + barra.noches,
      ) ?? null;
    const sale =
      fila.barras.find(
        (barra) => barra.inicio + barra.noches === indice && !barra.continuaDespues,
      ) ?? null;
    return {
      id: fila.id,
      nombre: fila.nombre,
      activo: fila.activo,
      noche,
      llega: noche !== null && noche.inicio === indice && !noche.continuaAntes,
      /* Si la misma barra sigue esa noche, no «sale»: es la misma estadía. */
      sale: sale && sale !== noche ? sale : null,
    };
  });
}
