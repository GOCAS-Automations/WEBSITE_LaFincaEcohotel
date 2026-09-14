"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * El botón «Leer más» de una reseña y la ventana que abre.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES UN `<details>`
 * ---------------------------------------------------------------------------
 * La versión anterior plegaba el texto con un `<details>` nativo, sin una línea
 * de JavaScript. Era elegante y tenía dos problemas que Cesar vio enseguida:
 *
 *   1. **Descuadraba la rejilla.** Al abrir una reseña la tarjeta crecía y
 *      empujaba a las de su fila; con tarjetas de altos distintos, el bloque
 *      entero se leía como un mosaico desordenado.
 *   2. **No estaba en todas.** Solo aparecía en las reseñas de más de 300
 *      caracteres, así que unas tarjetas tenían botón y otras no.
 *
 * Ahora la tarjeta NUNCA cambia de alto: el texto se recorta siempre al mismo
 * número de líneas y el botón —que está en todas— abre la reseña completa en
 * una ventana.
 *
 * ---------------------------------------------------------------------------
 * ACCESIBILIDAD
 * ---------------------------------------------------------------------------
 * Es un `<dialog>` abierto con `showModal()`, no un `<div>` con `role="dialog"`.
 * El elemento nativo trae de fábrica lo que en una imitación hay que escribir a
 * mano y casi nunca se escribe bien: el foco queda ATRAPADO dentro mientras
 * está abierto, el resto de la página queda inerte para el lector de pantalla,
 * la tecla Escape cierra, y al cerrar el foco VUELVE al botón que lo abrió.
 *
 * Lo único que hay que poner a mano es `aria-labelledby` (quién escribió la
 * reseña, que es el título de la ventana) y el cierre al pulsar fuera —que el
 * `<dialog>` no hace solo—.
 *
 * Si el navegador no soporta `showModal()` (o el JavaScript no ha llegado
 * todavía), el botón no se pinta: en su lugar queda el enlace a la ficha de
 * Google que la propia sección ya publica. Nunca se muestra un control muerto.
 */
export function LectorResena({
  autor,
  texto,
  meta,
  claro = false,
}: {
  autor: string;
  texto: string;
  /** Línea de contexto bajo el nombre: estrellas y fecha, ya formateadas. */
  meta?: string;
  claro?: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [disponible, setDisponible] = useState(false);
  const idTitulo = useId();

  /* `showModal` no existe en jsdom ni en navegadores antiguos. Se comprueba
     después del montaje para que el HTML del servidor y el del cliente
     coincidan en la primera pintada. */
  useEffect(() => {
    setDisponible(typeof HTMLDialogElement !== "undefined");
  }, []);

  const abrir = useCallback(() => dialogo.current?.showModal(), []);
  const cerrar = useCallback(() => dialogo.current?.close(), []);

  /* Clic en el fondo oscuro: el `<dialog>` recibe el evento cuando se pulsa el
     ::backdrop, así que basta comprobar que el objetivo es el diálogo mismo y
     no algo de dentro. */
  const clicFuera = useCallback((evento: React.MouseEvent<HTMLDialogElement>) => {
    if (evento.target === dialogo.current) dialogo.current?.close();
  }, []);

  if (!disponible) return null;

  const enlace = claro
    ? "text-brote-200 hover:text-white"
    : "text-petroleo-700 hover:text-petroleo-900";

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`mt-4 self-start font-titulo text-sm font-semibold underline-offset-4 transition-colors duration-200 hover:underline ${enlace}`}
      >
        Leer más
        <span className="sr-only"> la reseña de {autor}</span>
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        onClick={clicFuera}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-[var(--radius-generoso)] bg-white p-0 text-crema-800 shadow-[var(--shadow-elevada)] backdrop:bg-petroleo-950/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[80vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-crema-200 px-6 py-5">
            <div className="min-w-0">
              <h2
                id={idTitulo}
                className="font-titulo text-lg font-bold text-petroleo-900"
              >
                {autor}
              </h2>
              {meta ? (
                <p className="mt-1 text-xs text-crema-600">{meta}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={cerrar}
              className="-mt-1 -mr-2 shrink-0 rounded-full p-2 text-crema-600 transition-colors duration-200 hover:bg-crema-100 hover:text-petroleo-900"
            >
              <span className="sr-only">Cerrar</span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="size-5"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="overflow-y-auto px-6 py-5">
            <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line">
              {texto}
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
