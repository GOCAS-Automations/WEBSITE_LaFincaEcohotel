"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { RolPanel } from "@/lib/admin/roles";

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
    | "sol"
    | "brujula"
    | "regalo"
    | "personas"
    | "texto";
  /**
   * Solo la ve el propietario.
   *
   * Es una comodidad, NO la protección: quien escriba la dirección a mano se
   * topa con la página, que comprueba el rol antes de leer nada, y con las
   * Server Actions, que lo vuelven a comprobar. Ver
   * `src/app/admin/(panel)/usuarios/page.tsx`.
   */
  soloPropietario?: boolean;
};

export const NAV_PANEL: ElementoNav[] = [
  { href: "/admin", etiqueta: "Resumen", icono: "inicio" },
  { href: "/admin/reservas", etiqueta: "Reservas", icono: "calendario" },
  { href: "/admin/bloqueos", etiqueta: "Bloqueos", icono: "candado" },
  { href: "/admin/alojamientos", etiqueta: "Cabañas", icono: "cabana" },
  { href: "/admin/planes", etiqueta: "Planes", icono: "capas" },
  {
    href: "/admin/tarifas-diferenciales",
    etiqueta: "Tarifas diferenciales",
    icono: "sol",
  },
  { href: "/admin/experiencias", etiqueta: "Experiencias", icono: "brujula" },
  { href: "/admin/adicionales", etiqueta: "Adicionales", icono: "regalo" },
  { href: "/admin/contenido", etiqueta: "Contenido del sitio", icono: "texto" },
  {
    href: "/admin/usuarios",
    etiqueta: "Usuarios",
    icono: "personas",
    soloPropietario: true,
  },
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
  sol: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4l1.4-1.4m10-10 1.4-1.4",
  brujula:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.8-11.8-1.6 4.6-4.6 1.6 1.6-4.6 4.6-1.6Z",
  regalo:
    "M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Zm-1-4h18v4H3V7Zm9 0v13M12 7S10.5 3 8.5 3a2 2 0 0 0 0 4H12Zm0 0s1.5-4 3.5-4a2 2 0 0 1 0 4H12Z",
  personas:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 0c-3 0-5.5 1.8-5.5 4v3h11v-3c0-2.2-2.5-4-5.5-4Zm7.5-6.7a3.5 3.5 0 0 1 0 6.7m1.2 2.4c1.9.6 3.3 1.9 3.3 3.6v3h-4",
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

export function NavPanel({ rol }: { rol: RolPanel }) {
  const ruta = usePathname();

  /* La sección de Usuarios solo se le pinta al propietario. El rol llega del
     layout, que lo leyó del JWT ya validado en el servidor: no es un dato que
     el navegador pueda cambiar para hacerse aparecer el enlace. Y aunque lo
     hiciera, el enlace llevaría a una página que dice «No tienes permiso». */
  const elementos = NAV_PANEL.filter(
    (item) => !item.soloPropietario || rol === "propietario",
  );

  return (
    <>
      {/* Escritorio: barra lateral */}
      <nav aria-label="Secciones del panel" className="hidden lg:block">
        <ul className="space-y-1">
          {elementos.map((item) => {
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
          {elementos.map((item) => {
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
