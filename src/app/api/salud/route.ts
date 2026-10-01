import { revalidatePath } from "next/cache";

import { frenar } from "@/lib/api/limite-peticiones";
import { refrescarResenasGoogle } from "@/lib/resenas-google";
import { liberarReservasVencidas } from "@/lib/reserva/liberar-vencidas";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * LATIDO: mantiene despierta la base de Supabase, barre las reservas vencidas y
 * refresca las reseñas de Google.
 *
 *     GET /api/salud
 *     → 200 { "ok": true, "base": "activa", "reservas_liberadas": 0,
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
 *      cuando la variable está definida en el proyecto. Sin la variable el
 *      endpoint queda abierto (para poder probarlo antes de configurarla), y eso
 *      está documentado en `docs/DESPLIEGUE_VERCEL.md` como paso obligatorio.
 *   3. **Freno de peticiones**, aunque venga con la cabecera correcta: el latido
 *      legítimo es una vez al día.
 *
 * No devuelve NADA del interior: ni la versión de Postgres, ni el mensaje del
 * error, ni cuántas filas hay. `ok`, la hora del servidor y dos conteos
 * (reservas liberadas, reseñas guardadas) que no identifican a nadie.
 *
 * ---------------------------------------------------------------------------
 * LAS TRES TAREAS DEL CRON DIARIO
 * ---------------------------------------------------------------------------
 *   1. El latido en sí (clave anónima).
 *   2. Barrer las reservas cuyo hold venció (clave de servicio).
 *   3. Refrescar las reseñas de Google (clave de servicio) — la ÚNICA llamada
 *      rutinaria a Places API del proyecto: una al día, unas 30 al mes, contra
 *      las 1.000 gratuitas. Ver el comentario largo donde ocurre.
 *
 * Las tres en el mismo cron porque son tres cosas que hay que hacer una vez al
 * día y la suma cuesta milisegundos. Un cron por tarea serían tres entradas en
 * `vercel.json` para el mismo trabajo.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Margen de sobra. El latido y el barrido tardan milisegundos; lo único que
 * puede demorarse es la llamada a Places API, que ya tiene su propio corte de
 * seis segundos dentro de `refrescarResenasGoogle()`. Treinta segundos es
 * holgura, no una expectativa.
 */
export const maxDuration = 30;

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

  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const cabecera = peticion.headers.get("authorization") ?? "";
    if (cabecera !== `Bearer ${secreto}`) {
      /* 401 seco, sin decir si la variable existe ni qué se esperaba. */
      return json({ ok: false }, 401);
    }
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
    let liberadas = 0;
    try {
      liberadas = await liberarReservasVencidas(crearClienteAdmin());
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
    let resenas = { refrescado: false, resenas: 0 };
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
        /* Si el refresco de hoy entró, y con cuántas reseñas quedó la fila. Ni
           los textos ni los nombres de quienes reseñaron: solo el conteo. */
        resenas_refrescadas: resenas.refrescado,
        resenas_guardadas: resenas.resenas,
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
