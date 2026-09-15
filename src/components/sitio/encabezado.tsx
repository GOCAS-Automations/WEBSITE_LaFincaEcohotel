import { Foto } from "@/components/ui/foto";
import Link from "next/link";

import { clasesBoton } from "@/components/ui/boton";
import { NAVEGACION } from "@/lib/sitio";

import { CapsulaNav } from "./capsula-nav";
import { MenuMovil } from "./menu-movil";
import { NavEscritorio } from "./nav-escritorio";

/**
 * Navegación principal: una cápsula flotante, no una barra.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ CAMBIÓ
 * ---------------------------------------------------------------------------
 * Antes era un rectángulo crema de lado a lado, pegado al borde superior. Es la
 * forma más común que existe y, sobre una fotografía de bosque a pantalla
 * completa, la peor: corta el hero en dos con una línea horizontal y le pone un
 * techo de oficina a lo primero que ve el visitante.
 *
 * Ahora **flota**: se separa de los tres bordes, tiene esquinas de píldora y es
 * petróleo translúcido con desenfoque. La fotografía pasa POR DEBAJO y se
 * sigue viendo entera; la cápsula se lee como un control de iOS apoyado
 * encima, no como el marco de la página.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ PETRÓLEO Y NO CRISTAL BLANCO
 * ---------------------------------------------------------------------------
 * Un cristal blanco translúcido funciona sobre una foto oscura y se vuelve
 * ilegible sobre una clara: el texto oscuro pierde contraste contra el blanco
 * lavado. El petróleo al 55 % es el color de la marca, se mantiene oscuro
 * SIEMPRE y deja el texto claro por encima de 7:1 sobre cualquier foto. De
 * paso, el menú entra en la paleta oficial en vez de ser un elemento neutro
 * pegado encima.
 *
 * El botón «Reservar» va en verde claro de marca sobre el petróleo: es el
 * contraste más alto de la cápsula (12:1) y el único elemento lleno, así que no
 * hay duda de cuál es la acción del sitio (§10 del plan). Está a la vista en
 * TODAS las anchuras, también en el teléfono.
 *
 * El logo oficial no trae texto, así que el wordmark se compone al lado con la
 * tipografía de marca, espaciado como en el manual. En pantallas muy estrechas
 * se queda solo el isotipo: antes que apretar el botón de reservar, se recorta
 * la firma.
 */
export function Encabezado() {
  return (
    <CapsulaNav>
      {/*
        SIN `aria-label`. Lo llevaba («La Finca Eco Hotel — ir al inicio») y era
        peor que no ponerlo: el nombre accesible sustituye al texto visible, y
        como el visible es «La Finca / Eco · Hotel», los dos no coincidían.
        Quien navega por voz dice lo que LEE, y el comando no encontraba el
        enlace (regla `label-content-name-mismatch`). El texto de al lado ya
        nombra el enlace perfectamente.
      */}
      <Link
        href="/"
        className="group flex min-h-11 shrink-0 items-center gap-2.5 rounded-full pl-1"
      >
        <Foto
          src="/marca/icono.png"
          alt=""
          /* 96, no 513: se pinta a 36–40 px y con las medidas del archivo Next
             pedía la variante de 1080 px —siete kilobytes en prioridad alta
             para un icono de cuatro—. `sizes` remata el cálculo. */
          width={96}
          height={96}
          sizes="40px"
          priority
          /* `brightness-0 invert` pinta el isotipo de blanco sin necesitar un
             segundo archivo: el PNG oficial es petróleo sólido con alfa, así
             que llevarlo a negro y voltearlo da exactamente la silueta blanca.
             Cuando llegue el vectorial (Santiago), este es el único punto que
             hay que tocar. */
          className="size-9 shrink-0 object-contain brightness-0 invert transition-transform duration-300 ease-out group-hover:scale-105 sm:size-10"
        />
        {/*
          El wordmark se ve SIEMPRE, también a 390 px. Estaba oculto por debajo
          de 380 px para ganar sitio, y eso dejaba al enlace del logo sin nombre
          accesible en el móvil más estrecho (la imagen es decorativa). Cabe:
          isotipo, firma, «Reservar» y el menú suman menos que el ancho de la
          cápsula.
        */}
        <span className="flex flex-col leading-none">
          <span className="font-titulo text-[0.95rem] font-bold tracking-[0.26em] text-brote-100 uppercase sm:text-[1.02rem]">
            La Finca
          </span>
          {/* Sin transparencia: a 0,55 rem y al 75 % se quedaba en 3,5:1 sobre
              la cápsula (lo cazó Lighthouse en la ficha de una cabaña). En
              sólido pasa AA sin dejar de ser el trazo fino del manual. */}
          <span className="mt-1 font-titulo text-[0.55rem] font-medium tracking-[0.34em] text-brote-200 uppercase">
            Eco · Hotel
          </span>
        </span>
      </Link>

      <NavEscritorio enlaces={NAVEGACION} />

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <Link href="/reservar" className={clasesBoton("marca", "nav")}>
          Reservar
        </Link>
        <MenuMovil
          enlaces={NAVEGACION}
          ctaTexto="Reservar ahora"
          ctaHref="/reservar"
        />
      </div>
    </CapsulaNav>
  );
}
