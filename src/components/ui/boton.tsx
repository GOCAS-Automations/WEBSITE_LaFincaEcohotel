import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Botones del sitio.
 *
 * Son SIEMPRE enlaces: en el sitio público no hay ninguna acción que no lleve
 * a otra página o a WhatsApp. Cuando llegue el motor de reservas hará falta un
 * `<button>` de verdad; entonces se añade aquí, reutilizando `clasesBoton()`
 * para que las dos variantes no se separen visualmente.
 *
 * Forma de píldora, transición de 200 ms y una sombra que solo se insinúa: es
 * el gesto iOS que pide el diseño (§10 del plan). El foco visible sale del
 * `:focus-visible` global de `globals.css`.
 */

export type VarianteBoton =
  | "primario"
  | "secundario"
  | "contorno"
  | "claro"
  | "crema"
  | "contornoClaro";
export type TamanoBoton = "normal" | "grande" | "pequeno" | "nav";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-titulo font-semibold " +
  "transition-all duration-200 ease-out select-none " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const VARIANTES: Record<VarianteBoton, string> = {
  primario:
    "bg-petroleo-600 text-white shadow-[0_1px_2px_rgba(2,117,112,0.24),0_8px_20px_-8px_rgba(2,117,112,0.45)] " +
    "hover:bg-petroleo-700 hover:shadow-[0_2px_4px_rgba(2,117,112,0.24),0_12px_28px_-10px_rgba(2,117,112,0.5)]",
  secundario:
    "bg-crema-100 text-petroleo-800 ring-1 ring-crema-300/70 hover:bg-crema-200 hover:ring-crema-400/70",
  contorno:
    "bg-transparent text-petroleo-700 ring-1 ring-petroleo-600/35 hover:bg-petroleo-50 hover:ring-petroleo-600/60",
  /** Sobre fotografía: cristal translúcido, como los controles de iOS. */
  claro:
    "bg-white/15 text-white ring-1 ring-white/40 backdrop-blur-md hover:bg-white/25 hover:ring-white/60",
  /**
   * Acción principal sobre una sección de bosque profundo.
   *
   * El petróleo de `primario` NO sirve ahí: sobre `bosque-900` su superficie
   * queda en 2,2:1 contra el fondo y la norma pide 3:1 para el contorno de un
   * control (WCAG 1.4.11). El crema llega a 12:1 y, de paso, es lo que hace que
   * el botón se lea como un claro entre los árboles.
   */
  crema:
    "bg-crema-50 text-bosque-900 shadow-[0_2px_8px_rgba(8,29,23,0.35),0_14px_32px_-12px_rgba(8,29,23,0.6)] " +
    "hover:bg-white hover:shadow-[0_3px_10px_rgba(8,29,23,0.4),0_18px_40px_-14px_rgba(8,29,23,0.65)]",
  /** Acción secundaria sobre bosque: contorno con el contraste suficiente. */
  contornoClaro:
    "bg-transparent text-crema-50 ring-1 ring-crema-100/50 hover:bg-white/10 hover:ring-crema-100/80",
};

const TAMANOS: Record<TamanoBoton, string> = {
  pequeno: "px-4 py-2 text-sm",
  normal: "px-6 py-3 text-[0.95rem]",
  grande: "px-7 py-3.5 text-base sm:px-8 sm:py-4 sm:text-[1.05rem]",
  /**
   * El "Reservar" de la barra superior.
   *
   * Tiene su propio tamaño —y no `normal` con clases sueltas encima— porque en
   * Tailwind gana el orden del CSS generado, no el del atributo `class`: un
   * `px-5` escrito después de un `px-6` no siempre manda. Cualquier medida que
   * deba imponerse sobre la de la tabla tiene que vivir EN la tabla.
   */
  nav: "px-5 py-2.5 text-[0.95rem] sm:px-7 sm:py-3",
};

export function clasesBoton(
  variante: VarianteBoton = "primario",
  tamano: TamanoBoton = "normal",
  extra?: string,
): string {
  return [BASE, VARIANTES[variante], TAMANOS[tamano], extra]
    .filter(Boolean)
    .join(" ");
}

type PropsBoton = {
  href: string;
  children: ReactNode;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  className?: string;
  /** Para enlaces externos (WhatsApp, redes, mapa). */
  externo?: boolean;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

export function Boton({
  href,
  children,
  variante = "primario",
  tamano = "normal",
  className,
  externo = false,
  ...resto
}: PropsBoton) {
  const clases = clasesBoton(variante, tamano, className);

  if (externo) {
    return (
      <a
        href={href}
        className={clases}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={clases} {...resto}>
      {children}
    </Link>
  );
}
