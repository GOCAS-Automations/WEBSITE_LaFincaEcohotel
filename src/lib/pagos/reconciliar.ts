/**
 * RECONCILIACIÓN: confirmar una reserva **preguntándole nosotros a Bold**.
 *
 * ===========================================================================
 * POR QUÉ ESTO NO ES OPCIONAL
 * ===========================================================================
 * El webhook no puede ser la única vía de confirmación. Lo demostró el ambiente
 * de pruebas del 2026-10-01: dos pagos hechos de verdad en el sandbox de Bold,
 * **cero eventos recibidos**, y una reserva pagada (`LF-2026-0001`) cancelada
 * sola al vencer su hold. En producción eso es un huésped que paga y se queda
 * sin reserva, que es el único fallo verdaderamente inaceptable de un motor de
 * reservas.
 *
 * Las razones por las que un webhook no llega son muchas y ninguna es culpa
 * nuestra: el sandbox de Bold no los envía solos, el botón «Probar el webhook»
 * de su panel solo guarda la URL, una firma que no cuadra, un despliegue caído
 * los cinco reintentos, un cortafuegos. Todas terminan igual.
 *
 * ---------------------------------------------------------------------------
 * ¿Y LA AUDITORÍA? ESTO NO LA CONTRADICE
 * ---------------------------------------------------------------------------
 * El requisito 2 de `docs/AUDITORIA_SEGURIDAD.md` prohíbe confirmar por **la
 * redirección del navegador**: «la vuelta del checkout es una pista para el
 * huésped, no un hecho: se puede falsificar escribiendo la URL». Lo que se
 * prohíbe es creerle a `?bold-tx-status=approved`, un parámetro que escribe
 * cualquiera.
 *
 * Preguntarle a la API de Bold con **nuestra llave de identidad** es lo
 * contrario de eso: es la misma fuente de verdad que ya usa el webhook en su
 * requisito 5 («el webhook no confía en el estado que le mandan: consulta la
 * transacción contra la API con su propia clave antes de dar una reserva por
 * pagada»). Aquí se hace esa consulta sin esperar a que llegue un evento.
 *
 * Lo único que la página de retorno aporta es **la referencia**, y una
 * referencia no es una afirmación: es una pregunta. Quien se invente una
 * referencia ajena consigue, como máximo, que le preguntemos a Bold por un pago
 * que no es suyo — y lo que se escriba será lo que Bold diga de ese pago, que es
 * la verdad con o sin él.
 *
 * ---------------------------------------------------------------------------
 * DÓNDE SE ENGANCHA
 * ---------------------------------------------------------------------------
 *   1. **La página de retorno** `/reservar/confirmacion`: reconcilia esa
 *      referencia antes de pintar. Cubre el caso corriente —el huésped vuelve de
 *      pagar— y hace que vea su reserva confirmada aunque el webhook no exista.
 *   2. **El cron diario** `/api/salud`: reconcilia los pagos no finales de las
 *      últimas 24 horas **antes** de barrer las reservas vencidas, para que un
 *      pago aprobado nunca se pierda por el vencimiento.
 *   3. **El panel**, con el botón «Verificar pago con Bold» en la ficha de la
 *      reserva: es la herramienta de quien atiende un «pagué y no me llegó
 *      nada».
 *
 * La escritura es **exactamente la misma** que la del webhook, porque es
 * literalmente el mismo código: `aplicarEstadoDePago()` (`./aplicar-estado.ts`).
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ETIQUETA_ESTADO_BOLD,
  boldConfigurado,
  consultarEstadoPago,
  esEstadoFinal,
  esAprobado,
  normalizarEstadoBold,
  referenciaValida,
  type ConsultaEstado,
  type EstadoBold,
} from "./bold";
import {
  aplicarEstadoDePago,
  repararReservaSinConfirmar,
  type ResultadoAplicacion,
} from "./aplicar-estado";
import { crearClienteAdmin } from "../supabase/admin";

/* ===========================================================================
 * Qué devuelve
 * ======================================================================== */

export type ClaveReconciliacion =
  /** Faltan las llaves de Bold: no hay a quién preguntar. */
  | "no_configurado"
  /** La referencia no tiene una forma que Bold admitiría. */
  | "referencia_invalida"
  /** Esa referencia no existe en `pagos`. */
  | "pago_desconocido"
  /** Ya estaba resuelto y coherente: no se preguntó nada y no se tocó nada. */
  | "ya_resuelto"
  /** No se pudo preguntar (red, timeout, 5xx de Bold). Nada se tocó. */
  | "sin_respuesta"
  /** Bold todavía no ve la transacción (o ya la archivó). Nada se tocó. */
  | "sin_transaccion"
  /** Se preguntó, Bold respondió y se aplicó lo que dijo. */
  | "aplicado";

export type ResultadoReconciliacion = {
  clave: ClaveReconciliacion;
  referencia: string;
  /** Lo que respondió Bold, si respondió. */
  estadoEnBold: EstadoBold;
  /** La respuesta cruda de la API, para quien quiera el método o el total. */
  consulta: ConsultaEstado | null;
  /** Lo que se escribió, o `null` si no se escribió nada. */
  aplicado: ResultadoAplicacion | null;
  /** `true` solo si esta ejecución cambió algo en la base. */
  cambio: boolean;
  /** `true` si la reserva quedó (o ya estaba) confirmada y pagada. */
  confirmada: boolean;
  /** Frase en español claro, lista para el panel o para un registro. */
  mensaje: string;
};

/* ===========================================================================
 * Una referencia
 * ======================================================================== */

/**
 * Reconcilia **una** referencia: pregunta a Bold y aplica lo que diga.
 *
 * **Nunca lanza.** Se llama desde un render de página pública, desde un cron y
 * desde una Server Action; en los tres sitios un error tiene que volver como
 * dato y no como pantalla roja.
 *
 * Idempotente por partida doble: aquí se corta antes de preguntar si el pago ya
 * está en un estado final coherente, y si llega a preguntar, el `update`
 * condicional de `aplicarEstadoDePago()` impide escribir dos veces lo mismo.
 */
export async function reconciliarPago(
  referencia: string,
  opciones: {
    /** El cliente con el que escribir. Por defecto, el de servicio. */
    supabase?: SupabaseClient;
    /** Correos y calendario diferidos (el webhook usa `after`). */
    diferir?: (tarea: () => Promise<void>) => void;
  } = {},
): Promise<ResultadoReconciliacion> {
  const base: ResultadoReconciliacion = {
    clave: "no_configurado",
    referencia,
    estadoEnBold: "DESCONOCIDO",
    consulta: null,
    aplicado: null,
    cambio: false,
    confirmada: false,
    mensaje: "",
  };

  /* Una referencia con una forma que Bold no admitiría no puede existir en
     `pagos`, y además evita que este parámetro se use para injertar algo en la
     URL de la API. */
  if (!referencia || !referenciaValida(referencia)) {
    return {
      ...base,
      clave: "referencia_invalida",
      mensaje: "Esa referencia de pago no tiene una forma válida.",
    };
  }

  if (!boldConfigurado()) {
    return {
      ...base,
      clave: "no_configurado",
      mensaje:
        "La pasarela de pagos no está configurada en este entorno, así que no hay a quién preguntarle.",
    };
  }

  try {
    const supabase = opciones.supabase ?? crearClienteAdmin();

    /* ---------------------------------------------------------------------
       1. ¿HACE FALTA PREGUNTAR?
       ------------------------------------------------------------------ */
    /*
      Se lee primero la base y solo después se llama a Bold. Tres razones, y las
      tres importan:

        · **Idempotencia barata.** Un pago ya aprobado cuya reserva está
          confirmada no necesita ni una llamada de red: se responde «ya estaba» y
          se corta. Reconciliar dos veces es gratis.
        · **Nada de amplificación.** Esta función se llama desde una página
          pública. Si consultara Bold antes de mirar la base, cualquiera podría
          usar el sitio para bombardear la API de Bold con referencias
          inventadas; así, una referencia que no existe en `pagos` no provoca ni
          una petición hacia fuera.
        · **Un estado final no se desdice.** `APPROVED`, `REJECTED`, `FAILED` y
          `VOIDED` son finales en la documentación de Bold: volver a preguntar no
          puede devolver otra cosa, y en el sandbox devolvería un 404 porque las
          referencias se archivan a las pocas horas.
    */
    const { data: pago, error } = await supabase
      .from("pagos")
      .select("estado, reserva_id")
      .eq("referencia", referencia)
      .maybeSingle();

    if (error) {
      console.error(
        `[reconciliar] ${referencia}: no se pudo leer el pago:`,
        error.message,
      );
      return {
        ...base,
        clave: "sin_respuesta",
        mensaje:
          "No pudimos leer el pago en la base de datos. Inténtalo otra vez en un momento.",
      };
    }

    if (!pago) {
      return {
        ...base,
        clave: "pago_desconocido",
        mensaje:
          "Esa referencia de pago no existe en la base de datos de La Finca.",
      };
    }

    const estadoGuardado = normalizarEstadoBold(pago.estado);
    const reservaId = pago.reserva_id ? String(pago.reserva_id) : null;

    /*
      «Coherente» es la palabra clave: un pago `APPROVED` cuya reserva NO está
      confirmada **no** está resuelto, aunque su estado sea final. Pasa si el
      `update` de `reservas` falló después de guardar el pago, y es justo el
      hueco que este botón tiene que poder cerrar — sin gastar una llamada a
      Bold, porque el estado ya lo sabemos.
    */
    if (esEstadoFinal(estadoGuardado)) {
      const coherente =
        !esAprobado(estadoGuardado) ||
        (await reservaConfirmada(supabase, reservaId));

      if (coherente) {
        return {
          ...base,
          clave: "ya_resuelto",
          estadoEnBold: estadoGuardado,
          confirmada: esAprobado(estadoGuardado),
          mensaje: esAprobado(estadoGuardado)
            ? "Este pago ya está confirmado y la reserva también. No hay nada que verificar."
            : `Este cobro ya quedó cerrado como «${ETIQUETA_ESTADO_BOLD[estadoGuardado]}». No hay nada más que verificar.`,
        };
      }

      /*
        Aprobado en `pagos` y reserva sin confirmar: se arregla con lo que ya
        tenemos guardado, **sin preguntar nada a Bold**. El estado del pago ya es
        final y correcto; lo que falta es la segunda escritura, la de `reservas`,
        que se quedó sin hacer. Ver `repararReservaSinConfirmar()`.
      */
      const aplicado = await repararReservaSinConfirmar(supabase, referencia, {
        diferir: opciones.diferir,
      });

      return resultadoDesdeAplicacion(base, estadoGuardado, null, aplicado);
    }

    /* ---------------------------------------------------------------------
       2. LA PREGUNTA A BOLD
       ------------------------------------------------------------------ */
    const consulta = await consultarEstadoPago(referencia);

    if (consulta.fallo) {
      console.warn(
        `[reconciliar] ${referencia}: la API de Bold no respondió. No se toca nada.`,
      );
      return {
        ...base,
        clave: "sin_respuesta",
        consulta,
        mensaje:
          "Ahora mismo no pudimos preguntarle a Bold. No se cambió nada; vuelve a intentarlo en un minuto.",
      };
    }

    /*
      `NO_TRANSACTION_FOUND` NO ES UNA NEGATIVA, Y AQUÍ NO SE PUEDE TRATAR COMO
      TAL.

      La documentación de Bold dice dos cosas que lo explican: «la transacción
      aparecerá disponible para consulta en hasta 10 minutos» y, en el ambiente
      de pruebas, las referencias se archivan a las pocas horas (observado el
      2026-10-02: una venta pagada la noche anterior devolvía 404). Un estado que
      no reconocemos (`DESCONOCIDO`) es lo mismo: Bold cambió algo y no vamos a
      adivinar.

      En los dos casos **no se escribe nada**. Al contrario que en el webhook,
      aquí no hay un evento firmado del que fiarse: no hay segunda fuente, y la
      respuesta honesta es «todavía no se sabe».
    */
    if (
      consulta.estado === "NO_TRANSACTION_FOUND" ||
      consulta.estado === "DESCONOCIDO"
    ) {
      return {
        ...base,
        clave: "sin_transaccion",
        estadoEnBold: consulta.estado,
        consulta,
        mensaje:
          consulta.estado === "NO_TRANSACTION_FOUND"
            ? "Bold todavía no tiene ninguna transacción para esta referencia. Puede tardar hasta diez minutos en aparecer; si el huésped dice que pagó, búscala por el comprobante en el panel de Bold."
            : "Bold devolvió un estado que no reconocemos, así que no se cambió nada. Avisa a GOCAS.",
      };
    }

    /* ---------------------------------------------------------------------
       3. LO MISMO QUE HARÍA EL WEBHOOK. Literalmente el mismo código.
       ------------------------------------------------------------------ */
    const aplicado = await aplicarEstadoDePago(supabase, {
      referencia,
      estado: consulta.estado,
      montoCobrado: consulta.total,
      metodo: consulta.metodo,
      transaccionId: consulta.transaccionId,
      /* El soporte de este cambio: lo que respondió Bold y cuándo se preguntó.
         No hay evento firmado que guardar, y esto es lo que lo sustituye. */
      payload: {
        fuente: "reconciliacion",
        consultado_at: new Date().toISOString(),
        respuesta: consulta,
      },
      origen: "reconciliacion",
      diferir: opciones.diferir,
    });

    return resultadoDesdeAplicacion(base, consulta.estado, consulta, aplicado);
  } catch (error) {
    console.error(
      `[reconciliar] ${referencia}: fallo inesperado:`,
      error instanceof Error ? error.message : error,
    );
    return {
      ...base,
      clave: "sin_respuesta",
      mensaje:
        "No se pudo verificar el pago por un error interno. Inténtalo otra vez; si sigue, avisa a GOCAS.",
    };
  }
}

function resultadoDesdeAplicacion(
  base: ResultadoReconciliacion,
  estadoEnBold: EstadoBold,
  consulta: ConsultaEstado | null,
  aplicado: ResultadoAplicacion,
): ResultadoReconciliacion {
  return {
    ...base,
    clave: "aplicado",
    estadoEnBold,
    consulta,
    aplicado,
    cambio: aplicado.cambio,
    confirmada:
      aplicado.clave === "confirmada" ||
      (aplicado.clave === "sin_cambios" && esAprobado(aplicado.estadoAnterior)),
    mensaje: aplicado.mensaje,
  };
}

/** ¿La reserva de este pago ya está confirmada? Sin reserva, se da por sí. */
async function reservaConfirmada(
  supabase: SupabaseClient,
  reservaId: string | null,
): Promise<boolean> {
  if (!reservaId) return true;
  const { data } = await supabase
    .from("reservas")
    .select("estado")
    .eq("id", reservaId)
    .maybeSingle();
  /* Sin fila no hay nada que arreglar; `completada` es una confirmada que ya
     pasó, y tratarla como incoherente la devolvería a `confirmada` cada vez que
     alguien pulsara el botón. */
  if (!data) return true;
  return data.estado === "confirmada" || data.estado === "completada";
}

/* ===========================================================================
 * Varias referencias (el cron)
 * ======================================================================== */

/** Cuántas horas atrás mira el barrido de reconciliación del cron. */
export const HORAS_RECONCILIACION = 24;

/**
 * Cuántos pagos se reconcilian como máximo en una pasada.
 *
 * Es un tope de cortesía con Bold y con el límite de tiempo de la función de
 * Vercel: cada reconciliación es una llamada HTTP con seis segundos de corte. Con
 * cinco cabañas, veinticinco pagos sin resolver en un día ya sería un día
 * extraordinario; si alguna vez se llega al tope, la pasada siguiente coge el
 * resto, porque los que se resuelven dejan de estar en la lista.
 */
export const MAXIMO_RECONCILIACION = 25;

/**
 * Tiempo máximo que la pasada completa puede ocupar, en milisegundos.
 *
 * El tope de arriba no basta: cada consulta a Bold tiene seis segundos de corte,
 * así que veinticinco en el peor caso serían dos minutos y medio y la función de
 * Vercel se cortaría **a mitad de un barrido**, dejando la mitad sin mirar y, lo
 * que es peor, sin llegar a `liberarReservasVencidas()`. Con un plazo, la pasada
 * se detiene limpia y los que falten entran en la de mañana.
 */
export const LIMITE_MS_RECONCILIACION = 20_000;

/** Los estados de los que ya no se sale: no hay nada que reconciliar. */
const FINALES = ["APPROVED", "REJECTED", "FAILED", "VOIDED"];

export type ResumenReconciliacion = {
  /** Cuántos pagos sin resolver se miraron. */
  revisados: number;
  /** En cuántos se escribió algo. */
  reconciliados: number;
  /** Cuántas reservas quedaron confirmadas por esto. */
  confirmados: number;
  /** Cuántos quedaron cerrados como rechazados, fallidos o anulados. */
  descartados: number;
  /** Cuántos siguen sin respuesta de Bold (o sin transacción todavía). */
  sinRespuesta: number;
  /** Las referencias que piden una persona: pago aprobado y fechas ocupadas. */
  requierenAtencion: string[];
};

/**
 * Reconcilia los pagos **no finales creados en las últimas 24 horas**.
 *
 * ---------------------------------------------------------------------------
 * ESTO VA ANTES DE LIBERAR LAS RESERVAS VENCIDAS. SIEMPRE.
 * ---------------------------------------------------------------------------
 * Es toda la razón de que el orden del cron importe. Si el barrido corriera
 * primero, cancelaría una reserva cuyo pago está aprobado en Bold y la
 * reconciliación tendría que resucitarla un segundo después — con el riesgo de
 * que entre las dos cosas alguien hubiera comprado esas noches. Preguntando
 * antes, el pago aprobado **nunca** llega a la lista de vencidas: la
 * confirmación le quita el `expira_at`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ 24 HORAS Y NO «TODOS»
 * ---------------------------------------------------------------------------
 * Porque es lo que Bold conserva: «la transacción aparecerá disponible para
 * consulta en hasta 10 minutos y **durante las próximas 24 horas**». Pasado ese
 * plazo la API responde que no encuentra la referencia, así que preguntar por un
 * pago de la semana pasada es gastar una llamada para que nos digan que no se
 * sabe. Un cobro más viejo que eso se resuelve mirando el panel de Bold, que sí
 * guarda el historial.
 *
 * Se recorren **en serie** a propósito: son pocos, y en paralelo se le abrirían
 * veinticinco conexiones de golpe a la API de un tercero para ahorrar unos
 * segundos en una tarea que corre de madrugada.
 *
 * Nunca lanza.
 */
export async function reconciliarPagosPendientes(
  supabase: SupabaseClient,
  opciones: { horas?: number; maximo?: number; limiteMs?: number } = {},
): Promise<ResumenReconciliacion> {
  const resumen: ResumenReconciliacion = {
    revisados: 0,
    reconciliados: 0,
    confirmados: 0,
    descartados: 0,
    sinRespuesta: 0,
    requierenAtencion: [],
  };

  if (!boldConfigurado()) return resumen;

  const horas = opciones.horas ?? HORAS_RECONCILIACION;
  const maximo = opciones.maximo ?? MAXIMO_RECONCILIACION;
  const limiteMs = opciones.limiteMs ?? LIMITE_MS_RECONCILIACION;
  const arranque = Date.now();
  const desde = new Date(Date.now() - horas * 3_600_000).toISOString();

  let referencias: string[] = [];

  try {
    const { data, error } = await supabase
      .from("pagos")
      .select("referencia")
      .gte("created_at", desde)
      .not("estado", "in", `(${FINALES.join(",")})`)
      .order("created_at", { ascending: true })
      .limit(maximo);

    if (error) {
      console.error(
        "[reconciliar] no se pudo listar los pagos sin resolver:",
        error.message,
      );
      return resumen;
    }

    referencias = (data ?? [])
      .map((fila) => String(fila.referencia ?? ""))
      .filter((referencia) => referencia.length > 0);
  } catch (error) {
    console.error(
      "[reconciliar] no se pudo listar los pagos sin resolver:",
      error instanceof Error ? error.message : error,
    );
    return resumen;
  }

  for (const referencia of referencias) {
    if (Date.now() - arranque > limiteMs) {
      console.warn(
        `[reconciliar] se agotó el plazo de la pasada tras ${resumen.revisados} de ${referencias.length} pago(s). El resto entra mañana.`,
      );
      break;
    }

    resumen.revisados += 1;

    const resultado = await reconciliarPago(referencia, { supabase });

    if (resultado.cambio) resumen.reconciliados += 1;
    if (resultado.aplicado?.clave === "confirmada") resumen.confirmados += 1;
    if (
      resultado.aplicado?.clave === "no_aprobado" ||
      resultado.aplicado?.clave === "cancelada"
    ) {
      resumen.descartados += 1;
    }
    if (
      resultado.clave === "sin_respuesta" ||
      resultado.clave === "sin_transaccion"
    ) {
      resumen.sinRespuesta += 1;
    }
    if (resultado.aplicado?.clave === "fechas_ocupadas") {
      resumen.requierenAtencion.push(referencia);
    }
  }

  if (resumen.reconciliados > 0) {
    console.info(
      `[reconciliar] ${resumen.reconciliados} de ${resumen.revisados} pago(s) actualizados; ${resumen.confirmados} reserva(s) confirmada(s).`,
    );
  }
  if (resumen.requierenAtencion.length > 0) {
    console.error(
      "[reconciliar] ⚠ pagos aprobados que NO se pudieron confirmar porque las fechas ya están ocupadas:",
      resumen.requierenAtencion.join(", "),
    );
  }

  return resumen;
}
