import Link from "next/link";
import type { ReactNode } from "react";

import { IconoChevron } from "@/components/sitio/iconos";

/**
 * Las salidas de una página de error: una lista agrupada, como los ajustes del
 * iPhone. Cada fila es una zona táctil entera (icono, nombre, una línea que
 * dice qué hay detrás y la flecha), no un enlace de texto suelto.
 *
 * La usan la 404 y `error.tsx`, para que las dos se vean como lo que son: la
 * misma situación —«no llegaste a donde ibas»— con distinta causa.
 *
 * Sin `"use client"` y sin estado a propósito: la 404 es un Server Component y
 * `error.tsx` uno de cliente, y las dos la importan. Por eso las filas son
 * enlaces; un botón (como «Reintentar») va fuera de la lista.
 */
export type Camino = {
  etiqueta: string;
  detalle: string;
  href: string;
  icono: ReactNode;
  /** Abre en otra pestaña (WhatsApp). */
  externo?: boolean;
  /** Color del cuadrito del icono. Por defecto, el petróleo de la marca. */
  claseIcono?: string;
};

export function CaminosDeSalida({
  caminos,
  className,
}: {
  caminos: Camino[];
  className?: string;
}) {
  return (
    <nav aria-label="A dónde ir ahora" className={className}>
      <ul className="divide-y divide-crema-200/80 overflow-hidden rounded-[var(--radius-generoso)] bg-white text-left shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70">
        {caminos.map((camino) => {
          const contenido = (
            <>
              <span
                className={[
                  "grid size-10 shrink-0 place-items-center rounded-xl text-white",
                  camino.claseIcono ?? "bg-petroleo-700",
                ].join(" ")}
              >
                {camino.icono}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-titulo text-base font-bold text-petroleo-900">
                  {camino.etiqueta}
                </span>
                <span className="block text-sm leading-snug text-crema-700">
                  {camino.detalle}
                </span>
              </span>
              <IconoChevron className="size-5 shrink-0 -rotate-90 text-crema-500 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          );

          const clases =
            "group flex min-h-16 items-center gap-4 px-4 py-3 transition-colors duration-200 hover:bg-crema-50 focus-visible:bg-crema-50 focus-visible:-outline-offset-4 sm:px-5";

          return (
            <li key={camino.href}>
              {camino.externo ? (
                <a
                  href={camino.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clases}
                >
                  {contenido}
                </a>
              ) : (
                <Link href={camino.href} className={clases}>
                  {contenido}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
