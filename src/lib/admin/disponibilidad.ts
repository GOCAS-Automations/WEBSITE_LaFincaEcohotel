/**
 * Comprobación de fechas ocupadas, con explicación en español.
 *
 * La base ya tiene dos restricciones EXCLUDE que impiden el cruce
 * (`reservas_sin_solapamiento` y `bloqueos_sin_solapamiento`), y son la última
 * palabra ante dos guardados simultáneos. Pero un error `23P01` de Postgres no
 * le dice nada al usuario del panel: no explica CON QUÉ choca. Por eso la
 * comprobación se hace también aquí, antes de escribir, para poder decir
 * "esas fechas ya están ocupadas por la reserva de Ana, del 12 al 15".
 *
 * ---------------------------------------------------------------------------
 * LA TERCERA FUENTE: EL GOOGLE CALENDAR DEL HOTEL
 * ---------------------------------------------------------------------------
 * El hotel sigue apuntando reservas a mano en su calendario «la finca», y esas
 * fechas también están ocupadas aunque no estén en la base. Se leen desde
 * `@/lib/reserva/ocupacion-externa` (con caché de cinco minutos) y se suman a
 * los choques. A diferencia de las otras dos, esta fuente NO es obligatoria: si
 * Google no está configurado o no responde, la comprobación sigue con reservas
 * y bloqueos y no se bloquea ningún guardado.
 *
 * Un evento de Google que choca **sí bloquea** el guardado, igual que una
 * reserva de la base: así el equipo no duplica una reserva que ya estaba
 * apuntada a mano en el calendario del hotel. El mensaje del panel
 * ({@link describirChoquesEnCabana}) dice de dónde viene cada choque.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fechaCorta,
  leerRangoFechas,
  rangoConDias,
  rangoCorto,
  seCruzan,
} from "./fechas";
import { ESTADOS_QUE_OCUPAN, ETIQUETA_ESTADO } from "./tipos";
import { ocupaCalendario } from "../reserva/holds";
import {
  choquesDelCalendario,
  ocupacionDelCalendario,
} from "../reserva/ocupacion-externa";
import type { EstadoReserva } from "../tipos/basedatos";

export type Choque = {
  tipo: "reserva" | "bloqueo" | "calendario";
  /** La frase de siempre (la usan el sitio y los bloqueos). */
  descripcion: string;
  /** Primera noche y día de liberación de lo que choca. */
  inicio: string;
  fin: string;
  /**
   * Quién ocupa: el huésped («Ana Pérez · LF-1234 (Confirmada)»), el motivo
   * del bloqueo o el título del evento de Google, tal cual.
   */
  quien: string;
  /** Evento de Google que no dice qué cabaña (ocupa todas). */
  sinCabana?: boolean;
};

/**
 * Devuelve los choques del rango [entrada, salida) en una cabaña.
 * `excluirReservaId` permite reeditar una reserva sin que choque consigo misma.
 */
export async function buscarChoques(
  supabase: SupabaseClient,
  alojamientoId: string,
  entrada: string,
  salida: string,
  excluirReservaId?: string,
): Promise<Choque[]> {
  const choques: Choque[] = [];

  /* PostgREST no expresa cómodamente el operador de solape sobre `daterange`,
     así que se traen las reservas y los bloqueos de ESA cabaña —son pocos por
     definición— y se comparan en memoria con la misma regla de rango
     medio-abierto que usa Postgres. */
  const [reservas, bloqueos, cabana] = await Promise.all([
    supabase
      .from("reservas")
      .select("id, codigo, huesped_nombre, estancia, estado, expira_at")
      .eq("alojamiento_id", alojamientoId)
      /* El `in` solo acota la consulta; quién ocupa de verdad lo decide
         `ocupaCalendario()` más abajo, porque una `pendiente` con el hold
         vencido ya no aparta nada. */
      .in("estado", ESTADOS_QUE_OCUPAN),
    supabase
      .from("bloqueos")
      .select("id, rango, motivo")
      .eq("alojamiento_id", alojamientoId),
    /* El nombre de la cabaña («Cabaña 03») es lo que empareja con el título de
       los eventos de Google; sin él no se sabe a cuál se refieren. */
    supabase
      .from("alojamientos")
      .select("nombre")
      .eq("id", alojamientoId)
      .maybeSingle(),
  ]);

  if (reservas.error) {
    throw new Error(
      `No se pudo comprobar la disponibilidad: ${reservas.error.message}`,
    );
  }
  if (bloqueos.error) {
    throw new Error(
      `No se pudo comprobar la disponibilidad: ${bloqueos.error.message}`,
    );
  }

  const ahora = new Date();

  for (const fila of reservas.data ?? []) {
    if (excluirReservaId && String(fila.id) === excluirReservaId) continue;
    /* Una solicitud cuyo hold venció NO choca: esas fechas están libres aunque
       la fila siga diciendo `pendiente` hasta que el barrido la cancele. */
    if (
      !ocupaCalendario(
        {
          estado: String(fila.estado ?? ""),
          expira_at: typeof fila.expira_at === "string" ? fila.expira_at : null,
        },
        ahora,
      )
    ) {
      continue;
    }
    const rango = leerRangoFechas(fila.estancia);
    if (!rango) continue;
    if (!seCruzan(entrada, salida, rango.inicio, rango.fin)) continue;

    const estado = fila.estado as EstadoReserva;
    const quien = `${fila.huesped_nombre} · ${fila.codigo} (${
      ETIQUETA_ESTADO[estado] ?? estado
    })`;
    choques.push({
      tipo: "reserva",
      descripcion: `${quien}, del ${rangoCorto(rango.inicio, rango.fin)}`,
      inicio: rango.inicio,
      fin: rango.fin,
      quien,
    });
  }

  for (const fila of bloqueos.data ?? []) {
    const rango = leerRangoFechas(fila.rango);
    if (!rango) continue;
    if (!seCruzan(entrada, salida, rango.inicio, rango.fin)) continue;
    const motivo =
      typeof fila.motivo === "string" && fila.motivo ? fila.motivo : "Bloqueo";
    choques.push({
      tipo: "bloqueo",
      descripcion: `${motivo}, del ${rangoCorto(rango.inicio, rango.fin)}`,
      inicio: rango.inicio,
      fin: rango.fin,
      quien: motivo,
    });
  }

  /* El calendario del hotel, al final y sin poder romper nada: si Google falla,
     `choquesDelCalendario` devuelve una lista vacía y aquí no se nota. */
  const nombreCabana =
    typeof cabana.data?.nombre === "string" ? cabana.data.nombre : "";
  if (nombreCabana) {
    const franjas = await choquesDelCalendario(nombreCabana, entrada, salida);
    for (const franja of franjas) {
      choques.push({
        tipo: "calendario",
        descripcion:
          franja.motivo === "sin_cabana"
            ? `«${franja.titulo}» en el calendario del hotel, del ${rangoCorto(
                franja.inicio,
                franja.fin,
              )} (no dice qué cabaña, así que se cuentan todas como ocupadas)`
            : `«${franja.titulo}» en el calendario del hotel, del ${rangoCorto(
                franja.inicio,
                franja.fin,
              )}`,
        inicio: franja.inicio,
        fin: franja.fin,
        quien: franja.titulo,
        sinCabana: franja.motivo === "sin_cabana",
      });
    }
  }

  return choques;
}

/** Mensaje único, listo para el banner de error. */
export function describirChoques(choques: Choque[]): string {
  const lista = choques.map((item) => `• ${item.descripcion}`).join("\n");
  return `Esas fechas ya están ocupadas en esa cabaña:\n${lista}`;
}

/**
 * El mensaje del PANEL cuando unas noches ya están ocupadas: nombra la cabaña
 * y dice de dónde sale cada choque, con fechas `dd/mm/aaaa`.
 *
 *   «Esas noches ya están ocupadas en la Cabaña 03 por «Juan Pérez cabaña 3»
 *    (calendario del hotel), del mar 13/10/2026 al vie 16/10/2026.»
 *
 * Cuando el choque viene del calendario de Google, añade la pista que evita
 * el error de verdad: esa reserva ya está apuntada allí, no hay que duplicarla.
 *
 * Solo para el panel: lleva nombres de huéspedes.
 */
export function describirChoquesEnCabana(
  choques: Choque[],
  nombreCabana: string,
): string {
  const frase = (choque: Choque) => {
    const fechas = `del ${rangoConDias(choque.inicio, choque.fin)}`;
    if (choque.tipo === "reserva") {
      return `la reserva de ${choque.quien}, ${fechas}`;
    }
    if (choque.tipo === "bloqueo") {
      return `un bloqueo («${choque.quien}»), ${fechas}`;
    }
    return `«${choque.quien}» (calendario del hotel), ${fechas}${
      choque.sinCabana
        ? " — el evento no dice qué cabaña, así que ocupa todas"
        : ""
    }`;
  };
  const cabana = nombreCabana ? `la ${nombreCabana}` : "esa cabaña";
  const cuerpo =
    choques.length === 1
      ? `Esas noches ya están ocupadas en ${cabana} por ${frase(choques[0])}.`
      : `Esas noches ya están ocupadas en ${cabana}:\n${choques
          .map((choque) => `• ${frase(choque)}`)
          .join("\n")}`;
  const pista = choques.some((choque) => choque.tipo === "calendario")
    ? "\nSi es la misma reserva, ya está apuntada en el calendario de Google del hotel: no hace falta registrarla otra vez. Si no, elige otras fechas u otra cabaña."
    : "\nElige otras fechas u otra cabaña.";
  return cuerpo + pista;
}

/**
 * ¿Falló la lectura del calendario de Google para esas fechas? Entonces sus
 * eventos no pudieron bloquear nada y conviene decirlo al guardar. Sale de la
 * caché de cinco minutos: no es una llamada más a Google.
 */
export async function calendarioSinLeer(
  entrada: string,
  salida: string,
): Promise<boolean> {
  const lectura = await ocupacionDelCalendario(entrada, salida);
  return lectura.estado === "error" || lectura.lecturaIncompleta;
}

/** Choques de un bloqueo nuevo (contra otros bloqueos y contra reservas). */
export async function buscarChoquesDeBloqueo(
  supabase: SupabaseClient,
  alojamientoId: string,
  inicio: string,
  fin: string,
  excluirBloqueoId?: string,
): Promise<Choque[]> {
  const choques = await buscarChoques(supabase, alojamientoId, inicio, fin);

  if (!excluirBloqueoId) return choques;
  // Un bloqueo que se reedita no choca consigo mismo.
  const { data } = await supabase
    .from("bloqueos")
    .select("rango")
    .eq("id", excluirBloqueoId)
    .maybeSingle();
  const propio = leerRangoFechas(data?.rango);
  if (!propio) return choques;
  const etiquetaPropia = rangoCorto(propio.inicio, propio.fin);
  return choques.filter(
    (choque) =>
      !(choque.tipo === "bloqueo" && choque.descripcion.includes(etiquetaPropia)),
  );
}

/** Texto amable de una fecha suelta, para los avisos. */
export function diaLegible(iso: string): string {
  return fechaCorta(iso);
}
