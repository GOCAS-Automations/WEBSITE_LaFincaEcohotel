/**
 * Atmósfera del sitio: neblina, colibríes, motas de luz y divisores orgánicos.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------------------------------------------------------
 * La Finca no es "un hotel con fotos de bosque": es un bosque de niebla con
 * cabañas dentro. Un sitio hecho solo de rectángulos apilados sobre fondo crema
 * puede estar bien resuelto y aun así no contar eso. Estas piezas son las que
 * ponen el lugar en la pantalla —bruma que se mueve, un colibrí suspendido,
 * bordes de sección que son laderas y no líneas rectas—.
 *
 * TODO es servidor y TODO es decorativo:
 *   · Cero `"use client"`: son etiquetas y rutas SVG, no hay estado.
 *   · Cero JavaScript de animación: el movimiento vive en `globals.css` y lo
 *     resuelve el compositor (solo `transform` y `opacity`).
 *   · Cero dependencias nuevas: ni una librería de animación entra al paquete
 *     que descarga el visitante.
 *   · `aria-hidden` y `pointer-events: none` en todo: quien navega con lector
 *     de pantalla no se entera de que esto existe, que es exactamente lo que
 *     debe pasar con la decoración.
 *   · `prefers-reduced-motion` lo deja quieto (ver `globals.css`).
 */

/* ===========================================================================
 * Neblina
 * ======================================================================== */

type PropsNeblina = {
  /**
   * `clara`  — bruma blanca: sobre fotografía oscura.
   * `bosque` — bruma verde pálida: dentro de una sección de bosque profundo.
   * `verde`  — bruma gris verdosa: sobre crema o blanco, donde el blanco sería
   *            invisible.
   */
  tono?: "clara" | "bosque" | "verde";
  className?: string;
};

/**
 * Tres capas de bruma a la deriva.
 *
 * Se monta DENTRO de un contenedor con `position: relative` y se estira a todo
 * él. No lleva `inset` propio negativo: si la sección tiene `overflow-hidden`
 * la bruma se recorta sola en los bordes, que es lo que hace que parezca que
 * entra y sale del encuadre.
 */
export function Neblina({ tono = "clara", className }: PropsNeblina) {
  return (
    <div
      aria-hidden="true"
      className={["neblina", `neblina--${tono}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="neblina__capa" />
      <span className="neblina__capa" />
      <span className="neblina__capa" />
    </div>
  );
}

/* ===========================================================================
 * Motas de luz
 * ======================================================================== */

/**
 * Cinco motas de polen subiendo muy despacio. Solo tienen sentido sobre fondo
 * oscuro: sobre crema no se ven, y si se les sube la opacidad para que se vean,
 * parecen suciedad en la pantalla.
 */
export function Motas({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={["motas", className].filter(Boolean).join(" ")}
    >
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/* ===========================================================================
 * Colibrí
 * ======================================================================== */

type PropsColibri = {
  /** Variante de ritmo, para que dos colibríes nunca floten al unísono. */
  ritmo?: "normal" | "lento" | "pausado";
  /** Mira a la izquierda por defecto; `derecha` lo voltea. */
  mirando?: "izquierda" | "derecha";
  className?: string;
};

/**
 * Colibrí de línea fina.
 *
 * Es una **silueta de trazo**, no un dibujo animado: cuerpo y cola en línea de
 * 1,4 px y las alas rellenas al 16 % para dar volumen sin peso. Un colibrí
 * caricaturesco —ojo grande, colores planos— habría convertido un ecohotel en
 * un parque temático.
 *
 * El aleteo real de un colibrí son unos cincuenta golpes por segundo. Animarlo
 * a esa velocidad se ve como un error de renderizado, así que las alas
 * "respiran" cada 3,6 s cambiando de escala y opacidad: la lectura es "está
 * vivo y suspendido", no "está aleteando".
 */
export function Colibri({
  ritmo = "normal",
  mirando = "izquierda",
  className,
}: PropsColibri) {
  return (
    <svg
      viewBox="0 0 100 66"
      aria-hidden="true"
      focusable="false"
      className={[
        "colibri",
        ritmo === "lento" ? "colibri--lento" : "",
        ritmo === "pausado" ? "colibri--pausado" : "",
        mirando === "derecha" ? "-scale-x-100" : "",
        "pointer-events-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Alas: el único relleno del dibujo. Van primero para quedar detrás. */}
      <g className="colibri__ala">
        {/* La lejana, corta y empinada: la que da la profundidad. */}
        <path
          d="M48 33C50 22 54 12 60 3C59 16 55 27 52 36Z"
          fill="currentColor"
          fillOpacity="0.09"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeLinejoin="round"
        />
        {/* La cercana, larga y barrida hacia atrás: la que da el vuelo. */}
        <path
          d="M52 32C61 21 74 10 93 3C79 13 65 25 57 38Z"
          fill="currentColor"
          fillOpacity="0.15"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </g>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Cola: dos plumas finas, en el eje del cuerpo (no abiertas en V:
            abiertas parecen cola de pez). */}
        <path d="M67 43C76 43 84 45 93 48" />
        <path d="M68 47C75 50 81 54 87 60" />
        {/* Pico: largo, como el de los colibríes del bosque de niebla. */}
        <path d="M8 26L30 31" strokeWidth="1.35" />
      </g>

      {/* Cuerpo y cabeza, de una sola línea cerrada. */}
      <path
        d="M30 31C36 25 46 24 54 29C62 34 68 40 70 45C63 49 52 50 44 46C36 42 30 36 30 31Z"
        fill="currentColor"
        fillOpacity="0.07"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <circle cx="37.5" cy="31.5" r="1.05" fill="currentColor" />
    </svg>
  );
}

/* ===========================================================================
 * Divisores orgánicos
 * ======================================================================== */

/**
 * Los tres perfiles.
 *
 * Ninguno es una onda seno: las "waves" genéricas de plantilla se reconocen a
 * un kilómetro porque son simétricas y periódicas. Estos perfiles tienen los
 * puntos de control descolocados a propósito —crestas de alturas distintas,
 * valles que no se repiten— para que se lean como una ladera vista entre la
 * bruma y no como un adorno de librería.
 */
const PERFILES = {
  /** Cresta de montaña: la más marcada. Separa dos mundos de color. */
  cresta:
    "M0,120 V70 C90,52 170,86 268,78 C372,69 430,26 548,31 C664,36 726,84 850,80 C962,77 1030,38 1152,44 C1256,49 1330,74 1440,62 V120 Z",
  /** Loma larga y baja, con el punto alto desplazado a la derecha. */
  loma:
    "M0,120 V96 C160,78 300,92 452,72 C604,52 700,10 872,14 C1044,18 1146,62 1276,70 C1350,74 1400,68 1440,60 V120 Z",
  /** Banco de niebla: amplitud mínima, casi un borde deshilachado. */
  bruma:
    "M0,120 V88 C180,70 320,96 520,90 C720,84 830,54 1020,60 C1180,65 1300,88 1440,78 V120 Z",
} as const;

/** Segunda capa de la bruma, más baja y más pálida: da profundidad. */
const PERFIL_BRUMA_FONDO =
  "M0,120 V102 C220,90 380,108 600,100 C820,92 940,68 1140,74 C1280,78 1370,96 1440,90 V120 Z";

type PropsDivisor = {
  perfil?: keyof typeof PERFILES;
  /**
   * Clase de color de relleno del divisor: SIEMPRE el color de la sección que
   * viene DESPUÉS (`fill-crema-50`, `fill-bosque-900`…). El divisor es el
   * borde superior de la siguiente sección, dibujado dentro de la anterior.
   */
  color: string;
  /** Voltea el perfil en horizontal, para no repetir la misma ladera. */
  espejo?: boolean;
  /** Da la vuelta al divisor: úsalo arriba de una sección, no abajo. */
  invertido?: boolean;
  /** Alto en píxeles. Menos de 56 px se lee como una raya; más de 140, pesa. */
  alto?: number;
  className?: string;
};

/**
 * Borde orgánico entre dos secciones.
 *
 * Se apoya en `preserveAspectRatio="none"`: el perfil se estira a lo ancho del
 * visor, así que la misma ruta funciona a 390 px y a 1440 px sin recortes ni
 * franjas en blanco. Va en `block` (no `inline`) para que no arrastre la línea
 * base del texto y deje una rendija de un píxel entre secciones.
 */
export function DivisorOrganico({
  perfil = "cresta",
  color,
  espejo = false,
  invertido = false,
  alto = 96,
  className,
}: PropsDivisor) {
  const transformaciones = [
    espejo ? "scaleX(-1)" : "",
    invertido ? "scaleY(-1)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      aria-hidden="true"
      className={["pointer-events-none relative w-full", className]
        .filter(Boolean)
        .join(" ")}
      style={{ height: alto }}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-0 block h-full w-full"
        style={transformaciones ? { transform: transformaciones } : undefined}
      >
        {perfil === "bruma" ? (
          <path d={PERFIL_BRUMA_FONDO} className={color} opacity={0.45} />
        ) : null}
        <path d={PERFILES[perfil]} className={color} />
      </svg>
    </div>
  );
}
