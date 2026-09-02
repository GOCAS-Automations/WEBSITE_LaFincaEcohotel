import Image from "next/image";
import Link from "next/link";

import { Boton } from "@/components/ui/boton";
import { NAVEGACION, SITIO } from "@/lib/sitio";

import { MenuMovil } from "./menu-movil";
import { NavEscritorio } from "./nav-escritorio";

/**
 * Encabezado fijo y translúcido.
 *
 * Se queda pegado arriba con `backdrop-blur`: sobre la fotografía del hero se
 * lee como el cristal esmerilado de iOS, y en el resto del sitio deja ver el
 * contenido que pasa por debajo. El borde inferior es casi invisible; su
 * trabajo es que el header no se confunda con la sección de arriba cuando el
 * fondo también es crema.
 *
 * El botón "Reservar" NO entra en la lista de navegación: es la acción del
 * sitio y va destacado, siempre visible, también en móvil (§10: el camino a la
 * reserva debe ser evidente desde la primera pantalla).
 *
 * **Y va grande.** Antes era del mismo tamaño que un enlace del menú y se
 * perdía entre las siete secciones; ahora tiene el cuerpo de un botón de
 * acción y una sombra propia en petróleo. La barra creció de 64 a 72 px (80 en
 * escritorio) para que quepa sin apretar: un botón grande metido a la fuerza
 * en una barra estrecha se ve peor que uno pequeño.
 *
 * El isotipo de La Finca no trae texto, así que el nombre se compone al lado
 * con la tipografía de marca.
 */
export function Encabezado() {
  return (
    <header className="sticky top-0 z-50 border-b border-crema-200/70 bg-crema-50/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="contenedor flex h-[4.5rem] items-center justify-between gap-4 sm:h-20">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label={`${SITIO.nombre} — ir al inicio`}
        >
          <Image
            src="/marca/logo-principal.png"
            alt=""
            width={513}
            height={513}
            priority
            className="size-9 object-contain transition-transform duration-300 ease-out group-hover:scale-105 sm:size-10"
          />
          <span className="flex flex-col leading-none">
            <span className="font-titulo text-[1.05rem] font-extrabold tracking-tight text-petroleo-800 sm:text-[1.15rem]">
              La Finca
            </span>
            <span className="mt-0.5 font-titulo text-[0.62rem] font-semibold tracking-[0.22em] text-oliva-600 uppercase">
              Eco Hotel
            </span>
          </span>
        </Link>

        <NavEscritorio enlaces={NAVEGACION} />

        <div className="flex items-center gap-1 sm:gap-2">
          <Boton href="/reservar" tamano="nav">
            Reservar
          </Boton>
          <MenuMovil
            enlaces={NAVEGACION}
            ctaTexto="Reservar ahora"
            ctaHref="/reservar"
          />
        </div>
      </div>
    </header>
  );
}
