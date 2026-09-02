import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Higiene del bucket `imagenes` de Supabase Storage.
 *
 * Cuando desde el panel se reemplaza una foto o se saca de una galería, el
 * archivo se queda ocupando espacio para siempre si nadie lo borra. Este módulo
 * es lo que llaman las Server Actions después de guardar:
 *
 *   1. Se calcula qué direcciones salieron (estaban antes, ya no están).
 *   2. Se descarta cualquiera que NO sea de nuestro bucket. Una URL externa
 *      que el cliente haya pegado jamás se toca.
 *   3. De las nuestras, se comprueba que ninguna OTRA fila de la base la siga
 *      usando (otra cabaña, un extra, cualquier rincón del jsonb de
 *      `contenido`) antes de borrarla.
 *   4. El borrado usa `service_role`. Es la ÚNICA excepción a la regla de que
 *      el panel nunca usa la clave de servicio, y está aquí porque conviene que
 *      la limpieza funcione igual aunque mañana se endurezca la política de
 *      DELETE de Storage.
 *
 * Es deliberadamente "best-effort": cuando se llama, el guardado en la base ya
 * ocurrió. Un fallo aquí (red, permisos, lo que sea) se registra en consola
 * pero NUNCA se propaga. Un archivo huérfano ocasional es mucho menos grave que
 * una edición legítima que falle por un problema de limpieza.
 */

const BUCKET = "imagenes";

/**
 * Convierte una URL pública del bucket en su ruta interna (la que espera
 * `storage.from("imagenes").remove([...])`).
 *
 * Devuelve `null` si la URL no viene de nuestro Storage: es la salvaguarda que
 * impide borrar una imagen alojada en otro servicio.
 */
export function rutaEnBucket(url: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return null;

  const prefijo = `${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefijo)) return null;

  const ruta = url.slice(prefijo.length);
  if (!ruta) return null;

  try {
    return decodeURIComponent(ruta);
  } catch {
    return ruta;
  }
}

/** Reúne todas las cadenas de un jsonb arbitrario, a cualquier profundidad. */
export function recogerCadenas(valor: unknown, dentro: Set<string>): void {
  if (typeof valor === "string") {
    if (valor) dentro.add(valor);
    return;
  }
  if (Array.isArray(valor)) {
    for (const item of valor) recogerCadenas(item, dentro);
    return;
  }
  if (valor && typeof valor === "object") {
    for (const item of Object.values(valor as Record<string, unknown>)) {
      recogerCadenas(item, dentro);
    }
  }
}

/** Atajo: las cadenas de un valor cualquiera, como arreglo. */
export function cadenasDe(valor: unknown): string[] {
  const juego = new Set<string>();
  recogerCadenas(valor, juego);
  return [...juego];
}

/** URLs de una galería `[{ url, alt }, …]`, sea cual sea su forma real. */
export function urlsDeGaleria(galeria: unknown): string[] {
  if (!Array.isArray(galeria)) return [];
  return galeria.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { url } = item as Record<string, unknown>;
    return typeof url === "string" && url ? [url] : [];
  });
}

/** Las que estaban antes y ya no están: candidatas a borrarse. */
export function urlsQueSalieron(antes: unknown, despues: unknown): string[] {
  const nuevas = new Set(urlsDeGaleria(despues));
  return urlsDeGaleria(antes).filter((url) => !nuevas.has(url));
}

/**
 * Todo lo que sigue referenciado en algún lugar de la base.
 *
 * Se consulta SIEMPRE después de que el guardado que disparó la limpieza ya se
 * aplicó, así que la fila recién editada refleja su valor nuevo (o ya no
 * existe): no hay que excluirla a mano.
 */
async function urlsReferenciadas(supabase: SupabaseClient): Promise<Set<string>> {
  const [imagenes, extras, contenido] = await Promise.all([
    supabase.from("imagenes").select("url"),
    supabase.from("extras").select("imagen_url"),
    supabase.from("contenido").select("valor"),
  ]);

  const primerError = imagenes.error ?? extras.error ?? contenido.error;
  if (primerError) {
    throw new Error(
      `no se pudieron consultar las referencias: ${primerError.message}`,
    );
  }

  const referenciadas = new Set<string>();

  for (const fila of imagenes.data ?? []) {
    const url = (fila as { url?: unknown }).url;
    if (typeof url === "string" && url) referenciadas.add(url);
  }
  for (const fila of extras.data ?? []) {
    const url = (fila as { imagen_url?: unknown }).imagen_url;
    if (typeof url === "string" && url) referenciadas.add(url);
  }
  for (const fila of contenido.data ?? []) {
    recogerCadenas((fila as { valor?: unknown }).valor, referenciadas);
  }

  return referenciadas;
}

/** ¿Está configurada la clave de servicio? Sin ella no se puede limpiar. */
function haySeviceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Borra del bucket las direcciones indicadas que sean nuestras y que ya no
 * estén referenciadas en ninguna fila. Nunca lanza.
 */
export async function limpiarImagenesHuerfanas(
  supabase: SupabaseClient,
  urls: string[],
): Promise<void> {
  const candidatas = urls
    .map((url) => ({ url, ruta: rutaEnBucket(url) }))
    .filter((item): item is { url: string; ruta: string } => item.ruta !== null);

  if (candidatas.length === 0) return;

  if (!haySeviceRole()) {
    console.warn(
      "[panel] Storage: falta SUPABASE_SERVICE_ROLE_KEY; no se limpió",
      candidatas.map((item) => item.ruta),
    );
    return;
  }

  try {
    const referenciadas = await urlsReferenciadas(supabase);
    const aBorrar = [
      ...new Set(
        candidatas
          .filter((item) => !referenciadas.has(item.url))
          .map((item) => item.ruta),
      ),
    ];

    if (aBorrar.length === 0) return;

    const admin = crearClienteAdmin();
    const { error } = await admin.storage.from(BUCKET).remove(aBorrar);

    if (error) {
      console.error(
        "[panel] Storage: error borrando huérfanas:",
        error.message,
        aBorrar,
      );
      return;
    }

    console.log("[panel] Storage: imágenes huérfanas borradas:", aBorrar);
  } catch (error) {
    console.error(
      "[panel] Storage: fallo inesperado limpiando huérfanas:",
      error instanceof Error ? error.message : error,
    );
  }
}
