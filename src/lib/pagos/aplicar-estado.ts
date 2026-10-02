/**
 * APLICAR UN ESTADO DE BOLD A UN PAGO Y A SU RESERVA.
 *
 * ===========================================================================
 * POR QUÉ ESTE ARCHIVO EXISTE
 * ===========================================================================
 * Hasta el 2026-10-02 esta transición vivía dentro del Route Handler del
 * webhook, y el webhook era **la única** forma de confirmar una reserva. Eso se
 * rompió de la peor manera posible en el ambiente de pruebas: dos pagos reales
 * del sandbox, **cero eventos de webhook recibidos**, y una reserva pagada
 * (`LF-2026-0001`) cancelada sola al vencer su hold. En producción eso es un
 * huésped que paga y se queda sin reserva.
 *
 * La respuesta no es «arreglar el webhook»: es que el webhook **deje de ser la
 * única vía**. Hoy hay tres caminos que llegan aquí:
 *
 *   1. `POST /api/pagos/bold/webhook`  — el evento firmado de Bold.
 *   2. `src/lib/pagos/reconciliar.ts`  — **preguntarle nosotros a Bold**, desde
 *      la página de retorno, el cron diario y un botón del panel.
 *   3. Nada más. Y nunca los parámetros de la URL del navegador (requisito 2 de
 *      `docs/AUDITORIA_SEGURIDAD.md`).
 *
 * Los tres caminos tienen que escribir **exactamente lo mismo**, y la única
 * forma de garantizarlo es que sea literalmente el mismo código. De ahí este
 * módulo: el webhook y la reconciliación averiguan el estado por vías
 * distintas, y a partir de ahí no hay dos versiones de la verdad.
 *
 * ---------------------------------------------------------------------------
 * LA IDEMPOTENCIA, EN TRES CAPAS
 * ---------------------------------------------------------------------------
 *   **1. `pagos_eventos.id`** (solo el webhook) descarta el reenvío exacto de
 *   una notificación de Bold.
 *
 *   **2. `decidirAccionDePago`** (`./transiciones.ts`, función pura y probada):
 *   el mismo estado dos veces no hace nada, y de `APPROVED` no se sale hacia
 *   atrás con un rechazo que llegue tarde.
 *
 *   **3. El `update … .neq("estado", estado)`**: es condicional, así que de dos
 *   ejecuciones simultáneas —un webhook y una reconciliación a la vez, que es
 *   justo lo que va a pasar cuando el huésped vuelve de pagar— **solo una
 *   encuentra fila que cambiar**. Los correos y el calendario cuelgan de esa
 *   fila devuelta, así que no se pueden duplicar.
 *
 * Reconciliar dos veces, o reconciliar algo que el webhook ya confirmó, no
 * escribe nada y no envía ningún correo. Hay pruebas que lo vigilan
 * (`aplicar-estado.test.ts`).
 *
 * ---------------------------------------------------------------------------
 * LOS EFECTOS LENTOS SE INYECTAN
 * ---------------------------------------------------------------------------
 * Los correos y el evento del Google Calendar tardan y pueden fallar sin
 * consecuencia. El webhook los manda a `after()` porque Bold exige responder en
 * dos segundos; la reconciliación los **espera**, porque quien la llamó quiere
 * saber en pantalla si el correo salió. Esa diferencia es el parámetro
 * `diferir`, y es lo único que distingue a los dos caminos.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ETIQUETA_ESTADO_BOLD,
  esAprobado,
  etiquetaMetodoPago,
  normalizarEstadoBold,
  type EstadoBold,
} from "./bold";
import {
  decidirAccionDePago,
  pagadoTrasCobro,
  type AccionDePago,
} from "./transiciones";
import { avisarPagoAprobado } from "../email";
import { sincronizarReservaEnCalendario } from "../reserva/sincronizar-calendario";
import { formatearCOP } from "../utils/formato";

/* ===========================================================================
 * Qué pasó
 * ======================================================================== */

/**
 * El desenlace, en una palabra. Quien llama decide qué hacer con ella: el
 * webhook elige el código HTTP, el panel elige el banner y el cron cuenta.
 */
export type ClaveAplicacion =
  /** La referencia no existe en esta base. No es un error nuestro. */
  | "pago_desconocido"
  /** El pago ya estaba en ese estado: ni escritura, ni correos. */
  | "sin_cambios"
  /** Pago aprobado y reserva confirmada **en esta ejecución**. */
  | "confirmada"
  /** Anulación aprobada: la reserva queda cancelada. */
  | "cancelada"
  /** Rechazado o fallido: se guardó el estado y la reserva se deja vencer. */
  | "no_aprobado"
  /** `PROCESSING` / `PENDING`: se guardó y se espera. */
  | "intermedio"
  /** El pago se actualizó pero no cuelga de ninguna reserva. */
  | "sin_reserva"
  /** Otra ejecución (el webhook, o otra pestaña) se adelantó. */
  | "adelantado"
  /** No se pudo leer la fila de `pagos`. Conviene reintentar. */
  | "error_lectura"
  /** No se pudo escribir la fila de `pagos`. Conviene reintentar. */
  | "error_pago"
  /** El pago quedó guardado y la reserva NO se pudo actualizar. */
  | "error_reserva"
  /**
   * El pago está aprobado pero las fechas ya están ocupadas por otra reserva
   * activa: la restricción EXCLUDE rechazó la confirmación. **Pide a una
   * persona**, y es el único desenlace que no se puede resolver con código.
   */
  | "fechas_ocupadas";

export type ResultadoAplicacion = {
  clave: ClaveAplicacion;
  /** La decisión pura que tomó `decidirAccionDePago`, si se llegó a tomar. */
  accion: AccionDePago | null;
  /** `true` solo si ESTA ejecución escribió el cambio (y disparó los efectos). */
  cambio: boolean;
  estadoAnterior: EstadoBold;
  estado: EstadoBold;
  reservaId: string | null;
  codigo: string | null;
  total: number;
  pagado: number;
  saldo: number;
  /** Frase en español claro, lista para mostrarse en el panel. */
  mensaje: string;
  /** `true` cuando reintentar sirve de algo (el webhook responde 500). */
  reintentable: boolean;
};

export type EntradaAplicacion = {
  /** Nuestra referencia (`pagos.referencia`). */
  referencia: string;
  /** El estado que manda, ya decidido por quien llama. */
  estado: EstadoBold;
  /**
   * Lo que se cobró de verdad, si se sabe. Sin él se usa `pagos.monto`, que es
   * lo que se pidió cobrar.
   */
  montoCobrado?: number | null;
  /** El método tal como lo devuelve Bold (`CARD`, `PSE`…). Se traduce aquí. */
  metodo?: string | null;
  /** El `payment_id` de Bold. */
  transaccionId?: string | null;
  /**
   * El soporte de este cambio, tal cual: el cuerpo del evento firmado, o la
   * respuesta de la API de consulta. Si no se pasa, no se toca `pagos.payload`.
   */
  payload?: unknown;
  /** El `id` de la notificación de Bold. `null` en una reconciliación. */
  eventoId?: string | null;
  /** De dónde viene. Solo para los registros. */
  origen: "webhook" | "reconciliacion";
  /**
   * Cómo se ejecutan los correos y el calendario. Sin esto se **esperan**; el
   * webhook pasa `after` para responder a Bold dentro de los dos segundos.
   */
  diferir?: (tarea: () => Promise<void>) => void;
};

/** El estado 23P01 de Postgres: una restricción EXCLUDE rechazó la escritura. */
const SOLAPAMIENTO = "23P01";

/**
 * Lo que se anexa a `notas` cuando una reconciliación **resucita** una reserva
 * que el barrido ya había cancelado.
 *
 * Pasa de verdad y no es una rareza: es exactamente el caso de `LF-2026-0001`.
 * El huésped pagó, el webhook nunca llegó, el hold venció y el barrido la
 * canceló; cuando después se le pregunta a Bold, el pago está aprobado y la
 * reserva tiene que volver. Dejar constancia en la ficha importa: el equipo vio
 * esa reserva cancelada y tiene derecho a entender por qué volvió.
 */
const MOTIVO_RECUPERADA =
  "Pago verificado con Bold: la reserva se reactivó aunque su solicitud había caducado.";

/* ===========================================================================
 * La función
 * ======================================================================== */

/**
 * Escribe en `pagos` y en `reservas` lo que significa `entrada.estado`.
 *
 * **Nunca lanza.** Los tres caminos que la llaman son un webhook (donde un
 * `throw` provoca cinco reintentos de Bold), un render de página pública y una
 * Server Action del panel; en los tres, un error tiene que volver como dato.
 */
export async function aplicarEstadoDePago(
  supabase: SupabaseClient,
  entrada: EntradaAplicacion,
): Promise<ResultadoAplicacion> {
  const estado = normalizarEstadoBold(entrada.estado);
  const etiqueta = ETIQUETA_ESTADO_BOLD[estado];
  const marca = `[pagos/${entrada.origen}] ${entrada.referencia}`;

  const base: ResultadoAplicacion = {
    clave: "sin_cambios",
    accion: null,
    cambio: false,
    estadoAnterior: "DESCONOCIDO",
    estado,
    reservaId: null,
    codigo: null,
    total: 0,
    pagado: 0,
    saldo: 0,
    mensaje: "",
    reintentable: false,
  };

  /* ---------------------------------------------------------------------
     1. EL PAGO QUE ESTO TOCA
     ------------------------------------------------------------------ */
  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .select("id, reserva_id, referencia, monto, estado")
    .eq("referencia", entrada.referencia)
    .maybeSingle();

  if (errorPago) {
    console.error(`${marca}: no se pudo leer el pago:`, errorPago.message);
    return {
      ...base,
      clave: "error_lectura",
      mensaje:
        "No pudimos leer el pago en la base de datos. Inténtalo otra vez en un momento.",
      reintentable: true,
    };
  }

  if (!pago) {
    console.warn(`${marca}: la referencia no existe en esta base.`);
    return {
      ...base,
      clave: "pago_desconocido",
      mensaje:
        "Esa referencia de pago no existe en la base de datos de La Finca.",
    };
  }

  const estadoAnterior = normalizarEstadoBold(pago.estado);
  const reservaId = pago.reserva_id ? String(pago.reserva_id) : null;

  /* Lo que se cobró. Manda lo que diga Bold; si no lo dice, lo que se pidió. */
  const pedido = Number(pago.monto ?? 0);
  const cobrado =
    typeof entrada.montoCobrado === "number" &&
    Number.isFinite(entrada.montoCobrado) &&
    entrada.montoCobrado > 0
      ? Math.round(entrada.montoCobrado)
      : pedido;

  const metodo = etiquetaMetodoPago(entrada.metodo);

  /* ---------------------------------------------------------------------
     2. LA DECISIÓN (función pura, probada aparte)
     ------------------------------------------------------------------ */
  const accion = decidirAccionDePago(estadoAnterior, estado);

  const conContexto = { ...base, accion, estadoAnterior, reservaId };

  if (accion === "nada") {
    /*
      NADA QUE HACER. **Y «nada» significa nada.**

      Solo el webhook actualiza el `payload` aquí, porque su evento puede traer
      más datos que lo guardado y es un documento firmado. Una reconciliación
      que no cambia el estado **no escribe ni una columna**: así «reconciliar
      dos veces» es literalmente gratis, y el `actualizado_at` de la fila sigue
      diciendo cuándo cambió el pago de verdad y no cuándo alguien pulsó un
      botón.
    */
    if (entrada.origen === "webhook" && entrada.payload !== undefined) {
      await supabase
        .from("pagos")
        .update({ payload: entrada.payload, evento_id: entrada.eventoId || null })
        .eq("id", pago.id);
    }

    console.info(
      `${marca}: nada que hacer (guardado ${estadoAnterior}, llega ${estado}).`,
    );

    const reserva = reservaId ? await leerReserva(supabase, reservaId) : null;

    return {
      ...conContexto,
      clave: "sin_cambios",
      codigo: reserva?.codigo ?? null,
      total: reserva?.total ?? 0,
      pagado: reserva?.monto_pagado ?? 0,
      saldo: Math.max(0, (reserva?.total ?? 0) - (reserva?.monto_pagado ?? 0)),
      mensaje: esAprobado(estadoAnterior)
        ? `Este pago ya estaba confirmado${reserva?.codigo ? ` y la reserva ${reserva.codigo} también` : ""}. No había nada que corregir.`
        : `Bold dice «${etiqueta}», que es justo lo que ya estaba guardado. No había nada que corregir.`,
    };
  }

  /* ---------------------------------------------------------------------
     3. EL `UPDATE` CONDICIONAL. Es el candado de verdad.
     ------------------------------------------------------------------ */
  /*
    `.neq("estado", estado)` hace que dos ejecuciones simultáneas no puedan
    pasar las dos: Postgres serializa el `update` y la segunda no encuentra fila
    que cambiar. Entre un `select` y un `update` hechos aparte cabría la otra
    ejecución entera; aquí no cabe nada. Y los efectos cuelgan de la fila
    devuelta, no del estado leído.
  */
  const cambios: Record<string, unknown> = {
    estado,
    metodo,
    transaccion_id: entrada.transaccionId ?? null,
    evento_id: entrada.eventoId || null,
    /* El monto que se registra es el cobrado, y solo si se cobró algo. */
    monto: esAprobado(estado) ? cobrado : pedido,
    procesado_at: new Date().toISOString(),
  };
  if (entrada.payload !== undefined) cambios.payload = entrada.payload;

  const { data: actualizado, error: errorActualizar } = await supabase
    .from("pagos")
    .update(cambios)
    .eq("id", pago.id)
    .neq("estado", estado)
    .select("id");

  if (errorActualizar) {
    console.error(`${marca}: no se pudo actualizar el pago:`, errorActualizar.message);
    return {
      ...conContexto,
      clave: "error_pago",
      mensaje:
        "No pudimos guardar el estado del pago. Inténtalo otra vez en un momento.",
      reintentable: true,
    };
  }

  if (!actualizado || actualizado.length === 0) {
    console.info(`${marca}: otra ejecución se adelantó.`);
    return {
      ...conContexto,
      clave: "adelantado",
      mensaje:
        "Otra comprobación actualizó este pago hace un instante, así que aquí no había nada que hacer.",
    };
  }

  /* ---------------------------------------------------------------------
     4. Y LO QUE ESO SIGNIFICA PARA LA RESERVA
     ------------------------------------------------------------------ */
  if (!reservaId) {
    return {
      ...conContexto,
      clave: "sin_reserva",
      cambio: true,
      mensaje: `El pago quedó como «${etiqueta}», pero no está asociado a ninguna reserva.`,
    };
  }

  /** Correos y calendario: se esperan, salvo que quien llama los difiera. */
  const lanzar = async (tarea: () => Promise<void>) => {
    if (entrada.diferir) {
      entrada.diferir(tarea);
      return;
    }
    await tarea();
  };

  if (accion === "confirmar") {
    return await confirmarLaReserva(supabase, {
      base: conContexto,
      reservaId,
      referencia: entrada.referencia,
      cobrado,
      metodo,
      transaccionId: entrada.transaccionId ?? null,
      marca,
      lanzar,
      /* El candado ya lo puso el `update` de `pagos`: esta ejecución es la única
         que llegó aquí, así que la reserva se escribe sin condición. Importa que
         sea así: una reserva que el equipo confirmó a mano antes del cobro tiene
         que recibir igualmente su `monto_pagado`. */
      condicional: false,
    });
  }

  if (accion === "cancelar") {
    /*
      ANULACIÓN APROBADA (`VOID_APPROVED`): el dinero se devolvió, así que la
      reserva se cancela con el motivo escrito y las fechas vuelven al calendario
      en el momento, sin esperar al barrido.
    */
    const reserva = await leerReserva(supabase, reservaId);

    const motivo = `Pago anulado en Bold (referencia ${entrada.referencia}). La reserva queda cancelada.`;

    /*
      EL DINERO ANULADO SE DESCUENTA DE `monto_pagado`.

      Una anulación es una devolución: el hotel ya no tiene ese dinero. Dejar la
      ficha diciendo «abonado $362.500» en una reserva anulada haría que el
      equipo creyera que conserva un anticipo que se devolvió, y eso termina en
      una discusión con el huésped. Se **resta** en vez de poner cero porque
      puede haber otro dinero legítimo en esa reserva: una transferencia que el
      equipo apuntó a mano antes.
    */
    const pagadoTrasAnular = Math.max(
      0,
      Number(reserva?.monto_pagado ?? 0) - cobrado,
    );

    await supabase
      .from("reservas")
      .update({
        estado: "cancelada",
        monto_pagado: pagadoTrasAnular,
        expira_at: null,
        notas: anexarNota(reserva?.notas ?? null, motivo),
      })
      .eq("id", reservaId);

    /* El evento del calendario se borra si lo había: una reserva cancelada no
       puede seguir ocupando el calendario del hotel. */
    await lanzar(async () => {
      try {
        const aviso = await sincronizarReservaEnCalendario(supabase, reservaId);
        if (aviso) console.info(`${marca} calendario: ${aviso}`);
      } catch (error) {
        console.error(
          `${marca}: fallo al sincronizar el calendario tras la anulación:`,
          error instanceof Error ? error.message : error,
        );
      }
    });

    console.info(
      `${marca} anulado: reserva cancelada, abonado queda en ${pagadoTrasAnular}.`,
    );

    return {
      ...conContexto,
      clave: "cancelada",
      cambio: true,
      codigo: reserva?.codigo ?? null,
      total: Number(reserva?.total ?? 0),
      pagado: pagadoTrasAnular,
      saldo: Math.max(0, Number(reserva?.total ?? 0) - pagadoTrasAnular),
      mensaje: `En Bold ese pago está anulado: el dinero volvió al huésped, así que la reserva${reserva?.codigo ? ` ${reserva.codigo}` : ""} queda cancelada y esas fechas vuelven al calendario.`,
    };
  }

  if (accion === "dejar_vencer") {
    /*
      RECHAZADO O FALLIDO: **no se cancela nada**.

      El huésped sigue dentro de su media hora de hold y lo normal tras una
      tarjeta rechazada es intentarlo con otra: cancelarle la reserva en ese
      momento le quitaría las fechas que está a punto de pagar. Si no vuelve, el
      barrido la cancela sola a los treinta minutos.
    */
    console.info(`${marca} ${estado}: la reserva se deja vencer sola.`);

    const reserva = await leerReserva(supabase, reservaId);

    return {
      ...conContexto,
      clave: "no_aprobado",
      cambio: true,
      codigo: reserva?.codigo ?? null,
      total: Number(reserva?.total ?? 0),
      pagado: Number(reserva?.monto_pagado ?? 0),
      saldo: Math.max(
        0,
        Number(reserva?.total ?? 0) - Number(reserva?.monto_pagado ?? 0),
      ),
      mensaje: `En Bold ese cobro está «${etiqueta}»: no entró un peso. La reserva no se confirma y, si el huésped no vuelve a intentarlo, caduca sola.`,
    };
  }

  /* En proceso (`PROCESSING`, `PENDING` de PSE): se guardó el estado y se
     espera el final. Nada que tocar en la reserva. */
  console.info(`${marca} en estado ${estado}.`);

  const reserva = await leerReserva(supabase, reservaId);

  return {
    ...conContexto,
    clave: "intermedio",
    cambio: true,
    codigo: reserva?.codigo ?? null,
    total: Number(reserva?.total ?? 0),
    pagado: Number(reserva?.monto_pagado ?? 0),
    saldo: Math.max(
      0,
      Number(reserva?.total ?? 0) - Number(reserva?.monto_pagado ?? 0),
    ),
    mensaje: `Bold todavía está resolviendo el cobro («${etiqueta}»). Se guardó el estado; vuelve a verificar en unos minutos.`,
  };
}

/* ===========================================================================
 * Confirmar la reserva: una sola implementación, dos puertas
 * ======================================================================== */

type ParametrosConfirmacion = {
  base: ResultadoAplicacion;
  reservaId: string;
  referencia: string;
  cobrado: number;
  metodo: string | null;
  transaccionId: string | null;
  marca: string;
  lanzar: (tarea: () => Promise<void>) => Promise<void>;
  /**
   * `true` añade `… and estado <> 'confirmada'` al `update` de `reservas` y usa
   * la fila devuelta como candado. Solo lo usa la reparación
   * (`repararReservaSinConfirmar`), donde el `update` de `pagos` no puede servir
   * de candado porque el pago **ya** está aprobado y no hay nada que cambiar
   * ahí. En el camino normal va en `false`, para que una reserva que el equipo
   * confirmó a mano antes del cobro reciba igualmente su `monto_pagado`.
   */
  condicional: boolean;
};

/** Pasar la reserva a `confirmada`, abonar el dinero y avisar. */
async function confirmarLaReserva(
  supabase: SupabaseClient,
  p: ParametrosConfirmacion,
): Promise<ResultadoAplicacion> {
  const reserva = await leerReserva(supabase, p.reservaId);

  /* `pagadoTrasCobro` suma en vez de sustituir y topa en el total; está
     probada aparte (`transiciones.test.ts`). */
  const total = Number(reserva?.total ?? 0);
  const { pagado, saldo } = pagadoTrasCobro(
    total,
    Number(reserva?.monto_pagado ?? 0),
    p.cobrado,
  );

  /*
    ⚠ UNA RESERVA QUE EL BARRIDO YA HABÍA CANCELADO **VUELVE**.

    Es el caso que originó todo esto (`LF-2026-0001`). Se deja constancia en
    `notas` —anexada, nunca sobrescrita: ahí está lo que escribió el huésped— y
    la reserva pasa a `confirmada`. Si el pago entró, la reserva existe.
  */
  const resucita = reserva?.estado === "cancelada";
  const notas = resucita
    ? anexarNota(reserva?.notas ?? null, MOTIVO_RECUPERADA)
    : undefined;

  const actualizacion: Record<string, unknown> = {
    estado: "confirmada",
    monto_pagado: pagado,
    /*
      SE LIMPIA EL VENCIMIENTO. Una reserva pagada no caduca: si se quedara con
      el `expira_at` puesto, el barrido de los treinta minutos la cancelaría y
      liberaría unas fechas que el huésped ya pagó. Es el peor fallo posible de
      esta integración y se evita con este `null`. La migración 016 añade además
      la prohibición en SQL, por si alguien llega aquí por otro camino.
    */
    expira_at: null,
  };
  if (notas !== undefined) actualizacion.notas = notas;

  const consulta = supabase.from("reservas").update(actualizacion).eq("id", p.reservaId);

  const { data: filas, error: errorReserva } = p.condicional
    ? await consulta.neq("estado", "confirmada").select("id")
    : await consulta;

  if (errorReserva) {
    /*
      EL ÚNICO DESENLACE QUE NO SE PUEDE RESOLVER CON CÓDIGO.

      `23P01` aquí significa que las fechas de esta reserva ya las tiene otra
      reserva activa: el barrido la canceló, alguien compró esas noches y ahora
      resulta que el primer huésped sí había pagado. No hay nada automático que
      hacer —son dos personas y una cabaña— y lo único honesto es decirlo con
      todas las letras para que una persona lo resuelva.
    */
    const ocupadas = errorReserva.code === SOLAPAMIENTO;

    console.error(
      `${p.marca}: el pago entró pero no se pudo confirmar la reserva:`,
      errorReserva.message,
    );

    return {
      ...p.base,
      clave: ocupadas ? "fechas_ocupadas" : "error_reserva",
      cambio: true,
      codigo: reserva?.codigo ?? null,
      total,
      pagado: Number(reserva?.monto_pagado ?? 0),
      saldo,
      mensaje: ocupadas
        ? `El pago de ${formatearCOP(p.cobrado)} SÍ está aprobado en Bold, pero esas fechas ya las tiene otra reserva activa, así que no se pudo confirmar. Hay que resolverlo a mano: reubicar al huésped o devolverle el dinero.`
        : "El pago quedó guardado como aprobado, pero no se pudo confirmar la reserva. Vuelve a intentarlo; si sigue fallando, avisa a GOCAS.",
      /* Solo el fallo técnico merece reintento: el solape no se arregla
         repitiéndolo. */
      reintentable: !ocupadas,
    };
  }

  if (p.condicional && (!filas || (filas as unknown[]).length === 0)) {
    /* Otra ejecución la confirmó entre la lectura y la escritura. Esa otra
       mandó los correos; aquí no se manda nada. */
    console.info(`${p.marca}: otra ejecución confirmó la reserva primero.`);
    return {
      ...p.base,
      clave: "adelantado",
      codigo: reserva?.codigo ?? null,
      total,
      pagado: Number(reserva?.monto_pagado ?? 0),
      saldo,
      mensaje:
        "Otra comprobación confirmó esta reserva hace un instante, así que aquí no había nada que hacer.",
    };
  }

  console.info(
    `${p.marca} aprobado: reserva confirmada, pagado ${pagado} de ${total}.`,
  );

  await p.lanzar(async () => {
    try {
      await avisarPagoAprobado(supabase, p.reservaId, {
        monto: p.cobrado,
        saldo,
        metodo: p.metodo,
        transaccionId: p.transaccionId,
      });
    } catch (error) {
      /* `avisarPagoAprobado` tiene prohibido lanzar por contrato, pero un error
         aquí no puede deshacer una reserva pagada. */
      console.error(
        `${p.marca}: fallo inesperado al avisar del pago:`,
        error instanceof Error ? error.message : error,
      );
    }

    try {
      const aviso = await sincronizarReservaEnCalendario(supabase, p.reservaId);
      if (aviso) console.info(`${p.marca} calendario: ${aviso}`);
    } catch (error) {
      console.error(
        `${p.marca}: fallo inesperado al sincronizar el calendario:`,
        error instanceof Error ? error.message : error,
      );
    }
  });

  return {
    ...p.base,
    clave: "confirmada",
    cambio: true,
    codigo: reserva?.codigo ?? null,
    total,
    pagado,
    saldo,
    mensaje:
      `Bold confirma el pago de ${formatearCOP(p.cobrado)}. La reserva${reserva?.codigo ? ` ${reserva.codigo}` : ""} quedó confirmada` +
      (resucita ? " (estaba cancelada por vencimiento y se reactivó)" : "") +
      (saldo > 0 ? `, con un saldo de ${formatearCOP(saldo)}.` : ", pagada completa.") +
      " Se enviaron los correos de confirmación.",
  };
}

/**
 * EL ESTADO INCOHERENTE: pago `APPROVED` y reserva **sin confirmar**.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE LLEGA AHÍ, Y POR QUÉ HACE FALTA UNA PUERTA APARTE
 * ---------------------------------------------------------------------------
 * El webhook (y la reconciliación) escriben en dos pasos: primero `pagos`, que
 * es el candado, y después `reservas`. Si el segundo falla —la base tuvo un mal
 * segundo, o la restricción EXCLUDE rechazó las fechas— queda un pago aprobado y
 * una reserva que no lo está. El huésped pagó y su reserva no existe, que es
 * exactamente lo que todo esto intenta que no pase.
 *
 * `aplicarEstadoDePago()` no puede arreglarlo: `decidirAccionDePago('APPROVED',
 * 'APPROVED')` devuelve «nada», y debe devolverlo, porque esa es la regla que
 * impide que un reenvío de Bold mande dos correos. De ahí esta función.
 *
 * Es idempotente porque el `update` de `reservas` va **condicionado** a que no
 * esté ya `confirmada`: dos ejecuciones simultáneas no pueden mandar las dos el
 * correo. Y no gasta ni una llamada a Bold: el estado del pago ya está guardado y
 * aprobado, no hay nada que preguntar.
 *
 * No lanza.
 */
export async function repararReservaSinConfirmar(
  supabase: SupabaseClient,
  referencia: string,
  opciones: { diferir?: (tarea: () => Promise<void>) => void } = {},
): Promise<ResultadoAplicacion> {
  const marca = `[pagos/reparar] ${referencia}`;

  const base: ResultadoAplicacion = {
    clave: "sin_cambios",
    accion: "confirmar",
    cambio: false,
    estadoAnterior: "APPROVED",
    estado: "APPROVED",
    reservaId: null,
    codigo: null,
    total: 0,
    pagado: 0,
    saldo: 0,
    mensaje: "",
    reintentable: false,
  };

  const { data: pago, error } = await supabase
    .from("pagos")
    .select("reserva_id, monto, estado, metodo, transaccion_id")
    .eq("referencia", referencia)
    .maybeSingle();

  if (error || !pago) {
    return {
      ...base,
      clave: error ? "error_lectura" : "pago_desconocido",
      mensaje: error
        ? "No pudimos leer el pago en la base de datos. Inténtalo otra vez en un momento."
        : "Esa referencia de pago no existe en la base de datos de La Finca.",
      reintentable: Boolean(error),
    };
  }

  const reservaId = pago.reserva_id ? String(pago.reserva_id) : null;
  if (!reservaId) {
    return {
      ...base,
      clave: "sin_reserva",
      mensaje: "Ese pago no está asociado a ninguna reserva.",
    };
  }

  const lanzar = async (tarea: () => Promise<void>) => {
    if (opciones.diferir) {
      opciones.diferir(tarea);
      return;
    }
    await tarea();
  };

  return await confirmarLaReserva(supabase, {
    base: { ...base, reservaId },
    reservaId,
    referencia,
    cobrado: Number(pago.monto ?? 0),
    metodo: typeof pago.metodo === "string" ? pago.metodo : null,
    transaccionId:
      typeof pago.transaccion_id === "string" ? pago.transaccion_id : null,
    marca,
    lanzar,
    condicional: true,
  });
}

/* ===========================================================================
 * Piezas
 * ======================================================================== */

type FilaReserva = {
  codigo: string | null;
  total: number;
  monto_pagado: number;
  estado: string | null;
  notas: string | null;
};

/** Lo poco que de la reserva hace falta aquí. Nunca lanza. */
async function leerReserva(
  supabase: SupabaseClient,
  reservaId: string,
): Promise<FilaReserva | null> {
  const { data } = await supabase
    .from("reservas")
    .select("codigo, total, monto_pagado, estado, notas")
    .eq("id", reservaId)
    .maybeSingle();

  if (!data) return null;

  return {
    codigo: typeof data.codigo === "string" ? data.codigo : null,
    total: Number(data.total ?? 0),
    monto_pagado: Number(data.monto_pagado ?? 0),
    estado: typeof data.estado === "string" ? data.estado : null,
    notas: typeof data.notas === "string" ? data.notas : null,
  };
}

/**
 * Añade un motivo al final de `notas` sin duplicarlo y sin pisar nada.
 *
 * Mismo criterio que el barrido de la migración 013: en `notas` está lo que
 * escribió el huésped (una alergia, la hora de llegada) y perderlo por una
 * tarea automática sería destruir información del cliente para dejar una
 * etiqueta técnica. La comprobación de «ya está» es **por contenido**, igual
 * que en SQL.
 */
export function anexarNota(notas: string | null, motivo: string): string {
  const previas = (notas ?? "").trim();
  if (!previas) return motivo;
  if (previas.includes(motivo)) return previas;
  return `${previas}\n${motivo}`;
}
