/**
 * Qué noches tiene ocupadas UNA cabaña, para el calendario de la reserva
 * manual del panel.
 *
 * ---------------------------------------------------------------------------
 * LAS MISMAS TRES FUENTES QUE EL SITIO, CON DOS DIFERENCIAS
 * ---------------------------------------------------------------------------
 * Una noche está ocupada si la ocupa una reserva de la base (que siga
 * ocupando: `ocupaCalendario`), un bloqueo del panel o un evento del
 * calendario de Google del hotel (`franjasQueChocan`, la misma regla con que
 * el servidor rechaza la reserva). Es la suma de `/api/disponibilidad`, con
 * dos diferencias que solo tienen sentido en el panel:
 *
 *   1. **Al editar, la propia reserva no cuenta.** Si no, sus noches saldrían
 *      tachadas y no se podría ni conservar las fechas que ya tiene. Es la
 *      misma exclusión que hace `buscarChoques(…, excluirReservaId)` al guardar.
 *   2. **Cualquier cabaña, también las pausadas**: el equipo puede apuntar una
 *      reserva en una cabaña que no se vende en el sitio.
 *
 * El cupo del Día de Calma, igual: las personas de la propia reserva no
 * cuentan al editarla.
 *
 * Puro (sin red, sin reloj): lo usa `/admin/api/ocupacion` y se prueba solo.
 * Fechas `AAAA-MM-DD`, rangos `[entrada, salida)`.
 */

import { sumarDiasISO } from "./fechas";
import {
  franjasQueChocan,
  type OcupacionExterna,
} from "../reserva/calendario-externo";
import { ocupaCalendario } from "../reserva/holds";

/** Lo mínimo de una reserva para saber si ocupa y qué noches. */
export type ReservaParaOcupacion = {
  id: string;
  estado: string;
  expira_at: string | null;
  entrada: string;
  salida: string;
};

export type BloqueoParaOcupacion = { inicio: string; fin: string };

/** Las noches de `[inicio, fin)` que caen dentro de `[desde, hasta)`. */
function nochesDentro(
  inicio: string,
  fin: string,
  desde: string,
  hasta: string,
): string[] {
  const noches: string[] = [];
  const tope = fin < hasta ? fin : hasta;
  for (
    let dia = inicio > desde ? inicio : desde;
    dia < tope && noches.length < 400;
    dia = sumarDiasISO(dia, 1)
  ) {
    noches.push(dia);
  }
  return noches;
}

/**
 * Noches ocupadas de una cabaña entre `desde` y `hasta` (exclusivo), en orden
 * y sin repetir.
 */
export function nochesOcupadasDeCabana({
  nombreCabana,
  reservas,
  bloqueos,
  franjas,
  desde,
  hasta,
  excluirReservaId,
  ahora,
}: {
  /** «Cabaña 03»: es lo que se empareja con el título de los eventos. */
  nombreCabana: string;
  /** Reservas de hospedaje de ESA cabaña. */
  reservas: ReservaParaOcupacion[];
  /** Bloqueos de ESA cabaña. */
  bloqueos: BloqueoParaOcupacion[];
  /** Todas las franjas del calendario de Google del periodo. */
  franjas: OcupacionExterna[];
  desde: string;
  hasta: string;
  /** La reserva que se está editando: sus noches no cuentan. */
  excluirReservaId?: string | null;
  ahora: Date;
}): string[] {
  const ocupadas = new Set<string>();

  for (const reserva of reservas) {
    if (excluirReservaId && reserva.id === excluirReservaId) continue;
    if (!ocupaCalendario(reserva, ahora)) continue;
    for (const noche of nochesDentro(reserva.entrada, reserva.salida, desde, hasta)) {
      ocupadas.add(noche);
    }
  }

  for (const bloqueo of bloqueos) {
    for (const noche of nochesDentro(bloqueo.inicio, bloqueo.fin, desde, hasta)) {
      ocupadas.add(noche);
    }
  }

  /* `franjasQueChocan` es la regla con la que el servidor rechaza: un evento
     que nombra otra cabaña no cuenta, uno que no nombra ninguna cuenta para
     todas. Los eventos que escribió el propio sitio ya vienen descartados. */
  for (const franja of franjasQueChocan(franjas, nombreCabana, desde, hasta)) {
    for (const noche of nochesDentro(franja.inicio, franja.fin, desde, hasta)) {
      ocupadas.add(noche);
    }
  }

  return [...ocupadas].sort();
}

/** Una reserva de Día de Calma: un día y cuántas personas. */
export type ReservaDeDia = ReservaParaOcupacion & { personas: number };

/**
 * Personas del Día de Calma por fecha (solo las que tienen alguien), sin la
 * reserva que se está editando.
 */
export function personasDeDiaSinLaPropia({
  reservas,
  desde,
  hasta,
  excluirReservaId,
  ahora,
}: {
  reservas: ReservaDeDia[];
  desde: string;
  hasta: string;
  excluirReservaId?: string | null;
  ahora: Date;
}): Record<string, number> {
  const porDia: Record<string, number> = {};
  for (const reserva of reservas) {
    if (excluirReservaId && reserva.id === excluirReservaId) continue;
    if (!ocupaCalendario(reserva, ahora)) continue;
    for (const dia of nochesDentro(reserva.entrada, reserva.salida, desde, hasta)) {
      porDia[dia] = (porDia[dia] ?? 0) + reserva.personas;
    }
  }
  return porDia;
}
