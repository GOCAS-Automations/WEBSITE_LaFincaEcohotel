"use client";

import { useEffect, useState } from "react";

import { IconoWhatsapp } from "./iconos";

/**
 * Botón flotante de WhatsApp.
 *
 * Es cliente por una sola razón: **apartarse del pie de página**. Un botón fijo
 * sobre el pie tapa justo el RNT y los enlaces legales, que son las dos cosas
 * que el sitio está obligado a mostrar. Cuando el pie entra en pantalla, el
 * botón se desliza fuera con una transición corta y vuelve al subir.
 *
 * Se observa el `<footer>` con un `IntersectionObserver`; si no existe o el
 * navegador no lo soporta, el botón simplemente se queda siempre visible, que
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
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const pie = document.querySelector("footer");
    if (!pie || !("IntersectionObserver" in window)) return;

    const observador = new IntersectionObserver(
      ([entrada]) => setOculto(entrada.isIntersecting),
      { rootMargin: "0px 0px -40% 0px" },
    );

    observador.observe(pie);
    return () => observador.disconnect();
  }, []);

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
