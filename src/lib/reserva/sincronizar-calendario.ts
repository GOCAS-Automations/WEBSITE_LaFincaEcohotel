import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  actualizarEvento,
  calendarioConfigurado,
  calendarioDeEscritura,
  crearEvento,
  eliminarEvento,
  type EventoNuevo,
} from "@/lib/google/calendario";
import { obtenerReserva } from "@/lib/admin/datos";
import {
  contarNoches,
  formatearCOP,
  formatearFechaConDia,
} from "@/lib/utils/formato";
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
 * Si `GOOGLE_CALENDAR_ID` está vacío, todo esto no hace absolutamente nada.
 *
 * El hotel comparte **un solo** calendario con permiso de escritura; los demás
 * (el general y los cinco por cabaña) van en solo lectura. Si ese permiso se
 * cayera, cada escritura de aquí fallaría con un 403 y el panel lo diría al
 * guardar; el diagnóstico lo avisa antes, sin esperar a la primera reserva que
 * se quede sin apuntar (ver `diagnostico-calendarios.ts`).
 *
 * ---------------------------------------------------------------------------
 * SE ESCRIBE EN UN SOLO CALENDARIO
 * ---------------------------------------------------------------------------
 * El sitio LEE varios calendarios (el general del hotel y los subcalendarios por
 * cabaña), pero ESCRIBE solo en uno: el que diga `calendarioDeEscritura()`, que
 * es el primero de `GOOGLE_CALENDAR_ID` salvo que
 * `GOOGLE_CALENDAR_ESCRIBIR_EN` diga otro. Si se escribiera en el general y
 * además en el de la cabaña, el equipo vería cada reserva dos veces y habría que
 * mantener dos eventos por reserva.
 *
 * Crear, actualizar y borrar pasan por esa MISMA función, así que las tres
 * operaciones de una reserva caen siempre en el mismo calendario. El precio de
 * esa simplicidad: `reservas.referencia_externa` guarda solo el id del evento,
 * no en qué calendario está. Si alguien cambia el calendario de escritura con
 * reservas ya apuntadas, los eventos viejos se quedan huérfanos en el calendario
 * anterior —borrarlos no fallará (un 404 se trata como éxito) pero tampoco los
 * quitará— y hay que barrerlos a mano. Cambiar esa variable es, por tanto, una
 * decisión de puesta en marcha, no un ajuste del día a día.
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
  /* Las fechas, en `dd/mm/aaaa`. Google pinta un evento de todo el día
     hasta la víspera del día de salida (su fin es exclusivo): escrita aquí, la
     salida no se confunde con la última noche. */
  const noches = contarNoches(reserva.entrada, reserva.salida);
  const fechas =
    reserva.tipo === "dia"
      ? `Día: ${formatearFechaConDia(reserva.entrada)}`
      : `Llegada: ${formatearFechaConDia(reserva.entrada)} · Salida: ${formatearFechaConDia(reserva.salida)} (${noches} ${noches === 1 ? "noche" : "noches"})`;
  const lineas = [
    `Reserva ${reserva.codigo}`,
    fechas,
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

/**
 * ¿El fallo dice que el evento ya no está en Google? Solo 404 (no existe) y 410
 * (borrado del todo). Cualquier otro fallo —429, 5xx, `timeout`, red, permisos—
 * no prueba que el evento haya desaparecido.
 */
export function eventoYaNoExiste(resultado: { ok: boolean; http?: number }): boolean {
  return !resultado.ok && (resultado.http === 404 || resultado.http === 410);
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
  const calendarioId = calendarioDeEscritura();
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
    /* El PATCH lleva `status: "confirmed"`: si el equipo borró el evento en
       Google (queda `cancelled`), con esto vuelve a verse en el calendario. */
    const actualizado = await actualizarEvento(
      calendarioId,
      reserva.referencia_externa,
      evento,
    );
    if (actualizado.ok) {
      invalidarCacheCalendario();
      return null;
    }
    console.error("[calendario] al actualizar el evento:", actualizado.mensaje);
    /*
      SOLO SE CREA OTRO SI EL EVENTO YA NO EXISTE (404 o 410).

      Ante un fallo pasajero —429, 5xx, `timeout`, red— el evento sigue en
      Google: crear uno nuevo dejaría dos (y el viejo, huérfano, sin que nadie
      lo vuelva a tocar). Se avisa y se deja como está; el próximo guardado lo
      vuelve a intentar con la misma referencia.
    */
    if (!eventoYaNoExiste(actualizado)) {
      return `La reserva se guardó, pero no se pudo poner al día su evento en el calendario del hotel: ${actualizado.mensaje} Se volverá a intentar la próxima vez que se guarde; no lo crees a mano.`;
    }
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
  const calendarioId = calendarioDeEscritura();
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
