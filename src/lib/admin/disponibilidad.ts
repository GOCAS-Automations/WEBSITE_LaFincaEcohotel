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
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { fechaCorta, leerRangoFechas, rangoCorto, seCruzan } from "./fechas";
import { ESTADOS_QUE_OCUPAN, ETIQUETA_ESTADO } from "./tipos";
import { ocupaCalendario } from "@/lib/reserva/holds";
import { choquesDelCalendario } from "@/lib/reserva/ocupacion-externa";
import type { EstadoReserva } from "@/lib/tipos/basedatos";

export type Choque = {
  tipo: "reserva" | "bloqueo" | "calendario";
  descripcion: string;
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
    choques.push({
      tipo: "reserva",
      descripcion: `${fila.huesped_nombre} · ${fila.codigo} (${
        ETIQUETA_ESTADO[estado] ?? estado
      }), del ${rangoCorto(rango.inicio, rango.fin)}`,
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
