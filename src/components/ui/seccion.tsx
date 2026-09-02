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
  /**
   * Tono de fondo.
   *
   * `crema` y `blanco` alternan en el ritmo normal del sitio. `bosque` es el
   * contraste dramático: una sección oscura entera, para que la página respire
   * claro/oscuro en vez de ser una tira continua de crema. `niebla` es el
   * intermedio gris verdoso, cuando dos secciones claras seguidas necesitan
   * separarse sin llegar al negro.
   */
  fondo?: "blanco" | "crema" | "niebla" | "bosque" | "petroleo" | "oliva";
  /** Espaciado vertical. */
  espacio?: "normal" | "amplio" | "compacto" | "ninguno";
  id?: string;
  className?: string;
  /** Clases del contenedor interior (para romper el ancho de lectura). */
  claseContenedor?: string;
  /** Quita el contenedor: el hijo se encarga de su propio ancho. */
  sinContenedor?: boolean;
};

const FONDOS: Record<NonNullable<PropsSeccion["fondo"]>, string> = {
  blanco: "bg-white",
  crema: "bg-crema-50",
  niebla: "bg-niebla-100",
  bosque: "bg-bosque-900 text-crema-50",
  petroleo: "bg-petroleo-800 text-crema-50",
  oliva: "bg-oliva-700 text-crema-50",
};

const ESPACIOS: Record<NonNullable<PropsSeccion["espacio"]>, string> = {
  ninguno: "",
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
  claseContenedor,
  sinContenedor = false,
}: PropsSeccion) {
  return (
    <section
      id={id}
      className={[FONDOS[fondo], ESPACIOS[espacio], className]
        .filter(Boolean)
        .join(" ")}
    >
      {sinContenedor ? (
        children
      ) : (
        <div
          className={["contenedor", claseContenedor].filter(Boolean).join(" ")}
        >
          {children}
        </div>
      )}
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
            /* Sobre el verde bosque el crema se apaga; el dorado 300 mantiene
               el acento cálido de marca y pasa AA de sobra (más de 8:1). */
            claro ? "text-dorado-300" : "text-dorado-600",
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
