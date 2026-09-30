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

export const OPCIONES_COOKIE_SESION = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: DIAS_DE_SESION * 24 * 60 * 60,
};

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
