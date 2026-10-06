import { revalidatePath } from "next/cache";

import { frenar } from "@/lib/api/limite-peticiones";
import { decidirAccesoCron } from "@/lib/api/secreto-cron";
import {
  HORAS_RECONCILIACION,
  reconciliarPagosPendientes,
  type ResumenReconciliacion,
} from "@/lib/pagos/reconciliar";
import { refrescarResenasGoogle } from "@/lib/resenas-google";
import { liberarReservasVencidas } from "@/lib/reserva/liberar-vencidas";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * LATIDO: mantiene despierta la base de Supabase, barre las reservas vencidas y
 * refresca las reseñas de Google.
 *
 *     GET /api/salud
 *     → 200 { "ok": true, "base": "activa", "reservas_liberadas": 0,
 *             "pagos_revisados": 0, "pagos_reconciliados": 0,
 *             "pagos_confirmados": 0, "pagos_requieren_atencion": 0,
 *             "resenas_refrescadas": true, "resenas_guardadas": 5, "hora": "…" }
 *     → 503 { "ok": false }
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTE ENDPOINT
 * ---------------------------------------------------------------------------
 * El plan gratuito de Supabase **pausa los proyectos con poca actividad al cabo
 * de siete días**. Un proyecto pausado no responde: el sitio se queda sin
 * contenido, sin fotos y sin disponibilidad, y hay que entrar al panel de
 * Supabase a reactivarlo a mano. A un hotel eso le pasa justo en la semana
 * floja entre temporadas, que es cuando menos se mira el sitio y más caro sale
 * que no funcione.
 *
 * El `vercel.json` de la raíz programa un cron que llama a esta ruta una vez al
 * día. Eso basta: cada llamada hace **una** consulta trivial a Postgres y el
 * contador de inactividad vuelve a cero.
 *
 * **Si se quita el cron o esta ruta**, la base se vuelve a pausar sola a los
 * siete días de que nadie visite el sitio. Antes de borrarlo hay que haber
 * pasado a un plan de pago de Supabase (los planes pagos no pausan) o haber
 * puesto otro latido en su lugar.
 *
 * ---------------------------------------------------------------------------
 * CÓMO ESTÁ PROTEGIDO
 * ---------------------------------------------------------------------------
 *   1. **El latido va con la clave anónima.** La consulta es `select id from
 *      planes limit 1`: una tabla de catálogo con lectura pública por RLS. Si
 *      alguien llegara a esta ruta, lo más que consigue es saber que la base
 *      responde. La clave de servicio se usa **solo** en las dos tareas que
 *      escriben —el barrido de reservas vencidas y el refresco de las reseñas—,
 *      y está comentado en el sitio de cada una.
 *   2. **`CRON_SECRET`.** Si la variable existe, se exige la cabecera
 *      `Authorization: Bearer <CRON_SECRET>` — la que Vercel Cron manda sola
 *      cuando la variable está definida en el proyecto. Sin la variable, en
 *      producción **falla cerrado** (503 y un error claro en el registro); en
 *      local y en previews queda abierto para poder probarlo. Ver
 *      `src/lib/api/secreto-cron.ts` y `docs/DESPLIEGUE_VERCEL.md`.
 *   3. **Freno de peticiones**, aunque venga con la cabecera correcta: el latido
 *      legítimo es una vez al día.
 *
 * No devuelve NADA del interior: ni la versión de Postgres, ni el mensaje del
 * error, ni cuántas filas hay. `ok`, la hora del servidor y dos conteos
 * (reservas liberadas, reseñas guardadas) que no identifican a nadie.
 *
 * ---------------------------------------------------------------------------
 * LAS CUATRO TAREAS DEL CRON DIARIO, **EN ESTE ORDEN**
 * ---------------------------------------------------------------------------
 *   1. El latido en sí (clave anónima).
 *   2. **Reconciliar los pagos sin resolver** de las últimas 24 horas: se le
 *      pregunta a Bold por cada uno y se aplica lo que diga (clave de servicio).
 *   3. Barrer las reservas cuyo hold venció (clave de servicio).
 *   4. Refrescar las reseñas de Google (clave de servicio) — la ÚNICA llamada
 *      rutinaria a Places API del proyecto: una al día, unas 30 al mes, contra
 *      las 1.000 gratuitas. Ver el comentario largo donde ocurre.
 *
 * ⚠ **El 2 va antes del 3, y no es un detalle de estilo.** Si el barrido corriera
 * primero, cancelaría una reserva cuyo pago está aprobado en Bold —es
 * exactamente lo que le pasó a `LF-2026-0001`— y habría que resucitarla después,
 * con el riesgo de que entre las dos cosas alguien hubiera comprado esas noches.
 * Preguntando antes, un pago aprobado **nunca** llega a la lista de vencidas: la
 * confirmación le quita el `expira_at`.
 *
 * Las cuatro en el mismo cron porque son cosas que hay que hacer una vez al día.
 * Un cron por tarea serían cuatro entradas en `vercel.json` para el mismo
 * trabajo.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Margen de sobra. El latido y el barrido tardan milisegundos; lo que puede
 * demorarse son las llamadas a terceros: Places API (corte propio de seis
 * segundos) y la reconciliación de pagos contra Bold, que además de un corte por
 * consulta tiene un **plazo total** de veinte segundos
 * (`LIMITE_MS_RECONCILIACION`) para no comerse la función entera y dejar el
 * barrido sin ejecutar. Sesenta segundos es holgura, no una expectativa.
 */
export const maxDuration = 60;

/** Un latido al día, más margen para probarlo a mano. */
const LIMITE = { peticiones: 10, segundos: 300 };

/** Si la base no contesta en cinco segundos, se da por caída. */
const ESPERA_MS = 5000;

function json(cuerpo: unknown, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET(peticion: Request) {
  const frenada = frenar(peticion, "salud", LIMITE);
  if (frenada) return frenada;

  const acceso = decidirAccesoCron({
    secreto: process.env.CRON_SECRET,
    entornoVercel: process.env.VERCEL_ENV,
    cabecera: peticion.headers.get("authorization"),
  });
  if (acceso === "falta-secreto") {
    /* La respuesta no dice qué falta; el registro de Vercel, sí. */
    console.error(
      "[salud] CRON_SECRET no está configurada en producción: el latido no corre hasta que se cree en Vercel (ver docs/DESPLIEGUE_VERCEL.md).",
    );
    return json({ ok: false }, 503);
  }
  if (acceso === "rechazado") {
    /* 401 seco, sin decir si la variable existe ni qué se esperaba. */
    return json({ ok: false }, 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !claveAnon) {
    console.error("[salud] faltan las variables de Supabase.");
    return json({ ok: false }, 503);
  }

  const corte = AbortSignal.timeout(ESPERA_MS);

  try {
    /* Una sola consulta, una sola fila, una sola columna. Se usa `fetch` en
       vez de crear un cliente de supabase-js porque este handler no necesita
       nada de lo que el cliente añade (caché de Next, sesión, reintentos). */
    const respuesta = await fetch(
      `${url}/rest/v1/planes?select=id&limit=1`,
      {
        headers: {
          apikey: claveAnon,
          Authorization: `Bearer ${claveAnon}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: corte,
      },
    );

    if (!respuesta.ok) {
      console.error("[salud] la base respondió", respuesta.status);
      return json({ ok: false }, 503);
    }

    /* Se consume el cuerpo para que la conexión se cierre limpia, pero no se
       mira: da igual si hay planes o no, lo que importa es que contestó. */
    await respuesta.json().catch(() => null);

    /*
      EL MISMO CRON BARRE LAS RESERVAS VENCIDAS.

      Sin él, una solicitud que caducó de madrugada seguiría diciendo
      `pendiente` en el listado del panel hasta que alguien creara otra reserva.
      El calendario y la disponibilidad ya no la cuentan —`ocupaCalendario()` lo
      decide en memoria—, así que esto no arregla una sobreventa: arregla que el
      panel enseñe la verdad y que la tabla no acumule solicitudes zombis.

      Por qué aquí y no en un cron propio: es el único cron que el proyecto
      tiene, corre una vez al día y la operación cuesta un `UPDATE`. Un segundo
      cron sería una entrada más en `vercel.json` para el mismo trabajo.

      **Usa `service_role`, a diferencia del latido de arriba**, porque hay que
      ESCRIBIR y la función es `security invoker`: con la clave anónima no
      tendría permiso. Eso está acotado a esta línea, y la ruta está protegida
      por `CRON_SECRET` y por el freno de peticiones. Lo peor que puede hacer
      esta llamada es cancelar holds que ya estaban vencidos, que es
      exactamente su trabajo; no toca ninguna otra tabla ni devuelve nada.
    */
    /*
      ===================================================================
      ANTES DEL BARRIDO: PREGUNTARLE A BOLD POR LOS PAGOS SIN RESOLVER.
      ===================================================================
      El webhook no puede ser la única vía de confirmación. Lo demostró el
      sandbox: dos pagos reales, **cero eventos recibidos**, y una reserva pagada
      (`LF-2026-0001`) cancelada sola al vencer su hold. Esta pasada es la red que
      lo recoge aunque no llegue ni un evento: por cada pago no final de las
      últimas 24 horas se consulta la API de Bold con nuestra llave y se aplica lo
      que responda, con **el mismo código** que usa el webhook
      (`src/lib/pagos/aplicar-estado.ts`).

      Va ANTES de `liberarReservasVencidas()` a propósito: así una reserva pagada
      se confirma —y pierde su `expira_at`— antes de que el barrido pueda mirarla.
      Invertir estas dos llamadas reintroduce el fallo que esto arregla.

      24 horas porque es lo que Bold conserva para consulta; más atrás, la API
      responde que no encuentra la referencia. No lanza nunca.
    */
    const admin = crearClienteAdmin();

    let reconciliacion: ResumenReconciliacion = {
      revisados: 0,
      reconciliados: 0,
      confirmados: 0,
      descartados: 0,
      sinRespuesta: 0,
      requierenAtencion: [],
    };
    try {
      reconciliacion = await reconciliarPagosPendientes(admin);
    } catch (error) {
      /* `reconciliarPagosPendientes` no lanza, pero el latido no se cae ni
         aunque algún día lo hiciera. */
      console.error(
        "[salud] no se pudieron reconciliar los pagos:",
        error instanceof Error ? error.message : error,
      );
    }

    let liberadas = 0;
    try {
      liberadas = await liberarReservasVencidas(admin);
    } catch (error) {
      /* `liberarReservasVencidas` no lanza, pero crear el cliente sí puede si
         falta la clave de servicio. El latido no se cae por eso. */
      console.error(
        "[salud] no se pudo barrer las reservas vencidas:",
        error instanceof Error ? error.message : error,
      );
    }

    /*
      EL MISMO CRON REFRESCA LAS RESEÑAS DE GOOGLE.

      Es el único punto del proyecto que llama a Places API de forma rutinaria.
      Antes la llamada vivía en el render de la portada con `revalidate: 86400`,
      que suena a «una al día» pero no lo es: la Data Cache de Next es por
      instancia y por región, así que el número real dependía de cuántas levante
      Vercel. Desde que Google retiró el crédito universal eso importa en pesos:
      las reseñas están en el tramo más caro de Place Details, con 1.000 llamadas
      gratis al mes y 20 USD por millar después.

      Aquí el número es exacto y se puede presupuestar:

          1 llamada/día × 30 días = 30 llamadas/mes   frente a 1.000 gratis

      El sitio ya no llama a Google nunca: lee la tabla `cache_externo`. Ver
      `src/lib/resenas-google.ts` y la migración 014.

      Si Google falla, NO se toca lo guardado: la portada sigue mostrando las
      mismas reseñas de ayer y aquí sale `resenas_refrescadas: false`. Es
      información para los registros de Vercel, no un incidente.

      `revalidatePath("/")` solo cuando hubo cambio: la portada es estática con
      ISR de una hora, así que sin esto una reseña nueva tardaría hasta sesenta
      minutos más en salir. Solo se invalida `/`, que es la única página que
      muestra reseñas; invalidar de más obligaría a regenerar el sitio entero por
      un bloque social.
    */
    let resenas: Awaited<ReturnType<typeof refrescarResenasGoogle>> = {
      refrescado: false,
      resenas: 0,
    };
    try {
      resenas = await refrescarResenasGoogle();
      if (resenas.refrescado) revalidatePath("/");
    } catch (error) {
      /* `refrescarResenasGoogle` no lanza, pero el latido no se cae ni aunque
         algún día lo hiciera: el adorno social no manda sobre la base. */
      console.error(
        "[salud] no se pudieron refrescar las reseñas:",
        error instanceof Error ? error.message : error,
      );
    }

    return json(
      {
        ok: true,
        base: "activa",
        /* Cuántas cayeron, para poder mirarlo en los registros de Vercel sin
           entrar a la base. No sale ni un dato de ningún huésped. */
        reservas_liberadas: liberadas,
        /*
          LA RECONCILIACIÓN, CONTADA. Son conteos y una ventana en horas: ni una
          referencia, ni un monto, ni un nombre.

          `pagos_requieren_atencion` es el único que hay que mirar de verdad:
          cuenta los pagos que Bold da por aprobados y que NO se pudieron
          confirmar porque esas fechas ya se le asignaron a otra reserva. No hay
          nada automático que hacer con eso —son dos personas y una cabaña— y las
          referencias concretas quedan en los registros de Vercel con un
          `console.error`.
        */
        pagos_revisados: reconciliacion.revisados,
        pagos_reconciliados: reconciliacion.reconciliados,
        pagos_confirmados: reconciliacion.confirmados,
        pagos_descartados: reconciliacion.descartados,
        pagos_sin_respuesta: reconciliacion.sinRespuesta,
        pagos_requieren_atencion: reconciliacion.requierenAtencion.length,
        pagos_ventana_horas: HORAS_RECONCILIACION,
        /* Si el refresco de hoy entró, y con cuántas reseñas quedó la fila. Ni
           los textos ni los nombres de quienes reseñaron: solo el conteo. */
        resenas_refrescadas: resenas.refrescado,
        resenas_guardadas: resenas.resenas,
        /* Diagnóstico del criterio: cuántas devolvió Google hoy, cuántas hay
           en el repertorio acumulado y, de las publicadas, cuántas son del
           último año (el resto completa hasta cinco con las más antiguas). */
        resenas_devueltas: resenas.devueltas ?? null,
        resenas_en_repertorio: resenas.enRepertorio ?? null,
        resenas_del_ultimo_ano: resenas.delUltimoAno ?? null,
        hora: new Date().toISOString(),
      },
      200,
    );
  } catch (error) {
    console.error(
      "[salud] no se pudo consultar la base:",
      error instanceof Error ? error.message : error,
    );
    return json({ ok: false }, 503);
  }
}
