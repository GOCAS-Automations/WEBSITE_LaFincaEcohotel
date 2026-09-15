"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { EnlaceNav } from "@/lib/sitio";

/**
 * Menú de escritorio dentro de la cápsula flotante.
 *
 * Es cliente solo por `usePathname()`: marcar en qué sección está el visitante
 * es información de navegación, no decoración, y `aria-current="page"` es lo
 * que la anuncia a un lector de pantalla.
 *
 * ---------------------------------------------------------------------------
 * PÍLDORA, NO SUBRAYADO
 * ---------------------------------------------------------------------------
 * Antes el enlace activo llevaba un subrayado dorado. Dos motivos para
 * cambiarlo: el dorado no está en la paleta oficial (ver `globals.css`), y una
 * raya de 2 px pegada al borde inferior de una cápsula redondeada se sale del
 * radio y se ve como un error de maquetación.
 *
 * La píldora —un fondo claro translúcido detrás del enlace activo— es además
 * la convención de las barras flotantes de iOS y no depende del color:
 * funciona igual sobre foto oscura que sobre foto clara, porque el fondo de la
 * cápsula ya garantiza el contraste.
 *
 * El `hover` no mueve nada: solo sube la opacidad del texto y enciende un
 * fondo del 10 %. En una barra de siete enlaces, cualquier desplazamiento al
 * pasar el ratón se siente como un tic nervioso.
 */
export function NavEscritorio({ enlaces }: { enlaces: readonly EnlaceNav[] }) {
  const ruta = usePathname();

  return (
    <nav aria-label="Navegación principal" className="hidden lg:block">
      <ul className="flex items-center gap-0.5">
        {enlaces.map((enlace) => {
          const activo =
            ruta === enlace.href || ruta.startsWith(`${enlace.href}/`);
          return (
            <li key={enlace.href}>
              <Link
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center rounded-full px-3.5 py-2 font-titulo text-[0.9rem] font-medium transition-colors duration-200",
                  activo
                    ? "bg-white/15 text-white"
                    : "text-brote-100/80 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {enlace.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
