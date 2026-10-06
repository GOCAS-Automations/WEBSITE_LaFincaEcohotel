/**
 * Los tres momentos en que salen correos, cada uno en una función.
 *
 * `send.ts` sabe hablar con Resend y `plantillas.ts` sabe redactar; esto es la
 * capa de en medio: lee la reserva de la base, la traduce a `DatosCorreo` y
 * dispara los correos que toquen. Existe para que **quien confirma una reserva
 * no tenga que saber nada de correos**: una línea, y si algo falla no se nota.
 *
 * ---------------------------------------------------------------------------
 * NINGUNA DE ESTAS FUNCIONES LANZA. NUNCA.
 * ---------------------------------------------------------------------------
 * Se llaman desde Server Actions del panel y, cuando entre la pasarela, desde el
 * webhook de pagos. En los dos sitios la reserva **ya está guardada** cuando se
 * llega aquí: un fallo de correo no puede impedir guardar ni confirmar una
 * reserva, y mucho menos tumbar un webhook que la pasarela reintentaría.
 *
 * Por eso todo va dentro de `try/catch`, incluida la lectura de la base, y el
 * resultado es informativo: quien llama puede ignorarlo por completo.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DatosCorreo, NocheCorreo, PagoCorreo } from "./plantillas";
import {
  enviarAvisoAdministracion,
  enviarReservaConfirmada,
  enviarSolicitudRecibida,
  type ResultadoCorreo,
} from "./send";
import { extrasDeReserva, obtenerReserva } from "../admin/datos";

/** Qué pasó con los correos de un momento. Meramente informativo. */
export type ResumenAvisos = {
  /** El correo al huésped, si correspondía. */
  huesped: ResultadoCorreo | null;
  /** El aviso a la administración, si correspondía. */
  administracion: ResultadoCorreo | null;
};

const SIN_AVISOS: ResumenAvisos = { huesped: null, administracion: null };

/* ===========================================================================
 * De la fila de `reservas` a los datos del correo
 * ======================================================================== */

/**
 * Lee la reserva y sus extras y los deja como los quieren las plantillas.
 *
 * Devuelve `null` si la reserva ya no existe o si la base no responde. No
 * lanza: quien llama se limita a no enviar nada.
 *
 * El desglose **noche por noche** (`noches`) no sale de aquí: la fila de
 * `reservas` guarda un único `plan_id` y un subtotal, y repartirlo a ojo entre
 * las noches sería inventarse cifras en un correo de cobro. Quien sí tiene el
 * desglose real es el motor público —`cotizar()` lo calcula noche a noche—, y
 * puede pasarlo por `nochesExtra`. Sin él, la plantilla pinta una sola línea con
 * el plan y el número de noches, que es verdad.
 */
export async function datosDeReserva(
  supabase: SupabaseClient,
  reservaId: string,
  extras?: { noches?: NocheCorreo[]; pago?: PagoCorreo | null },
): Promise<DatosCorreo | null> {
  try {
    const [reserva, lineas] = await Promise.all([
      obtenerReserva(supabase, reservaId),
      extrasDeReserva(supabase, reservaId),
    ]);

    if (!reserva) return null;

    return {
      id: reserva.id,
      codigo: reserva.codigo,
      tipo: reserva.tipo,
      alojamiento: reserva.alojamiento_nombre,
      plan: reserva.plan_nombre,
      entrada: reserva.entrada,
      salida: reserva.salida,
      numPersonas: reserva.num_personas,
      huespedNombre: reserva.huesped_nombre,
      huespedEmail: reserva.huesped_email || null,
      huespedTelefono: reserva.huesped_telefono || null,
      notas: reserva.notas,
      subtotalAlojamiento: reserva.subtotal_alojamiento,
      subtotalExtras: reserva.subtotal_extras,
      total: reserva.total,
      porcentajeAnticipo: reserva.porcentaje_anticipo,
      /* `monto_anticipo` es `null` en las reservas anteriores a la migración
         010: se recompone con el porcentaje para no enseñar un cero. */
      montoAnticipo:
        reserva.monto_anticipo ??
        Math.round((reserva.total * reserva.porcentaje_anticipo) / 100),
      experiencias: lineas.map((linea) => ({
        nombre: linea.nombre,
        cantidad: linea.cantidad,
        precioUnitario: linea.precio_unitario,
        noche: linea.noche,
      })),
      noches: extras?.noches,
      estado: reserva.estado,
      origen: reserva.origen,
      expiraAt: reserva.expira_at,
      pago: extras?.pago ?? null,
    };
  } catch (error) {
    console.error(
      `[correos] no se pudieron leer los datos de la reserva ${reservaId}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/* ===========================================================================
 * Los tres momentos
 * ======================================================================== */

/**
 * **Momento 1 — se crea una solicitud.**
 *
 * Al huésped, «recibimos tu solicitud», siempre. Al hotel, el aviso interno con
 * el teléfono y el enlace a la ficha **solo si la solicitud llegó del sitio**
 * (`origen = 'web'`): una reserva que alguien del equipo acaba de escribir en el
 * panel no necesita avisar al equipo de que existe, y un correo que cuenta lo
 * que uno acaba de hacer enseña a ignorar los correos del sistema.
 *
 * Se llama desde el alta del panel y —cuando exista— desde la creación de la
 * solicitud en el motor público.
 */
export async function avisarSolicitudCreada(
  supabase: SupabaseClient,
  reservaId: string,
  extras?: { noches?: NocheCorreo[] },
): Promise<ResumenAvisos> {
  try {
    const datos = await datosDeReserva(supabase, reservaId, extras);
    if (!datos) return SIN_AVISOS;

    const delSitio = datos.origen === "web";

    /* En paralelo: son dos destinatarios distintos y ninguno depende del otro.
       `allSettled` para que un fallo de uno no arrastre al otro. */
    const [huesped, administracion] = await Promise.allSettled([
      enviarSolicitudRecibida(datos),
      delSitio ? enviarAvisoAdministracion(datos) : Promise.resolve(null),
    ]);

    return {
      huesped: huesped.status === "fulfilled" ? huesped.value : null,
      administracion:
        administracion.status === "fulfilled" ? administracion.value : null,
    };
  } catch (error) {
    console.error(
      "[correos] fallo al avisar de la solicitud creada:",
      error instanceof Error ? error.message : error,
    );
    return SIN_AVISOS;
  }
}

/**
 * **Momento 2 — el hotel confirma la reserva desde el panel.**
 *
 * Solo al huésped: quien acaba de pulsar «Confirmar» es el hotel, y mandarle un
 * aviso de algo que hizo él hace medio segundo es ruido que enseña a ignorar los
 * correos del sistema.
 */
export async function avisarReservaConfirmada(
  supabase: SupabaseClient,
  reservaId: string,
  extras?: { noches?: NocheCorreo[] },
): Promise<ResumenAvisos> {
  try {
    const datos = await datosDeReserva(supabase, reservaId, extras);
    if (!datos) return SIN_AVISOS;

    return {
      huesped: await enviarReservaConfirmada(datos),
      administracion: null,
    };
  } catch (error) {
    console.error(
      "[correos] fallo al avisar de la reserva confirmada:",
      error instanceof Error ? error.message : error,
    );
    return SIN_AVISOS;
  }
}

/**
 * **Momento 3 — la pasarela aprueba el pago.**
 *
 * Al huésped, la confirmación con lo que pagó y el saldo que queda; al hotel,
 * el aviso interno con el método y el identificador de la transacción.
 *
 * Aquí sí van los dos: al hotel nadie le ha dicho que entró un pago, y ese es
 * el aviso que de verdad tiene que llegarle.
 *
 * ---------------------------------------------------------------------------
 * ESTA ES LA FUNCIÓN QUE LLAMA EL WEBHOOK DE PAGOS
 * ---------------------------------------------------------------------------
 * Está escrita y probada antes de que exista la pasarela a propósito: el
 * webhook es el peor sitio para estar escribiendo lógica de correos con prisa.
 * Cuando se cablee (ver la costura marcada en
 * `src/components/sitio/selector-reserva.tsx` y §«Jueves 1 — pagos» de
 * `docs/PLAN_CIERRE.md`), el webhook hace:
 *
 *     await avisarPagoAprobado(supabase, reservaId, {
 *       monto: montoAprobado,
 *       saldo: reserva.total - montoAprobado,
 *       metodo: "Tarjeta",
 *       transaccionId: evento.transaction.id,
 *     });
 *
 * y nada más. Sin `try/catch` alrededor: ya está dentro.
 */
export async function avisarPagoAprobado(
  supabase: SupabaseClient,
  reservaId: string,
  pago: PagoCorreo,
  extras?: { noches?: NocheCorreo[] },
): Promise<ResumenAvisos> {
  try {
    const datos = await datosDeReserva(supabase, reservaId, {
      ...extras,
      pago,
    });
    if (!datos) return SIN_AVISOS;

    const [huesped, administracion] = await Promise.allSettled([
      enviarReservaConfirmada(datos),
      enviarAvisoAdministracion(datos),
    ]);

    return {
      huesped: huesped.status === "fulfilled" ? huesped.value : null,
      administracion:
        administracion.status === "fulfilled" ? administracion.value : null,
    };
  } catch (error) {
    console.error(
      "[correos] fallo al avisar del pago aprobado:",
      error instanceof Error ? error.message : error,
    );
    return SIN_AVISOS;
  }
}

/**
 * Aviso INTERNO de un pago que no se pudo convertir en reserva confirmada.
 *
 * Pasa cuando un pago llega tarde —el hold ya había vencido— y entretanto esas
 * noches se ocuparon (otra reserva, un bloqueo, un evento del calendario del
 * hotel) o el Día de Calma se llenó. La reserva NO se confirma: queda marcada
 * para revisión manual y aquí sale el correo a la administración con `alerta`,
 * que lo dice arriba del todo y cambia el asunto a «⚠ Revisar a mano».
 *
 * Al huésped NO se le manda nada automático: lo que hay que decirle (devolver
 * el dinero u ofrecerle otra cabaña u otras fechas) lo decide una persona.
 *
 * Nunca lanza.
 */
export async function avisarPagoSinNoches(
  supabase: SupabaseClient,
  reservaId: string,
  pago: PagoCorreo,
  alerta: string,
): Promise<ResumenAvisos> {
  try {
    const datos = await datosDeReserva(supabase, reservaId, { pago });
    if (!datos) return SIN_AVISOS;
    const administracion = await enviarAvisoAdministracion({ ...datos, alerta });
    return { huesped: null, administracion };
  } catch (error) {
    console.error(
      "[correos] fallo al avisar del pago sin noches libres:",
      error instanceof Error ? error.message : error,
    );
    return SIN_AVISOS;
  }
}
