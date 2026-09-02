import type { ReactNode } from "react";

/**
 * Piezas de composición de las secciones.
 *
 * Existen para que el aire del sitio sea el mismo en todas partes: el espaciado
 * vertical, el ancho de lectura y la jerarquía del encabezado se deciden aquí
 * una vez, y no a ojo en cada página.
 */

type PropsSeccion = {
  children: ReactNode;
  /** Tono de fondo. `crema` alterna con `blanco` para separar secciones. */
  fondo?: "blanco" | "crema" | "petroleo" | "oliva";
  /** Espaciado vertical. */
  espacio?: "normal" | "amplio" | "compacto";
  id?: string;
  className?: string;
};

const FONDOS: Record<NonNullable<PropsSeccion["fondo"]>, string> = {
  blanco: "bg-white",
  crema: "bg-crema-50",
  petroleo: "bg-petroleo-800 text-crema-50",
  oliva: "bg-oliva-700 text-crema-50",
};

const ESPACIOS: Record<NonNullable<PropsSeccion["espacio"]>, string> = {
  compacto: "py-12 sm:py-16",
  normal: "py-16 sm:py-20 lg:py-24",
  amplio: "py-20 sm:py-28 lg:py-32",
};

export function Seccion({
  children,
  fondo = "blanco",
  espacio = "normal",
  id,
  className,
}: PropsSeccion) {
  return (
    <section
      id={id}
      className={[FONDOS[fondo], ESPACIOS[espacio], className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="contenedor">{children}</div>
    </section>
  );
}

type PropsEncabezado = {
  antetitulo?: string;
  titulo: string;
  descripcion?: string;
  /** Centrado en secciones de catálogo; a la izquierda en las de texto. */
  alineacion?: "izquierda" | "centro";
  /** Nivel del encabezado. La portada usa `h2`; una página interna, `h1`. */
  como?: "h1" | "h2";
  claro?: boolean;
  children?: ReactNode;
};

export function EncabezadoSeccion({
  antetitulo,
  titulo,
  descripcion,
  alineacion = "centro",
  como: Titulo = "h2",
  claro = false,
  children,
}: PropsEncabezado) {
  const centrado = alineacion === "centro";

  return (
    <header
      className={[
        "flex flex-col gap-4",
        centrado ? "items-center text-center" : "items-start text-left",
      ].join(" ")}
    >
      {antetitulo ? (
        <p
          className={[
            "font-titulo text-xs font-semibold tracking-[0.18em] uppercase",
            claro ? "text-crema-200" : "text-dorado-600",
          ].join(" ")}
        >
          {antetitulo}
        </p>
      ) : null}

      <Titulo
        className={[
          "text-3xl leading-[1.15] font-bold sm:text-4xl lg:text-[2.75rem]",
          claro ? "text-white" : "text-petroleo-900",
        ].join(" ")}
      >
        {titulo}
      </Titulo>

      {descripcion ? (
        <p
          className={[
            "max-w-2xl text-base leading-relaxed sm:text-lg",
            claro ? "text-crema-100/90" : "text-crema-700",
          ].join(" ")}
        >
          {descripcion}
        </p>
      ) : null}

      {children}
    </header>
  );
}
