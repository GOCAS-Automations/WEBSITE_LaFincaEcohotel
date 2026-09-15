/**
 * Catálogo de las FOTOS OFICIALES del hotel.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES ESTO Y POR QUÉ EXISTE
 * ---------------------------------------------------------------------------
 * En septiembre de 2026 el cliente entregó, por Drive, la carpeta
 * `ACTUALIZADAS IMG`: una subcarpeta por cabaña más «Zonas Comunes», con las
 * fotos definitivas del hotel. Un script (`scripts/importar-fotos-drive.mjs`)
 * las subió al bucket bajo el prefijo `drive/` y dejó el inventario en
 * `supabase/seed/imagenes-manifest-v2.json`.
 *
 * Este módulo pone NOMBRE y TEXTO ALTERNATIVO a cada una de esas fotos. Sin él,
 * el sitio y el seed tendrían que repetir rutas como `drive/cabana-03/07.webp`
 * en una docena de sitios, y nadie sabría al leerlas qué se ve en la foto.
 *
 * Las fotos VIEJAS (`galeria/`, `cabanas/`, `sitio/…`, `lugar/…`) venían del
 * WordPress a 225×300 px, con recortes duros y —en algunas— toallas bordadas
 * «Finca Villarreal», que es el nombre anterior del hotel. Donde hay una foto
 * nueva equivalente, la vieja NO se usa. Las que quedaron sin usar se borran
 * del bucket con `npm run imagenes:limpiar`.
 *
 * ---------------------------------------------------------------------------
 * LAS FICHAS NO SON FOTOS
 * ---------------------------------------------------------------------------
 * Cada carpeta del Drive trae un archivo «0. PORTADA …»: no es una fotografía
 * sino una pieza gráfica con la lista de lo que incluye la cabaña. En el
 * manifiesto son `tipo: "ficha"`. NO se publican en ninguna galería —serían
 * texto dentro de una imagen, ilegible en móvil e invisible para Google— y
 * además llevan impreso el Facebook antiguo «Finca Villarreal». Lo que dicen
 * ya está en las amenidades y la descripción de cada cabaña, que sí son texto.
 *
 * ---------------------------------------------------------------------------
 * SOBRE LOS TEXTOS ALTERNATIVOS
 * ---------------------------------------------------------------------------
 * Están escritos MIRANDO cada foto, una por una. Describen lo que se ve, no lo
 * que nos gustaría vender: quien navega con lector de pantalla tiene que
 * hacerse la misma idea del lugar que quien la ve.
 */

import { medio } from "./sitio";
import type { ImagenGaleria } from "./contenido";

/**
 * Dirección pública de una foto oficial: `foto("zonas-comunes/02")`.
 *
 * Apunta a `web/`, NO a `drive/`. Los archivos del Drive vienen de un export
 * de Instagram y traen impresa en el pie la línea «Check-in: 3:00 pm |
 * Check-out: 1:00 pm | www.lafincaecohotel.com». En el sitio del propio hotel
 * esa franja sobra —la dirección es la página que se está mirando y los
 * horarios están escritos como texto— y aparecía cincuenta veces: en cada
 * tarjeta, en la galería entera y a pantalla completa en el hero.
 *
 * `npm run imagenes:recortar` genera las versiones de `web/`: las mismas fotos
 * sin ese 15 % inferior. No se retoca nada más. Los originales intactos se
 * quedan en `drive/` y el script de limpieza los protege.
 */
export function foto(ruta: string): string {
  return medio(`web/${ruta}.webp`);
}

/* ===========================================================================
 * EL SELLO DE MARCA («flag») DE LAS FOTOS
 * ---------------------------------------------------------------------------
 * Las 53 fotos del Drive llevan pegado en el BORDE SUPERIOR DERECHO un sello
 * blanco con el isotipo y el wordmark «LA FINCA · Eco-Hotel»: una pestaña de
 * esquinas redondeadas que cuelga del borde de arriba. Está en TODAS —se midió
 * una por una con `npm run imagenes:flag`, que anota el campo `flag` en los dos
 * manifiestos—, así que no existe la opción de «elegir una foto sin sello».
 *
 * El sello en sí queda bien: es la marca del hotel. Lo que queda mal es
 * CORTARLO. En cuanto la foto entra en un contenedor con forma —un arco, un
 * radio muy grande, un recorte orgánico— la forma muerde justo esa esquina y el
 * sello aparece partido por la mitad. Es lo que pasaba en «Bienvenidos».
 *
 * DE AHÍ LAS TRES REGLAS QUE SIGUE EL SITIO:
 *
 *   1. Un contenedor con forma NO puede tocar la esquina superior derecha. Los
 *      arcos y los radios grandes se llevan a la esquina superior IZQUIERDA o a
 *      las de abajo.
 *   2. Cuando el contenedor recorta por `object-cover`, se ancla el encuadre
 *      con `object-position: right top` (`CLASE_FOTO_CON_FLAG`): así la esquina
 *      del sello se ve ENTERA, nunca a medias.
 *   3. Para el hero de la portada —la única superficie donde la foto se ve a
 *      pantalla completa— hay variantes recortadas SIN sello
 *      (`npm run imagenes:hero`).
 *
 * `ZONA_FLAG` es la caja del sello en fracciones del archivo publicado
 * (`web/`, que ya perdió el 15 % inferior). El extremo medido en las 47 fotos
 * es x0 = 0,71 y y1 = 0,22; se redondea hacia fuera con margen.
 * ======================================================================== */

export const ZONA_FLAG = { x0: 0.68, x1: 1, y0: 0, y1: 0.24 } as const;

/**
 * Clases para una foto con sello dentro de un contenedor que recorta: ancla el
 * encuadre en la esquina superior derecha, que es donde vive el sello.
 */
export const CLASE_FOTO_CON_FLAG = "object-cover object-right-top";

/* ===========================================================================
 * Zonas comunes
 * ======================================================================== */

export const ZONAS_COMUNES: ImagenGaleria[] = [
  {
    url: foto("zonas-comunes/02"),
    alt: "Corredor techado de La Finca con jardineras y baranda de madera, abierto al bosque de niebla del Km 18",
    ancho: 2400,
    alto: 1530,
  },
  {
    url: foto("zonas-comunes/01"),
    alt: "Deck techado de La Finca con comedor de vidrio y sillas, frente a las montañas",
    ancho: 2400,
    alto: 2720,
  },
  {
    url: foto("zonas-comunes/06"),
    alt: "Piscina de agua fría de La Finca con su chorrera, frente a las montañas y las nubes",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("zonas-comunes/03"),
    alt: "Deck de inmersión metálico suspendido entre los árboles del bosque de niebla",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("zonas-comunes/04"),
    alt: "Ducha de madera al aire libre de La Finca, en medio del bosque",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("zonas-comunes/05"),
    alt: "Las cabañas de techo azul de La Finca sobre la ladera, con los senderos y los jardines",
    ancho: 1536,
    alto: 1741,
  },
  {
    url: foto("zonas-comunes/07"),
    alt: "Mesa y sillas de piedra bajo las farolas de La Finca, entre la neblina del atardecer",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("zonas-comunes/08"),
    alt: "Pareja abrigada frente a la fogata encendida de La Finca, de noche",
    ancho: 941,
    alto: 1421,
  },
];

/**
 * Atajos con nombre para las zonas comunes que se usan como fondo o portada.
 *
 * Tenerlos aquí y no repartidos por los componentes es lo que permite cambiar
 * la foto del hero —o la del fondo de la sección de planes— en un solo sitio.
 * En el sitio publicado, además, todas estas son editables desde el panel: esto
 * es el respaldo en código, no la única fuente.
 */
export const FOTO = {
  /** Fondo de las secciones oscuras: el deck suspendido entre los árboles.
   *  Es la más verde y la más cerrada, que es lo que hace falta detrás de un
   *  velo de petróleo: una foto con cielo se convierte en una mancha clara. */
  fondoBosque: foto("zonas-comunes/03"),
  /** Cierre de la portada: la neblina del atardecer con las farolas. */
  atardecer: foto("zonas-comunes/07"),
  /** Vista general del hotel, para «el lugar» y la tarjeta social. */
  panoramica: foto("zonas-comunes/05"),
  /** Piscina y montañas: cabecera de «el lugar». */
  piscina: foto("zonas-comunes/06"),
  /** Fogata de noche. */
  fogata: foto("zonas-comunes/08"),
  /** Ducha en el bosque. */
  duchaBosque: foto("zonas-comunes/04"),
  /** Deck techado con comedor. */
  deckComedor: foto("zonas-comunes/01"),
} as const;

/* ===========================================================================
 * LOS HEROS
 * ---------------------------------------------------------------------------
 * Un hero ocupa el ancho entero de la ventana, así que es la única superficie
 * del sitio donde se ve el tamaño REAL del archivo. Y el material del hotel es
 * pequeño: las fotos del Drive son exportaciones de Instagram de 1448 px de
 * ancho, con algunas de 1086 y una de 941.
 *
 * `next/image` NO amplía (su `sharp.resize()` lleva `withoutEnlargement: true`),
 * de modo que una foto de 941 px llega al navegador con 941 px y es él quien la
 * estira hasta los 1440 de la ventana. De ahí que Cesar viera borrosos justo
 * tres heros —Conócenos, Preguntas y Contacto—: eran los tres que no llegaban
 * al ancho de la pantalla.
 *
 * DE AHÍ LAS DOS REGLAS:
 *
 *   1. **Ninguna foto de menos de ~1440 px de ancho puede ser un hero.** No es
 *      una preferencia: por debajo de eso, el navegador amplía. Las tres que no
 *      llegaban cambiaron de foto (ver `scripts/generar-heros.mjs`, que es la
 *      lista razonada de qué foto usa cada página).
 *   2. **El archivo del hero se corta del original de `drive/`**, no de la copia
 *      de `web/`, y se guarda con `webp({ quality: 90 })`. Así hay UNA
 *      generación de pérdida antes de `next/image` en vez de dos. En el sitio
 *      van además con `quality={90}` y `sizes="100vw"`.
 *
 * Se regeneran con `npm run imagenes:hero -- --subir`. Como todo lo demás, esto
 * es el RESPALDO: en el sitio publicado cada hero es editable desde el panel.
 * ======================================================================== */

/** Dirección de una variante de hero: `hero("faq")`. */
function hero(nombre: string): string {
  return medio(`web/heroes/${nombre}.webp`);
}

export const HERO = {
  /**
   * Portada, escritorio: el corredor abierto al valle (2400×1180).
   *
   * La foto no cambia —le gusta al cliente—, pero el archivo sí: sale del
   * original de 2400 px y va a calidad 90. Sigue recortado por arriba para
   * dejar fuera el sello de marca: a pantalla completa, y a dos dedos del
   * logotipo real de la barra, se leía como una marca de agua de banco de
   * imágenes.
   */
  portadaEscritorio: hero("portada-escritorio"),
  /**
   * Portada, móvil: el deck techado, en vertical (1750×2720). La apaisada,
   * metida en una pantalla de teléfono, se queda en un trozo de baranda.
   * También sin sello, recortando por la derecha: aquí no se puede recortar por
   * arriba, porque el techo de guadua ES la foto.
   */
  portadaMovil: hero("portada-movil"),
  /** `/alojamientos` — balcón techado de la Cabaña 03 (1448×923). Sin cambio. */
  alojamientos: hero("alojamientos"),
  /** `/experiencias` — jacuzzi bajo el árbol de la Cabaña 02 (1448×923). */
  experiencias: hero("experiencias"),
  /** `/conocenos` — las cabañas sobre la ladera, banda de 1536×1000. */
  conocenos: hero("conocenos"),
  /** `/galeria` — la neblina del atardecer con las farolas (1448×923). */
  galeria: hero("galeria"),
  /** `/faq` — terraza con hamaca de la Cabaña 02 (1448×923). */
  faq: hero("faq"),
  /** `/contacto` — la chimenea de la Cabaña 05 (1448×923). */
  contacto: hero("contacto"),
  /** `/reservar` — habitación del nivel superior de la Cabaña 01 (1448×923). */
  reservar: hero("reservar"),
} as const;

/* ===========================================================================
 * Galerías de las cinco cabañas
 * ---------------------------------------------------------------------------
 * El ORDEN es el de la ficha, no el del archivo: primero el rasgo que hace
 * única a esa cabaña (§2 de `docs/DATOS_CLIENTE.md`), porque es la foto que se
 * usa de portada en las tarjetas y en el zigzag; después la habitación, las
 * zonas de estar y la terraza; el baño al final. Nadie reserva por el baño,
 * pero todo el mundo quiere verlo antes de pagar.
 *
 * Las cabañas 03 y 04 son gemelas y COMPARTEN zona social: varias fotos del
 * Drive se repiten entre las dos carpetas con distinto archivo. Cada ficha
 * muestra las suyas —es lo que el huésped va a tener—, pero la galería general
 * del sitio toma solo las de la 03 para no publicar la misma imagen dos veces.
 * ======================================================================== */

export const GALERIA_CABANA_01: ImagenGaleria[] = [
  /*
    La portada NO es el jacuzzi, aunque sea su rasgo más vendible: la foto del
    jacuzzi de la 01 y la de la 02 son casi idénticas —piedra, toallas
    enrolladas, agua turquesa— y puestas una al lado de la otra en la rejilla de
    la portada parecían la misma cabaña repetida. Abre la habitación del nivel
    superior, que además es lo que la hace única (es la única de dos plantas).
  */
  {
    url: foto("cabana-01/01"),
    alt: "Habitación de la Cabaña 01 en el nivel superior, con cama doble bajo el techo de madera",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-01/06"),
    alt: "Jacuzzi privado al aire libre de la Cabaña 01, con toallas y vista a las montañas",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-01/03"),
    alt: "Balcón de la Cabaña 01 con hamaca, mesa para dos y vista al bosque de niebla",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-01/05"),
    alt: "Cocina y comedor del nivel inferior de la Cabaña 01, con barra, sillas altas y sillones",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-01/02"),
    alt: "Sala del nivel inferior de la Cabaña 01, con cojines, tapete y plantas",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-01/04"),
    alt: "Baño privado de la Cabaña 01, con azulejos azules y hortensias",
    ancho: 1448,
    alto: 923,
  },
];

export const GALERIA_CABANA_02: ImagenGaleria[] = [
  {
    url: foto("cabana-02/05"),
    alt: "Jacuzzi privado de la Cabaña 02 bajo el árbol, rodeado de guadua, con toallas dobladas",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-02/04"),
    alt: "Terraza de la Cabaña 02 con hamaca, mesa para dos y vista a las montañas",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-02/01"),
    alt: "Habitación de la Cabaña 02 con cama doble, paredes de madera y mininevera",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-02/03"),
    alt: "Estación de café y aromáticas de la Cabaña 02, junto a la ventana",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-02/02"),
    alt: "Baño privado de la Cabaña 02 con ducha, lavamanos y espejo",
    ancho: 1448,
    alto: 923,
  },
];

export const GALERIA_CABANA_03: ImagenGaleria[] = [
  {
    url: foto("cabana-03/02"),
    alt: "Balcón techado de la Cabaña 03 con hamaca y comedor, frente al bosque de niebla",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-03/11"),
    alt: "Habitación de la Cabaña 03 con cama doble y ventanal al balcón",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-03/10"),
    alt: "Comedor en el balcón de la Cabaña 03, con hamaca y vista al valle",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-03/09"),
    alt: "Jacuzzi exterior de las cabañas 03 y 04, con toallas y vista al bosque",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-03/06"),
    alt: "Zona social techada de las cabañas 03 y 04, con cocina de isla y comedor",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-03/07"),
    alt: "Sala compartida de las cabañas 03 y 04, con sillones de madera y ventanales al bosque",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-03/04"),
    alt: "Rincón de la Cabaña 03 con batas, cojines y mesa baja junto al ventanal",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-03/03"),
    alt: "Interior de la Cabaña 03 con mininevera, estación de café y ventana al bosque",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-03/01"),
    alt: "Estación de café de la Cabaña 03, con cafetera, jarra y vasos",
    ancho: 1087,
    alto: 1230,
  },
  {
    url: foto("cabana-03/08"),
    alt: "Fachada blanca y techo azul de la Cabaña 03, con jardineras de flores",
    ancho: 1122,
    alto: 1192,
  },
  {
    url: foto("cabana-03/05"),
    alt: "Baño privado de la Cabaña 03 con ducha, lavamanos y espejo",
    ancho: 1086,
    alto: 1231,
  },
];

export const GALERIA_CABANA_04: ImagenGaleria[] = [
  /*
    LA PORTADA ES LA HORIZONTAL, NO EL BALCÓN.
    Las otras cuatro cabañas abren con una foto APAISADA y muestran el sello de
    marca de la esquina superior derecha; esta abría con una vertical y, metida
    en la caja 16/10 de la tarjeta y del zigzag, perdía justo esa franja: era la
    única de las cinco portadas sin sello, y se notaba puestas en fila.

    De paso resuelve otro problema: la 03 y la 04 son gemelas y las dos abrían
    con el mismo balcón con hamaca. Ahora la 03 abre con su balcón y la 04 con
    su rincón de café, que es la misma cabaña contada por otro lado.
  */
  {
    url: foto("cabana-04/09"),
    alt: "Rincón de estar y estación de café de la Cabaña 04, con ventana al bosque de niebla",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-04/05"),
    alt: "Balcón de la Cabaña 04 con hamaca, comedor redondo y vista al bosque de niebla",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-04/04"),
    alt: "Habitación de la Cabaña 04 con cama doble y ventanal al balcón",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-04/11"),
    alt: "Jacuzzi exterior de las cabañas 03 y 04, rodeado de guadua, con toallas",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-04/06"),
    alt: "Zona social techada de las cabañas 03 y 04, con cocina de isla y comedor",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-04/07"),
    alt: "Sala compartida de las cabañas 03 y 04, con sillones de madera y ventanales al bosque",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-04/02"),
    alt: "Rincón de la Cabaña 04 con cojines y mesa baja junto a la ventana",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-04/08"),
    alt: "Batas térmicas y lámpara junto al ventanal de la Cabaña 04",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-04/01"),
    alt: "Estación de café de la Cabaña 04, con cafetera, jarra y vasos",
    ancho: 1087,
    alto: 1230,
  },
  {
    url: foto("cabana-04/10"),
    alt: "Fachada blanca y techo azul de la Cabaña 04, con jardineras de flores",
    ancho: 1122,
    alto: 1192,
  },
  {
    url: foto("cabana-04/03"),
    alt: "Baño privado de la Cabaña 04 con ducha, lavamanos y toallas",
    ancho: 1086,
    alto: 1231,
  },
];

export const GALERIA_CABANA_05: ImagenGaleria[] = [
  {
    url: foto("cabana-05/05"),
    alt: "Chimenea encendida de la Cabaña 05, la única cabaña que tiene, con cojines y juegos de mesa",
    ancho: 1448,
    alto: 923,
  },
  {
    url: foto("cabana-05/03"),
    alt: "Cama doble de la Cabaña 05 junto al ventanal, con vista panorámica a la montaña",
    ancho: 1122,
    alto: 1192,
  },
  {
    url: foto("cabana-05/04"),
    alt: "Comedor para dos de la Cabaña 05 frente al ventanal, con vista al valle",
    ancho: 1122,
    alto: 1192,
  },
  {
    url: foto("cabana-05/01"),
    alt: "Sala y cocina de la Cabaña 05, con barra de piedra y ventanal al bosque",
    ancho: 1031,
    alto: 1296,
  },
  {
    url: foto("cabana-05/06"),
    alt: "Jacuzzi privado exterior de la Cabaña 05, con toallas y vista al jardín",
    ancho: 1086,
    alto: 1231,
  },
  {
    url: foto("cabana-05/02"),
    alt: "Baño privado de la Cabaña 05 con ducha, lavamanos y plantas",
    ancho: 1122,
    alto: 1192,
  },
];

/** Galerías por `slug` de cabaña: lo que usa el seed y el respaldo en código. */
export const GALERIAS_POR_CABANA: Record<string, ImagenGaleria[]> = {
  "cabana-01": GALERIA_CABANA_01,
  "cabana-02": GALERIA_CABANA_02,
  "cabana-03": GALERIA_CABANA_03,
  "cabana-04": GALERIA_CABANA_04,
  "cabana-05": GALERIA_CABANA_05,
};

/* ===========================================================================
 * Experiencias
 * ======================================================================== */

/**
 * Las fotos de las experiencias, por nombre del extra.
 *
 * Las dos primeras son las ÚNICAS fotos del sitio viejo que sobreviven al
 * cambio, y por un motivo simple: la carpeta del Drive no trae ninguna foto de
 * la mesa de aniversario ni de la bandeja de cumpleaños, y son las dos únicas
 * piezas de material donde se ve lo que el hotel monta en la cabaña. Están
 * revisadas una por una: son de La Finca, no llevan el nombre antiguo por
 * ninguna parte y la calidad aguanta el tamaño al que se publican.
 *
 * ⚠️ **DEL FONDUE NO HAY FOTO.** Ni en el Drive ni en el sitio viejo existe una
 * imagen de la fondue de frutas y chocolate. Se publica con una foto de
 * AMBIENTE —el comedor para dos de la Cabaña 05, frente al ventanal— porque es
 * donde se sirve, y se anota aquí para que nadie la confunda con una foto del
 * producto. Si el hotel envía una foto real, se reemplaza en el panel
 * («Experiencias» → Fondue → Imagen) y esta línea sobra.
 *
 * El script de limpieza del bucket las conserva explícitamente
 * (`scripts/limpiar-bucket.mjs`) porque las lee de la tabla `extras`.
 */
export const FOTOS_EXPERIENCIAS: Record<string, string> = {
  "Aniversario con Amor": medio(
    "experiencias/pw-finca-aniversario-con-amor-21-2-21.webp",
  ),
  "Cumpleaños con Amor": medio("experiencias/experiencia-cumpleanos-30.webp"),
  /* Foto de ambiente, no del plato: ver el aviso de arriba. */
  Fondue: foto("cabana-05/04"),
};

/* ===========================================================================
 * Galería general del sitio
 * ======================================================================== */

/**
 * Las fotos de `/galeria`, sin una sola repetida.
 *
 * Se arma a mano y no concatenando las cinco galerías porque las cabañas 03 y
 * 04 comparten zona social y jacuzzi: pegarlas todas publicaría la misma
 * escena dos veces con distinta URL, y el visitante no ve URLs, ve fotos.
 *
 * El orden alterna zonas comunes y cabañas para que al recorrerla se entienda
 * que La Finca es un lugar entero, no un catálogo de habitaciones.
 *
 * SON 36, Y ESO NO ES CASUAL: la galería pagina de doce en doce, así que 36 son
 * TRES PÁGINAS LLENAS. Con 32 la última página traía ocho fotos y su última
 * fila quedaba coja. Las cuatro que se añadieron son las únicas que faltaban
 * sin repetir escena: el baño de la 01, el rincón de la mininevera de la 03, el
 * baño de la 02 y el de la 05.
 */
export const GALERIA_GENERAL: ImagenGaleria[] = [
  ZONAS_COMUNES[0],
  GALERIA_CABANA_01[0],
  ZONAS_COMUNES[2],
  GALERIA_CABANA_02[0],
  ZONAS_COMUNES[1],
  GALERIA_CABANA_05[0],
  ZONAS_COMUNES[5],
  GALERIA_CABANA_03[0],
  ZONAS_COMUNES[3],
  GALERIA_CABANA_01[2],
  ZONAS_COMUNES[6],
  /*
    De la Cabaña 04 entra su portada —el rincón de café— y NO su balcón. Es
    gemela de la 03 y su balcón con hamaca es, a ojos de quien mira, la misma
    escena que la de la 03 desde dos metros más cerca. En la ficha de cada
    cabaña las dos tienen que estar —es lo que cada huésped va a tener—, pero
    en la galería general habrían parecido una foto repetida.
  */
  GALERIA_CABANA_04[0],

  ZONAS_COMUNES[4],
  GALERIA_CABANA_05[1],
  ZONAS_COMUNES[7],
  GALERIA_CABANA_03[3],
  GALERIA_CABANA_01[1],
  GALERIA_CABANA_02[1],
  GALERIA_CABANA_03[4],
  GALERIA_CABANA_05[2],
  GALERIA_CABANA_04[9],
  GALERIA_CABANA_01[3],
  GALERIA_CABANA_03[5],
  GALERIA_CABANA_02[2],

  GALERIA_CABANA_05[3],
  GALERIA_CABANA_03[9],
  GALERIA_CABANA_01[4],
  GALERIA_CABANA_04[7],
  GALERIA_CABANA_05[4],
  GALERIA_CABANA_03[6],
  GALERIA_CABANA_02[3],
  GALERIA_CABANA_03[1],

  /* Las cuatro que completan la tercera página. */
  GALERIA_CABANA_01[5],
  GALERIA_CABANA_03[7],
  GALERIA_CABANA_02[4],
  GALERIA_CABANA_05[5],
];
