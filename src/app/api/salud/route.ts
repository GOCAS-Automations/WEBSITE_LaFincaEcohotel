import { frenar } from "@/lib/api/limite-peticiones";
import { liberarReservasVencidas } from "@/lib/reserva/liberar-vencidas";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * LATIDO: mantiene despierta la base de Supabase y barre las reservas vencidas.
 *
 *     GET /api/salud
 *     → 200 { "ok": true, "base": "activa", "reservas_liberadas": 0, "hora": "…" }
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
 *      responde. La clave de servicio se usa **solo** en el barrido de reservas
 *      vencidas —que necesita escribir— y en ningún otro punto del handler;
 *      está comentado en su sitio.
 *   2. **`CRON_SECRET`.** Si la variable existe, se exige la cabecera
 *      `Authorization: Bearer <CRON_SECRET>` — la que Vercel Cron manda sola
 *      cuando la variable está definida en el proyecto. Sin la variable el
 *      endpoint queda abierto (para poder probarlo antes de configurarla), y eso
 *      está documentado en `docs/DESPLIEGUE_VERCEL.md` como paso obligatorio.
 *   3. **Freno de peticiones**, aunque venga con la cabecera correcta: el latido
 *      legítimo es una vez al día.
 *
 * No devuelve NADA del interior: ni la versión de Postgres, ni el mensaje del
 * error, ni cuántas filas hay. `ok` y la hora del servidor.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    return json(
      {
        ok: true,
        base: "activa",
        /* Cuántas cayeron, para poder mirarlo en los registros de Vercel sin
           entrar a la base. No sale ni un dato de ningún huésped. */
        reservas_liberadas: liberadas,
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
