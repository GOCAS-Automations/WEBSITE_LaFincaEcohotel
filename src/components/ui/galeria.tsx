"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ImagenGaleria } from "@/lib/contenido";

/**
 * Galería con visor a pantalla completa.
 *
 * ACCESIBILIDAD — lo que se resolvió y por qué
 * --------------------------------------------
 * · Cada miniatura es un `<button>` real, no un `div` con `onClick`: se enfoca
 *   con tabulador y se activa con Intro o barra espaciadora sin código extra.
 * · El visor es un `role="dialog" aria-modal`, con el foco movido al botón de
 *   cerrar al abrir y DEVUELTO a la miniatura de origen al cerrar. Perder el
 *   punto de retorno es el error más común de un lightbox.
 * · El tabulador queda atrapado dentro del visor mientras está abierto: si se
 *   escapa, el visitante navega a ciegas por la página de atrás.
 * · Teclas: Escape cierra, ← y → cambian de foto.
 * · El fondo se bloquea con `overflow: hidden` en `<body>` y se restaura al
 *   cerrar, incluso si el componente se desmonta con el visor abierto.
 */

type Disposicion = "mosaico" | "ficha" | "editorial";

type PropsGaleria = {
  imagenes: ImagenGaleria[];
  /**
   * `mosaico`  — cuadrícula uniforme (uso general).
   * `ficha`    — una foto grande y hasta cuatro secundarias (ficha de cabaña).
   * `editorial`— mosaico de piezas de distintos tamaños, POR PÁGINAS.
   */
  disposicion?: Disposicion;
  /** Se antepone al texto alternativo del visor para dar contexto. */
  titulo?: string;
  /** `priority` en la primera imagen: solo cuando la galería abre la página. */
  prioridad?: boolean;
  /** Fotos por página en la disposición `editorial`. */
  porPagina?: number;
};

export function Galeria({
  imagenes,
  disposicion = "mosaico",
  titulo,
  prioridad = false,
  porPagina = 12,
}: PropsGaleria) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  /**
   * Índice al que hay que devolver el foco cuando la miniatura de origen no
   * está montada todavía (pasa al cerrar el visor en una página distinta de
   * la que se abrió). Ver el efecto de más abajo.
   */
  const [focoPendiente, setFocoPendiente] = useState<number | null>(null);

  const disparadores = useRef<(HTMLButtonElement | null)[]>([]);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const cabeceraRef = useRef<HTMLDivElement>(null);
  const idTitulo = useId();

  const total = imagenes.length;
  const paginado = disposicion === "editorial" && total > porPagina;
  const paginas = paginado ? Math.ceil(total / porPagina) : 1;

  /** Página (1-based) en la que vive un índice global. */
  const paginaDe = useCallback(
    (indice: number) => (paginado ? Math.floor(indice / porPagina) + 1 : 1),
    [paginado, porPagina],
  );

  const visibles = useMemo(() => {
    if (!paginado) return imagenes;
    const desde = (pagina - 1) * porPagina;
    return imagenes.slice(desde, desde + porPagina);
  }, [imagenes, paginado, pagina, porPagina]);

  const desplazamiento = paginado ? (pagina - 1) * porPagina : 0;

  /*
   * Ojo: `cerrar` y `mover` leen `abierta` y NO usan la forma de actualizador
   * (`setAbierta(x => …)`). Es a propósito: dentro de un actualizador no se
   * pueden disparar otros `setState` —React puede invocarlo dos veces en modo
   * estricto— y aquí hay que mover a la vez el visor, la página y el foco.
   */
  const cerrar = useCallback(() => {
    if (abierta === null) return;
    /* Si el visor viajó a otra página, primero hay que traer de vuelta esa
       página: la miniatura de origen puede estar desmontada. El foco se pide
       aparte, cuando el elemento vuelva a existir. */
    setPagina(paginaDe(abierta));
    setFocoPendiente(abierta);
    setAbierta(null);
  }, [abierta, paginaDe]);

  const mover = useCallback(
    (paso: number) => {
      if (abierta === null) return;
      const siguiente = (abierta + paso + total) % total;
      /* El visor recorre TODA la colección, no la página: llegar al final de
         una página y toparse con un muro sería incomprensible. La cuadrícula de
         atrás se sincroniza para que, al cerrar, el visitante siga donde está
         mirando. */
      setPagina(paginaDe(siguiente));
      setAbierta(siguiente);
    },
    [abierta, total, paginaDe],
  );

  /** Devuelve el foco cuando la miniatura vuelve a existir en el árbol. */
  useEffect(() => {
    if (focoPendiente === null) return;
    const elemento = disparadores.current[focoPendiente];
    if (elemento) elemento.focus();
    setFocoPendiente(null);
  }, [focoPendiente, pagina]);

  useEffect(() => {
    if (abierta === null) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }
      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        mover(1);
        return;
      }
      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        mover(-1);
        return;
      }
      if (evento.key !== "Tab") return;

      // Trampa de foco dentro del visor.
      const enfocables = dialogoRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!enfocables || enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alPulsar);
    const foco = window.setTimeout(() => cerrarRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = anterior;
      window.clearTimeout(foco);
    };
  }, [abierta, cerrar, mover]);

  /** Cambio de página desde los controles: sube al inicio del mosaico. */
  function irAPagina(destino: number) {
    const siguiente = Math.min(Math.max(destino, 1), paginas);
    if (siguiente === pagina) return;
    setPagina(siguiente);
    /* `scrollIntoView` sin opciones respeta el `scroll-behavior` del documento,
       que `globals.css` pone en `auto` con `prefers-reduced-motion`. */
    cabeceraRef.current?.scrollIntoView({ block: "start" });
  }

  if (total === 0) return null;

  const actual = abierta === null ? null : imagenes[abierta];
  const desde = desplazamiento + 1;
  const hasta = desplazamiento + visibles.length;

  const registrar = (posicion: number, elemento: HTMLButtonElement | null) => {
    disparadores.current[desplazamiento + posicion] = elemento;
  };

  return (
    <>
      <div ref={cabeceraRef} className="scroll-mt-28" />

      {disposicion === "ficha" ? (
        <MosaicoFicha
          imagenes={imagenes}
          prioridad={prioridad}
          alAbrir={setAbierta}
          registrar={registrar}
        />
      ) : disposicion === "editorial" ? (
        <MosaicoEditorial
          key={pagina}
          imagenes={visibles}
          desplazamiento={desplazamiento}
          prioridad={prioridad && pagina === 1}
          alAbrir={setAbierta}
          registrar={registrar}
        />
      ) : (
        <MosaicoUniforme
          imagenes={imagenes}
          prioridad={prioridad}
          alAbrir={setAbierta}
          registrar={registrar}
        />
      )}

      {paginado ? (
        <Paginacion
          pagina={pagina}
          paginas={paginas}
          desde={desde}
          hasta={hasta}
          total={total}
          alCambiar={irAPagina}
        />
      ) : null}

      {actual ? (
        <div
          ref={dialogoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitulo}
          className="fixed inset-0 z-100 flex flex-col bg-bosque-950/96 backdrop-blur-sm"
        >
          <p id={idTitulo} className="sr-only">
            {titulo ? `Galería de ${titulo}. ` : "Galería. "}
            Imagen {(abierta ?? 0) + 1} de {total}. Usa las flechas del teclado
            para cambiar de foto y la tecla Escape para cerrar.
          </p>

          <div className="flex items-center justify-between px-5 py-4 text-crema-100 sm:px-8">
            <span className="font-titulo text-sm tabular-nums">
              {(abierta ?? 0) + 1} / {total}
            </span>
            <button
              ref={cerrarRef}
              type="button"
              onClick={cerrar}
              className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-white/20"
              aria-label="Cerrar la galería"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 sm:px-16">
            <Image
              key={actual.url}
              src={actual.url}
              alt={actual.alt}
              width={1600}
              height={1200}
              quality={90}
              sizes="100vw"
              className="max-h-full w-auto max-w-full rounded-[var(--radius-tarjeta)] object-contain"
            />

            {total > 1 ? (
              <>
                <BotonPaso direccion="anterior" alPulsar={() => mover(-1)} />
                <BotonPaso direccion="siguiente" alPulsar={() => mover(1)} />
              </>
            ) : null}
          </div>

          <p className="px-6 pb-6 text-center text-sm text-crema-200/90">
            {actual.alt}
          </p>
        </div>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------------- */

type PropsMosaico = {
  imagenes: ImagenGaleria[];
  prioridad: boolean;
  alAbrir: (indice: number) => void;
  /** `posicion` es relativa a lo que se está pintando, no al total. */
  registrar: (posicion: number, elemento: HTMLButtonElement | null) => void;
};

const CLASES_MINIATURA =
  "group relative block w-full overflow-hidden rounded-[var(--radius-tarjeta)] bg-crema-200 " +
  "shadow-[var(--shadow-tenue)] transition-all duration-300 ease-out hover:shadow-[var(--shadow-tarjeta)]";

function MosaicoUniforme({
  imagenes,
  prioridad,
  alAbrir,
  registrar,
}: PropsMosaico) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {imagenes.map((imagen, indice) => (
        <li key={imagen.url}>
          <button
            type="button"
            ref={(elemento) => registrar(indice, elemento)}
            onClick={() => alAbrir(indice)}
            className={`${CLASES_MINIATURA} aspect-4/5`}
            aria-label={`Ampliar: ${imagen.alt}`}
          >
            <Image
              src={imagen.url}
              alt={imagen.alt}
              fill
              quality={68}
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              priority={prioridad && indice === 0}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ===========================================================================
 * Mosaico editorial — mampostería que RESPETA la proporción de cada foto
 * ---------------------------------------------------------------------------
 * QUÉ HABÍA ANTES Y POR QUÉ SE CAMBIÓ
 * ---------------------------------------------------------------------------
 * Había una rejilla de doce casillas de tamaños distintos que teselaba
 * perfectamente en los tres anchos. Sobre el papel estaba muy bien resuelta;
 * en la pantalla tenía un problema que ninguna cuenta arregla: cada casilla
 * imponía su proporción a la foto con `object-cover`. Una vertical de 3:4
 * metida en una casilla apaisada de 2:1 perdía la mitad de la imagen, y en
 * estas fotos lo que se perdía era justo lo que se quería enseñar —el bosque
 * sobre el deck, el valle bajo la hamaca, la altura de la ducha entre los
 * árboles—.
 *
 * Ahora las fotos se reparten en columnas y CADA UNA conserva su proporción
 * original: no se recorta ni un píxel. Los «tamaños variados» que pedía el
 * diseño siguen ahí, pero ya no los inventa una rejilla: los pone la
 * fotografía, que es de donde tienen que salir.
 *
 * CÓMO
 * ----
 * `columns` de CSS (2 en teléfono, 3 en tableta, 4 en escritorio) con
 * `break-inside: avoid` en cada pieza. Es la única forma de conseguir
 * mampostería sin JavaScript, sin medir nada en el cliente y sin un segundo
 * repintado al cargar. Las columnas se equilibran solas.
 *
 * La contrapartida de `columns` es que el orden visual baja por columnas en
 * vez de avanzar por filas. En una galería de fotos no importa —no hay una
 * secuencia que leer— y se compensa con las páginas de doce: cada página es un
 * bloque corto y coherente.
 *
 * CERO SALTO DE MAQUETACIÓN
 * -------------------------
 * Cada pieza declara su `aspect-ratio` con las medidas reales del archivo
 * (vienen del manifiesto, ver `src/lib/fotos.ts`), así que el navegador reserva
 * el hueco exacto ANTES de descargar la imagen. Las fotos pegadas a mano desde
 * el panel no traen medidas: para esas se asume 4:3, que es la proporción más
 * común, y se dice aquí para que nadie lo tome por un descuido.
 * ======================================================================== */

/** Proporción `ancho / alto` de una foto, con respaldo seguro. */
function proporcion(imagen: ImagenGaleria): number {
  if (
    typeof imagen.ancho === "number" &&
    typeof imagen.alto === "number" &&
    imagen.ancho > 0 &&
    imagen.alto > 0
  ) {
    return imagen.ancho / imagen.alto;
  }
  return 4 / 3;
}

function MosaicoEditorial({
  imagenes,
  desplazamiento,
  prioridad,
  alAbrir,
  registrar,
}: PropsMosaico & { desplazamiento: number }) {
  return (
    <div className="pagina-galeria columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
      {imagenes.map((imagen, posicion) => (
        <div
          key={`${imagen.url}-${posicion}`}
          /* `break-inside-avoid` impide que una foto se parta entre dos
             columnas; `mb-*` hace de separación vertical, porque `gap` en
             `columns` solo separa en horizontal. */
          className="mb-3 break-inside-avoid sm:mb-4"
        >
          <button
            type="button"
            ref={(elemento) => registrar(posicion, elemento)}
            onClick={() => alAbrir(desplazamiento + posicion)}
            className={CLASES_MINIATURA}
            style={{ aspectRatio: proporcion(imagen) }}
            aria-label={`Ampliar: ${imagen.alt}`}
          >
            <Image
              src={imagen.url}
              alt={imagen.alt}
              fill
              /* Solo 68, 75 y 90 están declaradas en `next.config.ts`: una
                 calidad fuera de esa lista revienta en ejecución. */
              quality={75}
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
              /* `object-cover` sobre una caja que YA tiene la proporción de la
                 foto no recorta nada: solo cubre el píxel de redondeo. */
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              priority={prioridad && posicion === 0}
            />
            {/*
              Velo que solo aparece al pasar el cursor. No lleva texto: la foto
              es el contenido y taparla con una etiqueta sería quitarle lo
              único que la galería tiene que dar.
            */}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-petroleo-950/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          </button>
        </div>
      ))}
    </div>
  );
}


/* ===========================================================================
 * Paginación
 * ======================================================================== */

/**
 * Controles de página.
 *
 * · El recuento ("Fotos 13–24 de 31") va en un `aria-live="polite"`: quien no
 *   ve el mosaico necesita que algo le diga que la página cambió, porque el
 *   cambio en sí no mueve el foco.
 * · Los números son botones, no enlaces: la página vive en el estado del
 *   componente y no en la dirección. Meterla en la URL habría obligado a
 *   `useSearchParams` y a envolver la galería en otro `<Suspense>` a cambio de
 *   nada: nadie comparte "la página 3 de la galería".
 * · `aria-current="page"` marca la actual; el resto se anuncia con su número.
 */
function Paginacion({
  pagina,
  paginas,
  desde,
  hasta,
  total,
  alCambiar,
}: {
  pagina: number;
  paginas: number;
  desde: number;
  hasta: number;
  total: number;
  alCambiar: (destino: number) => void;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <p
        aria-live="polite"
        className="font-titulo text-sm text-crema-600 tabular-nums"
      >
        Fotos {desde}–{hasta} de {total}
      </p>

      <nav
        aria-label="Paginación de la galería"
        className="flex items-center gap-1.5"
      >
        <BotonPagina
          etiqueta="Página anterior"
          alPulsar={() => alCambiar(pagina - 1)}
          deshabilitado={pagina === 1}
        >
          <path d="M15 5l-7 7 7 7" />
        </BotonPagina>

        <ul className="flex items-center gap-1.5">
          {Array.from({ length: paginas }, (_, indice) => indice + 1).map(
            (numero) => {
              const activa = numero === pagina;
              return (
                <li key={numero}>
                  <button
                    type="button"
                    onClick={() => alCambiar(numero)}
                    aria-current={activa ? "page" : undefined}
                    aria-label={`Página ${numero} de ${paginas}`}
                    className={[
                      "flex size-10 items-center justify-center rounded-full font-titulo text-sm font-semibold tabular-nums",
                      "transition-all duration-200 ease-out",
                      activa
                        ? "bg-petroleo-600 text-white shadow-[0_2px_8px_-2px_rgba(2,117,112,0.5)]"
                        : "bg-white text-petroleo-800 ring-1 ring-crema-300/80 hover:bg-petroleo-50 hover:ring-petroleo-300",
                    ].join(" ")}
                  >
                    {numero}
                  </button>
                </li>
              );
            },
          )}
        </ul>

        <BotonPagina
          etiqueta="Página siguiente"
          alPulsar={() => alCambiar(pagina + 1)}
          deshabilitado={pagina === paginas}
        >
          <path d="M9 5l7 7-7 7" />
        </BotonPagina>
      </nav>
    </div>
  );
}

function BotonPagina({
  etiqueta,
  alPulsar,
  deshabilitado,
  children,
}: {
  etiqueta: string;
  alPulsar: () => void;
  deshabilitado: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={deshabilitado}
      aria-label={etiqueta}
      className="flex size-10 items-center justify-center rounded-full bg-white text-petroleo-800 ring-1 ring-crema-300/80 transition-all duration-200 hover:bg-petroleo-50 hover:ring-petroleo-300 disabled:pointer-events-none disabled:opacity-35"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------------- */

function MosaicoFicha({
  imagenes,
  prioridad,
  alAbrir,
  registrar,
}: PropsMosaico) {
  const [portada, ...resto] = imagenes;
  const secundarias = resto.slice(0, 4);
  const ocultas = imagenes.length - 1 - secundarias.length;

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
      <button
        type="button"
        ref={(elemento) => registrar(0, elemento)}
        onClick={() => alAbrir(0)}
        className={`${CLASES_MINIATURA} rounded-tl-[3.5rem] lg:col-span-3`}
        /*
          La portada de la ficha usa su PROPIA proporción, acotada entre 3:4 y
          16:10. Antes era 16:10 fija: las portadas verticales —la del balcón de
          la Cabaña 04, por ejemplo— perdían el bosque de arriba y la baranda de
          abajo, que es justo lo que hace especial a esa cabaña. El acotamiento
          existe para que una foto muy alargada no empuje el resto de la ficha
          fuera de la pantalla.
        */
        style={{
          aspectRatio: Math.min(1.6, Math.max(0.75, proporcion(portada))),
        }}
        aria-label={`Ampliar: ${portada.alt}`}
      >
        <Image
          src={portada.url}
          alt={portada.alt}
          fill
          quality={90}
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority={prioridad}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </button>

      {secundarias.length > 0 ? (
        /*
         * En escritorio la columna de miniaturas tiene que medir EXACTAMENTE lo
         * mismo que la foto grande de al lado. Con proporciones fijas no cuadra
         * —la portada es 4:3 y las miniaturas 3:2— y queda un hueco al final de
         * la columna. Por eso aquí las filas se reparten la altura disponible
         * (`grid-rows-2` + `h-full`) y la proporción solo manda en móvil, donde
         * las miniaturas van una debajo de otra.
         */
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-2 lg:h-full lg:grid-cols-2 lg:grid-rows-2">
          {secundarias.map((imagen, posicion) => {
            const indice = posicion + 1;
            const esUltima =
              ocultas > 0 && posicion === secundarias.length - 1;
            return (
              <li key={imagen.url} className="lg:min-h-0">
                <button
                  type="button"
                  ref={(elemento) => registrar(indice, elemento)}
                  onClick={() => alAbrir(indice)}
                  className={`${CLASES_MINIATURA} aspect-4/3 lg:aspect-auto lg:h-full`}
                  /* La última miniatura muestra «+6» y antes se anunciaba como
                     «Ver las 11 fotos de la galería»: un nombre accesible que
                     no contiene el texto visible rompe la navegación por voz
                     (quien dicta lee «+6» y el comando no encuentra nada). */
                  aria-label={
                    esUltima
                      ? `+${ocultas} fotos más: ver la galería completa`
                      : `Ampliar: ${imagen.alt}`
                  }
                >
                  <Image
                    src={imagen.url}
                    alt={imagen.alt}
                    fill
                    quality={68}
                    sizes="(min-width: 1024px) 20vw, 48vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  {esUltima ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-bosque-950/55 font-titulo text-lg font-semibold text-white"
                    >
                      +{ocultas}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function BotonPaso({
  direccion,
  alPulsar,
}: {
  direccion: "anterior" | "siguiente";
  alPulsar: () => void;
}) {
  const esAnterior = direccion === "anterior";
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={esAnterior ? "Foto anterior" : "Foto siguiente"}
      className={[
        "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full",
        "bg-white/10 text-white transition-colors duration-200 hover:bg-white/25",
        esAnterior ? "left-2 sm:left-4" : "right-2 sm:right-4",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={esAnterior ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
