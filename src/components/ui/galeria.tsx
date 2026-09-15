"use client";

import { Foto } from "@/components/ui/foto";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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

      {actual
        ? createPortal(
            /*
              PORTAL A `document.body`, y no un simple `position: fixed` en el
              sitio donde vive el componente.

              La galería cuelga casi siempre de una `<Seccion diferida>`
              (`src/components/ui/seccion.tsx`), que por defecto lleva
              `content-visibility: auto` para no pintar lo que está fuera de
              pantalla. Esa propiedad, aunque el elemento sea `position:
              relative` normal y corriente, lo convierte también en el
              CONTENEDOR DE POSICIONAMIENTO de cualquier descendiente `fixed`
              —es parte de la especificación de `contain`, no un error de
              Chrome—. El resultado, medido en `/galeria`: el visor dejaba de
              anclarse a la ventana y pasaba a ocupar el alto de la SECCIÓN
              entera (varios miles de píxeles), con la foto pintada muy por
              debajo de lo visible. Sacar el diálogo del árbol con un portal
              lo deja colgando directo de `<body>`, fuera del alcance de
              `content-visibility`, `overflow` o `transform` de cualquier
              antepasado.
            */
            <div
              ref={dialogoRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={idTitulo}
              className="fixed inset-0 z-100 flex flex-col bg-bosque-950/96 backdrop-blur-sm"
            >
              <p id={idTitulo} className="sr-only">
                {titulo ? `Galería de ${titulo}. ` : "Galería. "}
                Imagen {(abierta ?? 0) + 1} de {total}. Usa las flechas del
                teclado para cambiar de foto y la tecla Escape para cerrar.
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
                {/*
                  `max-h-full`/`max-w-full` (porcentajes) NO bastan aquí: el
                  contenedor es un elemento flex (`flex-1` dentro de una
                  columna) y su alto, aunque está resuelto en píxeles, no
                  siempre cuenta como «definido» para que un hijo reparta un
                  porcentaje sobre él — medido en Chrome, la foto se
                  desbordaba por arriba y por abajo en escritorio y quedaba
                  diminuta, con aire de sobra, en el teléfono. `vh`/`vw` son
                  relativos al viewport, no al contenedor, así que no dependen
                  de esa resolución y el tamaño sale estable en cualquier
                  proporción de pantalla. Se descuentan a mano la cabecera y
                  el pie (contador/cerrar arriba, texto alternativo abajo)
                  para que la foto nunca los tape.
                */}
                <Foto
                  key={actual.url}
                  src={actual.url}
                  alt={actual.alt}
                  width={1600}
                  height={1200}
                  sizes="100vw"
                  className="max-h-[calc(100vh-9.5rem)] max-w-[90vw] w-auto rounded-[var(--radius-tarjeta)] object-contain sm:max-w-[85vw]"
                />

                {total > 1 ? (
                  <>
                    <BotonPaso
                      direccion="anterior"
                      alPulsar={() => mover(-1)}
                    />
                    <BotonPaso
                      direccion="siguiente"
                      alPulsar={() => mover(1)}
                    />
                  </>
                ) : null}
              </div>

              <p className="px-6 pb-6 text-center text-sm text-crema-200/90">
                {actual.alt}
              </p>
            </div>,
            document.body,
          )
        : null}
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
            <Foto
              src={imagen.url}
              alt={imagen.alt}
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 92vw"
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
 * Mosaico editorial — FILAS JUSTIFICADAS
 * ---------------------------------------------------------------------------
 * LAS DOS VERSIONES ANTERIORES Y POR QUÉ NINGUNA SERVÍA
 * ---------------------------------------------------------------------------
 * 1. Una rejilla de doce casillas de tamaños distintos. Teselaba perfecto, y
 *    cada casilla imponía su proporción a la foto con `object-cover`: una
 *    vertical metida en una casilla apaisada perdía la mitad de la imagen.
 * 2. Mampostería con `columns` de CSS. Ya no recortaba nada, pero las columnas
 *    terminaban a alturas distintas: el bloque empezaba recto y acababa en
 *    escalera, y ninguna fila cuadraba con la de al lado. Es lo que Cesar vio:
 *    «conserva las proporciones, pero todas las filas deben quedar alineadas
 *    arriba y abajo, también la última».
 *
 * ---------------------------------------------------------------------------
 * FILAS JUSTIFICADAS (lo que hacen Flickr y Google Fotos)
 * ---------------------------------------------------------------------------
 * Cada fila tiene un ALTO COMÚN y los anchos se reparten según la relación de
 * aspecto de cada foto. Nada se recorta —el ancho sale de la proporción, no al
 * revés— y todas las fotos de una fila empiezan y terminan a la misma altura.
 *
 * Cada foto lleva dos declaraciones:
 *
 *   · `flex-grow: proporción` — el ancho de la fila se reparte en proporción a
 *     la relación de aspecto de cada foto…
 *   · `aspect-ratio: proporción` — …y por tanto todas las de la fila acaban con
 *     el mismo alto. Es aritmética, no un ajuste a ojo: si a cada foto le toca
 *     un ancho r·k, su alto es k para todas.
 *
 * LAS FILAS SE AGRUPAN AQUÍ, NO LAS DECIDE EL NAVEGADOR
 * -----------------------------------------------------
 * La primera versión de esto dejaba que `flex-wrap` cortara las filas solo,
 * con `flex-basis` proporcional. Funciona de maravilla… hasta que a la última
 * fila le toca UNA sola foto: entonces esa foto se estira a todo el ancho y se
 * ve cuatro veces más alta que las de arriba. Pasaba en la tercera página.
 *
 * Ahora las filas se arman en `repartirEnFilas()` —de tres en tres, con la
 * regla de que ninguna se quede con una sola— y a partir de `md` la fila va en
 * `flex-nowrap`: no puede partirse, pase lo que pase con las proporciones. Por
 * debajo de `md` sí se permite que una fila de tres se rompa en dos líneas
 * (tres fotos en 390 px serían sellos de correos); cada línea sigue llenando el
 * ancho, así que tampoco ahí queda hueco.
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

/**
 * Reparte las fotos en filas para las pantallas anchas.
 *
 * Tres por fila, que es lo que deja ver la foto a un tamaño decente en 1440 px
 * sin que la página se vuelva un rollo infinito. La única excepción es el
 * resto: si sobra UNA foto, las dos últimas filas se rehacen como 2 + 2 en vez
 * de 3 + 1. Una fila de una sola foto a todo el ancho rompe el ritmo de la
 * página entera, y es justo lo que había que arreglar.
 */
function repartirEnFilas<T>(elementos: T[], porFila = 3): T[][] {
  const filas: T[][] = [];
  for (let i = 0; i < elementos.length; i += porFila) {
    filas.push(elementos.slice(i, i + porFila));
  }
  const ultima = filas.at(-1);
  if (filas.length > 1 && ultima && ultima.length === 1) {
    const penultima = filas[filas.length - 2];
    /* 3 + 1 → 2 + 2: se baja la última foto de la penúltima fila. */
    ultima.unshift(penultima.pop() as T);
  }
  return filas;
}

function MosaicoEditorial({
  imagenes,
  desplazamiento,
  prioridad,
  alAbrir,
  registrar,
}: PropsMosaico & { desplazamiento: number }) {
  /* La posición dentro de la página se conserva al agrupar: es la que usan el
     visor y la devolución del foco. */
  const filas = repartirEnFilas(
    imagenes.map((imagen, posicion) => ({ imagen, posicion })),
  );

  return (
    <ul className="pagina-galeria flex flex-col gap-3 sm:gap-4">
      {filas.map((fila) => (
        <li
          key={fila[0].imagen.url}
          className="flex flex-wrap gap-3 sm:gap-4 md:flex-nowrap [--alto-fila:11rem] sm:[--alto-fila:13rem]"
        >
          {fila.map(({ imagen, posicion }) => {
            const relacion = proporcion(imagen);
            return (
        <div
          key={`${imagen.url}-${posicion}`}
          className="min-w-0"
          style={{
            flexGrow: relacion,
            flexShrink: 1,
            flexBasis: `calc(${relacion} * var(--alto-fila))`,
          }}
        >
          <button
            type="button"
            ref={(elemento) => registrar(posicion, elemento)}
            onClick={() => alAbrir(desplazamiento + posicion)}
            className={`${CLASES_MINIATURA} h-full`}
            style={{ aspectRatio: relacion }}
            aria-label={`Ampliar: ${imagen.alt}`}
          >
            <Foto
              src={imagen.url}
              alt={imagen.alt}
              fill
              /* 92vw en el teléfono, no 48: la mampostería va a UNA foto por
                 fila por debajo de `md` (`flex-wrap`), así que un `sizes` de
                 media pantalla hacía que el navegador eligiera la variante de
                 480 px para pintarla a 654 y la estirara. Un `sizes` que miente
                 no ahorra peso: produce fotos blandas. */
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 92vw"
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
            );
          })}
        </li>
      ))}
    </ul>
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
                      "flex size-11 items-center justify-center rounded-full font-titulo text-sm font-semibold tabular-nums",
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
      className="flex size-11 items-center justify-center rounded-full bg-white text-petroleo-800 ring-1 ring-crema-300/80 transition-all duration-200 hover:bg-petroleo-50 hover:ring-petroleo-300 disabled:pointer-events-none disabled:opacity-35"
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
        <Foto
          src={portada.url}
          alt={portada.alt}
          fill
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
                  <Foto
                    src={imagen.url}
                    alt={imagen.alt}
                    fill
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
