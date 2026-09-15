/**
 * El `srcset` de cada foto del bucket.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO EXISTE
 * ---------------------------------------------------------------------------
 * Decisión de Cesar (2026-09-14): el sitio se publica **sin transformaciones de
 * imagen** (`images.unoptimized` encendido por defecto en `next.config.ts`).
 * Ver ahí el porqué: la cuota de Vercel, cuando se agota, no degrada —devuelve
 * un error y la portada se queda con los huecos vacíos—.
 *
 * El precio es que `next/image` deja de generar `srcset` y cada foto se
 * descarga a su tamaño completo, mida lo que mida el hueco donde se pinta. Así
 * que el `srcset` lo generamos nosotros: `npm run imagenes:variantes` crea las
 * variantes reales en el bucket (`v/…`) y este módulo construye la cadena.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO SE GUARDAN LAS URL EN EL MANIFIESTO
 * ---------------------------------------------------------------------------
 * Porque las variantes siguen un patrón fijo:
 *
 *     …/imagenes/web/cabana-01/01.webp  →  …/imagenes/v/web/cabana-01/01-640.webp
 *
 * Guardar las 302 URL completas serían ~80 kB de JSON viajando al navegador
 * —la galería es un componente de cliente— para construir cadenas que se
 * derivan con dos `replace`. El manifiesto guarda solo lo que no se puede
 * deducir: el tamaño del original y qué peldaños existen de verdad. Son 8 kB.
 */

import variantes from "./variantes.json";

/** Lo que el manifiesto sabe de una foto. */
type EntradaVariantes = {
  /** Ancho del archivo original, en píxeles. */
  w: number;
  /** Alto del archivo original. */
  h: number;
  /** Anchos de las variantes WebP que EXISTEN en el bucket, de menor a mayor. */
  v: number[];
  /**
   * Anchos de las variantes AVIF, si esta foto las tiene.
   *
   * Solo los heros. Ver `scripts/generar-variantes.mjs`: son las imágenes del
   * primer visor —las que deciden el LCP— y el AVIF les quita casi la mitad del
   * peso. Para las fotos de cabaña, que se descargan cuando el visitante ya
   * está leyendo, no compensa doblar los objetos del bucket.
   */
  a?: number[];
};

const MANIFIESTO = variantes as Record<string, EntradaVariantes>;

/** Carpeta donde `generar-variantes.mjs` sube los peldaños. */
const PREFIJO_VARIANTES = "v/";

/**
 * Parte una URL pública del bucket en `[base, ruta]`.
 *
 * Devuelve `null` para cualquier cosa que no sea una foto de nuestro bucket:
 * una URL externa pegada desde el panel, el avatar de una reseña de Google o un
 * archivo de `/public`. Esas se sirven tal cual, sin `srcset`, que es lo
 * correcto: no tenemos variantes suyas y no vamos a inventarlas.
 */
function partir(url: string): { base: string; ruta: string } | null {
  const marca = "/storage/v1/object/public/imagenes/";
  const corte = url.indexOf(marca);
  if (corte === -1) return null;
  return {
    base: url.slice(0, corte + marca.length),
    ruta: url.slice(corte + marca.length),
  };
}

/**
 * La URL de la variante de `ancho` píxeles de esa ruta del bucket.
 *
 * La ruta de origen se conserva ENTERA bajo `v/`. Recortarle el `web/` dejaba
 * `experiencias/…` y `web/experiencias/…` apuntando a la misma variante, y la
 * limpieza del bucket —que hace el camino inverso— ya no sabía de cuál venía.
 */
function urlDeVariante(
  base: string,
  ruta: string,
  ancho: number,
  extension: "webp" | "avif" = "webp",
): string {
  return `${base}${PREFIJO_VARIANTES}${ruta.replace(/\.webp$/, "")}-${ancho}.${extension}`;
}

export type DatosFoto = {
  /** El `srcset` WebP, o `null` si no hay variantes. */
  srcSet: string | null;
  /** El `srcset` AVIF, o `null` si esta foto no tiene variantes AVIF. */
  srcSetAvif: string | null;
  /** Ancho del archivo original, si se conoce. */
  ancho: number | null;
  /** Alto del archivo original, si se conoce. */
  alto: number | null;
};

const VACIO: DatosFoto = {
  srcSet: null,
  srcSetAvif: null,
  ancho: null,
  alto: null,
};

/**
 * Los `srcset` de una foto del bucket.
 *
 * En WebP el último descriptor es **el archivo original**, que cierra la
 * escalera: si el navegador necesita más ancho que el peldaño más alto, se
 * lleva el original en vez de estirar una variante pequeña. En AVIF no hay
 * original en el bucket, así que el generador crea también el peldaño de ancho
 * completo y aquí basta con enumerar los que existen.
 */
export function datosDeFoto(url: string): DatosFoto {
  const partes = partir(url);
  if (!partes) return VACIO;

  const entrada = MANIFIESTO[partes.ruta];
  if (!entrada) return VACIO;

  const peldanos = entrada.v.map(
    (ancho) => `${urlDeVariante(partes.base, partes.ruta, ancho)} ${ancho}w`,
  );
  peldanos.push(`${url} ${entrada.w}w`);

  const avif = (entrada.a ?? []).map(
    (ancho) =>
      `${urlDeVariante(partes.base, partes.ruta, ancho, "avif")} ${ancho}w`,
  );

  return {
    srcSet: peldanos.length > 1 ? peldanos.join(", ") : null,
    srcSetAvif: avif.length ? avif.join(", ") : null,
    ancho: entrada.w,
    alto: entrada.h,
  };
}

/**
 * Cuánto pesaría la variante más pequeña. Solo para pruebas y diagnóstico.
 *
 * (El manifiesto no guarda bytes: cabe en 8 kB precisamente por eso.)
 */
export function tieneVariantes(url: string): boolean {
  const partes = partir(url);
  return Boolean(partes && MANIFIESTO[partes.ruta]?.v.length);
}
