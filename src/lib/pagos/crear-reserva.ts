/**
 * Crear la reserva y abrir el cobro: el orden importa, y es este.
 *
 * ===========================================================================
 * LOS SEIS PASOS, EN ESTE ORDEN Y NO EN OTRO
 * ===========================================================================
 *   1. **Recalcular el precio en el servidor.** Del navegador llegan decisiones,
 *      nunca cifras (`cotizarEnServidor`). Requisito 1 de la auditoría.
 *   2. **Liberar las reservas vencidas** (`liberar_reservas_vencidas`). No es
 *      opcional: `reservas_sin_solapamiento` es una restricción EXCLUDE y su
 *      predicado no puede llamar a `now()`, así que para ella un hold vencido
 *      sigue apartando las fechas y rechazaría unas noches que están libres. Lo
 *      mismo vale para el trigger del cupo del Día de Calma, que cuenta las
 *      `pendiente` sin mirar `expira_at`.
 *   3. **Verificar disponibilidad** y explicarla en español. La última palabra
 *      la tiene la restricción de la base; esto existe para poder decir «esas
 *      noches se acaban de ocupar» en vez de un `23P01`.
 *   4. **Crear la reserva `pendiente`** con su código y `expira_at = ahora + 30
 *      min`. Las fechas quedan apartadas mientras el huésped paga, y se sueltan
 *      solas si no paga.
 *   5. **Crear la fila de `pagos`** con la referencia que se le va a enviar a
 *      Bold. Nace en `PROCESSING`: todavía no se sabe nada.
 *   6. **Devolver la configuración del checkout**, con el anticipo elegido y la
 *      firma de integridad ya calculada **en el servidor**.
 *
 * ---------------------------------------------------------------------------
 * SI ALGO FALLA DESPUÉS DEL PASO 4, LA RESERVA SE SUELTA
 * ---------------------------------------------------------------------------
 * Un fallo al crear la fila de `pagos` o al firmar el cobro dejaría unas fechas
 * apartadas por una reserva que nunca va a poder pagarse. Como no hay
 * transacción que abarque los dos (son dos tablas y el cliente de Supabase no
 * expone `begin`), se cancela a mano: `estado = 'cancelada'` con el motivo
 * escrito. Es mejor una fila cancelada en el historial que una cabaña bloqueada
 * media hora por un error nuestro.
 *
 * ---------------------------------------------------------------------------
 * NINGÚN CORREO AQUÍ
 * ---------------------------------------------------------------------------
 * La solicitud no manda «recibimos tu solicitud»: el huésped está en ese
 * momento mirando la pasarela, y un correo que dice «la tenemos» treinta
 * segundos antes de que el pago falle es ruido y confunde. El correo sale
 * **cuando el webhook aprueba el pago** (`avisarPagoAprobado`), que es cuando
 * hay algo que contar. Si el pago no entra, la reserva se cae sola y el huésped
 * no recibió nunca una promesa que el hotel no iba a cumplir.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MONTO_MINIMO_BOLD,
  configuracionCheckout,
  construirReferencia,
  type ConfiguracionCheckoutBold,
} from "./bold";
import {
  cotizarEnServidor,
  type CotizacionAutoritativa,
  type SolicitudDeReserva,
} from "./cotizar-en-servidor";
import { insertarReservaConCodigo } from "../admin/codigo-reserva";
import {
  buscarChoques,
  describirChoques,
  mensajeNochesOcupadasParaHuesped,
} from "../admin/disponibilidad";
import { aRangoFechas, formatearEstadia, formatearFecha } from "../utils/formato";
import { LEGAL_ACTUALIZADO } from "../sitio";
import {
  CalendarioSinRespuesta,
  MENSAJE_SIN_CALENDARIO_HUESPED,
} from "../reserva/calendario-sin-respuesta";
import { calcularVencimiento } from "../reserva/holds";
import { liberarReservasVencidas } from "../reserva/liberar-vencidas";

/* ===========================================================================
 * Datos del huésped
 * ======================================================================== */

export type DatosHuesped = {
  nombre: string;
  correo: string;
  telefono: string;
  notas: string | null;
};

/* ===========================================================================
 * Entrada y salida
 * ======================================================================== */

export type PeticionDePago = {
  solicitud: SolicitudDeReserva;
  huesped: DatosHuesped;
  /** Dirección canónica del sitio, sin barra final. */
  origen: string;
};

export type ReservaConCobro = {
  reservaId: string;
  codigo: string;
  referencia: string;
  /** Lo que se cobra ahora, en pesos enteros. */
  anticipo: number;
  /** Lo que queda por pagar en la finca o por link antes de llegar. */
  saldo: number;
  total: number;
  porcentaje: number;
  expiraAt: string;
  /** Lista para que el navegador la pase a `new BoldCheckout(...)`. */
  checkout: ConfiguracionCheckoutBold;
};

export type ResultadoPago =
  | { ok: true; datos: ReservaConCobro }
  /**
   * `codigo` separa lo que el huésped puede arreglar (`datos`: 400) de lo que
   * no (`ocupado`: 409; `servidor`: 500). El Route Handler lo traduce a HTTP.
   */
  | { ok: false; motivo: string; codigo: "datos" | "ocupado" | "servidor" };

function fallo(
  motivo: string,
  codigo: "datos" | "ocupado" | "servidor" = "datos",
): ResultadoPago {
  return { ok: false, motivo, codigo };
}

/* ===========================================================================
 * El flujo
 * ======================================================================== */

export async function crearReservaYCobro(
  supabase: SupabaseClient,
  peticion: PeticionDePago,
): Promise<ResultadoPago> {
  const ahora = new Date();

  /* ---------------------------------------------------------------------
     1. EL PRECIO, RECALCULADO AQUÍ
     ------------------------------------------------------------------ */
  const recalculo = await cotizarEnServidor(supabase, peticion.solicitud, ahora);
  if (!recalculo.ok) {
    /* Lo que el huésped puede arreglar (otras fechas, otra cabaña) es un 400;
       lo que no depende de él —Google sin respuesta, un precio mal
       configurado— es del servidor. */
    return fallo(recalculo.motivo, recalculo.servidor ? "servidor" : "datos");
  }

  const cotizacion = recalculo.cotizacion;
  const { pago } = cotizacion;

  /* El mínimo de Bold se comprueba ANTES de escribir nada: si el anticipo no
     llega, la pasarela daría un error opaco con la reserva ya creada. */
  if (pago.anticipo < MONTO_MINIMO_BOLD) {
    return fallo(
      `El pago en línea mínimo es de $${MONTO_MINIMO_BOLD.toLocaleString("es-CO")} COP y este anticipo sería menor. Súbelo con el deslizante o escríbenos por WhatsApp.`,
    );
  }

  /* ---------------------------------------------------------------------
     2. LIBERAR LAS VENCIDAS — ANTES DE ESCRIBIR, SIEMPRE
     ------------------------------------------------------------------ */
  await liberarReservasVencidas(supabase);

  /* ---------------------------------------------------------------------
     3. DISPONIBILIDAD
     ------------------------------------------------------------------ */
  /* El Día de Calma no ocupa cabaña: su comprobación es el cupo, y ya la hizo
     `cotizarEnServidor` con la misma regla que el sitio y el panel. */
  if (cotizacion.alojamientoId) {
    try {
      const choques = await buscarChoques(
        supabase,
        cotizacion.alojamientoId,
        cotizacion.entrada,
        cotizacion.salida,
      );
      if (choques.length > 0) {
        /*
          EL DETALLE, SOLO EN EL REGISTRO DEL SERVIDOR.
          `describirChoques()` nombra al otro huésped, el código de su reserva
          o el título del evento de Google. Devolverlo al navegador dejaba a
          cualquiera averiguar con un POST a mano quién se aloja cuándo (Ley
          1581 de 2012). El huésped lee una frase genérica; el equipo, si hace
          falta, encuentra el porqué en los registros.
        */
        console.warn(
          `[pagos] noches ocupadas al reservar (${cotizacion.entrada} → ${cotizacion.salida}):`,
          describirChoques(choques),
        );
        return fallo(
          mensajeNochesOcupadasParaHuesped(cotizacion.alojamientoNombre),
          "ocupado",
        );
      }
    } catch (error) {
      /* FALLA CERRADO. Con el calendario de Google del hotel configurado y sin
         respuesta, no se sabe si esas noches están libres —hoy todas las
         reservas reales viven allí—, así que no se aparta nada. Lo mismo si la
         base no respondió. */
      console.error(
        "[pagos] no se pudo comprobar la disponibilidad:",
        error instanceof CalendarioSinRespuesta
          ? `calendario de Google: ${error.detalle}`
          : error instanceof Error
            ? error.message
            : error,
      );
      return fallo(MENSAJE_SIN_CALENDARIO_HUESPED, "servidor");
    }
  }

  /* ---------------------------------------------------------------------
     4. LA RESERVA, `pendiente` Y CON VENCIMIENTO
     ------------------------------------------------------------------ */
  const expira = calcularVencimiento(ahora);

  const fila = {
    tipo: cotizacion.tipo,
    alojamiento_id: cotizacion.alojamientoId,
    plan_id: cotizacion.planId,
    estancia: aRangoFechas(cotizacion.entrada, cotizacion.salida),
    huesped_nombre: peticion.huesped.nombre,
    huesped_email: peticion.huesped.correo,
    huesped_telefono: peticion.huesped.telefono,
    huesped_documento: null,
    num_personas: cotizacion.numPersonas,
    notas: peticion.huesped.notas,
    subtotal_alojamiento: pago.subtotalAlojamiento,
    subtotal_extras: pago.subtotalExtras,
    total: pago.total,
    monto_pagado: 0,
    estado: "pendiente" as const,
    origen: "web" as const,
    porcentaje_anticipo: pago.porcentaje,
    monto_anticipo: pago.anticipo,
    expira_at: expira.toISOString(),
    /*
      LA PRUEBA DE LA AUTORIZACIÓN DE DATOS, ESCRITA DE VERDAD.

      Requisito 10 de la auditoría: «La casilla de autorización de datos ya
      existe; al crear la reserva desde el servidor hay que escribir las tres
      columnas `autorizacion_datos_*` con canal `web`, en vez de dejarlas en
      `null`». Las tres juntas, como exige el `check` de la migración 012.

      Que la casilla estaba marcada ya lo verificó quien llama (el Route
      Handler): sin ella no se llega hasta aquí. La **versión** es la del texto
      publicado hoy, porque la política se edita desde el panel y dentro de un
      año el texto no será el que esta persona leyó.
    */
    autorizacion_datos_en: ahora.toISOString(),
    autorizacion_datos_version: LEGAL_ACTUALIZADO,
    autorizacion_datos_canal: "web" as const,
  };

  /* El código lo pone la base (contador por año, migración 019), igual que
     en el panel: aquí se inserta sin él y se lee el que devuelve. */
  const insertada = await insertarReservaConCodigo(supabase, fila);
  const reservaId = insertada.ok ? insertada.id : null;
  const codigo = insertada.ok ? insertada.codigo : "";
  const ultimoError = insertada.ok ? null : insertada.error;

  if (!reservaId) {
    /* 23P01 = las fechas se acaban de ocupar. LF010 = cupo del Día de Calma
       lleno. Reintentar no ayuda en ninguno de los dos. */
    const codigoError = ultimoError?.code ?? "";
    if (codigoError === "23P01") {
      return fallo(
        "Esas fechas se acaban de ocupar mientras elegías. Elige otras o escríbenos por WhatsApp.",
        "ocupado",
      );
    }
    if (codigoError === "LF010") {
      return fallo(
        ultimoError?.message ??
          "Ese Día de Calma se acaba de llenar. Elige otra fecha.",
        "ocupado",
      );
    }
    console.error(
      "[pagos] no se pudo crear la reserva:",
      ultimoError?.message ?? "sin detalle",
    );
    return fallo(
      "No pudimos crear tu reserva ahora mismo. Inténtalo de nuevo o escríbenos por WhatsApp.",
      "servidor",
    );
  }

  /* Las experiencias, con su precio congelado del catálogo. */
  if (cotizacion.extras.length > 0) {
    const { error } = await supabase.from("reserva_extras").insert(
      cotizacion.extras.map((extra) => ({ ...extra, reserva_id: reservaId })),
    );
    if (error) {
      /* El total de la reserva YA incluye los extras: si no se pudieron
         guardar, cobrarlos sería cobrar algo que no está escrito. Se suelta. */
      await soltarReserva(
        supabase,
        reservaId,
        "Reserva anulada: no se pudieron guardar las experiencias elegidas.",
      );
      console.error("[pagos] no se pudieron guardar los extras:", error.message);
      return fallo(
        "No pudimos guardar las experiencias que elegiste. Inténtalo de nuevo.",
        "servidor",
      );
    }
  }

  /* ---------------------------------------------------------------------
     5. LA FILA DE `pagos`, CON LA REFERENCIA QUE VA A BOLD
     ------------------------------------------------------------------ */
  const referencia = construirReferencia(codigo, ahora);

  const { error: errorPago } = await supabase.from("pagos").insert({
    reserva_id: reservaId,
    referencia,
    monto: pago.anticipo,
    /* `PROCESSING` es el estado de Bold para «en proceso». Nace así y no en
       `PENDING`, que en Bold significa algo más estrecho (solo PSE). */
    estado: "PROCESSING",
    pasarela: "bold",
    metodo: null,
    payload: null,
  });

  if (errorPago) {
    await soltarReserva(
      supabase,
      reservaId,
      "Reserva anulada: no se pudo registrar el intento de pago.",
    );
    console.error("[pagos] no se pudo crear la fila de pagos:", errorPago.message);
    return fallo(
      "No pudimos abrir el pago ahora mismo. Inténtalo de nuevo o escríbenos por WhatsApp.",
      "servidor",
    );
  }

  /* ---------------------------------------------------------------------
     6. LA CONFIGURACIÓN DEL CHECKOUT, FIRMADA AQUÍ
     ------------------------------------------------------------------ */
  try {
    const checkout = configuracionCheckout({
      referencia,
      monto: pago.anticipo,
      descripcion: descripcionDeLaVenta(cotizacion, codigo),
      /* La referencia viaja en nuestra propia URL además de en el parámetro que
         añade Bold (`bold-order-id`): así la página de retorno funciona aunque
         Bold cambie el nombre de su parámetro, y funciona también cuando el
         huésped llega por `originUrl` (abandono), donde Bold no añade nada. */
      urlRetorno: `${peticion.origen}/reservar/confirmacion?ref=${encodeURIComponent(referencia)}`,
      urlAbandono: `${peticion.origen}/reservar/confirmacion?ref=${encodeURIComponent(referencia)}&abandono=1`,
      /* El pago caduca cuando caduca el hold: Bold da 24 h por defecto y pagar
         un hold vencido sería cobrar una noche ya ofrecida a otra persona. */
      expiraEn: expira,
      huesped: {
        nombre: peticion.huesped.nombre,
        correo: peticion.huesped.correo,
        telefono: peticion.huesped.telefono,
      },
    });

    return {
      ok: true,
      datos: {
        reservaId,
        codigo,
        referencia,
        anticipo: pago.anticipo,
        saldo: pago.saldo,
        total: pago.total,
        porcentaje: pago.porcentaje,
        expiraAt: expira.toISOString(),
        checkout,
      },
    };
  } catch (error) {
    await soltarReserva(
      supabase,
      reservaId,
      "Reserva anulada: no se pudo preparar el cobro en línea.",
    );
    console.error(
      "[pagos] no se pudo preparar el checkout:",
      error instanceof Error ? error.message : error,
    );
    return fallo(
      "No pudimos abrir la pasarela de pagos. Escríbenos por WhatsApp y cerramos tu reserva.",
      "servidor",
    );
  }
}

/* ===========================================================================
 * Piezas auxiliares
 * ======================================================================== */

/**
 * Cancela una reserva recién creada que no va a poder pagarse.
 *
 * Nunca lanza: se la llama desde los caminos de error, y un fallo aquí no debe
 * tapar el error original. Lo peor que pasa es que el barrido de los treinta
 * minutos la recoja igual.
 */
async function soltarReserva(
  supabase: SupabaseClient,
  reservaId: string,
  motivo: string,
): Promise<void> {
  try {
    await supabase
      .from("reservas")
      .update({ estado: "cancelada", expira_at: null, notas: motivo })
      .eq("id", reservaId);
  } catch (error) {
    console.error(
      `[pagos] no se pudo soltar la reserva ${reservaId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Lo que el huésped lee en la pasarela de Bold y en su extracto bancario.
 *
 * Tiene que decir **qué** compró y **cuándo**, porque un cargo que dice solo
 * «La Finca» a los veinte días es una llamada al banco. Bold admite 100
 * caracteres y `descripcionParaBold()` recorta lo que sobre.
 */
function descripcionDeLaVenta(
  cotizacion: CotizacionAutoritativa,
  codigo: string,
): string {
  if (cotizacion.tipo === "dia") {
    return `${codigo} · ${cotizacion.planNombre} · ${formatearFecha(cotizacion.entrada)}`;
  }
  const cabana = cotizacion.alojamientoNombre ?? "La Finca";
  return `${codigo} · ${cabana} · ${formatearEstadia(cotizacion.entrada, cotizacion.salida)}`;
}
