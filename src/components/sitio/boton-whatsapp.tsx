"use client";

import { useEffect, useState } from "react";

import { IconoWhatsapp } from "./iconos";

/**
 * Botón flotante de WhatsApp.
 *
 * Es cliente por dos razones, las dos para **apartarse de algo más
 * importante**:
 *
 * 1. **El pie de página.** Un botón fijo sobre el pie tapa justo el RNT y los
 *    enlaces legales, que son las dos cosas que el sitio está obligado a
 *    mostrar. Se observa el `<footer>` con un `IntersectionObserver` y un
 *    `rootMargin` negativo por abajo, así que se aparta un poco antes de que
 *    el pie llegue a superponerse de verdad.
 * 2. **Cualquier módulo marcado `data-fab-evitar`.** El módulo de reserva de
 *    la portada (`ModuloReserva`) es el momento más importante de la página:
 *    un FAB montado encima de sus campos en un teléfono le estorbaría al
 *    visitante justo cuando va a actuar. En vez de acoplar este componente —
 *    global, vive en el layout— a un módulo concreto, se observa **cualquier**
 *    elemento con ese atributo: hoy es solo el módulo de reserva, pero
 *    cualquier pieza futura que necesite el mismo rincón de pantalla libre
 *    puede pedirlo con el mismo `data-*`, sin tocar este archivo.
 *
 * Si `IntersectionObserver` no existe, el botón se queda siempre visible, que
 * es el comportamiento seguro.
 *
 * **Solo el icono, sin texto.** El logotipo de WhatsApp es de los pocos signos
 * gráficos que no necesitan pie: nadie lo confunde. La palabra "Escríbenos"
 * alargaba la píldora y la convertía en el objeto más pesado de la pantalla,
 * compitiendo con el botón de reservar, que es el que sí tiene que ganar. El
 * `aria-label` en español sigue estando para quien no ve el icono, y es lo que
 * anuncia un lector de pantalla.
 */
export function BotonWhatsappFlotante({ enlace }: { enlace: string }) {
  const [ocultoPorPie, setOcultoPorPie] = useState(false);
  const [ocultoPorModulo, setOcultoPorModulo] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observadores: IntersectionObserver[] = [];

    const pie = document.querySelector("footer");
    if (pie) {
      const observadorPie = new IntersectionObserver(
        ([entrada]) => setOcultoPorPie(entrada.isIntersecting),
        { rootMargin: "0px 0px -40% 0px" },
      );
      observadorPie.observe(pie);
      observadores.push(observadorPie);
    }

    /* Puede haber más de un objetivo (o ninguno) en la página; el FAB se
       oculta mientras CUALQUIERA de ellos esté en el viewport. */
    const objetivos = document.querySelectorAll<HTMLElement>(
      "[data-fab-evitar]",
    );
    if (objetivos.length > 0) {
      const visibles = new Set<Element>();
      const observadorModulos = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) visibles.add(entrada.target);
          else visibles.delete(entrada.target);
        }
        setOcultoPorModulo(visibles.size > 0);
      });
      objetivos.forEach((objetivo) => observadorModulos.observe(objetivo));
      observadores.push(observadorModulos);
    }

    return () => observadores.forEach((observador) => observador.disconnect());
  }, []);

  const oculto = ocultoPorPie || ocultoPorModulo;

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className={[
        "fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full",
        "bg-[#25D366] text-white sm:right-6 sm:bottom-6",
        "shadow-[0_4px_12px_-2px_rgba(37,211,102,0.45),0_12px_32px_-8px_rgba(37,211,102,0.4)]",
        "transition-all duration-300 ease-out hover:brightness-105 active:scale-95",
        oculto
          ? "pointer-events-none translate-y-24 opacity-0"
          : "translate-y-0 opacity-100",
      ].join(" ")}
    >
      <IconoWhatsapp className="size-7 shrink-0" />
    </a>
  );
}
