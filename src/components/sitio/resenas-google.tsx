import Image from "next/image";

import type { ResenaGoogle, ResumenGoogle } from "@/lib/resenas-google";

import { LectorResena } from "./lector-resena";

/**
 * Bloque de reseñas de Google.
 *
 * ---------------------------------------------------------------------------
 * ES UN COMPONENTE DE SERVIDOR "TONTO"
 * ---------------------------------------------------------------------------
 * Recibe el resumen ya resuelto por props y NO llama a la API. Quien la llama
 * es la página (`await getResenasGoogle()`), por dos razones:
 *
 *   1. La clave vive en `src/lib/resenas-google.ts`, marcado `server-only`.
 *      Manteniéndola fuera de este archivo, el componente puede moverse a donde
 *      haga falta sin arrastrar la credencial detrás.
 *   2. Si el bloque se montara en dos sitios, cada uno dispararía su propio
 *      fetch. Resolviéndolo arriba, la página decide una sola vez.
 *
 * La ÚNICA pieza de cliente es el botón "Leer más" y su ventana
 * (`LectorResena`): la tarjeta, el texto recortado y la rejilla se pintan en el
 * servidor.
 *
 * ---------------------------------------------------------------------------
 * ATRIBUCIÓN OBLIGATORIA
 * ---------------------------------------------------------------------------
 * Los términos de Google exigen decir que las reseñas son de Google, enlazar a
 * la ficha y mostrar el nombre (y, si lo hay, la foto y el perfil) de cada
 * autor. Nada de eso es decorativo: no se puede quitar.
 */

/** "4,7" — coma decimal, que es como se lee un promedio en Colombia. */
const formatoPromedio = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatoTotal = new Intl.NumberFormat("es-CO");

/**
 * Líneas de reseña que se ven en la tarjeta.
 *
 * Es lo que hace que TODAS las tarjetas midan exactamente lo mismo: cabecera
 * fija + cinco líneas + botón. Cinco es el número que cabe en la pantalla de un
 * teléfono junto a la cabecera sin que la tarjeta ocupe el visor entero, y el
 * que deja ver de un vistazo tres tarjetas en escritorio.
 */
const LINEAS_VISIBLES = "line-clamp-5";

/* ===========================================================================
 * Estrellas
 * ======================================================================== */

function IconoEstrella({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.6l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.67l-5.9 3.1 1.13-6.57L2.45 9.54l6.6-.96z" />
    </svg>
  );
}

/**
 * Cinco estrellas con relleno proporcional.
 *
 * Se pintan DOS filas superpuestas: la de abajo apagada y la de arriba llena,
 * recortada al porcentaje exacto. Así un 4,7 muestra una estrella a medias de
 * verdad, sin redondear ni recurrir a medias estrellas dibujadas a mano.
 *
 * Accesibilidad: el conjunto es una sola imagen con texto alternativo
 * ("4,7 de 5 estrellas") y los SVG quedan ocultos al lector de pantalla, que
 * de otro modo anunciaría cinco gráficos sin sentido.
 */
function Estrellas({
  valor,
  etiqueta,
  claro = false,
  tamano = "sm",
}: {
  valor: number;
  etiqueta: string;
  claro?: boolean;
  tamano?: "sm" | "lg";
}) {
  const porcentaje = Math.max(0, Math.min(100, (valor / 5) * 100));
  const medida = tamano === "lg" ? "h-5 w-5" : "h-4 w-4";
  const apagada = claro ? "text-bosque-700" : "text-crema-300";
  const encendida = claro ? "text-bosque-300" : "text-petroleo-600";

  return (
    <span
      role="img"
      aria-label={etiqueta}
      className="relative inline-flex shrink-0 align-middle"
    >
      <span className={`flex gap-0.5 ${apagada}`} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <IconoEstrella key={i} className={`${medida} shrink-0`} />
        ))}
      </span>
      <span
        className={`absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden ${encendida}`}
        style={{ width: `${porcentaje}%` }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <IconoEstrella key={i} className={`${medida} shrink-0`} />
        ))}
      </span>
    </span>
  );
}

/* ===========================================================================
 * Tarjeta de una reseña
 * ======================================================================== */

function TarjetaResena({
  resena,
  claro,
}: {
  resena: ResenaGoogle;
  claro: boolean;
}) {
  const marco = claro
    ? "bg-bosque-800/55 ring-1 ring-bosque-600/50 backdrop-blur-sm"
    : "bg-white ring-1 ring-crema-200/70 shadow-[var(--shadow-tarjeta)]";
  const nombre = claro ? "text-crema-50" : "text-crema-900";
  const apunte = claro ? "text-crema-200/70" : "text-crema-600";

  const inicial = resena.autor.trim().charAt(0).toUpperCase();

  const avatar = resena.foto ? (
    <Image
      src={resena.foto}
      alt=""
      width={44}
      height={44}
      quality={75}
      className="h-11 w-11 shrink-0 rounded-full object-cover"
      /* Decorativa: el nombre del autor ya va escrito al lado en texto. */
      aria-hidden="true"
    />
  ) : (
    <span
      aria-hidden="true"
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-titulo text-base font-semibold",
        claro ? "bg-bosque-700 text-crema-100" : "bg-petroleo-50 text-petroleo-700",
      ].join(" ")}
    >
      {inicial}
    </span>
  );

  const cuerpo = claro ? "text-crema-100/85" : "text-crema-700";

  return (
    <article
      className={[
        "flex h-full flex-col rounded-[var(--radius-generoso)] p-5 sm:p-6",
        marco,
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <p className={`truncate font-titulo text-base font-semibold ${nombre}`}>
            {/* El perfil del autor es parte de la atribución que pide Google. */}
            {resena.perfil ? (
              <a
                href={resena.perfil}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline-offset-4 hover:underline"
              >
                {resena.autor}
              </a>
            ) : (
              resena.autor
            )}
          </p>
          <p className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${apunte}`}>
            <Estrellas
              valor={resena.calificacion}
              etiqueta={`${resena.calificacion} de 5 estrellas`}
              claro={claro}
            />
            <time dateTime={resena.publicadaEn}>{resena.tiempoRelativo}</time>
          </p>
        </div>
      </div>

      {/*
        SIEMPRE recortado al mismo número de líneas, aunque la reseña sea
        corta: es lo que garantiza que todas las tarjetas de la rejilla midan
        igual. Lo que no cabe se lee entero en la ventana del botón de abajo.
      */}
      <p
        className={`mt-4 flex-1 text-[0.9375rem] leading-relaxed ${LINEAS_VISIBLES} ${cuerpo}`}
      >
        {resena.texto}
      </p>

      <LectorResena
        autor={resena.autor}
        texto={resena.texto}
        meta={`${resena.calificacion} de 5 estrellas · ${resena.tiempoRelativo} · Reseña de Google`}
        claro={claro}
      />
    </article>
  );
}

/* ===========================================================================
 * Bloque completo
 * ======================================================================== */

export function ResenasGoogle({
  resumen,
  claro = false,
  titulo = "Lo que dicen quienes ya vinieron",
  className,
}: {
  /** Resultado de `getResenasGoogle()`. La página comprueba que no sea `null`. */
  resumen: ResumenGoogle;
  /** `true` cuando el bloque se apoya sobre una sección oscura (bosque-900). */
  claro?: boolean;
  /** Encabezado del bloque. `null` lo omite si la sección ya trae el suyo. */
  titulo?: string | null;
  className?: string;
}) {
  const { promedio, total, mapsUrl, resenas } = resumen;

  const promedioTexto = formatoPromedio.format(promedio);
  const totalTexto = formatoTotal.format(total);

  const tituloColor = claro ? "text-crema-50" : "text-crema-900";
  const apunte = claro ? "text-crema-200/80" : "text-crema-600";
  const enlace = claro
    ? "text-bosque-200 hover:text-white"
    : "text-petroleo-700 hover:text-petroleo-800";
  const panel = claro
    ? "bg-bosque-800/45 ring-1 ring-bosque-600/50"
    : "bg-white ring-1 ring-crema-200/70 shadow-[var(--shadow-tenue)]";

  return (
    <div className={className}>
      {/* --- Cabecera: promedio, estrellas, total y atribución --- */}
      <div
        className={[
          "flex flex-col gap-5 rounded-[var(--radius-generoso)] p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-7",
          panel,
        ].join(" ")}
      >
        <div className="flex items-center gap-4">
          <p
            className={`font-titulo text-5xl leading-none font-semibold ${tituloColor}`}
          >
            {promedioTexto}
          </p>
          <div>
            <Estrellas
              valor={promedio}
              etiqueta={`${promedioTexto} de 5 estrellas`}
              claro={claro}
              tamano="lg"
            />
            <p className={`mt-1.5 text-sm ${apunte}`}>
              {totalTexto} {total === 1 ? "reseña" : "reseñas"} en Google
            </p>
          </div>
        </div>

        <div className="sm:text-right">
          {/* Atribución obligatoria: de dónde salen estas opiniones. */}
          <p className={`text-xs font-semibold tracking-wide uppercase ${apunte}`}>
            Reseñas de Google
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={`mt-1 inline-block text-sm font-semibold underline-offset-4 transition-colors duration-200 hover:underline ${enlace}`}
          >
            Ver todas en Google Maps
          </a>
        </div>
      </div>

      {titulo ? (
        <h2
          className={`mt-10 font-titulo text-2xl font-semibold sm:text-3xl ${tituloColor}`}
        >
          {titulo}
        </h2>
      ) : null}

      {/*
        REJILLA ALINEADA, NO COLUMNAS.
        Antes esto eran columnas CSS (`columns-3`), con la idea de que cada
        reseña ocupara lo que necesitase. El resultado real era un mosaico:
        tarjetas de altos distintos, bordes que no cuadraban con nada y la
        última columna a media asta. Ahora es una rejilla de verdad, con todas
        las tarjetas del mismo alto —texto recortado a cinco líneas y botón
        «Leer más» en todas— y filas que empiezan y terminan a la misma altura.
      */}
      <ul
        /*
          FLEX con anchos calculados, no `grid-cols-3`. Google devuelve cinco
          reseñas: en una rejilla de tres columnas, la segunda fila queda pegada
          a la izquierda con un hueco a la derecha del tamaño de una tarjeta.
          Con `flex-wrap` + `justify-center`, esas dos últimas quedan centradas
          bajo las tres de arriba. Es el mismo recurso que la rejilla de cabañas
          de la portada, por el mismo motivo.
        */
        className={`${titulo ? "mt-6" : "mt-8"} flex flex-wrap justify-center gap-5`}
      >
        {resenas.map((resena) => (
          <li
            key={`${resena.autor}-${resena.publicadaEn}`}
            className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
          >
            <TarjetaResena resena={resena} claro={claro} />
          </li>
        ))}
      </ul>
    </div>
  );
}
