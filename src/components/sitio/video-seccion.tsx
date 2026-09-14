"use client";

import { useEffect, useRef } from "react";

/**
 * El video de una sección: arranca solo, pero **solo cuando se ve**.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES UN `<video autoplay>` A SECAS
 * ---------------------------------------------------------------------------
 * Lo fue, y costó 3,3 MB en la primera carga de la portada. `autoplay` GANA a
 * `preload="metadata"`: si el navegador puede reproducir, descarga, y le da
 * igual que el video esté siete pantallas más abajo. Lighthouse móvil cayó de
 * 96 a 82 y el LCP se fue a 4,5 s, todo por un clip que casi nadie llega a ver
 * sin desplazarse.
 *
 * Ahora el elemento nace con `preload="none"` y sin `autoplay`: no pide ni un
 * byte. Un `IntersectionObserver` lo arranca la primera vez que entra en
 * pantalla —silenciado y en bucle, como se pidió— y no vuelve a intervenir.
 *
 * ---------------------------------------------------------------------------
 * QUÉ PASA SIN JAVASCRIPT
 * ---------------------------------------------------------------------------
 * El `<video>` se pinta igual, con su póster y sus controles: quien no tenga
 * JavaScript ve la imagen y puede darle a reproducir. No se pierde nada; solo
 * el arranque automático, que es un adorno.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ LLEVA CONTROLES SI ARRANCA SILENCIADO
 * ---------------------------------------------------------------------------
 * Porque el clip de COP16 **tiene locución**: es la dueña del hotel contando el
 * reconocimiento, no un plano de ambiente. Sin un control para subir el
 * volumen, el visitante ve a alguien mover los labios durante dos minutos y
 * cincuenta segundos y no se entera de nada.
 */
export function VideoSeccion({
  src,
  poster,
  etiqueta,
  className,
}: {
  src: string;
  poster: string;
  /** Nombre accesible del reproductor. */
  etiqueta: string;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const elemento = video.current;
    if (!elemento) return;

    /* Con el movimiento reducido, el video NO arranca solo: quien pide menos
       movimiento no quiere un plano moviéndose al entrar en la sección. Los
       controles siguen ahí para verlo a voluntad. */
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          observador.disconnect();
          elemento.preload = "auto";
          /* `play()` devuelve una promesa que se rechaza si el navegador
             bloquea la reproducción (ahorro de datos, política del sistema).
             No es un error que haya que reportar: el póster se queda puesto y
             los controles siguen funcionando. */
          void elemento.play().catch(() => {});
        }
      },
      /* Un poco antes de que asome: así el primer fotograma ya está cuando el
         visitante llega, sin adelantar la descarga a la carga inicial. */
      { rootMargin: "200px 0px" },
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <video
      ref={video}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      controls
      preload="none"
      aria-label={etiqueta}
      className={className}
    />
  );
}
