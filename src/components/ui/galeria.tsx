"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { ImagenGaleria } from "@/lib/contenido";

/**
 * Galería con visor a pantalla completa.
 *
 * ACCESIBILIDAD — lo que se resolvió y por qué
 * --------------------------------------------
 * · Cada miniatura es un `<button>` real, no un `div` con `onClick`: se enfoca
 *   con tabulador y se activa con Intro o barra espaciadora sin código extra.
 * · El visor es un `role="dialog" aria-modal`, con el foco movido al botón de
 *   cerrar al abrir y DEVUELTO a la miniatura de origen al cerrar. Perder el
 *   punto de retorno es el error más común de un lightbox.
 * · El tabulador queda atrapado dentro del visor mientras está abierto: si se
 *   escapa, el visitante navega a ciegas por la página de atrás.
 * · Teclas: Escape cierra, ← y → cambian de foto.
 * · El fondo se bloquea con `overflow: hidden` en `<body>` y se restaura al
 *   cerrar, incluso si el componente se desmonta con el visor abierto.
 */

type Disposicion = "mosaico" | "ficha";

type PropsGaleria = {
  imagenes: ImagenGaleria[];
  /**
   * `mosaico`: cuadrícula uniforme (página de galería).
   * `ficha`: una foto grande y hasta cuatro secundarias (ficha de cabaña).
   */
  disposicion?: Disposicion;
  /** Se antepone al texto alternativo del visor para dar contexto. */
  titulo?: string;
  /** `priority` en la primera imagen: solo cuando la galería abre la página. */
  prioridad?: boolean;
};

export function Galeria({
  imagenes,
  disposicion = "mosaico",
  titulo,
  prioridad = false,
}: PropsGaleria) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const disparadores = useRef<(HTMLButtonElement | null)[]>([]);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const idTitulo = useId();

  const total = imagenes.length;

  const cerrar = useCallback(() => {
    setAbierta((indice) => {
      if (indice !== null) {
        // Devolver el foco a la miniatura desde la que se abrió.
        window.setTimeout(() => disparadores.current[indice]?.focus(), 0);
      }
      return null;
    });
  }, []);

  const mover = useCallback(
    (paso: number) => {
      setAbierta((indice) =>
        indice === null ? null : (indice + paso + total) % total,
      );
    },
    [total],
  );

  useEffect(() => {
    if (abierta === null) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }
      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        mover(1);
        return;
      }
      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        mover(-1);
        return;
      }
      if (evento.key !== "Tab") return;

      // Trampa de foco dentro del visor.
      const enfocables = dialogoRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!enfocables || enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alPulsar);
    const foco = window.setTimeout(() => cerrarRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = anterior;
      window.clearTimeout(foco);
    };
  }, [abierta, cerrar, mover]);

  if (total === 0) return null;

  const actual = abierta === null ? null : imagenes[abierta];

  return (
    <>
      {disposicion === "ficha" ? (
        <MosaicoFicha
          imagenes={imagenes}
          prioridad={prioridad}
          alAbrir={setAbierta}
          registrar={(indice, elemento) => {
            disparadores.current[indice] = elemento;
          }}
        />
      ) : (
        <MosaicoUniforme
          imagenes={imagenes}
          prioridad={prioridad}
          alAbrir={setAbierta}
          registrar={(indice, elemento) => {
            disparadores.current[indice] = elemento;
          }}
        />
      )}

      {actual ? (
        <div
          ref={dialogoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitulo}
          className="fixed inset-0 z-100 flex flex-col bg-crema-950/95 backdrop-blur-sm"
        >
          <p id={idTitulo} className="sr-only">
            {titulo ? `Galería de ${titulo}. ` : "Galería. "}
            Imagen {(abierta ?? 0) + 1} de {total}. Usa las flechas del teclado
            para cambiar de foto y la tecla Escape para cerrar.
          </p>

          <div className="flex items-center justify-between px-5 py-4 text-crema-100 sm:px-8">
            <span className="font-titulo text-sm tabular-nums">
              {(abierta ?? 0) + 1} / {total}
            </span>
            <button
              ref={cerrarRef}
              type="button"
              onClick={cerrar}
              className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-white/20"
              aria-label="Cerrar la galería"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 sm:px-16">
            <Image
              key={actual.url}
              src={actual.url}
              alt={actual.alt}
              width={1600}
              height={1200}
              quality={90}
              sizes="100vw"
              className="max-h-full w-auto max-w-full rounded-[var(--radius-tarjeta)] object-contain"
            />

            {total > 1 ? (
              <>
                <BotonPaso direccion="anterior" alPulsar={() => mover(-1)} />
                <BotonPaso direccion="siguiente" alPulsar={() => mover(1)} />
              </>
            ) : null}
          </div>

          <p className="px-6 pb-6 text-center text-sm text-crema-200/90">
            {actual.alt}
          </p>
        </div>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------------- */

type PropsMosaico = {
  imagenes: ImagenGaleria[];
  prioridad: boolean;
  alAbrir: (indice: number) => void;
  registrar: (indice: number, elemento: HTMLButtonElement | null) => void;
};

const CLASES_MINIATURA =
  "group relative block w-full overflow-hidden rounded-[var(--radius-tarjeta)] bg-crema-200 " +
  "shadow-[var(--shadow-tenue)] transition-all duration-300 ease-out hover:shadow-[var(--shadow-tarjeta)]";

function MosaicoUniforme({
  imagenes,
  prioridad,
  alAbrir,
  registrar,
}: PropsMosaico) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {imagenes.map((imagen, indice) => (
        <li key={imagen.url}>
          <button
            type="button"
            ref={(elemento) => registrar(indice, elemento)}
            onClick={() => alAbrir(indice)}
            className={`${CLASES_MINIATURA} aspect-4/5`}
            aria-label={`Ampliar: ${imagen.alt}`}
          >
            <Image
              src={imagen.url}
              alt={imagen.alt}
              fill
              quality={68}
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              priority={prioridad && indice === 0}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

function MosaicoFicha({
  imagenes,
  prioridad,
  alAbrir,
  registrar,
}: PropsMosaico) {
  const [portada, ...resto] = imagenes;
  const secundarias = resto.slice(0, 4);
  const ocultas = imagenes.length - 1 - secundarias.length;

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
      <button
        type="button"
        ref={(elemento) => registrar(0, elemento)}
        onClick={() => alAbrir(0)}
        className={`${CLASES_MINIATURA} aspect-16/10 lg:col-span-3 lg:aspect-4/3`}
        aria-label={`Ampliar: ${portada.alt}`}
      >
        <Image
          src={portada.url}
          alt={portada.alt}
          fill
          quality={90}
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority={prioridad}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </button>

      {secundarias.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-2 lg:grid-cols-2">
          {secundarias.map((imagen, posicion) => {
            const indice = posicion + 1;
            const esUltima =
              ocultas > 0 && posicion === secundarias.length - 1;
            return (
              <li key={imagen.url}>
                <button
                  type="button"
                  ref={(elemento) => registrar(indice, elemento)}
                  onClick={() => alAbrir(indice)}
                  className={`${CLASES_MINIATURA} aspect-4/3 lg:aspect-3/2`}
                  aria-label={
                    esUltima
                      ? `Ver las ${imagenes.length} fotos de la galería`
                      : `Ampliar: ${imagen.alt}`
                  }
                >
                  <Image
                    src={imagen.url}
                    alt={imagen.alt}
                    fill
                    quality={68}
                    sizes="(min-width: 1024px) 20vw, 48vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  {esUltima ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-crema-950/55 font-titulo text-lg font-semibold text-white"
                    >
                      +{ocultas}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function BotonPaso({
  direccion,
  alPulsar,
}: {
  direccion: "anterior" | "siguiente";
  alPulsar: () => void;
}) {
  const esAnterior = direccion === "anterior";
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={esAnterior ? "Foto anterior" : "Foto siguiente"}
      className={[
        "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full",
        "bg-white/10 text-white transition-colors duration-200 hover:bg-white/25",
        esAnterior ? "left-2 sm:left-4" : "right-2 sm:right-4",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={esAnterior ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
