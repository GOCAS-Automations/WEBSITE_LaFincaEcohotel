import { Foto } from "@/components/ui/foto";

/**
 * Atmósfera del sitio: bosque real, neblina, resplandor, patrón y botánica.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------------------------------------------------------
 * La Finca no es "un hotel con fotos de bosque": es un bosque de niebla con
 * cabañas dentro. Un sitio hecho solo de rectángulos apilados sobre fondo crema
 * puede estar bien resuelto y aun así no contar eso. Estas piezas son las que
 * ponen el lugar en la pantalla —bruma que se mueve, la luz del amanecer,
 * bordes de sección que son laderas y no líneas rectas—.
 *
 * ---------------------------------------------------------------------------
 * DE DÓNDE SALE CADA PIEZA (manual de marca `IV LA FINCA.pdf`)
 * ---------------------------------------------------------------------------
 * · `Resplandor`     — el degradado de luz verde-crema que entra por una
 *                      esquina del petróleo. Está en CASI TODAS las páginas
 *                      del manual: es la firma visual de la marca.
 * · `PatronColibri`  — la página 12 del manual, entera: el isotipo repetido a
 *                      baja opacidad. Se construye con `mask-image` sobre el
 *                      PNG oficial, así que el logo NO se redibuja ni se
 *                      altera (el manual lo prohíbe expresamente). Sustituyó a
 *                      un colibrí dibujado a mano en SVG que, a tamaño real y
 *                      con poca opacidad, no se leía como un ave sino como un
 *                      garabato — y que además no era el ave de la marca.
 * · `RamaBotanica`   — la ilustración de línea fina de la papelería, las tazas
 *                      y los colgadores de puerta (páginas 13–16).
 * · `FondoBosque`    — fotografía REAL de las zonas comunes bajo el petróleo,
 *                      en lugar del verde plano que había antes.
 *
 * Lo que se RETIRÓ: las «motas de luz» (puntitos dorados flotando). No salían
 * del manual, el dorado ni siquiera está en la paleta oficial, y sobre el
 * verde se leían como purpurina en vez de como polen.
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
 * Resplandor de luz
 * ======================================================================== */

/**
 * El degradado de luz de la marca.
 *
 * En el manual, el petróleo NUNCA es un color plano: siempre tiene una zona
 * donde la luz entra y lo aclara hasta casi el verde claro. Esa luz es la
 * neblina del amanecer, y es lo que separa la identidad de La Finca de
 * "cualquier hotel con verde oscuro".
 *
 * Va en `mix-blend-screen`, así que aclara lo que tenga debajo —color plano o
 * fotografía— en vez de pintarse encima como una mancha.
 */
export function Resplandor({
  desde = "derecha",
  className,
}: {
  /** Esquina por la que entra la luz. Alternarla entre secciones evita que se
   *  lea como un elemento de plantilla repetido. */
  desde?: "derecha" | "izquierda";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={[
        "resplandor",
        desde === "izquierda" ? "resplandor--izquierda" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

/* ===========================================================================
 * Patrón de colibríes
 * ======================================================================== */

/**
 * El isotipo repetido a baja opacidad, como en la página 12 del manual.
 *
 * Se pinta con `mask-image` sobre `/marca/icono.png`: el PNG tiene canal alfa,
 * así que su silueta recorta un color plano. Esto importa —el manual prohíbe
 * alterar el logo— porque no estamos redibujando nada: estamos usando el
 * archivo oficial tal cual, solo que como máscara.
 *
 * `tono="claro"` para fondos claros (petróleo bajísimo) y el de por defecto
 * para fondos oscuros (verde claro de marca al 13 %).
 */
export function PatronColibri({
  tono = "oscuro",
  className,
}: {
  tono?: "oscuro" | "claro";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={[
        "patron-colibri",
        tono === "claro" ? "patron-colibri--claro" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

/* ===========================================================================
 * Rama botánica de línea
 * ======================================================================== */

/**
 * La rama de hojas de trazo fino del manual (papelería, tazas, colgadores).
 *
 * Está dibujada a mano, no calcada: son hojas lanceoladas alternas sobre un
 * tallo curvo, con tres bayas al final, que es exactamente la construcción de
 * la ilustración del manual. Va SIEMPRE en `currentColor` para poder pintarla
 * en verde claro sobre petróleo o en petróleo sobre crema, que son los dos
 * usos que aparecen en la guía.
 *
 * Respira muy despacio (28 s) gracias a la clase `.botanica`: apenas un grado
 * de giro. Si se nota el movimiento, está mal calibrado.
 */
export function RamaBotanica({
  ritmo = "normal",
  espejo = false,
  className,
}: {
  ritmo?: "normal" | "lenta";
  /** Voltea la rama para que dos no se lean como la misma calcomanía. */
  espejo?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 220"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[
        "botanica",
        ritmo === "lenta" ? "botanica--lenta" : "",
        espejo ? "-scale-x-100" : "",
        "pointer-events-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Tallo principal: una sola curva larga, sin puntos de inflexión
          simétricos (una curva simétrica se lee como un adorno de librería). */}
      <path d="M18 214C30 176 44 140 66 108C86 79 112 55 142 38" />

      {/* Hojas alternas. Cada una es una lanceta cerrada con su nervadura:
          dos trazos por hoja, que es lo mínimo para que parezca dibujada y no
          recortada. Los tamaños decrecen hacia la punta, como en una rama. */}
      <g>
        <path d="M40 168C24 162 14 148 12 130C31 131 44 144 48 160Z" />
        <path d="M40 168C36 158 32 149 25 140" />

        <path d="M57 137C64 118 80 107 99 105C94 124 80 137 63 141Z" />
        <path d="M57 137C68 131 78 124 90 114" />

        <path d="M76 107C64 96 58 80 59 63C76 70 86 85 86 101Z" />
        <path d="M76 107C76 96 75 87 70 76" />

        <path d="M98 82C107 66 123 57 141 57C135 74 121 85 105 87Z" />
        <path d="M98 82C108 77 117 71 128 63" />

        <path d="M120 60C112 49 109 35 112 21C126 28 133 42 131 56Z" />
        <path d="M120 60C121 50 121 42 118 32" />
      </g>

      {/* Las tres bayas del extremo: el detalle que aparece en las tazas y en
          el membrete del manual. Sin ellas la rama se queda en "unas hojas". */}
      <g fill="currentColor" stroke="none">
        <circle cx="144" cy="34" r="3.1" />
        <circle cx="133" cy="24" r="2.2" />
        <circle cx="150" cy="46" r="1.9" />
      </g>
    </svg>
  );
}

/* ===========================================================================
 * Fondo de bosque
 * ======================================================================== */

/**
 * Una sección oscura hecha de bosque de verdad.
 *
 * Antes las zonas oscuras del sitio eran `bg-bosque-900`: un verde plano,
 * correcto y muerto. Ahora son una fotografía real de las zonas comunes con
 * cuatro capas encima, en este orden exacto y por este motivo:
 *
 *   1. **La foto**, en `object-cover`. Es el lugar.
 *   2. **El velo de petróleo** (85–92 %). No es para "oscurecer": es para que
 *      la fotografía ENTRE en la paleta. Sin él, una foto de bosque verde
 *      amarillento al lado del petróleo de marca se ven como dos verdes que
 *      discuten. Con él, la foto ES el petróleo.
 *   3. **La bruma a la deriva**, en `screen`, que es lo único que se mueve.
 *   4. **El resplandor y el patrón de colibríes**, la firma de la marca.
 *
 * El velo además es lo que garantiza el contraste: sobre la foto sola, un
 * titular blanco bailaría entre 2:1 y 12:1 según la zona. Con el velo al 88 %
 * el peor caso sigue pasando AA holgadamente.
 */
export function FondoBosque({
  imagen,
  /**
   * Intensidad del velo de petróleo.
   * `denso` para secciones con texto largo o tarjetas encima; `suave` cuando
   * la foto es la protagonista y el texto va en un bloque con su propio fondo.
   */
  velo = "denso",
  patron = true,
  resplandor = "derecha",
  className,
}: {
  imagen: string;
  velo?: "denso" | "suave";
  patron?: boolean;
  resplandor?: "derecha" | "izquierda" | "ninguno";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={["absolute inset-0 overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Foto
        src={imagen}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />

      <div
        className={
          velo === "denso"
            ? "absolute inset-0 bg-petroleo-950/92"
            : "absolute inset-0 bg-petroleo-950/80"
        }
      />

      <Neblina tono="bosque" className="mix-blend-screen" />

      {resplandor !== "ninguno" ? <Resplandor desde={resplandor} /> : null}
      {patron ? <PatronColibri /> : null}
    </div>
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

/* ===========================================================================
 * Corte orgánico sobre una sección con FOTOGRAFÍA de fondo
 * ======================================================================== */

/**
 * El borde ondulado de una sección que tiene una imagen de fondo.
 *
 * ---------------------------------------------------------------------------
 * EL FALLO QUE ESTO ARREGLA
 * ---------------------------------------------------------------------------
 * `DivisorOrganico` dibuja la onda DENTRO de la sección anterior, rellena con
 * el color de la siguiente. Funciona perfecto cuando la siguiente sección es un
 * color plano. Cuando la siguiente sección es una FOTO —la de planes, la de
 * cierre, cualquiera con `FondoBosque`— el resultado es el fallo que se veía en
 * el sitio: primero una franja de verde plano con forma de ladera, y debajo el
 * borde recto de la fotografía. La onda y la foto eran dos cosas distintas
 * pegadas una encima de la otra, y se notaba.
 *
 * ---------------------------------------------------------------------------
 * LA SOLUCIÓN
 * ---------------------------------------------------------------------------
 * Se le da la vuelta al problema. La sección con foto empieza donde tiene que
 * empezar —su fotografía llega hasta el borde mismo— y la onda se dibuja ENCIMA
 * de ella, rellena con el color de la sección VECINA. El resultado es que la
 * imagen de fondo queda recortada por la forma: la foto se ve hasta el filo de
 * la onda, y no hay ni un píxel de color plano donde debería haber fotografía.
 *
 * Es el mismo resultado que un `clip-path`, sin sus dos costes: no crea un
 * contexto de recorte que obligue a recomponer la sección entera en cada
 * pintado, y el alto de la onda se mide en píxeles fijos en vez de escalar con
 * el alto de la sección (con `clipPathUnits="objectBoundingBox"` una sección
 * alta se lleva una ola gigante y una corta, un rizo).
 *
 * `color` es, por tanto, el color de la sección VECINA, no el de esta —al
 * revés que en `DivisorOrganico`—. Y va siempre en pares: `borde="superior"`
 * arriba y `borde="inferior"` abajo, para que la sección no tenga un extremo
 * orgánico y el otro recto.
 */
export function CorteOrganico({
  perfil = "cresta",
  color,
  borde,
  espejo = false,
  alto = 96,
  className,
}: {
  perfil?: keyof typeof PERFILES;
  /** Color de la sección VECINA (`fill-white`, `fill-crema-50`…). */
  color: string;
  borde: "superior" | "inferior";
  espejo?: boolean;
  alto?: number;
  className?: string;
}) {
  /*
    El posicionamiento va en un envoltorio y NO en el `className` del divisor.
    `DivisorOrganico` ya trae `relative` escrito, y en Tailwind gana la clase
    que el CSS generado escriba después, no la que se ponga al final del
    atributo: `position: relative` se emite después de `absolute`, así que un
    `absolute` pasado por `className` NO surte efecto. Se vio en la primera
    captura —las dos ondas salieron dentro del contenedor, a media sección, en
    vez de pegadas a sus bordes—.

    El envoltorio va además a todo el ANCHO DE LA SECCIÓN: el contenedor de
    lectura tiene 76 rem y márgenes, y una onda que respete ese ancho deja dos
    franjas rectas a los lados.
  */
  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-x-0 z-20",
        /* El píxel negativo evita la rendija que deja el redondeo del
           navegador entre el borde de la sección y el de la onda. */
        borde === "superior" ? "top-0 -mt-px" : "bottom-0 -mb-px",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <DivisorOrganico
        perfil={perfil}
        color={color}
        espejo={espejo}
        /* Arriba hay que voltear el perfil: el relleno de las rutas está en la
           mitad de ABAJO del `viewBox`, y en el borde superior lo que tiene que
           quedar pintado es la mitad de arriba. */
        invertido={borde === "superior"}
        alto={alto}
      />
    </div>
  );
}

/**
 * Traducción de la clase de FONDO de una sección a su clase de RELLENO SVG.
 *
 * Las páginas declaran el fondo de la sección anterior como `bg-crema-50`
 * —que es como se lee— y el corte necesita `fill-crema-50`. Escribir las dos
 * clases literales aquí no es redundancia: Tailwind v4 solo genera el CSS de
 * las clases que encuentra escritas en el código, así que una cadena compuesta
 * en tiempo de ejecución (`fill-${tono}`) no existiría en la hoja de estilos.
 */
export const RELLENO_DE_FONDO: Record<string, string> = {
  "bg-white": "fill-white",
  "bg-crema-50": "fill-crema-50",
  "bg-niebla-100": "fill-niebla-100",
  "bg-brote-50": "fill-brote-50",
  "bg-petroleo-900": "fill-petroleo-900",
};

/* ===========================================================================
 * Colibríes sueltos
 * ======================================================================== */

/**
 * Unos pocos colibríes en vuelo, colocados a mano.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE, SI YA HAY `PatronColibri`
 * ---------------------------------------------------------------------------
 * El patrón es un mosaico: repite el isotipo cada 320 px, en tresbolillo, hasta
 * llenar la superficie. Sobre una sección corta es una textura y funciona.
 * Sobre una página larga —la de cabañas mide cinco pantallas— deja de leerse
 * como textura y se lee como lo que es: una cuadrícula de logotipos. Cesar lo
 * dijo con todas las letras: «hay demasiados colibríes y se nota el patrón».
 *
 * Aquí hay CINCO aves, con posiciones, tamaños, giros y opacidades escritos uno
 * a uno. Ninguna comparte fila ni columna con otra, ninguna está a la misma
 * altura que otra, y los tamaños no siguen progresión: es lo que hace que se
 * lean como individuos en vuelo y no como un fondo generado.
 *
 * Van en porcentajes del alto de la sección, así que se reparten igual en una
 * página corta y en una larga. Las dos últimas se esconden por debajo de `lg`:
 * en un teléfono, con la mitad de ancho, cinco aves vuelven a parecer patrón.
 */
type AveSuelta = {
  top: string;
  left: string;
  ancho: string;
  giro: string;
  opacidad: number;
  /** Solo se pinta a partir de `lg`: en móvil cinco aves vuelven a ser patrón. */
  soloAncho?: boolean;
};

const COLIBRIES_SUELTOS: AveSuelta[] = [
  { top: "6%", left: "4%", ancho: "5.5rem", giro: "-14deg", opacidad: 0.1 },
  { top: "23%", left: "88%", ancho: "4rem", giro: "22deg", opacidad: 0.08 },
  {
    top: "48%",
    left: "10%",
    ancho: "3.25rem",
    giro: "8deg",
    opacidad: 0.07,
    soloAncho: true,
  },
  { top: "62%", left: "82%", ancho: "6.5rem", giro: "-6deg", opacidad: 0.09 },
  {
    top: "86%",
    left: "22%",
    ancho: "4.5rem",
    giro: "17deg",
    opacidad: 0.07,
    soloAncho: true,
  },
];

export function ColibriesSueltos({
  tono = "claro",
  className,
}: {
  /** `claro` = sobre fondo claro (el ave se pinta en petróleo). */
  tono?: "claro" | "oscuro";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={["pointer-events-none absolute inset-0 overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
    >
      {COLIBRIES_SUELTOS.map((ave) => (
        <span
          key={`${ave.top}-${ave.left}`}
          className={[
            "colibri-suelto absolute block aspect-square",
            tono === "claro" ? "colibri-suelto--claro" : "",
            ave.soloAncho ? "hidden lg:block" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            top: ave.top,
            left: ave.left,
            width: ave.ancho,
            opacity: ave.opacidad,
            /* El giro va en el `transform` de este elemento y la deriva en el
               de un pseudoelemento (ver `globals.css`): dos transformaciones en
               la misma propiedad se pisan. */
            transform: `rotate(${ave.giro})`,
          }}
        />
      ))}
    </div>
  );
}
