/**
 * Validación de la dirección del mapa embebido (`sitio.contacto.mapa_embed`).
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HACE FALTA
 * ---------------------------------------------------------------------------
 * Ese campo lo edita el cliente desde el panel y va **directo a un
 * `<iframe src>`** de dos páginas públicas (`/conocenos` y `/contacto`). Antes
 * se guardaba y se pintaba tal cual, así que cualquier cuenta del panel —o
 * cualquiera que consiguiera una sesión de `equipo`— podía dejar en la portada
 * del hotel un marco a un sitio ajeno: una pasarela de pago falsa con la marca
 * de La Finca, un formulario que pide la tarjeta, publicidad. Y eso no es un
 * fallo del panel: es que el sitio publicaba sin preguntar lo que el panel
 * escribía.
 *
 * El mismo criterio que ya se aplicaba al reel de Instagram
 * (`direccionEmbebido()` en `src/components/sitio/reel-instagram.tsx`): la regla
 * vive donde se decide qué acaba en el iframe, y si lo pegado no encaja, no se
 * pinta el marco. Aquí además se valida al guardar, para que el cliente vea el
 * «no» en el momento y no descubra el mapa en blanco al visitar la página.
 *
 * ---------------------------------------------------------------------------
 * QUÉ SE ACEPTA
 * ---------------------------------------------------------------------------
 * Solo los dos hosts con los que Google sirve un mapa embebido, según cómo se
 * copie el enlace:
 *
 *   · `https://maps.google.com/maps?q=…&output=embed`  (el que usa el sitio hoy)
 *   · `https://www.google.com/maps/embed?pb=…`          (el «Insertar un mapa»)
 *
 * Nada más. Un mapa de otro proveedor exigiría añadirlo aquí Y en `frame-src`
 * de la CSP (`next.config.ts`), que es exactamente el par de sitios donde
 * conviene tener que pensarlo.
 */

/** Hosts de Google que sirven mapas embebidos. */
const HOSTS = new Set(["maps.google.com", "www.google.com", "google.com"]);

/**
 * Devuelve la dirección si es un mapa embebido de Google; `null` si no.
 *
 * Módulo puro y sin `server-only`: lo usa el panel al guardar y los componentes
 * públicos al pintar.
 */
export function direccionDeMapa(valor: string | null | undefined): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio) return null;

  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }

  /* `https:` y nada más. Descarta de paso `javascript:` y `data:`, que en un
     `src` serían ejecución de código en nuestro propio origen. */
  if (url.protocol !== "https:") return null;
  if (!HOSTS.has(url.hostname)) return null;

  const camino = url.pathname.replace(/\/+$/, "");

  /* Forma «Insertar un mapa»: /maps/embed?pb=… */
  if (camino === "/maps/embed") {
    return url.searchParams.has("pb") ? limpio : null;
  }

  /* Forma clásica: /maps?q=…&output=embed */
  if (camino === "/maps" || camino === "") {
    return url.searchParams.get("output") === "embed" ? limpio : null;
  }

  return null;
}

/** ¿El valor sirve como mapa embebido? */
export function esDireccionDeMapa(valor: string | null | undefined): boolean {
  return direccionDeMapa(valor) !== null;
}
