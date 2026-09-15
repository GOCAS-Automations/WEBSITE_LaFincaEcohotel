/**
 * Iconos del sitio, dibujados a mano.
 *
 * No se instala ninguna librería de iconos: el sitio usa una docena, y una
 * dependencia entera por doce trazos es peso muerto en el paquete que descarga
 * el visitante (§9 del plan: Core Web Vitals en verde, sin librerías pesadas).
 *
 * Todos son decorativos y llevan `aria-hidden`: el significado lo pone SIEMPRE
 * el texto que los acompaña o el `aria-label` del enlace que los contiene.
 */

type PropsIcono = { className?: string };

function Svg({
  children,
  className,
  relleno = false,
}: {
  children: React.ReactNode;
  className?: string;
  relleno?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "size-5"}
      aria-hidden="true"
      focusable="false"
      {...(relleno
        ? { fill: "currentColor" }
        : {
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.7,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          })}
    >
      {children}
    </svg>
  );
}

export function IconoWhatsapp({ className }: PropsIcono) {
  return (
    <Svg className={className} relleno>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 5.83 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.24.25-.41.09-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.24-.86.84-.86 2.05s.88 2.38 1.01 2.54c.12.17 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </Svg>
  );
}

export function IconoInstagram({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconoFacebook({ className }: PropsIcono) {
  return (
    <Svg className={className} relleno>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </Svg>
  );
}

export function IconoTiktok({ className }: PropsIcono) {
  return (
    <Svg className={className} relleno>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06v-3.1a5.66 5.66 0 0 0-.77-.05A5.68 5.68 0 1 0 15.54 15V8.99a7.34 7.34 0 0 0 4.29 1.37V7.28a4.28 4.28 0 0 1-3.23-1.46Z" />
    </Svg>
  );
}

export function IconoUbicacion({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </Svg>
  );
}

export function IconoReloj({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2V12l3.2 1.9" />
    </Svg>
  );
}

export function IconoFlecha({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5" />
    </Svg>
  );
}

export function IconoCheck({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </Svg>
  );
}

export function IconoPersonas({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.4a3.2 3.2 0 0 1 0 5.2M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
    </Svg>
  );
}

export function IconoCalendario({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8.5 3v4M15.5 3v4" />
    </Svg>
  );
}

export function IconoLlave({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <circle cx="8" cy="8" r="4.2" />
      <path d="M11 11l8.5 8.5M16 15.5l2 2M13.5 13l2 2" />
    </Svg>
  );
}

/** Cabaña: la casita del campo de «Cabaña» del módulo de reserva. */
export function IconoCabana({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <path d="M3.5 10.8 12 4l8.5 6.8" />
      <path d="M6 9.6V20h12V9.6" />
      <path d="M10 20v-4.6h4V20" />
    </Svg>
  );
}

/**
 * Chevron hacia abajo.
 *
 * Es el del desplegable de cabañas: el `<select>` va con `appearance-none`
 * para poder darle el radio, el borde y el alto del resto de los campos, y esa
 * propiedad se lleva por delante la flecha que pinta el sistema. Dibujarla
 * nosotros es la única forma de que el campo se vea del sitio y siga siendo un
 * `<select>` nativo —que es lo que abre la rueda a pantalla completa en un
 * teléfono y lo que ya sabe manejar cualquier lector de pantalla—.
 */
export function IconoChevron({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  );
}

export function IconoHoja({ className }: PropsIcono) {
  return (
    <Svg className={className}>
      <path d="M5 19c0-8 5-14 14-14 0 8-5 14-14 14Z" />
      <path d="M5 19c3-3 6-5.5 10-7.5" />
    </Svg>
  );
}
