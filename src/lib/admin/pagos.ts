/**
 * Los pagos, vistos desde el panel.
 *
 * ---------------------------------------------------------------------------
 * QUÉ SE MUESTRA Y QUÉ NO
 * ---------------------------------------------------------------------------
 * **No hay ni un dato de tarjeta aquí, y no es un olvido.** El checkout es de
 * Bold y este sitio nunca ve un número de tarjeta ni un CVV; lo único que Bold
 * manda es el PAN enmascarado, y eso se queda dentro del `payload` crudo de
 * `pagos` como soporte del cobro. El panel enseña lo que el equipo del hotel
 * necesita para atender a un huésped por teléfono:
 *
 *   · en qué estado está el cobro,
 *   · cuánto entró y cuánto falta,
 *   · la **referencia**, que es lo que se busca en el panel de Bold,
 *   · el **método** (tarjeta, PSE, Nequi…), porque cambia a quién se reclama,
 *   · el `payment_id` de Bold, que es lo que pide su soporte.
 *
 * Requisito 6 de `docs/AUDITORIA_SEGURIDAD.md`: «Nunca se guarda un dato de la
 * tarjeta (…) en la base solo entra la referencia, el monto y el estado. La
 * política de privacidad ya lo dice, y tiene que seguir siendo verdad».
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ETIQUETA_ESTADO_BOLD,
  esAprobado,
  esRechazado,
  etiquetaMetodoPago,
  normalizarEstadoBold,
  type EstadoBold,
} from "../pagos/bold";

export type PagoAdmin = {
  id: string;
  reservaId: string | null;
  referencia: string;
  /** El `payment_id` de Bold. `null` mientras no haya habido intento. */
  transaccionId: string | null;
  /** Lo que se intentó cobrar (o se cobró), en pesos enteros. */
  monto: number;
  estado: EstadoBold;
  /** `Tarjeta`, `PSE`, `Nequi`… ya traducido. */
  metodo: string | null;
  pasarela: string;
  creadoEn: string;
  /** Cuándo se convirtió en una confirmación. `null` = todavía no. */
  procesadoEn: string | null;
};

const COLUMNAS =
  "id, reserva_id, referencia, transaccion_id, monto, estado, metodo, pasarela, created_at, procesado_at";

type FilaPago = Record<string, unknown>;

function aPagoAdmin(fila: FilaPago): PagoAdmin {
  return {
    id: String(fila.id),
    reservaId: fila.reserva_id ? String(fila.reserva_id) : null,
    referencia: String(fila.referencia ?? ""),
    transaccionId:
      typeof fila.transaccion_id === "string" ? fila.transaccion_id : null,
    monto: Number(fila.monto ?? 0),
    estado: normalizarEstadoBold(fila.estado),
    metodo: etiquetaMetodoPago(
      typeof fila.metodo === "string" ? fila.metodo : null,
    ),
    pasarela: typeof fila.pasarela === "string" ? fila.pasarela : "bold",
    creadoEn: String(fila.created_at ?? ""),
    procesadoEn: typeof fila.procesado_at === "string" ? fila.procesado_at : null,
  };
}

/**
 * Todos los intentos de pago de una reserva, del más reciente al más antiguo.
 *
 * Son varios cuando el huésped lo intentó con una tarjeta que no pasó y después
 * con otra: cada intento es su propia referencia y su propia fila, y verlos
 * todos es justamente lo que explica una llamada de «me cobraron dos veces»
 * (normalmente no: hay un rechazado y un aprobado).
 *
 * Nunca lanza: una reserva que no se puede acompañar de sus pagos se sigue
 * pudiendo ver y editar. Un fallo al leer esta tabla no puede tumbar la ficha.
 */
export async function pagosDeReserva(
  supabase: SupabaseClient,
  reservaId: string,
): Promise<PagoAdmin[]> {
  try {
    const { data, error } = await supabase
      .from("pagos")
      .select(COLUMNAS)
      .eq("reserva_id", reservaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/pagos] no se pudieron leer los pagos:", error.message);
      return [];
    }
    return (data ?? []).map(aPagoAdmin);
  } catch (error) {
    console.error(
      "[admin/pagos] no se pudieron leer los pagos:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

/**
 * El último pago de cada reserva de una lista, para el listado del panel.
 *
 * Una consulta sola para las N reservas de la pantalla, no una por fila: el
 * listado trae hasta 300 y 300 consultas serían 300 viajes a la base.
 */
export async function ultimoPagoPorReserva(
  supabase: SupabaseClient,
  reservaIds: string[],
): Promise<Map<string, PagoAdmin>> {
  const mapa = new Map<string, PagoAdmin>();
  if (reservaIds.length === 0) return mapa;

  try {
    const { data, error } = await supabase
      .from("pagos")
      .select(COLUMNAS)
      .in("reserva_id", reservaIds)
      /* Del más viejo al más nuevo, para que el último sobrescriba al anterior
         al construir el mapa y quede el reciente. */
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[admin/pagos] no se pudo leer el listado:", error.message);
      return mapa;
    }

    for (const fila of data ?? []) {
      const pago = aPagoAdmin(fila);
      if (pago.reservaId) mapa.set(pago.reservaId, pago);
    }
  } catch (error) {
    console.error(
      "[admin/pagos] no se pudo leer el listado:",
      error instanceof Error ? error.message : error,
    );
  }

  return mapa;
}

/* ===========================================================================
 * Cómo se cuenta en pantalla
 * ======================================================================== */

export type ResumenPagoReserva = {
  /** Qué pastilla ponerle a la reserva en el listado. */
  etiqueta: string;
  tono: "verde" | "ambar" | "rojo" | "gris";
};

/**
 * Cómo se resume el estado del dinero de una reserva **en una pastilla**.
 *
 * No se mira solo el pago: se mira **cuánto entró de verdad** frente al total,
 * porque son dos cosas distintas y el equipo necesita las dos. Una reserva puede
 * tener un pago aprobado del 50 % y seguir teniendo saldo, y una reserva sin
 * ninguna fila de `pagos` puede estar pagada en efectivo y registrada a mano
 * desde el panel.
 *
 * El orden de las ramas es el orden en que importa:
 *   1. ¿Está pagada entera? Entonces no hay nada que cobrar.
 *   2. ¿Entró algo? Entonces hay saldo, y se dice cuánto falta.
 *   3. ¿Hubo un intento y se cayó? Es lo que el equipo tiene que ver.
 *   4. ¿Hay un intento abierto? Está en la pasarela ahora mismo.
 *   5. Si no, sin pago: la escribió el equipo o el huésped no llegó a pagar.
 */
export function resumirPagoDeReserva(
  total: number,
  pagado: number,
  pago: PagoAdmin | undefined,
  estadoReserva?: string | null,
): ResumenPagoReserva {
  if (total > 0 && pagado >= total) {
    return { etiqueta: "Pagada", tono: "verde" };
  }
  if (pagado > 0) {
    return { etiqueta: "Anticipo pagado", tono: "ambar" };
  }
  /*
    UNA RESERVA CANCELADA NO TIENE UN PAGO «EN CURSO».

    Es el caso de un checkout abandonado: la fila de `pagos` se quedó en
    `PROCESSING` para siempre porque nadie volvió, y el barrido canceló la
    reserva. Decir «pago en curso» ahí manda al equipo a esperar algo que no va a
    llegar. Sin dinero y sin reserva, no hay nada que cobrar.
  */
  if (estadoReserva === "cancelada") {
    return { etiqueta: "Sin cobro", tono: "gris" };
  }
  if (pago && esRechazado(pago.estado)) {
    return { etiqueta: ETIQUETA_ESTADO_BOLD[pago.estado], tono: "rojo" };
  }
  if (pago && !esAprobado(pago.estado)) {
    return { etiqueta: "Pago en curso", tono: "ambar" };
  }
  return { etiqueta: "Sin pago", tono: "gris" };
}
