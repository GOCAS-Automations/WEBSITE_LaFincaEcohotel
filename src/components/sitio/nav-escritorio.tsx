"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { EnlaceNav } from "@/lib/sitio";

/**
 * Menú de escritorio. Es cliente solo por `usePathname()`: marcar en qué
 * sección está el visitante es información de navegación, no decoración, y
 * `aria-current="page"` es lo que la anuncia a un lector de pantalla.
 *
 * El subrayado activo se dibuja con un pseudo-elemento propio en vez de con
 * `border-bottom` para que no empuje el texto ni un píxel al aparecer.
 */
export function NavEscritorio({ enlaces }: { enlaces: readonly EnlaceNav[] }) {
  const ruta = usePathname();

  return (
    <nav aria-label="Navegación principal" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {enlaces.map((enlace) => {
          const activo =
            ruta === enlace.href || ruta.startsWith(`${enlace.href}/`);
          return (
            <li key={enlace.href}>
              <Link
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={[
                  "relative rounded-full px-3.5 py-2 font-titulo text-[0.95rem] font-medium transition-colors duration-200",
                  "after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-dorado-600 after:transition-opacity after:duration-200",
                  activo
                    ? "text-petroleo-700 after:opacity-100"
                    : "text-crema-800 after:opacity-0 hover:text-petroleo-700 hover:after:opacity-40",
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
