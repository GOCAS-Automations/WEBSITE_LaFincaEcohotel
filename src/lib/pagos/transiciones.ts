/**
 * Qué hacer con una reserva cuando llega un evento de pago.
 *
 * ===========================================================================
 * LA IDEMPOTENCIA, ESCRITA COMO UNA FUNCIÓN PURA
 * ===========================================================================
 * El webhook de Bold se reintenta hasta cinco veces y la propia documentación
 * avisa de que «puede enviarte múltiples notificaciones por una misma
 * transacción». La regla que impide que eso duplique correos o reservas es una
 * sola, y es esta: **los efectos ocurren en la TRANSICIÓN, no en el estado.**
 *
 * Vive aquí y no dentro del Route Handler por dos motivos:
 *
 *   1. Se puede **probar sin red y sin base de datos**, y es la regla que más
 *      caro sale romper: dos correos de confirmación al mismo huésped, o una
 *      reserva pagada que se queda sin confirmar.
 *   2. Deja el webhook legible. Lo que hace el webhook es leer, decidir con esta
 *      función y escribir; mezclar la decisión con los `await` la esconde.
 *
 * ---------------------------------------------------------------------------
 * NO ES LA ÚNICA CAPA, Y ESO IMPORTA
 * ---------------------------------------------------------------------------
 * Esta función decide **qué** hacer. Que no se haga dos veces lo garantizan,
 * además, dos candados en la base (ver `supabase/migrations/015_pagos_bold.sql`):
 *
 *   · `pagos_eventos.id` es la clave primaria y es el `id` de la notificación,
 *     así que un reenvío exacto choca y se descarta de una sola sentencia.
 *   · el `update … where estado <> nuevo` de `pagos` es condicional, así que dos
 *     ejecuciones simultáneas no pueden pasar las dos.
 *
 * Módulo PURO: ni Supabase, ni fetch, ni fechas del sistema escondidas.
 */

import { esAprobado, esRechazado, normalizarEstadoBold, type EstadoBold } from "./bold";

/**
 * Lo que hay que hacer con la reserva.
 *
 *   · `nada`         — el pago ya estaba en ese estado. Ni escribir, ni avisar.
 *   · `confirmar`    — el pago acaba de aprobarse: reserva `confirmada`,
 *                      `monto_pagado`, `expira_at = null`, correos y calendario.
 *   · `cancelar`     — anulación aprobada (`VOID_APPROVED`): el dinero volvió,
 *                      la reserva se cancela y las fechas se liberan ya.
 *   · `dejar_vencer` — rechazado o fallido: **no se toca la reserva**. El huésped
 *                      sigue dentro de su media hora y lo normal es que lo
 *                      intente con otra tarjeta; si no vuelve, el barrido la
 *                      cancela sola.
 *   · `solo_guardar` — estado intermedio (`PROCESSING`, `PENDING` de PSE): se
 *                      guarda y se espera el evento final.
 */
export type AccionDePago =
  | "nada"
  | "confirmar"
  | "cancelar"
  | "dejar_vencer"
  | "solo_guardar";

/**
 * Decide qué hacer, mirando **el estado que ya estaba guardado** y el nuevo.
 *
 * Las dos reglas que esta función existe para fijar:
 *
 *   **1. El mismo estado dos veces no hace nada.** Es el reenvío de Bold. Aquí
 *   se cortan los correos duplicados.
 *
 *   **2. De `APPROVED` no se sale hacia atrás.** Si un pago ya está aprobado y
 *   después llega un `SALE_REJECTED` —un evento viejo que se reintentó 24 horas
 *   más tarde, o el rechazo del PRIMER intento llegando después de que el segundo
 *   fuera aprobado— la reserva **no se cancela**. El dinero entró; el estado
 *   anterior manda. Sin esta regla, un reintento tardío de Bold podría tumbar una
 *   reserva pagada, y eso es exactamente el tipo de fallo que nadie detecta hasta
 *   que el huésped llega a la finca.
 */
export function decidirAccionDePago(
  estadoGuardado: string | null | undefined,
  estadoNuevo: EstadoBold,
): AccionDePago {
  const anterior = normalizarEstadoBold(estadoGuardado);

  /* Regla 1: nada que hacer si no cambia. */
  if (anterior === estadoNuevo) return "nada";

  /* Regla 2: un pago aprobado no se deshace con un evento de rechazo. La única
     salida legítima de `APPROVED` es la anulación, que es un hecho contable. */
  if (esAprobado(anterior) && esRechazado(estadoNuevo) && estadoNuevo !== "VOIDED") {
    return "nada";
  }

  if (esAprobado(estadoNuevo)) return "confirmar";
  if (estadoNuevo === "VOIDED") return "cancelar";
  if (esRechazado(estadoNuevo)) return "dejar_vencer";
  return "solo_guardar";
}

/* ===========================================================================
 * El dinero
 * ======================================================================== */

/**
 * Cuánto queda registrado como pagado tras un cobro aprobado.
 *
 * **Se suma, no se sustituye.** Hay dos casos reales en los que el pago nuevo no
 * es el único dinero de la reserva:
 *
 *   · el hotel registró un abono a mano antes (una transferencia), y
 *   · el huésped paga el saldo con un segundo cobro.
 *
 * Y se topa en el total, porque un abono apuntado por error no puede dejar la
 * ficha diciendo que pagaron más de lo que vale la estadía: eso se lee como un
 * reembolso pendiente que nadie debe.
 */
export function pagadoTrasCobro(
  total: number,
  pagadoAntes: number,
  cobrado: number,
): { pagado: number; saldo: number } {
  const limpio = (valor: number) =>
    Number.isFinite(valor) ? Math.max(0, Math.round(valor)) : 0;

  const totalLimpio = limpio(total);
  const pagado = Math.min(totalLimpio, limpio(pagadoAntes) + limpio(cobrado));

  return { pagado, saldo: Math.max(0, totalLimpio - pagado) };
}
