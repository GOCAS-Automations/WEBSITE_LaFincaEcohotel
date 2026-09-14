"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { IconoInstagram } from "./iconos";
import { CLASE_FOTO_CON_FLAG } from "@/lib/fotos";

/**
 * El reel de Instagram de la portada, con CARGA BAJO DEMANDA.
 *
 * ===========================================================================
 * LA REGLA: CERO PETICIONES A META ANTES DEL CLIC
 * ===========================================================================
 * Al cargar la portada no se hace ni una petición a `instagram.com`. Lo que se
 * pinta es una FACHADA: una fotografía del bucket propio —peso conocido,
 * servida desde nuestro dominio— con un botón de reproducir encima. El
 * `<iframe>` del embebido se inserta en el árbol la primera vez que alguien lo
 * pulsa, y no antes.
 *
 * Se puede comprobar con el panel de red: abrir la portada y filtrar por
 * «instagram». Debe salir vacío. Si algún día aparece algo, es que alguien sacó
 * el iframe de detrás del `if`.
 *
 * POR QUÉ EL CLIC Y NO UN `IntersectionObserver`
 * ----------------------------------------------
 * Arrancarlo al entrar en pantalla también evitaría el coste de la primera
 * carga, pero lo pagaría igual todo el que se limita a pasar de largo —que en
 * la portada es casi todo el mundo— y además insertaría el iframe DESPUÉS del
 * primer pintado, con el cambio de composición que eso trae. Aquí el marco
 * tiene su proporción fija desde el primer momento y el embebido cae dentro sin
 * mover un píxel de la página: el desplazamiento de diseño acumulado es cero,
 * antes y después de pulsar.
 *
 * POR QUÉ UN `<iframe>` Y NO `embed.js`
 * -------------------------------------
 * El embebido «oficial» es un `<blockquote>` más el script `embed.js` de
 * Instagram, que a su vez inyecta este mismo iframe. El script añade una
 * dependencia de terceros que se ejecuta en NUESTRO dominio para acabar
 * haciendo lo que se puede hacer en una línea de HTML. La dirección
 * `.../embed/` está documentada y devuelve 200 sin `X-Frame-Options` ni
 * `frame-ancestors` (verificado en esta ronda), así que se puede embeber
 * directamente.
 *
 * Y SI ALGÚN DÍA META LO BLOQUEA
 * ------------------------------
 * Un iframe de otro origen no se puede inspeccionar desde aquí: si Instagram
 * empezara a rechazar el embebido, la caja se quedaría en blanco sin avisar.
 * Por eso hay dos redes:
 *
 *   · un temporizador: si el iframe no dispara `load` en ocho segundos, se
 *     vuelve a la fachada con un aviso y el enlace a la publicación;
 *   · el enlace «Ver el reel en Instagram», que está SIEMPRE debajo del marco,
 *     se haya pulsado o no. Nunca se depende de que el embebido funcione.
 */

/** Margen antes de dar por muerto el embebido. */
const ESPERA_MS = 8000;

/**
 * Permalink → dirección del embebido.
 *
 * Acepta cualquier forma del enlace que copie alguien del hotel desde la app
 * (`/reel/…`, `/p/…`, `/tv/…`, con o sin `?hl=es`, con o sin barra final) y
 * devuelve la dirección del iframe. Si lo pegado no es una dirección de
 * Instagram, devuelve `null` y la sección se pinta sin reel: un campo mal
 * escrito en el panel no puede dejar un iframe apuntando a cualquier sitio.
 */
export function direccionEmbebido(permalink: string): string | null {
  let url: URL;
  try {
    url = new URL(permalink.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!/(^|\.)instagram\.com$/.test(url.hostname)) return null;

  const camino = url.pathname.replace(/\/+$/, "");
  if (!/^\/(reel|reels|p|tv)\/[A-Za-z0-9_-]+$/.test(camino)) return null;

  /* Se descartan los parámetros del enlace original (`?hl=es`, `?igsh=…`): son
     de la app, no del embebido, y el `igsh` es un identificador de quien
     comparte que no tiene por qué viajar. */
  return `https://www.instagram.com${camino}/embed/`;
}

type Props = {
  /** Permalink de la publicación (`home.instagram.reel_url`). */
  permalink: string;
  /** Fotografía del bucket propio que hace de portada. */
  poster: string;
  posterAlt: string;
};

export function ReelInstagram({ permalink, poster, posterAlt }: Props) {
  const [activo, setActivo] = useState(false);
  const [fallo, setFallo] = useState(false);
  const cargado = useRef(false);

  useEffect(() => {
    if (!activo) return;
    cargado.current = false;
    const reloj = window.setTimeout(() => {
      if (!cargado.current) {
        setActivo(false);
        setFallo(true);
      }
    }, ESPERA_MS);
    return () => window.clearTimeout(reloj);
  }, [activo]);

  const embebido = direccionEmbebido(permalink);
  if (!embebido) return null;

  return (
    <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-4">
      {/*
        EL MARCO TIENE SU PROPORCIÓN DESDE EL PRIMER PINTADO.
        `aspect-[88/165]` es la altura que ocupa la tarjeta del embebido a este
        ancho —cabecera, video a 4:5 y la fila de acciones—, medida en Chrome.
        Fijarla de antemano es lo que hace que al pulsar no se mueva nada: el
        iframe cae exactamente en el hueco que ya ocupaba la fotografía.

        La curva grande abre ARRIBA A LA IZQUIERDA. En la esquina superior
        derecha no se toca nada: es donde todas las fotos del hotel llevan
        impreso el sello de marca (ver `ZONA_FLAG` en `src/lib/fotos.ts`).
      */}
      <div className="relative aspect-[88/165] w-full overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[4rem] bg-bosque-900 shadow-[var(--shadow-elevada)] ring-1 ring-crema-200/60">
        {activo ? (
          <iframe
            src={embebido}
            title="Reel de La Finca Eco Hotel en Instagram"
            loading="lazy"
            scrolling="no"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              cargado.current = true;
            }}
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <>
            <Image
              src={poster}
              alt={posterAlt}
              fill
              /* Está al final de la portada: nunca compite por el ancho de
                 banda del primer pintado. */
              sizes="352px"
              quality={75}
              fetchPriority="low"
              /* `object-right-top` y no el centro: el marco es mucho más alto
                 que ancho y recorta por los lados, y el sello de marca del
                 hotel vive justo en la esquina superior derecha de todas las
                 fotos. Anclado ahí se ve entero; centrado, quedaba partido por
                 el borde (ver `CLASE_FOTO_CON_FLAG` en `src/lib/fotos.ts`). */
              className={CLASE_FOTO_CON_FLAG}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-bosque-950/85 via-bosque-950/25 to-bosque-950/10"
            />

            {/* EL BOTÓN ES LA TARJETA ENTERA, no un icono flotante: se pulsa
                donde se mira. Y es un `<button>` de verdad, así que el teclado
                y el lector de pantalla funcionan sin añadir nada. */}
            <button
              type="button"
              onClick={() => {
                setFallo(false);
                setActivo(true);
              }}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center outline-none ring-inset ring-brote-200 focus-visible:ring-2"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-inset ring-white/35 backdrop-blur-md transition duration-300 group-hover:scale-105 group-hover:bg-white/25 group-active:scale-95">
                {/* Triángulo ópticamente centrado: desplazado 2 px a la
                    derecha, que es donde se ve en el medio. */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                  className="ml-[2px] size-7"
                >
                  <path d="M8 5.2c0-.9 1-1.5 1.8-1l9 6.8c.7.5.7 1.5 0 2l-9 6.8c-.8.5-1.8-.1-1.8-1V5.2Z" />
                </svg>
              </span>
              <span className="text-[0.95rem] font-semibold text-white">
                Ver el reel
              </span>
              {/* La promesa explícita. Es cortesía con quien navega con datos
                  móviles y, de paso, la razón por la que la portada sigue
                  siendo rápida. */}
              <span className="text-xs leading-relaxed text-crema-100/75">
                {fallo
                  ? "Instagram no cargó el video aquí. Ábrelo en su perfil."
                  : "No se carga nada de Instagram hasta que lo toques."}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Siempre visible, se haya pulsado o no: si el embebido falla, esta es
          la salida; y si funciona, es igualmente la forma de darle «me gusta». */}
      <a
        href={permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-petroleo-700 underline-offset-4 transition-colors duration-200 hover:text-petroleo-800 hover:underline"
      >
        <IconoInstagram className="size-4" />
        Ver el reel en Instagram
      </a>
    </div>
  );
}
