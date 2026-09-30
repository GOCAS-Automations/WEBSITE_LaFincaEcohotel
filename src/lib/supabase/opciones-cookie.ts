/**
 * Opciones de la cookie de sesión del panel.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO SE DEJAN LAS DE `@supabase/ssr`
 * ---------------------------------------------------------------------------
 * La librería trae `DEFAULT_COOKIE_OPTIONS = { path: "/", sameSite: "lax",
 * httpOnly: false, maxAge: 400 días }` (ver
 * `node_modules/@supabase/ssr/dist/main/utils/constants.js`). El `httpOnly:
 * false` es deliberado en la librería: `createBrowserClient()` necesita LEER la
 * cookie desde `document.cookie` para reconstruir la sesión en el navegador.
 *
 * **Este proyecto nunca crea un cliente de navegador.** `crearClienteNavegador()`
 * existe en `client.ts` pero no lo importa ni un solo componente: todo el panel
 * es Server Components y Server Actions, y la sesión se resuelve siempre en el
 * servidor con `getUser()`. Como nada en el navegador necesita leer el token,
 * dejarlo legible por JavaScript solo añade una forma de perderlo: cualquier XSS
 * en el panel —o en una dependencia suya— podría copiar la cookie y entrar a las
 * reservas y a los datos personales de los huéspedes durante los 400 días que
 * dura. Con `httpOnly` el token deja de existir para `document.cookie`.
 *
 * Si algún día hace falta un cliente de navegador con sesión, hay que quitar
 * `httpOnly` aquí y asumir ese riesgo a conciencia, no descubrirlo por un fallo.
 *
 * ---------------------------------------------------------------------------
 * `secure` SOLO EN PRODUCCIÓN
 * ---------------------------------------------------------------------------
 * Una cookie `Secure` no viaja por HTTP. En Vercel todo es HTTPS, así que
 * conviene; en `localhost` (http) marcarla dejaría el panel imposible de probar.
 *
 * ---------------------------------------------------------------------------
 * DURACIÓN
 * ---------------------------------------------------------------------------
 * 400 días para la sesión de quien administra un hotel es demasiado: un
 * portátil olvidado sigue entrando más de un año después. Se baja a 30 días,
 * que sigue evitando que al cliente le pidan la contraseña cada semana. El
 * token de acceso se refresca solo en cada visita al panel (lo hace el
 * middleware), así que la cuenta activa nunca ve el corte.
 */

/** Un mes. Lo que dura la cookie de sesión del panel sin volver a entrar. */
export const DIAS_DE_SESION = 30;

/** El mismo número en segundos, que es lo que entiende `Max-Age`. */
export const SEGUNDOS_DE_SESION = DIAS_DE_SESION * 24 * 60 * 60;

export const OPCIONES_COOKIE_SESION = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: SEGUNDOS_DE_SESION,
};

/**
 * Recorta la duración de una cookie que va a escribir `@supabase/ssr`.
 *
 * Hace falta porque **la librería ignora el `maxAge` de `cookieOptions`**: en
 * varios de sus caminos escribe `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge` a mano
 * (ver `node_modules/@supabase/ssr/dist/main/cookies.js`, líneas 233 y 464), así
 * que la cookie salía con los 400 días de la librería aunque aquí pidiéramos 30.
 * Se comprobó en el `Set-Cookie` real de un login antes de escribir esto.
 *
 * Solo recorta hacia abajo, y **solo cuando la duración es positiva**: la
 * librería usa `maxAge` cero o negativo para BORRAR la cookie al cerrar sesión,
 * y pisarlo dejaría al panel sin poder cerrar sesión.
 */
export function recortarDuracion<
  T extends { maxAge?: number; expires?: Date | number | string },
>(opciones: T): T {
  const recortadas = { ...opciones };

  if (typeof recortadas.maxAge === "number" && recortadas.maxAge > 0) {
    recortadas.maxAge = Math.min(recortadas.maxAge, SEGUNDOS_DE_SESION);
  }

  /* Si además viene una fecha absoluta, se recorta igual: la más cercana gana. */
  if (recortadas.expires !== undefined) {
    const tope = Date.now() + SEGUNDOS_DE_SESION * 1000;
    const pedida = new Date(recortadas.expires).getTime();
    if (Number.isFinite(pedida) && pedida > tope) {
      recortadas.expires = new Date(tope);
    }
  }

  return recortadas;
}

/**
 * Cabeceras que `@supabase/ssr` pide poner en cualquier respuesta que escriba
 * cookies de sesión.
 *
 * Sin ellas, un proxy o una CDN podría guardar una respuesta CON el
 * `Set-Cookie` de una persona y servírsela a otra: dos administradores
 * compartirían sesión. Vercel no cachea respuestas con `Set-Cookie`, pero la
 * garantía no depende de eso si la respuesta lo dice explícitamente.
 */
export const CABECERAS_SIN_CACHE: Record<string, string> = {
  "cache-control": "private, no-cache, no-store, must-revalidate, max-age=0",
  expires: "0",
  pragma: "no-cache",
};
