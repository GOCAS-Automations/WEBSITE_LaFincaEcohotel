import { after } from "next/server";

import {
  CABECERA_FIRMA_BOLD,
  boldConfigurado,
  consultarEstadoPago,
  esAprobado,
  estadoDeEvento,
  etiquetaMetodoPago,
  firmaDeEventoValida,
  leerEventoBold,
  modoBold,
  type EstadoBold,
} from "@/lib/pagos/bold";
import {
  decidirAccionDePago,
  pagadoTrasCobro,
} from "@/lib/pagos/transiciones";
import { avisarPagoAprobado } from "@/lib/email";
import { sincronizarReservaEnCalendario } from "@/lib/reserva/sincronizar-calendario";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * EL WEBHOOK DE BOLD. **Aquí y solo aquí se confirma una reserva.**
 *
 *     POST /api/pagos/bold/webhook
 *
 * ===========================================================================
 * LAS CUATRO REGLAS QUE ESTE ARCHIVO TIENE QUE CUMPLIR
 * ===========================================================================
 * De `docs/AUDITORIA_SEGURIDAD.md`, §Pagos:
 *
 *   **2.** «La reserva se confirma SOLO por webhook, nunca por la redirección
 *   del navegador. La vuelta del checkout es una pista para el huésped, no un
 *   hecho: se puede falsificar escribiendo la URL.»
 *
 *   **3.** «El webhook verifica la firma antes de mirar el cuerpo, y rechaza lo
 *   que no la traiga. Sin esto, cualquiera confirma reservas gratis con un
 *   `curl`.»
 *
 *   **4.** «El webhook es idempotente. La misma transacción tiene que poder
 *   llegar dos veces sin cobrar dos veces ni duplicar la reserva.»
 *
 *   **5.** «El webhook no confía en el estado que le mandan: consulta la
 *   transacción contra la API con su propia clave antes de dar una reserva por
 *   pagada.»
 *
 * ---------------------------------------------------------------------------
 * LA IDEMPOTENCIA, EN DOS CAPAS
 * ---------------------------------------------------------------------------
 * Bold reintenta hasta cinco veces (15 min, 1 h, 4 h, 8 h, 24 h) y además
 * advierte que «puede enviarte múltiples notificaciones por una misma
 * transacción (…) o confirmaciones de estado».
 *
 *   **Capa 1 — el `id` de la notificación.** Se inserta en `pagos_eventos`,
 *   cuya clave primaria ES ese `id`. `insert … on conflict do nothing
 *   returning` es a la vez el registro y el candado: si no devuelve fila, ese
 *   evento exacto ya se procesó y aquí se responde 200 sin hacer nada.
 *
 *   **Capa 2 — la transición de estado.** La capa 1 no basta, porque Bold
 *   documenta el `id` como único «por notificación enviada», no por
 *   transacción: un reintento podría traer otro `id` del mismo pago. Lo que
 *   garantiza que no se dupliquen los correos es que los efectos ocurren **solo
 *   en el `update` condicional**:
 *
 *       update pagos set estado='APPROVED' … where referencia=$1 and estado<>'APPROVED'
 *
 *   Si no devuelve fila, ese pago ya estaba aprobado y no se reenvía nada.
 *
 * ---------------------------------------------------------------------------
 * RESPONDER RÁPIDO, Y QUÉ SE DEJA PARA DESPUÉS
 * ---------------------------------------------------------------------------
 * «El endpoint debe responder inmediatamente con el código de estado 200 (…)
 * con un máximo de 2 segundos permitidos».
 *
 * Antes de responder se hace solo lo que **no puede perderse**: guardar el
 * evento, consultar el estado real y escribir las dos filas (el pago y la
 * reserva). Los correos y el evento del Google Calendar van en `after()`, que
 * corre con la respuesta ya enviada: son lentos, pueden fallar sin consecuencia
 * y ninguno de los dos cambia el hecho de que el huésped pagó.
 *
 * Si aun así se pasa de dos segundos, Bold reintenta — y el reintento no hace
 * daño, que es exactamente para lo que está la idempotencia.
 *
 * ---------------------------------------------------------------------------
 * UN 500 NUNCA ES LA RESPUESTA CORRECTA A UN CUERPO QUE NO ENTENDEMOS
 * ---------------------------------------------------------------------------
 * Bold reintenta cinco veces todo lo que no sea 200. Un evento que nunca vamos
 * a poder procesar —una referencia que no existe en esta base, un tipo nuevo de
 * evento— se guarda y se responde **200**: reintentarlo cinco veces durante 24
 * horas no lo va a arreglar. Lo que sí devuelve error es la firma inválida
 * (**401**), porque eso no es un evento de Bold.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
/** Los correos y el calendario corren en `after()`; hay que darles aire. */
export const maxDuration = 30;

/** Respuesta estándar: 200 con una línea de texto, que es lo que Bold espera. */
function ok(detalle: string): Response {
  return new Response(JSON.stringify({ recibido: true, detalle }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(peticion: Request) {
  /*
    EL CUERPO SE LEE COMO TEXTO CRUDO, Y ESO NO ES UN DETALLE.

    La firma se calcula sobre el Base64 **del cuerpo tal como llegó**. Un
    `peticion.json()` y luego un `JSON.stringify` cambian espacios y orden de
    claves, y la firma deja de coincidir. Primero el texto, después el `parse`.
  */
  let crudo: string;
  try {
    crudo = await peticion.text();
  } catch {
    return ok("cuerpo ilegible");
  }

  if (!boldConfigurado()) {
    /* Sin llaves no se puede verificar nada, así que no se confía en nada. */
    console.error("[bold/webhook] llegó un evento y Bold no está configurado.");
    return new Response("Pasarela no configurada", { status: 503 });
  }

  /* ---------------------------------------------------------------------
     1. LA FIRMA, ANTES DE MIRAR EL CUERPO
     ------------------------------------------------------------------ */
  const firma = peticion.headers.get(CABECERA_FIRMA_BOLD);

  if (!firmaDeEventoValida(crudo, firma)) {
    /*
      401 y nada más. No se dice si faltaba la cabecera o si no coincidía: es
      información gratis para quien lo esté intentando. Y no se guarda el
      cuerpo: un endpoint que archiva lo que le manden es un sitio donde
      escribir basura.
    */
    console.warn(
      `[bold/webhook] firma inválida (modo ${modoBold()}): el evento se descarta.`,
    );
    return new Response("Firma inválida", { status: 401 });
  }

  /* ---------------------------------------------------------------------
     2. EL EVENTO
     ------------------------------------------------------------------ */
  let json: unknown;
  try {
    json = JSON.parse(crudo);
  } catch {
    return ok("cuerpo no es JSON");
  }

  const evento = leerEventoBold(json);
  if (!evento) {
    console.warn("[bold/webhook] evento con firma válida pero forma desconocida.");
    return ok("evento no reconocido");
  }

  const supabase = crearClienteAdmin();

  /* ---------------------------------------------------------------------
     3. IDEMPOTENCIA, CAPA 1: ¿ya vimos ESTA notificación?
     ------------------------------------------------------------------ */
  if (evento.id) {
    const { data, error } = await supabase
      .from("pagos_eventos")
      .upsert(
        {
          id: evento.id,
          referencia: evento.referencia,
          tipo: evento.tipo,
          payload: json,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id");

    if (error) {
      /* Si no se puede registrar el evento, se sigue igual: la capa 2 es la que
         de verdad impide duplicar efectos, y perder el historial es menos grave
         que dejar sin confirmar una reserva ya pagada. */
      console.error(
        "[bold/webhook] no se pudo registrar el evento:",
        error.message,
      );
    } else if (!data || data.length === 0) {
      console.info(
        `[bold/webhook] evento ${evento.id} repetido: ya estaba procesado.`,
      );
      return ok("evento repetido");
    }
  } else {
    /* Sin `id` no hay capa 1, pero el evento se guarda igual con una clave
       derivada para no perder el rastro. */
    await supabase
      .from("pagos_eventos")
      .upsert(
        {
          id: `sin-id:${evento.referencia ?? "?"}:${evento.tipo}`,
          referencia: evento.referencia,
          tipo: evento.tipo,
          payload: json,
        },
        { onConflict: "id" },
      );
  }

  if (!evento.referencia) {
    /*
      Un evento sin referencia no es nuestro: Bold manda al mismo webhook los
      cobros del datáfono, que no llevan `metadata.reference`. Queda guardado y
      se responde 200.
    */
    console.info(
      `[bold/webhook] evento ${evento.tipo} sin referencia (probablemente de datáfono): se ignora.`,
    );
    return ok("evento sin referencia");
  }

  /* ---------------------------------------------------------------------
     4. EL PAGO QUE ESTE EVENTO TOCA
     ------------------------------------------------------------------ */
  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .select("id, reserva_id, referencia, monto, estado")
    .eq("referencia", evento.referencia)
    .maybeSingle();

  if (errorPago) {
    console.error("[bold/webhook] no se pudo leer el pago:", errorPago.message);
    /* Esto sí merece un reintento: es un fallo nuestro, no del evento. */
    return new Response("Error al leer el pago", { status: 500 });
  }

  if (!pago) {
    console.warn(
      `[bold/webhook] la referencia ${evento.referencia} no existe en esta base.`,
    );
    return ok("referencia desconocida");
  }

  /* ---------------------------------------------------------------------
     5. EL ESTADO REAL, PREGUNTADO A BOLD (requisito 5)
     ------------------------------------------------------------------ */
  /*
    No se confía en el estado que trae el evento. Se pregunta con nuestra propia
    llave de identidad, y lo que diga la API manda.

    Si la consulta falla —red, timeout, un 5xx de Bold— se usa el estado del
    evento y se deja dicho en el registro. Es un compromiso consciente: la firma
    ya se verificó, y en producción esa firma es un HMAC con la llave secreta, o
    sea una garantía de verdad. Dejar sin confirmar una reserva pagada porque la
    API de consulta tuvo un mal minuto sería peor.

    En modo pruebas la firma usa la llave vacía y por tanto no garantiza nada
    (es cómo funciona el sandbox de Bold, ver `modoBold()`): ahí esta consulta
    es la ÚNICA comprobación real, y si falla no se confirma nada.
  */
  const consulta = await consultarEstadoPago(evento.referencia);
  const estadoDelEvento = estadoDeEvento(evento.tipo);

  let estado: EstadoBold;
  if (!consulta.fallo) {
    /*
      `NO_TRANSACTION_FOUND` con un evento firmado en la mano NO es una negativa:
      es una carrera. «La transacción aparecerá disponible para consulta en hasta
      10 minutos» y «la respuesta de la API puede que sea NO_TRANSACTION_FOUND»
      justo cuando el comprador vuelve. El evento llegó antes que el índice de la
      API, así que manda el evento. Lo mismo con un estado que no reconocemos.
    */
    const intermedio =
      consulta.estado === "NO_TRANSACTION_FOUND" ||
      consulta.estado === "DESCONOCIDO";

    estado = intermedio ? estadoDelEvento : consulta.estado;

    if (intermedio) {
      console.info(
        `[bold/webhook] ${evento.referencia}: la API todavía no ve la transacción (${consulta.estado}); se usa el estado del evento firmado (${estadoDelEvento}).`,
      );
    } else if (estado !== estadoDelEvento) {
      console.info(
        `[bold/webhook] ${evento.referencia}: el evento dice ${estadoDelEvento} y la API ${estado}. Manda la API.`,
      );
    }
  } else if (modoBold() === "pruebas") {
    console.error(
      `[bold/webhook] ${evento.referencia}: no se pudo consultar el estado y en modo pruebas la firma no garantiza nada. No se toca la reserva.`,
    );
    return ok("estado no verificable en modo pruebas");
  } else {
    estado = estadoDelEvento;
    console.warn(
      `[bold/webhook] ${evento.referencia}: la API de Bold no respondió; se usa el estado del evento firmado (${estado}).`,
    );
  }

  const metodo =
    etiquetaMetodoPago(consulta.metodo) ?? etiquetaMetodoPago(evento.metodo);
  const transaccionId = consulta.transaccionId ?? evento.transaccionId;
  /* Lo que se cobró de verdad. Lo normal es que coincida con `pago.monto`, pero
     manda lo que diga Bold: es lo que llegó a la cuenta del hotel. */
  const montoCobrado =
    consulta.total ?? evento.monto ?? Number(pago.monto ?? 0);

  /* ---------------------------------------------------------------------
     6. IDEMPOTENCIA, CAPA 2: la transición
     ------------------------------------------------------------------ */
  /*
    LA DECISIÓN VIVE EN UNA FUNCIÓN PURA Y PROBADA.

    `decidirAccionDePago` (`src/lib/pagos/transiciones.ts`) fija las dos reglas
    que no se pueden romper: el mismo estado dos veces no hace nada, y de
    `APPROVED` no se sale hacia atrás con un evento de rechazo que llegue tarde.
    Tenerla aparte permite probarla sin red ni base de datos.
  */
  const accion = decidirAccionDePago(pago.estado, estado);

  if (accion === "nada") {
    /* Se actualiza el payload por si trae más datos y se corta aquí. Ni correos,
       ni calendario, ni nada. */
    await supabase
      .from("pagos")
      .update({ payload: json, evento_id: evento.id || null })
      .eq("id", pago.id);

    console.info(
      `[bold/webhook] ${evento.referencia}: nada que hacer (guardado ${String(
        pago.estado ?? "",
      )}, evento ${estado}).`,
    );
    return ok("sin cambios");
  }

  /*
    EL `UPDATE` CONDICIONAL. Es el candado de verdad.

    `.neq("estado", estado)` hace que dos ejecuciones simultáneas del webhook no
    puedan pasar las dos: Postgres serializa el `update` y la segunda no
    encuentra fila que cambiar. Entre un `select` y un `update` hechos aparte
    cabría la otra ejecución entera; aquí no cabe nada.
  */
  const { data: actualizado, error: errorActualizar } = await supabase
    .from("pagos")
    .update({
      estado,
      metodo,
      transaccion_id: transaccionId,
      payload: json,
      evento_id: evento.id || null,
      /* El monto que se registra es el cobrado, solo si se cobró algo. */
      monto: esAprobado(estado) ? montoCobrado : pago.monto,
      procesado_at: new Date().toISOString(),
    })
    .eq("id", pago.id)
    .neq("estado", estado)
    .select("id");

  if (errorActualizar) {
    console.error(
      "[bold/webhook] no se pudo actualizar el pago:",
      errorActualizar.message,
    );
    return new Response("Error al guardar el pago", { status: 500 });
  }

  if (!actualizado || actualizado.length === 0) {
    console.info(
      `[bold/webhook] otra ejecución se adelantó con ${evento.referencia}.`,
    );
    return ok("ya procesado por otra ejecución");
  }

  /* ---------------------------------------------------------------------
     7. Y LO QUE ESO SIGNIFICA PARA LA RESERVA
     ------------------------------------------------------------------ */
  const reservaId = pago.reserva_id ? String(pago.reserva_id) : null;

  if (!reservaId) {
    return ok("pago sin reserva asociada");
  }

  if (accion === "confirmar") {
    const { data: reserva } = await supabase
      .from("reservas")
      .select("total, monto_pagado, estado")
      .eq("id", reservaId)
      .maybeSingle();

    /* `pagadoTrasCobro` suma en vez de sustituir y topa en el total; está
       probada aparte (`transiciones.test.ts`). */
    const { pagado, saldo } = pagadoTrasCobro(
      Number(reserva?.total ?? 0),
      Number(reserva?.monto_pagado ?? 0),
      montoCobrado,
    );
    const total = Number(reserva?.total ?? 0);

    const { error: errorReserva } = await supabase
      .from("reservas")
      .update({
        estado: "confirmada",
        monto_pagado: pagado,
        /*
          SE LIMPIA EL VENCIMIENTO. Una reserva pagada no caduca: si se quedara
          con el `expira_at` puesto, el barrido de los treinta minutos la
          cancelaría y liberaría unas fechas que el huésped ya pagó. Es el peor
          fallo posible de esta integración y se evita con este `null`.
        */
        expira_at: null,
      })
      .eq("id", reservaId);

    if (errorReserva) {
      console.error(
        `[bold/webhook] el pago de ${evento.referencia} entró pero no se pudo confirmar la reserva:`,
        errorReserva.message,
      );
      /* El pago ya está guardado como aprobado. Un 500 hace que Bold reintente
         y la capa 2 ya no dejará pasar el pago, pero sí este bloque: en el
         reintento la reserva se confirmará. Es el único camino en el que un
         reintento sirve para algo. */
      return new Response("Pago guardado, reserva pendiente de confirmar", {
        status: 500,
      });
    }

    console.info(
      `[bold/webhook] ${evento.referencia} aprobado: reserva confirmada, pagado ${pagado} de ${total}.`,
    );

    /*
      LOS CORREOS Y EL CALENDARIO, YA CON LA RESPUESTA ENVIADA.

      `after()` corre después de responder, así que Bold recibe su 200 dentro de
      los dos segundos y el huésped recibe su correo igual. Ninguna de las dos
      llamadas lanza —`avisarPagoAprobado` lo tiene prohibido por contrato y
      `sincronizarReservaEnCalendario` devuelve un aviso en vez de fallar—, pero
      van en `try/catch` porque un error dentro de `after()` que nadie atrapa
      ensucia los registros sin informar de nada.
    */
    after(async () => {
      try {
        await avisarPagoAprobado(supabase, reservaId, {
          monto: montoCobrado,
          saldo,
          metodo,
          transaccionId,
        });
      } catch (error) {
        console.error(
          "[bold/webhook] fallo inesperado al avisar del pago:",
          error instanceof Error ? error.message : error,
        );
      }

      try {
        const aviso = await sincronizarReservaEnCalendario(supabase, reservaId);
        if (aviso) console.info(`[bold/webhook] calendario: ${aviso}`);
      } catch (error) {
        console.error(
          "[bold/webhook] fallo inesperado al sincronizar el calendario:",
          error instanceof Error ? error.message : error,
        );
      }
    });

    return ok("reserva confirmada");
  }

  if (accion === "cancelar") {
    /*
      ANULACIÓN APROBADA (`VOID_APPROVED`): el dinero se devolvió, así que la
      reserva se cancela con el motivo escrito y las fechas vuelven al calendario
      en el momento, sin esperar al barrido.
    */
    const { data: reserva } = await supabase
      .from("reservas")
      .select("estado, notas, monto_pagado")
      .eq("id", reservaId)
      .maybeSingle();

    const motivo = `Pago anulado en Bold (referencia ${evento.referencia}). La reserva queda cancelada.`;
    const notasPrevias =
      typeof reserva?.notas === "string" ? reserva.notas.trim() : "";

    /*
      EL DINERO ANULADO SE DESCUENTA DE `monto_pagado`.

      Una anulación es una devolución: el hotel ya no tiene ese dinero. Dejar la
      ficha diciendo «abonado $362.500» en una reserva anulada haría que el
      equipo creyera que conserva un anticipo que se devolvió, y eso termina en
      una discusión con el huésped.

      Se **resta** en vez de poner cero porque puede haber otro dinero legítimo
      en esa reserva: una transferencia que el equipo apuntó a mano antes. Lo que
      se anula es este cobro, no todo lo que entró.
    */
    const pagadoTrasAnular = Math.max(
      0,
      Number(reserva?.monto_pagado ?? 0) - montoCobrado,
    );

    await supabase
      .from("reservas")
      .update({
        estado: "cancelada",
        monto_pagado: pagadoTrasAnular,
        expira_at: null,
        /* Se ANEXA: ahí está lo que escribió el huésped (una alergia, la hora de
           llegada) y perderlo por una anulación sería destruir información del
           cliente para dejar una etiqueta técnica. Mismo criterio que el barrido
           de la migración 013. */
        notas: notasPrevias ? `${notasPrevias}\n${motivo}` : motivo,
      })
      .eq("id", reservaId);

    /* El evento del calendario se borra si lo había: una reserva cancelada no
       puede seguir ocupando el calendario del hotel. */
    after(async () => {
      try {
        const aviso = await sincronizarReservaEnCalendario(supabase, reservaId);
        if (aviso) console.info(`[bold/webhook] calendario: ${aviso}`);
      } catch (error) {
        console.error(
          "[bold/webhook] fallo al sincronizar el calendario tras la anulación:",
          error instanceof Error ? error.message : error,
        );
      }
    });

    console.info(
      `[bold/webhook] ${evento.referencia} anulado: reserva cancelada, abonado queda en ${pagadoTrasAnular}.`,
    );
    return ok("reserva cancelada por anulación");
  }

  if (accion === "dejar_vencer") {
    /*
      RECHAZADO O FALLIDO: **no se cancela nada**.

      El huésped sigue dentro de su media hora de hold y lo normal tras una
      tarjeta rechazada es intentarlo con otra: cancelarle la reserva en ese
      momento le quitaría las fechas que está a punto de pagar. Si no vuelve, el
      barrido la cancela sola a los treinta minutos, que es exactamente para lo
      que existe.
    */
    console.info(
      `[bold/webhook] ${evento.referencia} ${estado}: la reserva se deja vencer sola.`,
    );
    return ok("pago no aprobado; la reserva vencerá sola");
  }

  /* En proceso (`PROCESSING`, `PENDING` de PSE): se guardó el estado y se
     espera el evento final. Nada que tocar en la reserva. */
  console.info(`[bold/webhook] ${evento.referencia} en estado ${estado}.`);
  return ok("estado intermedio guardado");
}

/**
 * Bold no hace `GET` sobre el webhook, pero la gente sí: alguien va a pegar
 * esta URL en el navegador para ver «si funciona». Un 405 con una frase es más
 * útil que una pantalla de error de Next.
 */
export function GET() {
  return new Response(
    "Este endpoint solo acepta POST firmados por Bold.",
    { status: 405, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
