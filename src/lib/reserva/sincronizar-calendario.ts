import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  actualizarEvento,
  calendarioConfigurado,
  crearEvento,
  eliminarEvento,
  idCalendarioHotel,
  type EventoNuevo,
} from "@/lib/google/calendario";
import { obtenerReserva } from "@/lib/admin/datos";
import { formatearCOP } from "@/lib/utils/formato";
import { invalidarCacheCalendario } from "./ocupacion-externa";
import type { ReservaAdmin } from "@/lib/admin/tipos";

/**
 * Del panel al Google Calendar del hotel.
 *
 * ---------------------------------------------------------------------------
 * ESTO ES «MEJOR SI SALE», NUNCA UN REQUISITO
 * ---------------------------------------------------------------------------
 * La verdad de las reservas vive en Postgres, con sus restricciones EXCLUDE.
 * El calendario de Google es una COMODIDAD para el equipo del hotel, que lo
 * mira desde el teléfono. Por eso ninguna función de aquí lanza ni impide
 * guardar: si Google falla, la reserva ya está escrita y lo único que pasa es
 * que el panel muestra un aviso amable —«la reserva se guardó, pero no se pudo
 * apuntar en el calendario del hotel»— y queda la traza en la consola del
 * servidor.
 *
 * Si `GOOGLE_CALENDAR_ID` está vacío —hoy lo está: el hotel todavía no ha
 * compartido su calendario— todo esto no hace absolutamente nada.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE RECONOCE NUESTRO EVENTO
 * ---------------------------------------------------------------------------
 * Dos marcas, y las dos hacen falta:
 *   · `reservas.referencia_externa` guarda el id del evento, que es como el
 *     panel lo vuelve a encontrar para actualizarlo o borrarlo.
 *   · `extendedProperties.private.origen = 'lafinca-web'` viaja dentro del
 *     evento, y es lo que hace que al LEER el calendario no contemos nuestras
 *     propias reservas dos veces (ver `calendario-externo.ts`).
 */

/** Texto del evento: lo primero que ve el equipo en su teléfono. */
export function tituloDeReserva(reserva: ReservaAdmin): string {
  if (reserva.tipo === "dia") {
    return `Día de Calma · ${reserva.num_personas} pers. · ${reserva.huesped_nombre}`;
  }
  const cabana = reserva.alojamiento_nombre ?? "Sin cabaña";
  const plan = reserva.plan_nombre ? ` · ${reserva.plan_nombre}` : "";
  return `${cabana} · ${reserva.huesped_nombre}${plan}`;
}

/** Cuerpo del evento: lo justo para atender una llamada sin abrir el panel. */
export function descripcionDeReserva(reserva: ReservaAdmin): string {
  const lineas = [
    `Reserva ${reserva.codigo}`,
    `Teléfono: ${reserva.huesped_telefono || "—"}`,
    `Total: ${formatearCOP(reserva.total)}`,
  ];
  if (reserva.monto_pagado > 0) {
    lineas.push(`Abonado: ${formatearCOP(reserva.monto_pagado)}`);
  }
  lineas.push(
    "",
    "Creado desde el sitio de La Finca. Para cambiarlo, edita la reserva en el panel: lo que se escriba aquí se pierde en la siguiente sincronización.",
  );
  return lineas.join("\n");
}

function eventoDeReserva(reserva: ReservaAdmin): EventoNuevo {
  return {
    titulo: tituloDeReserva(reserva),
    descripcion: descripcionDeReserva(reserva),
    inicio: reserva.entrada,
    fin: reserva.salida,
    reservaId: reserva.id,
  };
}

/** Guarda (o borra) el id del evento en la reserva, sin hacer ruido si falla. */
async function guardarReferencia(
  supabase: SupabaseClient,
  reservaId: string,
  referencia: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("reservas")
    .update({ referencia_externa: referencia })
    .eq("id", reservaId);
  if (error) {
    console.error(
      "[calendario] no se pudo guardar la referencia del evento:",
      error.message,
    );
  }
}

/**
 * Pone la reserva al día en el calendario del hotel.
 *
 * Devuelve `null` si todo fue bien (o si no hay nada que hacer porque la
 * integración no está configurada) y una frase en español si hubo un problema
 * que merece contarle a quien está usando el panel.
 */
export async function sincronizarReservaEnCalendario(
  supabase: SupabaseClient,
  reservaId: string,
): Promise<string | null> {
  const calendarioId = idCalendarioHotel();
  if (!calendarioId || !calendarioConfigurado()) return null;

  let reserva: ReservaAdmin | null = null;
  try {
    reserva = await obtenerReserva(supabase, reservaId);
  } catch (error) {
    console.error(
      "[calendario] no se pudo leer la reserva para sincronizarla:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
  if (!reserva) return null;

  /* Una reserva cancelada no ocupa nada: su evento se borra del calendario del
     hotel para que nadie lo vea como ocupado. */
  if (reserva.estado === "cancelada") {
    if (!reserva.referencia_externa) return null;
    const borrado = await eliminarEvento(calendarioId, reserva.referencia_externa);
    if (!borrado.ok) {
      console.error("[calendario] al borrar el evento:", borrado.mensaje);
      return `La reserva se guardó, pero su evento sigue en el calendario del hotel: ${borrado.mensaje}`;
    }
    await guardarReferencia(supabase, reserva.id, null);
    invalidarCacheCalendario();
    return null;
  }

  const evento = eventoDeReserva(reserva);

  if (reserva.referencia_externa) {
    const actualizado = await actualizarEvento(
      calendarioId,
      reserva.referencia_externa,
      evento,
    );
    if (actualizado.ok) {
      invalidarCacheCalendario();
      return null;
    }
    /* Si alguien borró el evento a mano en Google, actualizar ya no tiene
       sentido: se crea uno nuevo y se reescribe la referencia. */
    console.error("[calendario] al actualizar el evento:", actualizado.mensaje);
  }

  const creado = await crearEvento(calendarioId, evento);
  if (!creado.ok) {
    console.error("[calendario] al crear el evento:", creado.mensaje);
    return `La reserva se guardó, pero no se pudo apuntar en el calendario del hotel: ${creado.mensaje}`;
  }

  await guardarReferencia(supabase, reserva.id, creado.datos.id);
  invalidarCacheCalendario();
  return null;
}

/**
 * Borra el evento de una reserva que se va a eliminar de la base.
 *
 * Se llama ANTES del `delete`, porque después ya no hay de dónde sacar la
 * referencia.
 */
export async function borrarEventoDeReserva(
  supabase: SupabaseClient,
  reservaId: string,
): Promise<string | null> {
  const calendarioId = idCalendarioHotel();
  if (!calendarioId || !calendarioConfigurado()) return null;

  const { data } = await supabase
    .from("reservas")
    .select("referencia_externa")
    .eq("id", reservaId)
    .maybeSingle();

  const referencia =
    typeof data?.referencia_externa === "string" ? data.referencia_externa : null;
  if (!referencia) return null;

  const borrado = await eliminarEvento(calendarioId, referencia);
  if (!borrado.ok) {
    console.error("[calendario] al borrar el evento:", borrado.mensaje);
    return `La reserva se eliminó, pero su evento sigue en el calendario del hotel: ${borrado.mensaje}`;
  }
  invalidarCacheCalendario();
  return null;
}
