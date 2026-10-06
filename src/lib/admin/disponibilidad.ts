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
 * los choques. Si Google no está configurado (sin `GOOGLE_CALENDAR_ID`), la
 * comprobación sigue solo con reservas y bloqueos.
 *
 * Si está configurado y NO responde, depende de para qué se pregunta
 * ({@link OpcionesChoques}): para tomar noches nuevas (crear o reactivar una
 * reserva) se falla cerrado —lanza `CalendarioSinRespuesta`—, porque hoy todas
 * las reservas reales viven en Google y un fallo de lectura abriría el
 * calendario entero. Para un bloqueo, que solo puede quitar noches de la venta,
 * un fallo no impide guardar.
 *
 * Un evento de Google que choca **sí bloquea** el guardado, igual que una
 * reserva de la base: así el equipo no duplica una reserva que ya estaba
 * apuntada a mano en el calendario del hotel. El mensaje del panel
 * ({@link describirChoquesEnCabana}) dice de dónde viene cada choque.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { leerRangoFechas, seCruzan } from "./fechas";
import { ESTADOS_QUE_OCUPAN, ETIQUETA_ESTADO } from "./tipos";
import { ocupaCalendario } from "../reserva/holds";
import {
  choquesDelCalendario,
  choquesDelCalendarioParaEscribir,
} from "../reserva/ocupacion-externa";
import type { EstadoReserva } from "../tipos/basedatos";
import { formatearFecha, formatearRango, formatearRangoConDias } from "../utils/formato";

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

export type OpcionesChoques = {
  /**
   * Cómo se consulta el calendario de Google del hotel:
   *
   *   · `"estricto"` (por defecto) — para TOMAR noches: se pregunta a Google
   *     sin caché, justo antes de escribir, y si está configurado y no
   *     responde se lanza `CalendarioSinRespuesta` (falla cerrado).
   *   · `"tolerante"` — sale de la caché y un fallo de Google no impide nada.
   *     Para lo que no vende noches (un bloqueo) o para una reserva que ya las
   *     tiene apartadas y solo se retoca.
   */
  calendario?: "estricto" | "tolerante";
};

/**
 * Devuelve los choques del rango [entrada, salida) en una cabaña.
 * `excluirReservaId` permite reeditar una reserva sin que choque consigo misma.
 *
 * Con Google configurado y sin respuesta, en modo estricto (el de por defecto)
 * lanza `CalendarioSinRespuesta`: quien llama lo traduce a su mensaje.
 */
export async function buscarChoques(
  supabase: SupabaseClient,
  alojamientoId: string,
  entrada: string,
  salida: string,
  excluirReservaId?: string,
  opciones: OpcionesChoques = {},
): Promise<Choque[]> {
  const estricto = (opciones.calendario ?? "estricto") === "estricto";
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
      descripcion: `${quien}, del ${formatearRango(rango.inicio, rango.fin)}`,
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
      descripcion: `${motivo}, del ${formatearRango(rango.inicio, rango.fin)}`,
      inicio: rango.inicio,
      fin: rango.fin,
      quien: motivo,
    });
  }

  /* El calendario del hotel, al final. En modo estricto se lee sin caché y un
     fallo lanza `CalendarioSinRespuesta`; en modo tolerante sale de la caché y
     un fallo devuelve una lista vacía. */
  const nombreCabana =
    typeof cabana.data?.nombre === "string" ? cabana.data.nombre : "";
  if (nombreCabana) {
    const franjas = estricto
      ? await choquesDelCalendarioParaEscribir(nombreCabana, entrada, salida)
      : await choquesDelCalendario(nombreCabana, entrada, salida);
    for (const franja of franjas) {
      choques.push({
        tipo: "calendario",
        descripcion:
          franja.motivo === "sin_cabana"
            ? `«${franja.titulo}» en el calendario del hotel, del ${formatearRango(
                franja.inicio,
                franja.fin,
              )} (no dice qué cabaña, así que se cuentan todas como ocupadas)`
            : `«${franja.titulo}» en el calendario del hotel, del ${formatearRango(
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

/**
 * Mensaje único, listo para el banner de error **del panel** (bloqueos).
 *
 * ⚠️ Lleva el nombre del huésped, el código de su reserva o el título del
 * evento de Google: NUNCA debe llegar a una respuesta pública. El sitio usa
 * {@link mensajeNochesOcupadasParaHuesped}; este detalle va solo a los
 * registros del servidor.
 */
export function describirChoques(choques: Choque[]): string {
  const lista = choques.map((item) => `• ${item.descripcion}`).join("\n");
  return `Esas fechas ya están ocupadas en esa cabaña:\n${lista}`;
}

/**
 * Lo que lee el HUÉSPED cuando las noches que pidió ya están ocupadas.
 *
 * Genérico a propósito (Ley 1581 de 2012): no dice quién las tiene, ni el
 * código de esa reserva, ni el título del evento del calendario del hotel.
 * Con el detalle, un POST a mano sobre unas fechas cualquiera dejaba saber
 * quién se aloja cuándo. Solo nombra la cabaña, que es la que eligió el
 * propio huésped.
 */
export function mensajeNochesOcupadasParaHuesped(
  nombreCabana: string | null | undefined,
): string {
  const cabana = nombreCabana ? `en la ${nombreCabana}` : "en esa cabaña";
  return `Esas noches ya no están disponibles ${cabana}. Elige otras fechas o escríbenos por WhatsApp.`;
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
    const fechas = `del ${formatearRangoConDias(choque.inicio, choque.fin)}`;
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
 * ¿Toma esta escritura noches que la reserva NO tenía ya apartadas?
 *
 * Decide si hace falta leer Google en modo estricto. Retocar el teléfono de una
 * reserva confirmada no vende ninguna noche: sus noches ya son suyas, y exigir
 * que Google responda para eso dejaría al equipo sin poder corregir una reserva
 * durante una caída de Google. En cambio, crear una reserva, reactivar una
 * cancelada (o una solicitud vencida), cambiarla de cabaña o alargarla sí toma
 * noches nuevas, y ahí se falla cerrado.
 *
 * `anterior` es la reserva tal como está guardada (`null` si es nueva) y
 * `ocupaAhora` dice si hoy aparta sus fechas (`ocupaCalendario()`).
 */
export function tomaNochesNuevas(
  anterior: {
    alojamientoId: string | null;
    inicio: string;
    fin: string;
    ocupaAhora: boolean;
  } | null,
  nueva: { alojamientoId: string | null; inicio: string; fin: string },
): boolean {
  if (!anterior || !anterior.ocupaAhora) return true;
  if (anterior.alojamientoId !== nueva.alojamientoId) return true;
  return nueva.inicio < anterior.inicio || nueva.fin > anterior.fin;
}

/** Choques de un bloqueo nuevo (contra otros bloqueos y contra reservas). */
export async function buscarChoquesDeBloqueo(
  supabase: SupabaseClient,
  alojamientoId: string,
  inicio: string,
  fin: string,
  excluirBloqueoId?: string,
): Promise<Choque[]> {
  /* Un bloqueo solo quita noches de la venta: si Google no responde, guardarlo
     no puede vender nada, así que no se le exige leerlo. */
  const choques = await buscarChoques(supabase, alojamientoId, inicio, fin, undefined, {
    calendario: "tolerante",
  });

  if (!excluirBloqueoId) return choques;
  // Un bloqueo que se reedita no choca consigo mismo.
  const { data } = await supabase
    .from("bloqueos")
    .select("rango")
    .eq("id", excluirBloqueoId)
    .maybeSingle();
  const propio = leerRangoFechas(data?.rango);
  if (!propio) return choques;
  return choques.filter(
    (choque) =>
      !(
        choque.tipo === "bloqueo" &&
        choque.inicio === propio.inicio &&
        choque.fin === propio.fin
      ),
  );
}

/** Texto amable de una fecha suelta, para los avisos. */
export function diaLegible(iso: string): string {
  return formatearFecha(iso);
}
