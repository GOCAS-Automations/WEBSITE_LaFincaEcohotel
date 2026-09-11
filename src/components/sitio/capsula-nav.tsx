"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * La cáscara de la cápsula de navegación.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ES CLIENTE (y por qué es LO ÚNICO que lo es)
 * ---------------------------------------------------------------------------
 * Lo único que necesita JavaScript aquí es saber si la página ya se movió, para
 * compactar la cápsula. Todo lo demás —el logo, los enlaces, el botón de
 * reservar— se renderiza en el servidor y entra por `children`. Un header
 * entero marcado como cliente habría mandado al navegador HTML que ya estaba
 * resuelto.
 *
 * ---------------------------------------------------------------------------
 * LOS DOS ESTADOS
 * ---------------------------------------------------------------------------
 * · **Arriba del todo**: cápsula alta, muy translúcida. Está flotando sobre la
 *   fotografía del hero y tiene que dejarla ver: es la primera impresión del
 *   lugar, no la barra de un panel.
 * · **Con la página desplazada**: baja 10 px de alto, sube la opacidad del
 *   petróleo y aparece la sombra. Ya no hay foto debajo sino contenido, y el
 *   menú necesita separarse de él para seguir siendo legible.
 *
 * La transición dura 300 ms sobre `padding`, `background` y `box-shadow`. No se
 * anima el alto (`height: auto` no transiciona): se anima el relleno, que es lo
 * que de verdad lo define aquí.
 *
 * DETALLES QUE IMPORTAN
 * ---------------------
 * · El listener va con `{ passive: true }`: nunca llama a `preventDefault`, y
 *   avisarlo evita que el navegador retrase el desplazamiento esperando a ver
 *   si lo hace.
 * · Se comprueba el estado UNA VEZ al montar. Si alguien llega a la página con
 *   un ancla (`/#planes`) o recarga a media página, el navegador restaura la
 *   posición sin disparar `scroll`, y la cápsula se quedaría en su estado alto
 *   encima del contenido.
 * · El umbral son 24 px, no 0: un rebote de un píxel en un trackpad no debe
 *   hacer parpadear la barra.
 */
export function CapsulaNav({ children }: { children: ReactNode }) {
  const [compacta, setCompacta] = useState(false);

  useEffect(() => {
    function mirar() {
      setCompacta(window.scrollY > 24);
    }

    mirar();
    window.addEventListener("scroll", mirar, { passive: true });
    return () => window.removeEventListener("scroll", mirar);
  }, []);

  return (
    <header
      /* El `header` ocupa todo el ancho pero NO recibe eventos: si los
         recibiera, una franja invisible de 80 px cruzaría la pantalla y se
         comería los clics del hero. Solo la cápsula vuelve a activarlos. */
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <div
        className={[
          "pointer-events-auto mx-auto flex w-full max-w-[76rem] items-center justify-between gap-3",
          "rounded-full ring-1 backdrop-blur-xl backdrop-saturate-150",
          "transition-[padding,background-color,box-shadow,border-color] duration-300 ease-out",
          compacta
            ? "bg-petroleo-900/88 px-3 py-1.5 ring-white/12 shadow-[0_10px_34px_-12px_rgba(5,37,36,0.65)] sm:px-4 sm:py-2"
            /* 78 %, no 55 %. Al 55 % la cápsula se veía preciosa sobre la foto
               del hero y se volvía pálida sobre las páginas que abren en blanco
               (la ficha de una cabaña, los legales): el texto en verde claro se
               quedaba por debajo de 4,5:1. Al 78 % sigue dejando ver la foto y
               el contraste ya no depende de lo que haya debajo. */
            : "bg-petroleo-900/78 px-3 py-2.5 ring-white/20 shadow-[0_8px_28px_-16px_rgba(5,37,36,0.5)] sm:px-4 sm:py-3",
        ].join(" ")}
      >
        {children}
      </div>
    </header>
  );
}
