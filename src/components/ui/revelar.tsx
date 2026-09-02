"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Micro-aparición al hacer scroll.
 *
 * REGLAS QUE SE RESPETAN AQUÍ, Y POR QUÉ
 * --------------------------------------
 * 1. **Sucede una sola vez.** En cuanto el elemento entra, se deja de observar.
 *    Un contenido que se desvanece al volver a subir es un parpadeo, no una
 *    animación.
 * 2. **Sin JavaScript, todo se ve.** El estado inicial oculto NO está en el
 *    HTML del servidor: se aplica en el primer efecto del cliente, justo antes
 *    de observar. Si el script no llega, el visitante ve la página completa en
 *    vez de una pantalla en blanco.
 * 3. **`prefers-reduced-motion` la desactiva por completo**, no la acorta: se
 *    comprueba antes de ocultar nada (y `globals.css` lo refuerza con `!important`).
 * 4. **Es sutil**: 14 px de desplazamiento y 600 ms. Nada rebota ni gira.
 */

type PropsRevelar = {
  children: ReactNode;
  /** Retraso en milisegundos, para escalonar una fila de tarjetas. */
  retraso?: number;
  className?: string;
  /** Etiqueta a renderizar. Por defecto `div`. */
  como?: "div" | "li" | "article" | "section";
};

export function Revelar({
  children,
  retraso = 0,
  className,
  como: Etiqueta = "div",
}: PropsRevelar) {
  const referencia = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) return;

    const prefiereMenosMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefiereMenosMovimiento || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    // Si ya está en pantalla al montar (contenido del primer visor), se muestra
    // sin animar: animar lo que el visitante ya está mirando es un parpadeo.
    const caja = elemento.getBoundingClientRect();
    if (caja.top < window.innerHeight * 0.9) {
      setVisible(true);
      return;
    }

    elemento.dataset.revelar = "oculto";

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          observador.disconnect();
          window.setTimeout(() => setVisible(true), retraso);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, [retraso]);

  return (
    <Etiqueta
      // @ts-expect-error — la referencia sirve para cualquiera de las etiquetas permitidas
      ref={referencia}
      data-revelar={visible ? "visible" : undefined}
      className={className}
    >
      {children}
    </Etiqueta>
  );
}
