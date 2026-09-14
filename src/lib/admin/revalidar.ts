import { revalidatePath, revalidateTag } from "next/cache";

import { ETIQUETA_CONTENIDO_PUBLICO } from "@/lib/supabase/public";

/**
 * Publica en el sitio público lo que se acaba de cambiar en el panel.
 *
 * Hay DOS cachés que invalidar y hacen falta las dos:
 *
 *   1. `revalidateTag(ETIQUETA_CONTENIDO_PUBLICO)` — el "Data Cache": las
 *      respuestas de Supabase que Next guardó al renderizar. Sin esto, Next
 *      vuelve a renderizar la página… con los datos viejos, y el cambio no se
 *      ve hasta que expire la hora del ISR.
 *   2. `revalidatePath(...)` — el "Full Route Cache": el HTML ya generado.
 *
 * Sobre la forma de las llamadas: para una ruta estática se pasa SOLO la ruta.
 * Añadirle el segundo argumento `"page"` no purga nada. El segundo argumento sí
 * hace falta en `/alojamientos/[slug]`, donde se revalida el PATRÓN para cubrir
 * de una vez las cinco fichas, incluida la que acaba de cambiar de slug.
 */
export function revalidarSitioPublico() {
  revalidateTag(ETIQUETA_CONTENIDO_PUBLICO);

  revalidatePath("/");
  revalidatePath("/alojamientos");
  revalidatePath("/alojamientos/[slug]", "page");
  revalidatePath("/experiencias");
  revalidatePath("/conocenos");
  revalidatePath("/galeria");
  revalidatePath("/faq");
  revalidatePath("/contacto");
  revalidatePath("/reservar");
  revalidatePath("/sitemap.xml");
  // La 404 propia (`app/(publico)/not-found.tsx`) también lee el CMS
  // (clave `no_encontrado`); su ruta interna en Next es esta.
  revalidatePath("/_not-found");
}

/**
 * Refresca las pantallas del propio panel tras una mutación.
 * `rutas` recibe las páginas concretas del módulo que cambió.
 */
export function refrescarPanel(...rutas: string[]) {
  revalidatePath("/admin");
  for (const ruta of rutas) revalidatePath(ruta);
}
