/**
 * BORRAR UNA RESERVA DESDE EL PANEL, SIN PERDER DINERO NI DEJAR HUÉRFANOS.
 *
 * Tres reglas, cada una por un fallo que pasaba:
 *
 *   1. **Con un pago aprobado no se borra: se cancela.** `pagos` cuelga de
 *      `reservas` con `on delete cascade`, así que borrar una reserva pagada
 *      borraba la constancia del pago. Se comprueba aquí para explicarlo, y la
 *      base lo impide igual (trigger de la migración 021, error LF020).
 *   2. **Primero la base, después Google.** Antes se borraba el evento del
 *      calendario del hotel y luego la reserva: si la base fallaba, quedaba
 *      una reserva viva sin evento, y el equipo —que mira el calendario desde
 *      el teléfono— vendía esas noches por WhatsApp. Al revés, lo peor que
 *      puede pasar es un evento de más, que se ve y se borra a mano.
 *   3. **Errores en español.** Nunca el texto crudo de Postgres en pantalla.
 *
 * El borrado es UNA sentencia: las experiencias y los intentos de pago sin
 * dinero se van en cascada con la reserva, o no se va nada.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** El error propio del trigger `reservas_no_borrar_pagadas` (migración 021). */
export const RESERVA_PAGADA = "LF020";

export const MENSAJE_RESERVA_PAGADA =
  "Esta reserva tiene un pago aprobado y no se puede borrar: se perdería el registro del dinero. Cancélala en su lugar (así las fechas quedan libres y el pago sigue constando).";

export type ResultadoEliminar =
  | { ok: true; codigo: string | null; aviso: string | null }
  | { ok: false; mensaje: string };

/**
 * Borra la reserva `id`. `borrarEvento` quita su evento del calendario de
 * Google (devuelve `null` si salió bien o una frase si no); solo se llama
 * después de que la base haya borrado de verdad. Nunca lanza.
 */
export async function eliminarReserva(
  supabase: SupabaseClient,
  id: string,
  borrarEvento: (referencia: string) => Promise<string | null>,
): Promise<ResultadoEliminar> {
  const { data: reserva, error: errorLectura } = await supabase
    .from("reservas")
    .select("id, codigo, referencia_externa")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura) {
    console.error("[panel] no se pudo leer la reserva a borrar:", errorLectura.message);
    return {
      ok: false,
      mensaje: "No se pudo leer la reserva. Vuelve a intentarlo en un momento.",
    };
  }
  if (!reserva) {
    return { ok: false, mensaje: "Esa reserva ya no existe." };
  }

  const { data: aprobados, error: errorPagos } = await supabase
    .from("pagos")
    .select("id")
    .eq("reserva_id", id)
    .eq("estado", "APPROVED");

  if (errorPagos) {
    console.error("[panel] no se pudieron leer los pagos de la reserva:", errorPagos.message);
    return {
      ok: false,
      mensaje:
        "No se pudo comprobar si esta reserva tiene pagos, así que no se borró. Vuelve a intentarlo en un momento.",
    };
  }
  if ((aprobados ?? []).length > 0) {
    return { ok: false, mensaje: MENSAJE_RESERVA_PAGADA };
  }

  /* 1. LA BASE. Una sola sentencia; experiencias e intentos de pago sin dinero
        se van en cascada. */
  const { data: borradas, error } = await supabase
    .from("reservas")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === RESERVA_PAGADA) {
      /* Entró un pago entre la comprobación y el borrado: manda la base. */
      return { ok: false, mensaje: MENSAJE_RESERVA_PAGADA };
    }
    console.error("[panel] no se pudo borrar la reserva:", error.code, error.message);
    return {
      ok: false,
      mensaje:
        "No se pudo borrar la reserva. Vuelve a intentarlo; si sigue pasando, cancélala y avisa a GOCAS.",
    };
  }
  if (!borradas || borradas.length === 0) {
    return {
      ok: false,
      mensaje:
        "No se pudo borrar la reserva: puede que ya no exista o que tu cuenta no tenga permiso para borrar.",
    };
  }

  /* 2. GOOGLE, SOLO DESPUÉS. Si falla, la reserva ya no existe y lo que queda
        es un evento de más, que se avisa para borrarlo a mano. */
  const referencia =
    typeof reserva.referencia_externa === "string" ? reserva.referencia_externa : null;
  const aviso = referencia ? await borrarEvento(referencia) : null;

  return {
    ok: true,
    codigo: typeof reserva.codigo === "string" ? reserva.codigo : null,
    aviso,
  };
}
