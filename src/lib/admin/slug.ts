/**
 * Slugs para las direcciones públicas (`/alojamientos/[slug]`).
 *
 * Se usa en el servidor (validación) y en el navegador (el campo se completa
 * solo mientras se escribe el nombre), por eso no depende de nada de Node.
 */

/**
 * Rango "Combining Diacritical Marks" (U+0300–U+036F): los acentos que quedan
 * sueltos tras `normalize("NFD")`. Se escribe con escapes unicode para que el
 * patrón no dependa de la codificación del archivo.
 */
const MARCAS_COMBINANTES = /[̀-ͯ]/g;

/** "Cabaña 01 — Neblina" → "cabana-01-neblina". */
export function slugificar(valor: string): string {
  return valor
    .normalize("NFD")
    // La ñ se descompone en "n" + tilde combinante, así que también se resuelve
    // al quitar las marcas.
    .replace(MARCAS_COMBINANTES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function esSlugValido(valor: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor) && valor.length <= 80;
}
