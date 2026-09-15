import type { CSSProperties } from "react";

import { datosDeFoto } from "@/lib/imagenes/srcset";

/**
 * `<Foto>` — la imagen del sitio público.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES `next/image`
 * ---------------------------------------------------------------------------
 * Porque el sitio se publica con `images.unoptimized` encendido (decisión de
 * Cesar, ver `next.config.ts`), y en ese modo `next/image` **no genera
 * `srcset`**: escribe un `<img src>` con el archivo del bucket a tamaño
 * completo. El hero móvil de la portada eran 1,2 MB para un teléfono de 390 px.
 *
 * Así que el trabajo que hacía Vercel lo hacemos nosotros, una vez, en el
 * despliegue: `npm run imagenes:variantes` deja las variantes reales en el
 * bucket y este componente arma el `srcset`. El navegador elige el peldaño con
 * los `sizes` de cada uso, igual que siempre, y Vercel no transforma nada.
 *
 * ---------------------------------------------------------------------------
 * ES UN REEMPLAZO DIRECTO
 * ---------------------------------------------------------------------------
 * Acepta las mismas props que usaba el sitio con `next/image` —`src`, `alt`,
 * `fill`, `width`/`height`, `sizes`, `priority`, `loading`, `className`— y se
 * comporta igual:
 *
 * · `fill` reproduce lo que hace `next/image`: `position: absolute` cubriendo
 *   el contenedor, que tiene que ser `relative`. El encuadre (`object-cover`,
 *   `object-right-top`…) sigue viniendo por `className`, sin cambios.
 * · `priority` es `loading="eager"` + `fetchpriority="high"`, que es
 *   exactamente lo que emite `next/image`.
 * · Lo demás va perezoso y con `decoding="async"`.
 *
 * `quality` ya NO existe como prop: la calidad se decide al generar la
 * variante, no al pedirla. Dejarla habría sido una prop que no hace nada.
 *
 * ---------------------------------------------------------------------------
 * `fuentes`: DIRECCIÓN DE ARTE DE VERDAD
 * ---------------------------------------------------------------------------
 * La portada sirve una foto horizontal en escritorio y una vertical en el
 * teléfono. Antes eran dos `<img>` con `hidden`/`sm:block`, y eso tiene un
 * coste que no se ve en la maqueta: **Chrome descarga igualmente una imagen con
 * `display: none` si no es perezosa**, así que el escritorio se bajaba el hero
 * vertical de 1,2 MB sin pintarlo nunca.
 *
 * Con `fuentes` se emite un `<picture>` con `<source media="…">`: el navegador
 * evalúa las medias ANTES de pedir nada y descarga una sola. Es para lo que se
 * inventó `<picture>`.
 */

export type FuenteFoto = {
  /** Media query, p. ej. `"(max-width: 639px)"`. */
  media: string;
  /** URL del archivo del bucket para esa media. */
  src: string;
  /** `sizes` propio de esta fuente; si falta, hereda el del componente. */
  sizes?: string;
};

type PropsFoto = {
  src: string;
  /** Texto alternativo. Cadena vacía para una foto decorativa. */
  alt: string;
  /** Fuentes alternativas por media query (dirección de arte). */
  fuentes?: FuenteFoto[];
  /** Cubre el contenedor, que debe ser `position: relative`. */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  /** Carga inmediata y prioridad alta: solo para lo del primer visor. */
  priority?: boolean;
  loading?: "eager" | "lazy";
  /**
   * Prioridad de red explícita. `priority` ya pone `"high"`; esta prop existe
   * para lo contrario: bajar a `"low"` lo que está al final de la página y no
   * debe competir por el ancho de banda del primer pintado.
   */
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
  style?: CSSProperties;
};

/** Lo que `next/image` aplica con `fill`, escrito a mano. */
const CLASES_FILL = "absolute inset-0 h-full w-full";

export function Foto({
  src,
  alt,
  fuentes,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  loading,
  fetchPriority,
  className,
  style,
}: PropsFoto) {
  const datos = datosDeFoto(src);

  /*
    Con `fill` NO se ponen `width`/`height`: el hueco lo reserva el contenedor
    con su proporción, y unos atributos de tamaño sobre una imagen absoluta solo
    sirven para confundir. Sin `fill` sí, y si no llegan por prop se sacan del
    manifiesto: son los que evitan el salto de maquetación al cargar.
  */
  const anchoAtributo = fill ? undefined : (width ?? datos.ancho ?? undefined);
  const altoAtributo = fill
    ? undefined
    : (height ??
      (width && datos.ancho && datos.alto
        ? Math.round((datos.alto * width) / datos.ancho)
        : (datos.alto ?? undefined)));

  const imagen = (
    /* eslint-disable-next-line @next/next/no-img-element --
       La regla avisa de que un `<img>` suelto no se optimiza. Aquí es
       deliberado y está medido: el sitio se publica con `unoptimized`
       encendido, así que `next/image` tampoco optimizaría nada; lo único que
       haría es quitar el `srcset` que este componente sí pone. Ver la cabecera
       y `next.config.ts`. */
    <img
      src={src}
      srcSet={datos.srcSet ?? undefined}
      sizes={sizes}
      alt={alt}
      width={anchoAtributo}
      height={altoAtributo}
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={fetchPriority ?? (priority ? "high" : undefined)}
      decoding={priority ? "sync" : "async"}
      style={style}
      className={[fill ? CLASES_FILL : "", className]
        .filter(Boolean)
        .join(" ")}
    />
  );

  /*
    LA PREDESCARGA DE LO PRIORITARIO.

    Esto lo hacía `next/image` con `priority` y se perdió al dejar de usarlo:
    medido con Lighthouse móvil, el LCP de la portada subió de 2,7 s a 4,1 s.
    El motivo es que el navegador no descubre un `<img>` hasta que ha armado el
    árbol y ha resuelto el CSS; un `<link rel="preload">` en la cabecera lo pone
    en la cola en cuanto lee el HTML.

    Los `<link>` que React 19 encuentra dentro de un componente los **iza a la
    cabecera** solos, así que no hace falta tocar el layout. Van con el mismo
    `imagesrcset` / `imagesizes` que el `<img>`: si no coincidieran, el
    navegador descargaría DOS variantes de la misma foto en vez de una.
  */
  const predescarga = priority ? (
    <>
      {fuentes?.map((fuente) => {
        const suyos = datosDeFoto(fuente.src);
        return (
          <link
            key={`preload-${fuente.media}`}
            rel="preload"
            as="image"
            href={fuente.src}
            /* El `type` importa: con él, un navegador que no entienda AVIF se
               salta esta línea en vez de descargar algo que no puede pintar. */
            type={suyos.srcSetAvif ? "image/avif" : undefined}
            imageSrcSet={suyos.srcSetAvif ?? suyos.srcSet ?? undefined}
            imageSizes={fuente.sizes ?? sizes}
            media={fuente.media}
            fetchPriority="high"
          />
        );
      })}
      <link
        rel="preload"
        as="image"
        href={src}
        type={datos.srcSetAvif ? "image/avif" : undefined}
        imageSrcSet={datos.srcSetAvif ?? datos.srcSet ?? undefined}
        imageSizes={sizes}
        /* Con dirección de arte, esta es la fuente de «el resto de anchos»: se
           limita con la media contraria para no predescargar las dos. */
        media={mediaContraria(fuentes)}
        fetchPriority="high"
      />
    </>
  ) : null;

  /*
    EL `<picture>` SE MONTA SI HAY ALGO QUE ELEGIR: dirección de arte, AVIF o
    las dos. Sin nada de eso, un `<img>` suelto con su `srcset` basta y no se
    envuelve por envolver.

    ORDEN DE LAS FUENTES: el navegador se queda con la PRIMERA que le encaje,
    así que el AVIF va siempre antes que el WebP dentro de la misma media.
  */
  const hayAvif = Boolean(
    datos.srcSetAvif ?? fuentes?.some((f) => datosDeFoto(f.src).srcSetAvif),
  );
  if (!fuentes?.length && !hayAvif) {
    return (
      <>
        {predescarga}
        {imagen}
      </>
    );
  }

  return (
    <>
      {predescarga}
      <picture>
        {fuentes?.flatMap((fuente) => {
          const suyos = datosDeFoto(fuente.src);
          const tamanos = fuente.sizes ?? sizes;
          const lista = [];
          if (suyos.srcSetAvif) {
            lista.push(
              <source
                key={`avif-${fuente.media}`}
                media={fuente.media}
                srcSet={suyos.srcSetAvif}
                sizes={tamanos}
                type="image/avif"
              />,
            );
          }
          lista.push(
            <source
              key={`webp-${fuente.media}`}
              media={fuente.media}
              srcSet={suyos.srcSet ?? fuente.src}
              sizes={tamanos}
              type="image/webp"
            />,
          );
          return lista;
        })}
        {datos.srcSetAvif ? (
          <source
            srcSet={datos.srcSetAvif}
            sizes={sizes}
            type="image/avif"
            media={mediaContraria(fuentes)}
          />
        ) : null}
        {imagen}
      </picture>
    </>
  );
}

/**
 * La media que cubre lo que NO cubren las fuentes de dirección de arte.
 *
 * Solo se resuelve el caso que el sitio usa de verdad: una fuente móvil
 * `(max-width: Npx)` y la principal para el resto. Con cualquier otra forma se
 * devuelve `undefined`, que predescarga la principal siempre: descargar de más
 * es un fallo de rendimiento; descargar de menos, un hueco en blanco.
 */
function mediaContraria(fuentes?: FuenteFoto[]): string | undefined {
  if (!fuentes?.length) return undefined;
  const maximo = /^\(max-width:\s*(\d+)px\)$/.exec(fuentes[0].media);
  if (fuentes.length === 1 && maximo) {
    return `(min-width: ${Number(maximo[1]) + 1}px)`;
  }
  return undefined;
}
