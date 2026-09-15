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
  fondo?:
    | "blanco"
    | "crema"
    | "niebla"
    | "brote"
    | "brote-banda"
    | "bosque"
    | "petroleo"
    | "oliva";
  /** Espaciado vertical. */
  espacio?: "normal" | "amplio" | "compacto" | "ninguno";
  id?: string;
  className?: string;
  /** Clases del contenedor interior (para romper el ancho de lectura). */
  claseContenedor?: string;
  /** Quita el contenedor: el hijo se encarga de su propio ancho. */
  sinContenedor?: boolean;
  /**
   * `content-visibility: auto`: el navegador se salta el estilo y la
   * maquetación de esta sección mientras no se vea. Encendido por defecto.
   *
   * Es lo que baja el «render delay» de la portada: sus nueve secciones —con
   * bruma, patrón, resplandor, ramas y ondas— se maquetaban enteras antes de
   * pintar el titular del hero. Ver `.seccion-diferida` en `globals.css`.
   *
   * **Se apaga (`diferida={false}`) en dos casos, y son los únicos:**
   *   · la sección que se ve al cargar, que no gana nada y sí paga la medida;
   *   · cualquiera con un `position: sticky` dentro —el resumen de
   *     `/reservar`—, porque el `contain` de maquetación lo rompe en silencio.
   */
  diferida?: boolean;
};

const FONDOS: Record<NonNullable<PropsSeccion["fondo"]>, string> = {
  blanco: "bg-white",
  crema: "bg-crema-50",
  niebla: "bg-niebla-100",
  /** El verde claro de marca, en su tono más pálido. */
  brote: "bg-brote-50",
  /**
   * El verde claro OFICIAL del manual, `#E8F4D9`, sin diluir.
   *
   * Es una banda, no un fondo de uso general: sirve para que una sección se
   * despegue de sus vecinas cuando hay tres claras seguidas y el sitio se lee
   * como una sola masa blanca. Usarla dos veces en la misma página la
   * convierte en otro fondo más y deja de separar nada.
   */
  "brote-banda": "bg-brote-100",
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
  diferida = true,
}: PropsSeccion) {
  return (
    <section
      id={id}
      className={[
        FONDOS[fondo],
        ESPACIOS[espacio],
        diferida ? "seccion-diferida" : "",
        className,
      ]
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

/**
 * LA ESCALA DE RITMO VERTICAL.
 *
 * El aire entre secciones ya lo decidía `ESPACIOS`. El aire DENTRO de una
 * sección, en cambio, se decidía a ojo en cada página: había `mt-10`, `mt-12` y
 * `mt-14` para exactamente la misma relación —un título y lo que viene debajo—,
 * y el resultado es que dos secciones seguidas respiran distinto sin que nada
 * lo justifique. Cesar lo vio en la página de cabañas.
 *
 * Son tres medidas y ninguna más:
 *
 *   · `trasTitulo`    — del encabezado de sección a su contenido.
 *   · `trasContenido` — del contenido a la acción que lo cierra (un botón).
 *   · `nota`          — a la letra pequeña del final (tarifas, condiciones).
 *
 * Si hace falta una cuarta, se añade AQUÍ y se documenta, no se escribe un
 * `mt-` suelto en una página.
 */
export const RITMO = {
  trasTitulo: "mt-10 sm:mt-12",
  trasContenido: "mt-10",
  nota: "mt-8",
} as const;

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
            /* Sobre el verde bosque el crema se apaga y se confunde con el
               titular; el verde claro de marca (`brote`) es el acento oficial
               para ese fondo y pasa AA de sobra (más de 9:1). Sobre claro, el
               oliva: el segundo color del manual. */
            claro ? "text-brote-200" : "text-oliva-600",
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
