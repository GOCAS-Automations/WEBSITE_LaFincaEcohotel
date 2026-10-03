import { after } from "next/server";

import {
  AVISO_PRUEBAS_EN_PRODUCCION,
  CABECERA_FIRMA_BOLD,
  ambienteDePruebasEnProduccion,
  boldConfigurado,
  consultarEstadoPago,
  estadoDeEvento,
  firmaDeEventoValida,
  leerEventoBold,
  modoBold,
  type EstadoBold,
} from "@/lib/pagos/bold";
import {
  aplicarEstadoDePago,
  type ResultadoAplicacion,
} from "@/lib/pagos/aplicar-estado";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * EL WEBHOOK DE BOLD: la vía **preferente** de confirmación, no la única.
 *
 *     POST /api/pagos/bold/webhook
 *
 * ⚠ **2026-10-02 — esto cambió, y conviene entender por qué.** Hasta esa fecha
 * aquí decía «aquí y solo aquí se confirma una reserva». Dejó de ser verdad a
 * propósito: en el ambiente de pruebas se hicieron dos pagos reales en el
 * sandbox de Bold y llegaron **cero** eventos a este endpoint, de modo que una
 * reserva pagada (`LF-2026-0001`) se canceló sola al vencer su hold. Un webhook
 * que no llega no avisa de que no llegó.
 *
 * Desde entonces existe la **reconciliación** (`src/lib/pagos/reconciliar.ts`):
 * le preguntamos nosotros a la API de Bold con nuestra llave y aplicamos lo que
 * diga, desde la página de retorno, el cron diario y un botón del panel. Las dos
 * vías comparten la escritura —`aplicarEstadoDePago()`— precisamente para que no
 * puedan divergir.
 *
 * Lo que **sigue intacto** es el requisito 2 de la auditoría: la redirección del
 * navegador no confirma nada. De la URL de retorno solo se toma la referencia,
 * que es una pregunta y no una afirmación.
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
 *   La letra de este requisito se queda corta y su **intención** se cumple
 *   entera: lo que no se puede creer es la URL. La reconciliación no cree a la
 *   URL; le pregunta a la API de Bold con nuestra llave, que es la misma fuente
 *   de verdad que exige el requisito 5. Ver la nota al día en
 *   `docs/AUDITORIA_SEGURIDAD.md`.
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
 *   **Capas 2 y 3 — la transición de estado y el `update` condicional.** La capa
 *   1 no basta, porque Bold documenta el `id` como único «por notificación
 *   enviada», no por transacción: un reintento podría traer otro `id` del mismo
 *   pago. Y además hay otra vía escribiendo (la reconciliación), así que dos
 *   procesos distintos pueden coincidir en el mismo pago. Las dos capas que lo
 *   impiden viven en `src/lib/pagos/aplicar-estado.ts` y están explicadas ahí.
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

  /* ---------------------------------------------------------------------
     3-bis. EL CANDADO DEL AMBIENTE: pruebas no confirma nada en producción
     ------------------------------------------------------------------ */
  /*
    EL PEOR ESCENARIO DE TODA ESTA INTEGRACIÓN, Y SE CIERRA AQUÍ.

    Desde que `lafincaecohotel.com` apunta a Vercel, el sitio publicado es el del
    hotel. Si las llaves de Production fueran todavía las de PRUEBAS, un evento
    del sandbox de Bold —que en ese ambiente se firma con la **llave vacía**, o
    sea que cualquiera puede fabricarlo— dejaría una reserva `confirmada` **sin
    un peso cobrado**: una cabaña bloqueada por una venta que no existió.

    Así que el webhook sigue recibiendo y REGISTRANDO el evento (hace falta para
    probarlo desde el panel de Bold, con el botón «Probar el webhook»), pero no
    toca `pagos` ni `reservas`.

    La comprobación vive en `ambienteDePruebasEnProduccion()`
    (`src/lib/pagos/bold.ts`) y **no** se repite aquí a mano: la reconciliación
    tiene que hacer exactamente la misma, y mientras estuvo escrita solo en este
    archivo no la hacía. Ahí está explicado por qué mira `ambienteDeclarado()` y
    no `modoBold()`.

    Esto es la red, no el interruptor: el que impide de verdad que un huésped
    llegue a pagar en pruebas es `PAGOS_ACTIVOS` (`src/lib/pagos/bold.ts`).
  */
  if (ambienteDePruebasEnProduccion()) {
    console.error(
      `[bold/webhook] ${evento.referencia ?? "sin referencia"}: ${AVISO_PRUEBAS_EN_PRODUCCION} ` +
        "El evento queda registrado en `pagos_eventos` y no se toca ni `pagos` ni `reservas`.",
    );
    return ok("ambiente de pruebas en producción: no se confirma nada");
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
     4. EL ESTADO REAL, PREGUNTADO A BOLD (requisito 5)
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

  /* ---------------------------------------------------------------------
     5. LA TRANSICIÓN — **EL MISMO CÓDIGO QUE LA RECONCILIACIÓN**
     ------------------------------------------------------------------ */
  /*
    AQUÍ ESTABA ANTES TODA LA ESCRITURA, Y HABERLA SACADO ES EL ARREGLO.

    Desde el 2026-10-02 el webhook no es la única vía de confirmación: también
    confirma `reconciliarPago()` (`src/lib/pagos/reconciliar.ts`), que le
    pregunta a Bold por su cuenta desde la página de retorno, el cron diario y un
    botón del panel. Hizo falta porque llegaron CERO eventos de webhook y una
    reserva pagada se canceló sola al vencer su hold.

    Dos caminos que escriben una confirmación de pago **tienen** que escribir lo
    mismo, y la única forma de garantizarlo es que sea literalmente el mismo
    código. Vive en `src/lib/pagos/aplicar-estado.ts`, con la decisión pura
    (`decidirAccionDePago`) y las tres capas de idempotencia explicadas ahí.

    Lo único que este endpoint le añade es `after`: Bold exige responder en dos
    segundos, así que los correos y el evento del calendario salen con la
    respuesta ya enviada. La reconciliación, en cambio, los espera.
  */
  const resultado = await aplicarEstadoDePago(supabase, {
    referencia: evento.referencia,
    estado,
    montoCobrado: consulta.total ?? evento.monto ?? null,
    metodo: consulta.metodo ?? evento.metodo ?? null,
    transaccionId: consulta.transaccionId ?? evento.transaccionId ?? null,
    payload: json,
    eventoId: evento.id || null,
    origen: "webhook",
    diferir: (tarea) => after(tarea),
  });

  /* ---------------------------------------------------------------------
     6. QUÉ SE LE RESPONDE A BOLD
     ------------------------------------------------------------------ */
  /*
    Bold reintenta cinco veces todo lo que no sea 200, así que **solo se devuelve
    error cuando el reintento puede arreglar algo**. Un evento que nunca vamos a
    poder procesar —una referencia que no existe aquí— se responde 200: insistir
    veinticuatro horas no lo va a cambiar. Lo que sí merece reintento es un fallo
    nuestro de escritura, y `reintentable` lo dice.
  */
  if (resultado.reintentable) {
    return new Response(resultado.mensaje, { status: 500 });
  }

  return ok(DETALLE[resultado.clave]);
}

/** Lo que se le escribe a Bold en el cuerpo del 200, por desenlace. */
const DETALLE: Record<ResultadoAplicacion["clave"], string> = {
  pago_desconocido: "referencia desconocida",
  sin_cambios: "sin cambios",
  confirmada: "reserva confirmada",
  cancelada: "reserva cancelada por anulación",
  no_aprobado: "pago no aprobado; la reserva vencerá sola",
  intermedio: "estado intermedio guardado",
  sin_reserva: "pago sin reserva asociada",
  adelantado: "ya procesado por otra ejecución",
  fechas_ocupadas: "pago aprobado, pero las fechas ya están ocupadas",
  error_lectura: "no se pudo leer el pago",
  error_pago: "no se pudo guardar el pago",
  error_reserva: "no se pudo confirmar la reserva",
};

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
