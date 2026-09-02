"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegación del panel: barra lateral en escritorio y fila de pestañas
 * desplazable en el celular (el cliente lo va a usar sobre todo desde el
 * teléfono, atendiendo el WhatsApp).
 *
 * El orden no es casual: Reservas va primero porque es lo que se abre todos los
 * días; el contenido del sitio, al final, porque se toca de vez en cuando.
 */

export type ElementoNav = {
  href: string;
  etiqueta: string;
  icono:
    | "inicio"
    | "calendario"
    | "candado"
    | "cabana"
    | "capas"
    | "brujula"
    | "regalo"
    | "texto";
};

export const NAV_PANEL: ElementoNav[] = [
  { href: "/admin", etiqueta: "Resumen", icono: "inicio" },
  { href: "/admin/reservas", etiqueta: "Reservas", icono: "calendario" },
  { href: "/admin/bloqueos", etiqueta: "Bloqueos", icono: "candado" },
  { href: "/admin/alojamientos", etiqueta: "Cabañas", icono: "cabana" },
  { href: "/admin/planes", etiqueta: "Planes", icono: "capas" },
  { href: "/admin/experiencias", etiqueta: "Experiencias", icono: "brujula" },
  { href: "/admin/adicionales", etiqueta: "Adicionales", icono: "regalo" },
  { href: "/admin/contenido", etiqueta: "Contenido del sitio", icono: "texto" },
];

const TRAZOS: Record<ElementoNav["icono"], string> = {
  inicio: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-8.5Z",
  calendario:
    "M4 8h16M7 4v3m10-3v3M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z",
  candado:
    "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z",
  cabana: "M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5",
  capas:
    "M12 3 21 8 12 13 3 8 12 3ZM3.5 12 12 16.5 20.5 12M3.5 16 12 20.5 20.5 16",
  brujula:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.8-11.8-1.6 4.6-4.6 1.6 1.6-4.6 4.6-1.6Z",
  regalo:
    "M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Zm-1-4h18v4H3V7Zm9 0v13M12 7S10.5 3 8.5 3a2 2 0 0 0 0 4H12Zm0 0s1.5-4 3.5-4a2 2 0 0 1 0 4H12Z",
  texto: "M5 6h14M5 11h14M5 16h9",
};

function estaActivo(ruta: string, href: string): boolean {
  if (href === "/admin") return ruta === "/admin";
  return ruta === href || ruta.startsWith(`${href}/`);
}

function Icono({ icono }: { icono: ElementoNav["icono"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.125rem] w-[1.125rem] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={TRAZOS[icono]} />
    </svg>
  );
}

export function NavPanel() {
  const ruta = usePathname();

  return (
    <>
      {/* Escritorio: barra lateral */}
      <nav aria-label="Secciones del panel" className="hidden lg:block">
        <ul className="space-y-1">
          {NAV_PANEL.map((item) => {
            const activo = estaActivo(ruta, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-suave px-3.5 py-2.5 text-[0.9375rem] font-medium transition-colors duration-200 ${
                    activo
                      ? "bg-petroleo-600 text-white shadow-tenue"
                      : "text-crema-700 hover:bg-crema-900/[0.05] hover:text-crema-900"
                  }`}
                >
                  <Icono icono={item.icono} />
                  {item.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Celular y tableta: pestañas horizontales */}
      <nav
        aria-label="Secciones del panel"
        className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden"
      >
        <ul className="flex w-max gap-2 pb-1">
          {NAV_PANEL.map((item) => {
            const activo = estaActivo(ruta, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[0.875rem] font-semibold transition-colors duration-200 ${
                    activo
                      ? "bg-petroleo-600 text-white shadow-tenue"
                      : "bg-crema-900/[0.06] text-crema-700"
                  }`}
                >
                  <Icono icono={item.icono} />
                  {item.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
