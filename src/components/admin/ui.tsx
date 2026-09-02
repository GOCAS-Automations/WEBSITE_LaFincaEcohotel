/**
 * Piezas de interfaz compartidas del panel.
 *
 * Mismo lenguaje visual que el sitio público —los tokens de `globals.css`:
 * crema de fondo, petróleo como color de acción, esquinas de 16–24 px, sombras
 * de varias capas— pero con densidad de herramienta de trabajo: menos aire y
 * más información por pantalla.
 *
 * Son componentes de servidor: no llevan estado. Los que sí lo necesitan viven
 * en archivos propios marcados con "use client".
 */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------------------------------------------------------------------------
 * Superficies
 * ------------------------------------------------------------------------- */

export function Tarjeta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-amplio bg-white shadow-tarjeta ring-1 ring-crema-900/[0.06] ${className}`}
    >
      {children}
    </section>
  );
}

export function CabeceraTarjeta({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-crema-900/[0.07] px-4 py-4 sm:px-6">
      <div className="min-w-0">
        <h2 className="font-titulo text-[1.0625rem] font-semibold text-crema-900">
          {titulo}
        </h2>
        {descripcion && (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-crema-700">
            {descripcion}
          </p>
        )}
      </div>
      {accion}
    </header>
  );
}

export function CuerpoTarjeta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-4 py-5 sm:px-6 ${className}`}>{children}</div>;
}

/** Encabezado de una página del panel. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.625rem] text-crema-900 sm:text-[2rem]">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-crema-700">
            {descripcion}
          </p>
        )}
      </div>
      {accion}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Botones
 * ------------------------------------------------------------------------- */

export type TonoBoton = "primario" | "secundario" | "fantasma" | "peligro";

const BASE_BOTON =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,color,box-shadow,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-55";

const TONOS_BOTON: Record<TonoBoton, string> = {
  primario:
    "bg-petroleo-600 text-white shadow-tenue hover:bg-petroleo-700 active:scale-[0.98]",
  secundario:
    "bg-crema-900/[0.06] text-crema-900 hover:bg-crema-900/[0.1] active:scale-[0.98]",
  fantasma:
    "bg-transparent text-petroleo-700 hover:bg-petroleo-600/10 active:scale-[0.98]",
  peligro: "bg-red-600/10 text-red-700 hover:bg-red-600/[0.18] active:scale-[0.98]",
};

const TAMANOS_BOTON = {
  sm: "px-3.5 py-1.5 text-[0.8125rem]",
  md: "px-5 py-2.5 text-[0.875rem]",
} as const;

export type TamanoBoton = keyof typeof TAMANOS_BOTON;

export function claseBoton(
  tono: TonoBoton = "primario",
  tamano: TamanoBoton = "md",
): string {
  return `${BASE_BOTON} ${TONOS_BOTON[tono]} ${TAMANOS_BOTON[tamano]}`;
}

export function EnlaceBoton({
  href,
  tono = "primario",
  tamano = "md",
  children,
  className = "",
  ...resto
}: {
  href: string;
  tono?: TonoBoton;
  tamano?: TamanoBoton;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={`${claseBoton(tono, tamano)} ${className}`}
      {...resto}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------------------
 * Campos de formulario
 * ------------------------------------------------------------------------- */

export const CLASE_INPUT =
  "w-full rounded-suave border-0 bg-crema-900/[0.04] px-4 py-3 text-[0.9375rem] text-crema-900 outline-none ring-1 ring-inset ring-crema-900/[0.07] transition-[box-shadow,background-color] duration-200 placeholder:text-crema-500 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-petroleo-500";

export function Campo({
  etiqueta,
  htmlFor,
  ayuda,
  obligatorio,
  children,
  className = "",
}: {
  etiqueta: string;
  htmlFor?: string;
  ayuda?: string;
  obligatorio?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[0.8125rem] font-semibold text-crema-900"
      >
        {etiqueta}
        {obligatorio && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {ayuda && (
        <p className="mt-1.5 text-[0.75rem] leading-relaxed text-crema-600">
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function Entrada({ className = "", ...resto }: ComponentProps<"input">) {
  return <input {...resto} className={`${CLASE_INPUT} ${className}`} />;
}

export function AreaTexto({
  className = "",
  ...resto
}: ComponentProps<"textarea">) {
  return (
    <textarea
      {...resto}
      className={`${CLASE_INPUT} min-h-28 leading-relaxed ${className}`}
    />
  );
}

export function Desplegable({
  className = "",
  children,
  ...resto
}: ComponentProps<"select">) {
  return (
    <select {...resto} className={`${CLASE_INPUT} pr-10 ${className}`}>
      {children}
    </select>
  );
}

/* ---------------------------------------------------------------------------
 * Indicadores
 * ------------------------------------------------------------------------- */

export type TonoPastilla = "gris" | "verde" | "ambar" | "rojo" | "azul" | "dorado";

const TONOS_PASTILLA: Record<TonoPastilla, string> = {
  gris: "bg-crema-900/[0.07] text-crema-700",
  verde: "bg-petroleo-600/[0.13] text-petroleo-800",
  ambar: "bg-dorado-500/[0.16] text-dorado-800",
  rojo: "bg-red-600/[0.1] text-red-700",
  azul: "bg-sky-600/[0.12] text-sky-800",
  dorado: "bg-dorado-600/[0.13] text-dorado-800",
};

export function Pastilla({
  children,
  tono = "gris",
}: {
  children: ReactNode;
  tono?: TonoPastilla;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${TONOS_PASTILLA[tono]}`}
    >
      {children}
    </span>
  );
}

/**
 * Estado vacío. Siempre explica QUÉ hace la sección, no solo que está vacía:
 * quien abre el panel por primera vez no tiene por qué saberlo.
 */
export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-tarjeta bg-crema-900/[0.025] px-6 py-12 text-center">
      <p className="font-titulo text-[1.0625rem] font-semibold text-crema-900">
        {titulo}
      </p>
      {descripcion && (
        <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-crema-700">
          {descripcion}
        </p>
      )}
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </div>
  );
}

/** Banner de éxito, error o aviso. Respeta los saltos de línea del mensaje. */
export function Banner({
  tono,
  children,
}: {
  tono: "ok" | "error" | "info";
  children: ReactNode;
}) {
  const tonos = {
    ok: "bg-petroleo-600/[0.1] text-petroleo-800 ring-petroleo-600/20",
    error: "bg-red-600/[0.08] text-red-800 ring-red-600/20",
    info: "bg-dorado-500/[0.1] text-dorado-800 ring-dorado-500/25",
  } as const;

  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={`whitespace-pre-line rounded-suave px-4 py-3 text-[0.875rem] font-medium leading-relaxed ring-1 ${tonos[tono]}`}
    >
      {children}
    </div>
  );
}

/** Cifra grande del resumen. */
export function Indicador({
  valor,
  etiqueta,
  ayuda,
  href,
}: {
  valor: number | string;
  etiqueta: string;
  ayuda?: string;
  href?: string;
}) {
  const contenido = (
    <>
      <p className="font-titulo text-[1.875rem] font-semibold leading-none tracking-[-0.03em] text-petroleo-700">
        {valor}
      </p>
      <p className="mt-2 text-[0.875rem] font-semibold text-crema-900">
        {etiqueta}
      </p>
      {ayuda && <p className="mt-1 text-[0.75rem] text-crema-600">{ayuda}</p>}
    </>
  );

  const clase =
    "block rounded-tarjeta bg-white px-5 py-5 shadow-tenue ring-1 ring-crema-900/[0.06] transition-[box-shadow,transform] duration-200";

  if (href) {
    return (
      <Link
        href={href}
        className={`${clase} hover:-translate-y-0.5 hover:shadow-tarjeta`}
      >
        {contenido}
      </Link>
    );
  }
  return <div className={clase}>{contenido}</div>;
}

/** Par etiqueta/valor de las fichas de detalle. */
export function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
        {etiqueta}
      </dt>
      <dd className="mt-1 text-[0.9375rem] text-crema-900">{children}</dd>
    </div>
  );
}

/** Separador con título dentro de un formulario largo. */
export function Divisor({ titulo }: { titulo: string }) {
  return (
    <div className="col-span-full mt-2 flex items-center gap-3">
      <h3 className="font-titulo text-[0.9375rem] font-semibold text-crema-900">
        {titulo}
      </h3>
      <span className="h-px flex-1 bg-crema-900/10" aria-hidden="true" />
    </div>
  );
}
