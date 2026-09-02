/**
 * Cliente de Supabase para LECTURA PÚBLICA (sitio público, sin sesión).
 *
 * ---------------------------------------------------------------------------
 * ¿POR QUÉ EXISTE ADEMÁS DE `server.ts`?
 * ---------------------------------------------------------------------------
 * `server.ts` usa `cookies()` de `next/headers` para mantener la sesión de
 * Supabase Auth. Leer cookies obliga a Next a renderizar la ruta de forma
 * DINÁMICA en cada petición, lo que anula `generateStaticParams` y el ISR
 * (`export const revalidate`). Las páginas públicas —portada, cabañas,
 * experiencias— no dependen de ninguna sesión: son iguales para todo el mundo
 * y deben servirse estáticas y revalidarse cada cierto tiempo.
 *
 * Por eso aquí se crea un cliente plano, sin cookies, con la clave pública
 * `anon`. Las políticas RLS siguen aplicando: solo ve lo que está activo.
 *
 * Reglas de uso:
 *   · Contenido público cacheable ....... este cliente.
 *   · Algo que dependa de la sesión ..... `server.ts` (panel).
 *   · Saltarse RLS (webhooks, cron) ..... `admin.ts`, nunca este.
 */
import { createClient } from "@supabase/supabase-js";

/**
 * Etiqueta de caché que llevan TODAS las consultas del sitio público.
 *
 * Next guarda la respuesta de cada consulta en su "Data Cache", separado del
 * HTML ya renderizado. Cuando el panel publique un cambio no bastará con
 * invalidar la página (`revalidatePath`): sin esta etiqueta, Next volvería a
 * renderizarla reutilizando los datos viejos y el cambio no se vería hasta que
 * expirara la hora de `revalidate`. Con ella, el panel podrá tirar las dos
 * cachés de una vez:
 *
 *     revalidateTag(ETIQUETA_CONTENIDO_PUBLICO);
 *     revalidatePath("/");
 */
export const ETIQUETA_CONTENIDO_PUBLICO = "lafinca-contenido-publico";

/** Debe coincidir con el `export const revalidate` de las páginas públicas. */
export const SEGUNDOS_REVALIDACION = 3600;

export function crearClientePublico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !claveAnon) {
    throw new Error(
      "Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(url, claveAnon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // supabase-js delega en `fetch`; aquí se le añaden las opciones de caché
      // de Next sin tocar nada más de la petición.
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: {
            tags: [ETIQUETA_CONTENIDO_PUBLICO],
            revalidate: SEGUNDOS_REVALIDACION,
          },
        }),
    },
  });
}
