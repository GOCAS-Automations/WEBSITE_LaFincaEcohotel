"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { clasesBoton } from "@/components/ui/boton";
import type { EnlaceNav } from "@/lib/sitio";

/**
 * Menú de navegación en móvil.
 *
 * Es lo único del encabezado que necesita ser cliente: abrir un panel, cerrarlo
 * al cambiar de página y atrapar el foco mientras está abierto. El resto del
 * header (logo, menú de escritorio, CTA) se renderiza en el servidor.
 *
 * Detalles que importan:
 * · Se cierra solo al navegar (`usePathname`): en un panel a pantalla completa,
 *   quedarse abierto sobre la página nueva se siente como un fallo.
 * · Escape cierra; el foco queda atrapado dentro del panel mientras está abierto.
 * · Bloquea el desplazamiento del fondo y lo restaura al cerrar.
 */

type PropsMenu = {
  enlaces: readonly EnlaceNav[];
  ctaTexto: string;
  ctaHref: string;
};

export function MenuMovil({ enlaces, ctaTexto, ctaHref }: PropsMenu) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);

  // Cerrar al cambiar de página.
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  useEffect(() => {
    if (!abierto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setAbierto(false);
        disparadorRef.current?.focus();
        return;
      }
      if (evento.key !== "Tab") return;

      const enfocables = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
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
    const foco = window.setTimeout(
      () => panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus(),
      120,
    );

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = anterior;
      window.clearTimeout(foco);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={disparadorRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-expanded={abierto}
        aria-label="Abrir el menú de navegación"
        className="flex size-11 items-center justify-center rounded-full text-petroleo-900 transition-colors duration-200 hover:bg-petroleo-50 lg:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {abierto ? (
        <div
          className="fixed inset-0 z-100 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <button
            type="button"
            aria-label="Cerrar el menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-crema-950/40 backdrop-blur-sm"
          />

          <div
            ref={panelRef}
            className="absolute inset-x-0 top-0 rounded-b-[var(--radius-generoso)] bg-crema-50 pt-5 pb-8 shadow-[var(--shadow-elevada)]"
          >
            <div className="contenedor flex items-center justify-between">
              <p className="font-titulo text-sm font-semibold tracking-[0.16em] text-dorado-600 uppercase">
                Menú
              </p>
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  disparadorRef.current?.focus();
                }}
                aria-label="Cerrar el menú"
                className="flex size-11 items-center justify-center rounded-full text-petroleo-900 transition-colors duration-200 hover:bg-petroleo-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="contenedor mt-4">
              <ul className="flex flex-col">
                {enlaces.map((enlace) => {
                  const activo =
                    ruta === enlace.href || ruta.startsWith(`${enlace.href}/`);
                  return (
                    <li key={enlace.href}>
                      <Link
                        href={enlace.href}
                        aria-current={activo ? "page" : undefined}
                        className={[
                          "block border-b border-crema-200/80 py-4 font-titulo text-lg font-medium transition-colors duration-200",
                          activo
                            ? "text-petroleo-600"
                            : "text-petroleo-900 hover:text-petroleo-600",
                        ].join(" ")}
                      >
                        {enlace.etiqueta}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <Link
                href={ctaHref}
                className={clasesBoton("primario", "grande", "mt-6 w-full")}
              >
                {ctaTexto}
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
