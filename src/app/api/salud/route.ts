import { frenar } from "@/lib/api/limite-peticiones";

/**
 * LATIDO: mantiene despierta la base de Supabase.
 *
 *     GET /api/salud
 *     → 200 { "ok": true, "base": "activa", "hora": "2026-09-30T12:00:00.000Z" }
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
 *   1. **Clave anónima, nunca `service_role`.** La consulta es `select id from
 *      planes limit 1`: una tabla de catálogo con lectura pública por RLS. Si
 *      alguien llegara a esta ruta, lo más que consigue es saber que la base
 *      responde. Usar la clave de servicio para un latido sería dar permisos de
 *      dios a la ruta más llamada del sitio.
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

    return json(
      { ok: true, base: "activa", hora: new Date().toISOString() },
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
