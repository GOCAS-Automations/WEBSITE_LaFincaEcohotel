/**
 * CMS ligero + capa de acceso al contenido público.
 *
 * ---------------------------------------------------------------------------
 * CÓMO FUNCIONA
 * ---------------------------------------------------------------------------
 * La tabla `contenido` es un diccionario `(clave text primary key, valor jsonb)`.
 * Cada sección editable del sitio tiene UNA fila. Este módulo:
 *
 *   1. Lee TODAS las filas de una sola vez (`leerContenido()`), envuelto en
 *      `cache()` de React: dentro de un mismo render, todos los getters
 *      comparten una única consulta.
 *   2. Fusiona lo que venga de la base sobre un **respaldo escrito en código**.
 *
 * El respaldo es la pieza clave: si Supabase no responde durante el build —o si
 * el panel todavía no ha creado la fila, o alguien guarda un campo vacío— el
 * sitio se publica igual, con los textos reales del hotel, en vez de romper el
 * despliegue o mostrar huecos en blanco.
 *
 * La fusión SOLO copia claves que ya existen en el respaldo (ver `fusionar`).
 * Así el código manda sobre la forma del objeto: una fila del panel con una
 * clave inesperada no puede romper un componente.
 *
 * El contrato completo (todas las claves y la forma de su jsonb) está
 * documentado en `docs/CMS_CLAVES.md`. Ese documento es lo que usará el agente
 * del panel administrativo: si aquí se añade una clave, allí también.
 */
import { cache } from "react";

import { crearClientePublico } from "./supabase/public";
import {
  FOTO,
  GALERIA_CABANA_01,
  GALERIA_CABANA_03,
  GALERIA_GENERAL,
  HERO,
  ZONAS_COMUNES,
} from "./fotos";
import { IMAGEN_SOCIAL, SITIO, medio, video } from "./sitio";
import type { Alojamiento, Extra, Plan } from "./tipos/basedatos";

/* ===========================================================================
 * Tipos del contenido editable
 * ======================================================================== */

export type ImagenGaleria = {
  url: string;
  /** Obligatorio por accesibilidad y SEO. Nunca se publica una foto sin él. */
  alt: string;
  /**
   * Medidas ORIGINALES del archivo, en píxeles.
   *
   * Opcionales porque una foto pegada a mano desde el panel no las trae. Cuando
   * están, la galería respeta la proporción real de la fotografía en vez de
   * recortarla a una casilla, y el navegador reserva el hueco exacto antes de
   * descargarla (cero salto de maquetación).
   *
   * Vienen de `supabase/seed/imagenes-manifest-v2.json`, que las midió al subir
   * cada archivo al bucket.
   */
  ancho?: number;
  alto?: number;
};

export type HeroInicio = {
  antetitulo: string;
  titulo: string;
  subtitulo: string;
  parrafo: string;
  cta_texto: string;
  cta_href: string;
  cta_secundario_texto: string;
  cta_secundario_href: string;
  /** Foto horizontal del hero (escritorio y tabletas). */
  imagen: string;
  /**
   * Foto vertical para móvil. Dirección de arte real: la horizontal recortada
   * a una pantalla de teléfono pierde justo las cabañas.
   */
  imagen_movil: string;
  imagen_alt: string;
};

export type IntroInicio = {
  antetitulo: string;
  titulo: string;
  parrafos: string[];
  imagen: string;
  imagen_alt: string;
  datos: { valor: string; etiqueta: string }[];
};

/** Encabezado reutilizable de las secciones de la portada. */
export type SeccionInicio = {
  antetitulo: string;
  titulo: string;
  descripcion: string;
  cta_texto: string;
  cta_href: string;
};

/**
 * Igual que `SeccionInicio`, más la nota legal de las tarifas y la foto de
 * bosque que se usa como fondo de las secciones oscuras.
 *
 * La imagen vive aquí —y no incrustada en el componente— porque el cliente
 * tiene que poder cambiarla desde el panel cuando renueve las fotos, sin
 * esperar a un despliegue.
 */
export type SeccionPlanes = SeccionInicio & {
  nota: string;
  imagen_fondo: string;
};

export type ReconocimientoInicio = {
  antetitulo: string;
  titulo: string;
  parrafos: string[];
  /**
   * Póster del video (o la foto, si no hay video). Es lo que se ve mientras el
   * navegador decide si descarga el clip, y lo único que se ve en móvil si el
   * visitante no lo reproduce.
   */
  imagen: string;
  imagen_alt: string;
  /**
   * Dirección del VIDEO de la sección. Opcional: si va vacía, el bloque se
   * pinta con `imagen` como hasta ahora. El clip de «Somos COP16» vive en el
   * bucket `videos` (migración 007) y se puede reemplazar desde el panel
   * pegando otra dirección.
   */
  video: string;
  cta_texto: string;
  cta_href: string;
};

/**
 * La tira de Instagram de la portada.
 *
 * ---------------------------------------------------------------------------
 * QUÉ NO ES
 * ---------------------------------------------------------------------------
 * NO es un widget que lea el perfil por API. La API de Instagram exige una app
 * de Meta, un token que caduca cada sesenta días y una revisión que hay que
 * renovar; y el día que Meta cambie algo, la portada del hotel se queda con un
 * hueco. Aquí las fotos son fotos PROPIAS del bucket, elegidas desde el panel,
 * que enlazan al perfil. Lo único que viene de Instagram es el reel embebido, y
 * solo cuando el visitante lo pide.
 *
 * `perfil` y `usuario` tampoco viven aquí: salen de `sitio.contacto`
 * (`instagram` e `instagram_usuario`), que ya se editan en el panel. Una
 * dirección del perfil en dos filas distintas es una dirección que algún día
 * va a discrepar consigo misma.
 */
export type InstagramInicio = {
  antetitulo: string;
  titulo: string;
  descripcion: string;
  cta_texto: string;
  /**
   * Enlace de la publicación que se muestra embebida. Se acepta cualquier
   * permalink de Instagram (`/reel/…`, `/p/…`, `/tv/…`): el componente le añade
   * `embed/` para armar la dirección del iframe. Si va vacío, la sección se
   * pinta sin el reel y solo con la tira de fotos.
   */
  reel_url: string;
  /** Texto alternativo del póster —la primera foto— cuando hace de portada del reel. */
  reel_alt: string;
  /** Las fotos de la tira. Se muestran las cuatro primeras. */
  fotos: ImagenGaleria[];
};

export type Testimonio = { texto: string; autor: string };

export type TestimoniosInicio = {
  antetitulo: string;
  titulo: string;
  items: Testimonio[];
};

export type CtaFinal = {
  titulo: string;
  texto: string;
  cta_texto: string;
  cta_href: string;
  imagen: string;
  imagen_alt: string;
};

export type ContactoSitio = {
  /** Solo dígitos con indicativo: `573160476671`. */
  whatsapp: string;
  whatsapp_visible: string;
  mensaje_whatsapp: string;
  correo: string;
  direccion: string;
  ciudad: string;
  region: string;
  pais: string;
  direccion_completa: string;
  horario_restaurante: string;
  rnt: string;
  instagram: string;
  instagram_usuario: string;
  facebook: string;
  tiktok: string;
  tiktok_usuario: string;
  mapa_url: string;
  mapa_embed: string;
  /** Indicaciones DESDE CALI hasta el hotel, para el botón «Cómo llegar». */
  mapa_como_llegar: string;
};

export type SeoSitio = {
  titulo: string;
  descripcion: string;
  palabras_clave: string[];
  imagen: { url: string; alt: string; ancho: number; alto: number };
};

export type HeroListado = {
  titulo: string;
  subtitulo: string;
  imagen: string;
  imagen_alt: string;
};

export type HeroesListados = {
  alojamientos: HeroListado;
  experiencias: HeroListado;
  conocenos: HeroListado;
  galeria: HeroListado;
  faq: HeroListado;
  contacto: HeroListado;
  reservar: HeroListado;
};

export type ExperienciaAdicional = {
  nombre: string;
  descripcion: string;
  imagen: string;
  imagen_alt: string;
};

export type ContenidoExperiencias = {
  intro: string;
  adicionales_titulo: string;
  adicionales_descripcion: string;
  adicionales: ExperienciaAdicional[];
};

export type PreguntaFrecuente = { pregunta: string; respuesta: string };

export type ContenidoFaq = {
  intro: string;
  items: PreguntaFrecuente[];
};

export type Instalacion = {
  nombre: string;
  descripcion: string;
  imagen: string;
  imagen_alt: string;
  /**
   * `object-position` del recorte en la tarjeta (4:3). Opcional: sin ella la
   * tarjeta centra la foto, que es lo correcto casi siempre.
   *
   * Se añadió para el Salón multifuncional (2026-09-15): su foto es la del
   * deck comedor, vertical (2400×2720), y un recorte centrado dejaba la mitad
   * de la tarjeta ocupada por el techo de guadua. `"center bottom"` sube el
   * encuadre para enseñar las sillas y la mesa, y de paso saca de cuadro el
   * sello de marca —vive en la esquina superior derecha de toda foto del
   * hotel— sin cortarlo a la mitad.
   */
  imagen_posicion?: string;
};

export type ContenidoLugar = {
  antetitulo: string;
  titulo: string;
  parrafos: string[];
  imagen: string;
  imagen_alt: string;
  /**
   * SEGUNDA foto de «Sobre nosotros» (2026-09-15).
   *
   * La columna de la derecha llevaba una sola fotografía con proporción fija,
   * así que en escritorio empezaba —y sobre todo acababa— a una altura
   * distinta de la del texto de al lado. Ahora son DOS apiladas y entre las dos
   * ocupan exactamente el alto de la columna de texto. Si esta se deja vacía,
   * el bloque vuelve a pintar una sola foto y sigue alineado.
   */
  imagen_secundaria: string;
  imagen_secundaria_alt: string;
  instalaciones_titulo: string;
  instalaciones_descripcion: string;
  instalaciones: Instalacion[];
  llegar_titulo: string;
  llegar_parrafos: string[];
  llegar_indicaciones: string[];
};

export type ContenidoGaleria = {
  intro: string;
  imagenes: ImagenGaleria[];
};

export type PasoReserva = { titulo: string; texto: string };

export type ContenidoReservar = {
  intro: string;
  pasos: PasoReserva[];
  nota: string;
};

export type ContenidoNoEncontrado = {
  titulo: string;
  mensaje: string;
  cta_texto: string;
  cta_href: string;
  imagen: string;
  imagen_alt: string;
};

/* ===========================================================================
 * Respaldos en código
 * ---------------------------------------------------------------------------
 * FUENTE DE VERDAD: `docs/DATOS_CLIENTE.md` — lo que el hotel confirmó en
 * septiembre de 2026 (respuestas de Juan Camilo, configuración del bot de
 * ventas y el manual de identidad de marca). Manda sobre `CONTENIDO_ACTUAL.md`
 * (el texto del WordPress viejo) y sobre cualquier borrador anterior.
 *
 * REGLA: lo que no esté respaldado por esos dos documentos NO se publica. Si
 * hace falta un dato que nadie ha confirmado, va marcado `TODO` y se pregunta;
 * nunca se inventa un horario, un precio ni una política.
 *
 * Las frases de marca («Vive despacio. Respira profundo. Estás en La Finca.»,
 * «un suspiro del bosque convertido en descanso», la misión y la visión) están
 * transcritas LITERALMENTE del manual: son texto aprobado y no se reescriben.
 * ======================================================================== */

const RESPALDO_HERO: HeroInicio = {
  antetitulo: "Km 18 vía Cali–Buenaventura",
  /* Frase oficial del manual de marca (última página). Es el lema del hotel,
     no un titular de agencia: se publica tal cual. */
  titulo: "Vive despacio. Respira profundo. Estás en La Finca.",
  subtitulo:
    "Cinco cabañas para dos en un bosque de niebla del Valle del Cauca, a 45 minutos de Cali.",
  parrafo:
    "Te invitamos a respirar más despacio, a escuchar lo que el bosque quiere contarte y a dejar que la neblina te devuelva la calma.",
  cta_texto: "Reservar",
  cta_href: "/reservar",
  cta_secundario_texto: "Conócenos",
  cta_secundario_href: "/conocenos",
  imagen: HERO.portadaEscritorio,
  imagen_movil: HERO.portadaMovil,
  imagen_alt:
    "Corredor techado de La Finca Eco Hotel abierto al bosque de niebla del Km 18, con jardineras y baranda de madera",
};

const RESPALDO_INTRO: IntroInicio = {
  antetitulo: "Bienvenidos",
  titulo: "Un suspiro del bosque convertido en descanso",
  parrafos: [
    "La Finca Eco Hotel está en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta, dentro de un bosque de niebla del Valle del Cauca. Son cinco cabañas pensadas para dos personas, cada una independiente, con cama doble, baño privado y vista a la montaña.",
    "No hay televisor en ninguna cabaña, y es a propósito. Hay estación de café y aromáticas ilimitadas, batas y cobijas térmicas para el frío, y el canto de las aves a las seis de la mañana.",
  ],
  imagen: FOTO.panoramica,
  imagen_alt:
    "Las cabañas de techo azul de La Finca Eco Hotel sobre la ladera, con los senderos y los jardines de la reserva",
  datos: [
    { valor: "45 min", etiqueta: "desde Cali" },
    { valor: "5", etiqueta: "cabañas para dos" },
    { valor: "18 °C", etiqueta: "clima de montaña" },
  ],
};

const RESPALDO_CABANAS: SeccionInicio = {
  antetitulo: "Alojamiento",
  titulo: "Nuestras cinco cabañas",
  descripcion:
    "Cada una tiene algo que las otras no: dos niveles, un jacuzzi bajo un árbol, un comedor en el balcón o la única chimenea de La Finca. Todas para dos personas.",
  cta_texto: "Ver todas las cabañas",
  cta_href: "/alojamientos",
};

const RESPALDO_PLANES: SeccionPlanes = {
  antetitulo: "Planes y tarifas",
  titulo: "Elige tu plan",
  descripcion:
    "El precio lo pone el plan, no la cabaña: eliges el nivel de servicio que quieres y lo disfrutas en la cabaña que prefieras.",
  /* Condición que el cliente pidió dejar visible en todas partes donde se
     publique un precio (§3 de DATOS_CLIENTE.md). */
  nota: "Tarifas referenciales de temporada baja. Pueden variar en festivos y alta demanda. IVA incluido.",
  imagen_fondo: FOTO.fondoBosque,
  cta_texto: "Reservar ahora",
  cta_href: "/reservar",
};

const RESPALDO_EXPERIENCIAS: SeccionInicio = {
  antetitulo: "Experiencias",
  titulo: "Celebra en medio del bosque",
  descripcion:
    "Añade una experiencia a tu reserva y encuentra la cabaña lista al llegar: torta, vino, decoración y fotos instantáneas para que la fecha quede marcada.",
  cta_texto: "Ver experiencias",
  cta_href: "/experiencias",
};

/*
  «NUESTRA ESENCIA» SE RETIRÓ DE LA PORTADA EL 2026-09-15.

  Era la séptima sección —la banda de verde claro con las tres fotos y las
  frases del manual— y no la pedía nadie: quien llega a la portada quiere ver
  el lugar, el precio y la forma de reservar, y la página se había hecho larga.
  El texto de marca no se pierde: vive entero en «Sobre nosotros» de
  `/conocenos`, que es la página que cuenta quiénes somos.

  La clave `home.esencia` sale del CMS con ella (no la usaba ninguna otra
  página), del panel y de `docs/CMS_CLAVES.md`. Ninguna de sus tres fotos se
  queda huérfana en el bucket: las tres seguían usándose en la galería general,
  en las instalaciones de Conócenos o en la ficha de la Cabaña 03.
*/

/**
 * «Somos COP16» — VIVE EN `/conocenos`, NO EN LA PORTADA.
 *
 * Estuvo en la portada hasta el 2026-09-14 y ahí competía consigo misma: un
 * video de casi tres minutos, con locución, en una página cuyo trabajo es
 * llevar a reservar en el primer visor. Cesar pidió moverlo, y el sitio que le
 * corresponde es la página que cuenta quiénes somos: el reconocimiento va justo
 * después de «Sobre nosotros» y antes de las instalaciones, que es el orden en
 * que alguien se hace las preguntas.
 *
 * La clave del CMS se renombró con él (`home.reconocimiento` →
 * `conocenos.reconocimiento`, migración 008). Dejarla con el prefijo `home.`
 * habría sido una mentira pequeña que dentro de seis meses cuesta media hora de
 * búsqueda.
 */
const RESPALDO_RECONOCIMIENTO: ReconocimientoInicio = {
  antetitulo: "Reconocimientos",
  titulo: "Somos COP16",
  parrafos: [
    "Somos COP16 y, junto con la Cámara de Comercio de Cali, nos preparamos para este evento donde mostramos la mejor imagen de nuestra región al mundo entero.",
    "La reserva funciona con respaldo de paneles solares y los vehículos se quedan en el parqueadero externo: dentro de La Finca solo se entra a pie, para no alterar a las especies que viven aquí.",
  ],
  /*
    Aquí había una FOTO (la ducha de madera del bosque), que además aparecía en
    otros cuatro sitios del sitio. Ahora esta sección lleva el VIDEO que el
    hotel publicaba en la misma sección de su sitio anterior: la dueña contando
    el reconocimiento COP16, con planos del bosque, los colibríes y las
    cabañas. Es material propio y es lo que hace creíble el reconocimiento.

    `imagen` sigue existiendo y ya no es decorativa: es el PÓSTER del video.
  */
  imagen: medio("sitio/video/cop16-poster.webp"),
  imagen_alt:
    "Bebedero de colibríes de La Finca Eco Hotel entre la neblina, con las cabañas al fondo",
  video: video("sitio/cop16-la-finca.mp4"),
  cta_texto: "Reservar ahora",
  cta_href: "/reservar",
};

/**
 * La tira de Instagram de la portada — OCUPA EL HUECO QUE DEJÓ LA COP16.
 *
 * ---------------------------------------------------------------------------
 * LAS CUATRO FOTOS NO SON NUEVAS: SON LAS QUE LIBERARON LOS HEROS
 * ---------------------------------------------------------------------------
 * Tres heros cambiaron de foto porque su material no llegaba al ancho de la
 * pantalla (ver `RESPALDO_HEROES`). Las tres que salieron —la piscina entre la
 * neblina, la fogata de noche y el balcón con hamaca— son justo las que mejor
 * funcionan aquí: se ven en un cuadrado de 130 px, donde 941 px de ancho sobran,
 * y son las que cualquiera reconocería del perfil del hotel. La cuarta, la
 * ducha del bosque, completa la fila.
 *
 * LA PRIMERA ES ADEMÁS EL PÓSTER DEL REEL. Sale del panel como las otras tres,
 * así que el día que el hotel cambie las fotos, el póster cambia con ellas y
 * nadie tiene que acordarse de este archivo.
 *
 * El perfil (`@lafinca_cali`) NO se escribe aquí: sale de `sitio.contacto`.
 */
const RESPALDO_INSTAGRAM: InstagramInicio = {
  antetitulo: "Instagram",
  titulo: "La Finca, día a día",
  descripcion:
    "La neblina de las seis, la fogata de las nueve y los colibríes del bebedero. Así se ve esto cuando no hay nadie fotografiándolo para un folleto.",
  cta_texto: "Síguenos en Instagram",
  /* El reel que el hotel publicó en su perfil. Se carga SOLO al pulsar: ver
     `src/components/sitio/reel-instagram.tsx`. */
  reel_url: "https://www.instagram.com/reel/DbO8x0SxnFX/",
  reel_alt:
    "Reel de La Finca Eco Hotel en Instagram: el bosque de niebla desde el mirador",
  fotos: [
    ZONAS_COMUNES[7],
    GALERIA_CABANA_01[2],
    ZONAS_COMUNES[2],
    ZONAS_COMUNES[4],
  ],
};

/**
 * Testimonios de RESPALDO.
 *
 * La portada muestra las reseñas reales de Google (`src/lib/resenas-google.ts`)
 * leídas en vivo de la ficha del hotel. Estos textos —también reales, tomados
 * de esa misma ficha— solo salen si la API falla, si falta la clave o si no
 * queda ninguna reseña de 4★ o más. Son el plan B para que el bloque de
 * confianza nunca desaparezca del recorrido.
 */
const RESPALDO_TESTIMONIOS: TestimoniosInicio = {
  antetitulo: "Reseñas",
  titulo: "Lo que cuentan quienes ya vinieron",
  items: [
    {
      texto:
        "Excelente experiencia! Un lugar hermoso, tranquilo, agradable, excelente atención por parte del anfitrión y en el restaurante. La comida es deliciosa, a tiempo y variada y calientica. El clima es delicioso y te brindan las comodidades para sentirte a gusto.",
      autor: "Angela Buitrago Schonhobel",
    },
    {
      texto:
        "El mejor lugar para desconectar! Excelente atención de parte de Nicolás & Jackeline hacen que la estadía sea placentera y no tengamos que preocuparnos por nada.",
      autor: "Sebastian Rojas T.",
    },
    {
      texto:
        "Me encantó, disfrute mucho la estadía, excelente servicio, el paisaje increíble, se respira paz y tranquilidad.",
      autor: "Laura Melissa Sanchez Serna",
    },
    {
      texto:
        "En general todo estuvo muy bien, la atención y el servicio, un lugar bastante privado, ya que son pocas cabañas, es un lugar que sirve perfectamente para salir del caos de la ciudad.",
      autor: "Diana Sandoval Cepeda",
    },
    {
      texto:
        "Bellísimo lugar, cabañas preciosas, acogedoras y decoradas con muy buen gusto; cuidan cada detalle. El personal super amable, comida deliciosa. Es el sitio ideal para una desconexión total.",
      autor: "Liliana Aranzazu",
    },
    {
      texto:
        "Excelente atención, son muy amables y atentos desde el primer momento de llegada, la comida es exquisita generosas porciones e increíble sazón, un espacio lleno de naturaleza y clima agradable.",
      autor: "Mariana Rios",
    },
  ],
};

const RESPALDO_CTA_FINAL: CtaFinal = {
  titulo: "Deja que la neblina te devuelva la calma",
  texto:
    "Escríbenos y te ayudamos a elegir la cabaña, el plan y la fecha. Respondemos por WhatsApp todos los días.",
  cta_texto: "Reservar ahora",
  cta_href: "/reservar",
  imagen: FOTO.atardecer,
  imagen_alt:
    "Mesa y sillas de piedra bajo las farolas de La Finca Eco Hotel, entre la neblina del atardecer",
};

const RESPALDO_CONTACTO: ContactoSitio = {
  whatsapp: SITIO.contacto.whatsapp,
  whatsapp_visible: SITIO.contacto.whatsappVisible,
  mensaje_whatsapp:
    "¡Hola! Vengo del sitio web de La Finca Eco Hotel y me gustaría recibir más información sobre las opciones de hospedaje y disponibilidad. ✨",
  correo: SITIO.contacto.correo,
  direccion: SITIO.contacto.direccion,
  ciudad: SITIO.contacto.ciudad,
  region: SITIO.contacto.region,
  pais: SITIO.contacto.pais,
  direccion_completa: SITIO.contacto.direccionCompleta,
  horario_restaurante: SITIO.contacto.horarioRestaurante,
  rnt: SITIO.rnt,
  instagram: SITIO.redes.instagram,
  instagram_usuario: SITIO.redes.instagramUsuario,
  facebook: SITIO.redes.facebook,
  tiktok: SITIO.redes.tiktok,
  tiktok_usuario: SITIO.redes.tiktokUsuario,
  mapa_url: SITIO.mapa.url,
  mapa_embed: SITIO.mapa.embed,
  mapa_como_llegar: SITIO.mapa.comoLlegar,
};

const RESPALDO_SEO: SeoSitio = {
  titulo: "La Finca Eco Hotel — Cabañas con jacuzzi cerca de Cali",
  descripcion:
    "Ecohotel en el bosque de niebla, Km 18 vía Cali–Buenaventura. Cinco cabañas para dos con jacuzzi, turco, piscina y restaurante, a 45 minutos de Cali.",
  palabras_clave: [
    "ecohotel cerca de Cali",
    "cabañas con jacuzzi Valle del Cauca",
    "hotel Km 18 vía Buenaventura",
    "bosque de niebla Cali",
    "plan romántico para parejas cerca de Cali",
  ],
  imagen: {
    url: IMAGEN_SOCIAL.url,
    alt: IMAGEN_SOCIAL.alt,
    ancho: IMAGEN_SOCIAL.ancho,
    alto: IMAGEN_SOCIAL.alto,
  },
};

/**
 * Las cabeceras de las siete páginas internas.
 *
 * ---------------------------------------------------------------------------
 * TODAS APUNTAN A `web/heroes/`, NINGUNA A UNA FOTO DE GALERÍA
 * ---------------------------------------------------------------------------
 * Un hero se ve al ancho entero de la ventana. Una foto de 1086 px puesta ahí
 * la estira el navegador hasta los 1440 de la pantalla —`next/image` no amplía,
 * así que el archivo llega a su tamaño real y el estirón lo hace el navegador—,
 * y eso es exactamente lo que Cesar veía borroso.
 *
 * Ahora cada hero tiene su propio archivo, cortado del original de `drive/` a
 * calidad 90 (`npm run imagenes:hero`). Y **tres páginas cambiaron de foto**
 * porque la suya no llegaba al ancho de un hero, no por gusto:
 *
 *   · Conócenos: la piscina medía 1086 px → la panorámica de la reserva, 1536.
 *   · Preguntas: el balcón de la Cabaña 01 medía 1086 px → la terraza de la 02,
 *     que es la misma escena (hamaca, hortensias y montañas) con 1448.
 *   · Contacto: la fogata medía 941 px, el peor material del sitio → la
 *     chimenea de la Cabaña 05, que cuenta lo mismo con 1448.
 *
 * Al mudarse esas tres fotos quedaron libres, y no se han perdido: la piscina,
 * la fogata y el balcón con hamaca son ahora tres de las cuatro fotos de la
 * tira de Instagram de la portada.
 */
const RESPALDO_HEROES: HeroesListados = {
  alojamientos: {
    titulo: "Nuestras cabañas",
    subtitulo:
      "Cinco cabañas independientes para dos, con cama doble, baño privado y vista al bosque de niebla.",
    imagen: HERO.alojamientos,
    imagen_alt: GALERIA_CABANA_03[0].alt,
  },
  experiencias: {
    titulo: "Experiencias",
    subtitulo:
      "Aniversarios y cumpleaños listos al llegar, y los detalles que se añaden a tu reserva.",
    imagen: HERO.experiencias,
    imagen_alt:
      "Jacuzzi privado de la Cabaña 02 bajo el árbol, rodeado de guadua, con toallas dobladas",
  },
  conocenos: {
    titulo: "Conócenos",
    subtitulo:
      "Una reserva natural en el Km 18, con jacuzzi, turco, piscina de agua fría, restaurante y senderos.",
    imagen: HERO.conocenos,
    imagen_alt:
      "Las cabañas de techo azul de La Finca Eco Hotel sobre la ladera, con los senderos y los jardines",
  },
  galeria: {
    titulo: "Galería",
    subtitulo: "El bosque, las cabañas y los rincones de La Finca en imágenes.",
    imagen: HERO.galeria,
    imagen_alt:
      "Mesa y sillas de piedra bajo las farolas de La Finca, entre la neblina del atardecer",
  },
  faq: {
    titulo: "Preguntas frecuentes",
    subtitulo:
      "Lo que más nos preguntan antes de llegar: cómo llegar, el clima, las mascotas, los pagos y las reglas de la casa.",
    imagen: HERO.faq,
    imagen_alt:
      "Terraza de la Cabaña 02 con hamaca, hortensias y vista a las montañas",
  },
  contacto: {
    titulo: "Contacto",
    subtitulo:
      "Escríbenos por WhatsApp: resolvemos dudas y confirmamos disponibilidad el mismo día.",
    /* La fogata de noche era la imagen exacta para esta página —cuenta en una
       foto para qué se le escribe al hotel—, pero medía 941 px de ancho y en
       una banda de cabecera se veía blanda. La chimenea de la Cabaña 05 dice lo
       mismo (calor, noche, compañía) y mide 1448. */
    imagen: HERO.contacto,
    imagen_alt:
      "Chimenea encendida de la Cabaña 05 de La Finca Eco Hotel, con cojines y juegos de mesa",
  },
  reservar: {
    titulo: "Reserva tu estadía",
    subtitulo:
      "Elige cabaña y plan, y confirmamos tu fecha por WhatsApp en pocos minutos.",
    imagen: HERO.reservar,
    imagen_alt: GALERIA_CABANA_01[0].alt,
  },
};

/**
 * Página de experiencias.
 *
 * Las cuatro cosas que se venden aparte —Aniversario con Amor, Cumpleaños con
 * Amor, Fondue y Segunda mascota— viven en la tabla `extras`, con su precio
 * real, porque se van a poder añadir dentro de la reserva. Aquí solo quedan los
 * textos de la página.
 *
 * `adicionales` va VACÍO a propósito. Contenía «Picnic en el bosque» y «Velada
 * romántica», dos experiencias que el sitio viejo publicaba con foto y sin
 * precio y que el hotel confirmó que NO existen (§4 de DATOS_CLIENTE.md). Se
 * retiraron del CMS, del seed y de la base. El campo se conserva por si el
 * cliente quiere anunciar algo a pedido desde el panel.
 */
const RESPALDO_EXPERIENCIAS_PAGINA: ContenidoExperiencias = {
  intro:
    "Preparamos la cabaña antes de que llegues: decoración, torta, vino y los detalles de la celebración listos. Se añaden a tu reserva y se cobran una sola vez por estadía.",
  adicionales_titulo: "Otras experiencias",
  adicionales_descripcion:
    "¿Tienes algo distinto en mente? Escríbenos por WhatsApp y lo armamos contigo.",
  adicionales: [],
};

/**
 * Preguntas frecuentes.
 *
 * Reescritas ENTERAS con `docs/DATOS_CLIENTE.md`. Las del sitio viejo tenían
 * tres errores que costaban reservas: decían «6 cabañas» (son cinco), daban el
 * restaurante de 8:00 a. m. a 11:00 p. m. (es de 9:00 a. m. a 8:00 p. m. y solo
 * para huéspedes) y afirmaban que no había pasadía (existe el Día de Calma).
 * También decían que los niños son bienvenidos sin matizar. Desde el
 * 2026-09-14 la regla del hotel es más tajante y está en §5 de
 * `DATOS_CLIENTE.md`: NO se permiten menores de edad, en ninguna cabaña.
 */
const RESPALDO_FAQ: ContenidoFaq = {
  intro:
    "Si tu pregunta no está aquí, escríbenos por WhatsApp: respondemos todos los días.",
  items: [
    {
      pregunta: "¿Dónde están ubicados y cómo se llega?",
      respuesta:
        "En el Km 18 de la vía Cali–Buenaventura, Vereda Loma Alta, a unos 45 minutos al occidente de Cali. La vía no está pavimentada en el último tramo, pero es apta para cualquier carro. El punto exacto y el video de llegada te los enviamos cuando confirmes el pago.",
    },
    {
      pregunta: "¿Cuántas cabañas tienen?",
      respuesta:
        "Cinco. Todas son independientes, con capacidad máxima para 2 personas, cama doble, baño privado y vista a la montaña. Pocas cabañas significan silencio, privacidad y una atención que se nota.",
    },
    {
      pregunta: "¿Todas las cabañas tienen jacuzzi privado?",
      respuesta:
        "Las cabañas 01, 02 y 05 tienen jacuzzi privado en zona exterior. Las cabañas 03 y 04 comparten uno de uso privado por turnos: se reserva con Nicolás, nuestro anfitrión, para que cada pareja lo disfrute sola. Todos son climatizados, con burbujas y luces.",
    },
    {
      pregunta: "¿A qué hora puedo llegar y a qué hora debo salir?",
      respuesta:
        "Desde la 1:00 p. m. puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 3:00 p. m. El check-out es a la 1:00 p. m.",
    },
    {
      pregunta: "¿Cómo se reserva y cómo se paga?",
      respuesta:
        "Con un anticipo del 50 % se confirma la reserva; el 50 % restante se paga el día de la llegada con un link de pago que te enviamos con anticipación. En La Finca no hay datáfono ni manejamos efectivo. Nunca te pediremos los datos de tu tarjeta por WhatsApp.",
    },
    {
      pregunta: "¿Puedo cancelar o cambiar la fecha?",
      respuesta:
        "Una vez confirmada la reserva no hay reembolsos. Sí puedes cambiar la fecha una sola vez, avisando con mínimo 3 días de anticipación. Cancelar el mismo día o no presentarse se considera incumplimiento y no da lugar a devolución ni reprogramación.",
    },
    {
      pregunta: "¿Cómo es el clima y qué debo llevar?",
      respuesta:
        "Estamos en un bosque de niebla, con temperaturas que bajan hasta los 18 °C y días templados. Trae ropa abrigada, algo impermeable y zapatos cómodos para los senderos. En la cabaña encontrarás batas y cobijas térmicas.",
    },
    {
      pregunta: "¿Tienen parqueadero?",
      respuesta:
        "Sí, un parqueadero externo vigilado las 24 horas en la entrada. Los vehículos no ingresan a la reserva natural, para proteger a las especies que habitan el lugar: desde el parqueadero se entra a pie.",
    },
    {
      pregunta: "¿Puedo llevar a mi mascota?",
      respuesta:
        "¡Claro! Las mascotas son bienvenidas en todas nuestras áreas, con cuidado responsable de sus acompañantes. La primera no tiene costo; a partir de la segunda hay un valor de $50.000 por estadía.",
    },
    {
      pregunta: "¿Pueden ir menores de edad?",
      respuesta:
        "No. La Finca es una experiencia exclusiva para adultos: no recibimos menores de edad en ninguna de las cabañas ni en las zonas comunes. Las cabañas son para dos personas y todo el lugar —el silencio, la zona de hidroterapia, los senderos— está pensado para parejas que vienen a desconectarse.",
    },
    {
      pregunta: "¿Cuentan con restaurante?",
      respuesta:
        "Sí, de 9:00 a. m. a 8:00 p. m. todos los días, exclusivo para huéspedes. El desayuno se sirve desde las 9:00 a. m. y tenemos opciones vegetarianas, veganas y sin gluten.",
    },
    {
      pregunta: "¿Qué horarios tienen las zonas comunes?",
      respuesta:
        "El jacuzzi está disponible de 3:00 p. m. a 12:00 a. m. y se solicita con anticipación para alistarlo. La fogata con masmelos se enciende a las 9:00 p. m. La piscina de agua fría con chorrera y el turco por turnos están disponibles durante el día.",
    },
    {
      pregunta: "¿Se puede visitar sin quedarse a dormir?",
      respuesta:
        "Sí, con el plan Día de Calma: de 10:00 a. m. a 5:00 p. m., con almuerzo a la carta, refrigerio y acceso a piscina, turco, decks, senderos y salón. No incluye hospedaje.",
    },
    {
      pregunta: "¿Hay televisor en las cabañas?",
      respuesta:
        "No, y es a propósito. Las cabañas están pensadas para desconectarse. Sí hay WiFi, estación de café y aromáticas ilimitadas, mininevera, agua caliente, secador, amenities de baño y botiquín.",
    },
    {
      pregunta: "¿Se pueden hacer eventos?",
      respuesta:
        "Sí. Tenemos un salón multifuncional para hasta 30 personas, ideal para retiros, cumpleaños y reuniones. Los talleres de yoga o meditación se programan desde 10 personas.",
    },
    {
      pregunta: "¿Se puede caminar por el bosque?",
      respuesta:
        "Hay senderos y miradores habilitados dentro de la reserva, además de caminatas por los alrededores. No se permite el senderismo fuera de los senderos, por conservación del bosque.",
    },
    {
      pregunta: "¿Es accesible para personas con movilidad reducida?",
      respuesta:
        "El terreno es de montaña y no es plano: hay escaleras y pendientes entre las cabañas y las zonas comunes, así que no lo recomendamos para personas con movilidad reducida. Escríbenos y te contamos con detalle cómo es el recorrido.",
    },
  ],
};

const RESPALDO_LUGAR: ContenidoLugar = {
  antetitulo: "Sobre nosotros",
  titulo: "Una reserva natural en el bosque de niebla",
  parrafos: [
    "La Finca Eco Hotel está en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta. Se llega en unos 45 minutos desde Cali y, apenas se sube, el clima cambia: entra el frío, la neblina y el canto de las aves.",
    "El lugar se pensó al revés de un hotel grande: cinco cabañas, mucho bosque y un equipo pequeño. Nicolás, nuestro anfitrión, recibe a cada pareja, coordina los turnos de jacuzzi y turco y resuelve lo que haga falta.",
    "Cuidar la reserva es parte del plan. La energía tiene respaldo de paneles solares, los vehículos se quedan en el parqueadero externo y el bosque solo se recorre por los senderos habilitados. Somos COP16, en alianza con la Cámara de Comercio de Cali.",
  ],
  /* La panorámica de la reserva se subió al HERO de esta misma página (era la
     única foto de más de 1440 px que no estaba ya en las instalaciones de
     abajo), así que aquí habría salido dos veces en la misma pantalla. Entra
     el corredor techado abierto al valle, que además es la foto más grande del
     hotel —2400 px— y en este hueco de media columna se ve impecable. */
  imagen: ZONAS_COMUNES[0].url,
  imagen_alt: ZONAS_COMUNES[0].alt,
  /*
    La SEGUNDA foto de la columna (2026-09-15).

    Tiene que ser APAISADA: la caja de abajo es ancha y baja —el alto se lo
    reparten las dos fotos dentro del alto del texto— y una vertical metida ahí
    se queda en una franja de pared. Se probó la fachada de la Cabaña 03
    (1086×1231) y eso fue exactamente lo que pasó.

    El jacuzzi de la Cabaña 01 es de 1448×923, no sale en ninguna otra parte de
    esta página y su franja superior —las montañas, las nubes y la guadua— es lo
    que el texto de al lado está contando. Las zonas comunes no sirven: las ocho
    salen más abajo, en las instalaciones.
  */
  imagen_secundaria: GALERIA_CABANA_01[1].url,
  imagen_secundaria_alt: GALERIA_CABANA_01[1].alt,
  instalaciones_titulo: "Zonas comunes",
  instalaciones_descripcion:
    "Todo esto está incluido con tu estadía, además de la cabaña.",
  instalaciones: [
    {
      nombre: "Zona de hidroterapia",
      descripcion:
        "Jacuzzi climatizado de 3:00 p. m. a 12:00 a. m. (se solicita con anticipación), turco por turnos y piscina de agua fría con chorrera para alternar frío y calor.",
      imagen: FOTO.piscina,
      imagen_alt:
        "Piscina de agua fría de La Finca con su chorrera, frente a las montañas y las nubes",
    },
    {
      /*
        La foto del hero de la portada (2026-09-15): el corredor techado
        abierto al valle. Ya viene recortada sin el sello de marca —es la
        misma regla que sigue todo hero— así que sirve tal cual en una
        tarjeta 4:3 sin encuadre especial.
      */
      nombre: "Restaurante",
      descripcion:
        "De 9:00 a. m. a 8:00 p. m. todos los días, exclusivo para huéspedes. Desayuno desde las 9:00 a. m., con opciones vegetarianas, veganas y sin gluten.",
      imagen: HERO.portadaEscritorio,
      imagen_alt:
        "Corredor techado de La Finca Eco Hotel abierto al bosque de niebla del Km 18, con jardineras y baranda de madera",
    },
    {
      nombre: "Decks de inmersión",
      descripcion:
        "Plataformas suspendidas entre los árboles para sentarse a mirar el bosque, respirar y no hacer nada más.",
      imagen: ZONAS_COMUNES[3].url,
      imagen_alt: ZONAS_COMUNES[3].alt,
    },
    {
      nombre: "Ducha al aire libre",
      descripcion:
        "Una ducha de madera en medio del bosque, para terminar el recorrido por los senderos como se debe.",
      imagen: FOTO.duchaBosque,
      imagen_alt:
        "Ducha de madera al aire libre de La Finca, en medio del bosque",
    },
    {
      nombre: "Fogata con masmelos",
      descripcion:
        "A las 9:00 p. m. encendemos la fogata. Está incluida en todos los planes de hospedaje.",
      imagen: FOTO.fogata,
      imagen_alt:
        "Pareja abrigada frente a la fogata encendida de La Finca, de noche",
    },
    {
      /*
        La foto que usaba Restaurante (2026-09-15): el deck techado con el
        comedor de vidrio. Es vertical y el hueco de la tarjeta es 4:3, así
        que sin `imagen_posicion` el recorte centrado dejaba medio techo de
        guadua y perdía las sillas. "center bottom" enseña la parte de abajo.
      */
      nombre: "Salón multifuncional",
      descripcion:
        "Espacio para retiros, cumpleaños y reuniones, con capacidad máxima para 30 personas. Talleres de yoga o meditación desde 10 personas.",
      imagen: FOTO.deckComedor,
      imagen_alt:
        "Deck techado de La Finca con comedor de vidrio y sillas, frente a las montañas",
      imagen_posicion: "center bottom",
    },
  ],
  llegar_titulo: "Cómo llegar",
  llegar_parrafos: [
    "Desde Cali se toma la vía a Buenaventura y se sube hasta el Km 18. Son unos 45 minutos en carro desde el occidente de la ciudad. El último tramo no está pavimentado, pero es apto para cualquier vehículo.",
    "Al llegar, el carro se deja en el parqueadero externo vigilado y se entra a pie: estamos dentro de una reserva natural y no permitimos el ingreso de vehículos, para no alterar a las especies del bosque.",
  ],
  llegar_indicaciones: [
    "Km 18, vía Cali–Buenaventura, Vereda Loma Alta (Valle del Cauca).",
    "Aproximadamente 45 minutos desde Cali.",
    "Parqueadero externo vigilado 24 horas; los vehículos no ingresan a la reserva.",
    "El pin exacto y el video de llegada se envían al confirmar el pago.",
  ],
};

/**
 * Galería general: las fotos oficiales, sin una sola repetida.
 *
 * Sale de `src/lib/fotos.ts`, que es donde vive el catálogo con su texto
 * alternativo. Las fotos del WordPress viejo —225×300 px, y algunas con toallas
 * bordadas «Finca Villarreal», el nombre anterior del hotel— ya no se publican
 * en ninguna parte del sitio.
 */
const RESPALDO_GALERIA: ContenidoGaleria = {
  intro:
    "El bosque, las cabañas y las zonas comunes de La Finca, tal como las encuentran nuestros huéspedes.",
  imagenes: GALERIA_GENERAL,
};

const RESPALDO_RESERVAR: ContenidoReservar = {
  intro:
    "Empieza por tus fechas: con ellas te mostramos las cabañas libres y el precio noche por noche. Te llevamos a WhatsApp con el mensaje ya escrito y confirmamos disponibilidad el mismo día.",
  /*
    EL ORDEN ES EL DEL FLUJO REAL, y no al revés (corregido el 2026-09-15).

    El selector pregunta primero las FECHAS, porque de ellas sale todo lo
    demás: qué cabañas sirven y qué planes se pueden elegir. Los tres pasos
    decían «cabaña → plan → confirmamos», que era el flujo de antes del motor
    de precios noche a noche y ya no describía lo que el visitante ve.
  */
  pasos: [
    {
      titulo: "1. Elige tus fechas",
      texto:
        "Marca la llegada y la salida en el calendario. Puedes mezclar noches entre semana y de fin de semana: cada noche se cobra con la tarifa de su fecha.",
    },
    {
      titulo: "2. Elige tu cabaña",
      texto:
        "Te mostramos las que sirven para esas fechas, con el total de la estadía. Las cinco son independientes y para dos personas.",
    },
    {
      titulo: "3. Elige tu plan",
      texto:
        "Solo si tu estadía tiene noches de fin de semana o festivos: ahí eliges entre Estándar y Premium. Entre semana el plan es automático. Confirmamos y reservas con el 50 %.",
    },
  ],
  /*
    VACÍA A PROPÓSITO.
    Aquí iba: «En La Finca no hay datáfono ni manejamos efectivo, y nunca
    pedimos datos de tarjeta por WhatsApp. Muy pronto vas a poder reservar y
    pagar en línea desde esta misma página.» Se retiró por indicación de Cesar:
    la primera mitad ya está en las preguntas frecuentes y en los términos,
    donde alguien la busca; la segunda prometía una fecha que nadie ha fijado.

    La clave se conserva —el panel sigue teniendo su campo— para que el hotel
    pueda publicar un aviso puntual sin esperar a un despliegue. Si está vacía,
    el bloque no se pinta.
  */
  nota: "",
};

const RESPALDO_NO_ENCONTRADO: ContenidoNoEncontrado = {
  titulo: "Esta página se perdió en la neblina",
  mensaje:
    "La dirección que buscas no existe o cambió de lugar. Vuelve al inicio o escríbenos por WhatsApp y te orientamos.",
  cta_texto: "Volver al inicio",
  cta_href: "/",
  imagen: ZONAS_COMUNES[3].url,
  imagen_alt: ZONAS_COMUNES[3].alt,
};

/* ===========================================================================
 * Lectura de la tabla `contenido`
 * ======================================================================== */

/** Todas las claves que este módulo conoce. Ver `docs/CMS_CLAVES.md`. */
export const CLAVES_CONTENIDO = [
  "sitio.contacto",
  "sitio.seo",
  "home.hero",
  "home.intro",
  "home.cabanas",
  "home.planes",
  "home.experiencias",
  "home.instagram",
  "home.testimonios",
  "home.cta_final",
  "heroes.listados",
  "experiencias",
  "faq",
  "lugar",
  "conocenos.reconocimiento",
  "galeria",
  "reservar",
  "no_encontrado",
] as const;

export type ClaveContenido = (typeof CLAVES_CONTENIDO)[number];

/**
 * Los respaldos, indexados por su clave.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE MAPA EXISTE
 * ---------------------------------------------------------------------------
 * El contenido vivía DOS veces: aquí arriba, en TypeScript, y otra vez a mano
 * en `supabase/seed/002_contenido.sql`. Eran seiscientas líneas de JSON
 * transcritas, y bastaba corregir una frase en un lado y olvidarla en el otro
 * para que el sitio publicado y la base dijeran cosas distintas —que es
 * exactamente lo que pasó con el horario del restaurante—.
 *
 * Ahora el seed se GENERA de aquí (`npm run seed:contenido`). El código es la
 * única fuente y el SQL es un artefacto, como lo es un `build`.
 */
export const RESPALDOS: Record<ClaveContenido, Record<string, unknown>> = {
  "sitio.contacto": RESPALDO_CONTACTO,
  "sitio.seo": RESPALDO_SEO,
  "home.hero": RESPALDO_HERO,
  "home.intro": RESPALDO_INTRO,
  "home.cabanas": RESPALDO_CABANAS,
  "home.planes": RESPALDO_PLANES,
  "home.experiencias": RESPALDO_EXPERIENCIAS,
  "home.instagram": RESPALDO_INSTAGRAM,
  "home.testimonios": RESPALDO_TESTIMONIOS,
  "home.cta_final": RESPALDO_CTA_FINAL,
  "heroes.listados": RESPALDO_HEROES,
  experiencias: RESPALDO_EXPERIENCIAS_PAGINA,
  faq: RESPALDO_FAQ,
  lugar: RESPALDO_LUGAR,
  "conocenos.reconocimiento": RESPALDO_RECONOCIMIENTO,
  galeria: RESPALDO_GALERIA,
  reservar: RESPALDO_RESERVAR,
  no_encontrado: RESPALDO_NO_ENCONTRADO,
};

/**
 * Lee la tabla entera de una vez.
 *
 * Son menos de veinte filas de jsonb: una sola consulta cuesta menos que
 * diecisiete y, envuelta en `cache()`, todos los getters de un mismo render la
 * comparten. Si la consulta falla, devuelve un mapa vacío y CADA getter cae a
 * su respaldo — el build nunca se rompe por esto.
 */
const leerContenido = cache(
  async (): Promise<Map<string, Record<string, unknown>>> => {
    const mapa = new Map<string, Record<string, unknown>>();

    try {
      const supabase = crearClientePublico();
      const { data, error } = await supabase
        .from("contenido")
        .select("clave, valor");

      if (error) {
        console.error("[contenido] lectura:", error.message);
        return mapa;
      }

      for (const fila of data ?? []) {
        if (
          fila.valor &&
          typeof fila.valor === "object" &&
          !Array.isArray(fila.valor)
        ) {
          mapa.set(fila.clave, fila.valor as Record<string, unknown>);
        }
      }
    } catch (error) {
      console.error(
        "[contenido] lectura:",
        error instanceof Error ? error.message : error,
      );
    }

    return mapa;
  },
);

/**
 * Superpone el jsonb de la base sobre el respaldo en código.
 *
 * Reglas:
 *   · Solo se copian claves que EXISTEN en el respaldo (el código manda sobre
 *     la forma; una clave inesperada del panel no puede romper un componente).
 *   · Las cadenas vacías o en blanco no sustituyen: se lee mejor el texto de
 *     respaldo que un hueco.
 *   · Los arreglos se reemplazan ENTEROS o no se reemplazan. Mezclar elemento
 *     a elemento produciría listas de largo distinto y frases descolocadas.
 *   · Los objetos anidados se fusionan en profundidad (`heroes.listados`).
 */
function fusionar<T extends Record<string, unknown>>(
  respaldo: T,
  valor: Record<string, unknown> | undefined,
): T {
  if (!valor) return respaldo;

  const salida: Record<string, unknown> = { ...respaldo };

  for (const [clave, base] of Object.entries(respaldo)) {
    const nuevo = valor[clave];
    if (nuevo === undefined || nuevo === null) continue;

    if (typeof base === "string") {
      if (typeof nuevo === "string" && nuevo.trim()) salida[clave] = nuevo.trim();
      continue;
    }

    if (typeof base === "number") {
      if (typeof nuevo === "number" && Number.isFinite(nuevo)) {
        salida[clave] = nuevo;
      }
      continue;
    }

    if (typeof base === "boolean") {
      if (typeof nuevo === "boolean") salida[clave] = nuevo;
      continue;
    }

    if (Array.isArray(base)) {
      if (Array.isArray(nuevo) && nuevo.length > 0) salida[clave] = nuevo;
      continue;
    }

    if (base && typeof base === "object") {
      if (nuevo && typeof nuevo === "object" && !Array.isArray(nuevo)) {
        salida[clave] = fusionar(
          base as Record<string, unknown>,
          nuevo as Record<string, unknown>,
        );
      }
    }
  }

  return salida as T;
}

/** Getter genérico: lee la fila, la fusiona con el respaldo y la devuelve. */
async function obtener<T extends Record<string, unknown>>(
  clave: ClaveContenido,
  respaldo: T,
): Promise<T> {
  const filas = await leerContenido();
  return fusionar(respaldo, filas.get(clave));
}

/* ===========================================================================
 * Getters del contenido editable
 * ======================================================================== */

export const getHero = cache(() => obtener("home.hero", RESPALDO_HERO));
export const getIntro = cache(() => obtener("home.intro", RESPALDO_INTRO));
export const getSeccionCabanas = cache(() =>
  obtener("home.cabanas", RESPALDO_CABANAS),
);
export const getSeccionPlanes = cache(() =>
  obtener("home.planes", RESPALDO_PLANES),
);
export const getSeccionExperiencias = cache(() =>
  obtener("home.experiencias", RESPALDO_EXPERIENCIAS),
);
export const getInstagram = cache(() =>
  obtener("home.instagram", RESPALDO_INSTAGRAM),
);
/** Vive en `/conocenos` desde el 2026-09-14, no en la portada. */
export const getReconocimiento = cache(() =>
  obtener("conocenos.reconocimiento", RESPALDO_RECONOCIMIENTO),
);
export const getTestimonios = cache(() =>
  obtener("home.testimonios", RESPALDO_TESTIMONIOS),
);
export const getCtaFinal = cache(() =>
  obtener("home.cta_final", RESPALDO_CTA_FINAL),
);
export const getContacto = cache(() =>
  obtener("sitio.contacto", RESPALDO_CONTACTO),
);
export const getSeoSitio = cache(() => obtener("sitio.seo", RESPALDO_SEO));
export const getHeroesListados = cache(() =>
  obtener("heroes.listados", RESPALDO_HEROES),
);
export const getContenidoExperiencias = cache(() =>
  obtener("experiencias", RESPALDO_EXPERIENCIAS_PAGINA),
);
export const getFaq = cache(() => obtener("faq", RESPALDO_FAQ));
export const getLugar = cache(() => obtener("lugar", RESPALDO_LUGAR));
export const getGaleria = cache(() => obtener("galeria", RESPALDO_GALERIA));
export const getReservar = cache(() => obtener("reservar", RESPALDO_RESERVAR));
export const getNoEncontrado = cache(() =>
  obtener("no_encontrado", RESPALDO_NO_ENCONTRADO),
);

/* ===========================================================================
 * Catálogo: cabañas, planes, tarifas y extras
 * ======================================================================== */

/** Tarifa de un plan concreto para una cabaña concreta. */
export type TarifaDePlan = {
  plan: Plan;
  precio_noche: number;
  /**
   * Precio por noche si viaja UNA sola persona. `null` = se cobra igual.
   *
   * Hoy solo lo usa el plan Entre Semana ($350.000 para dos, $200.000 para
   * una). Es un dato que el hotel publica y que cambia la decisión de quien
   * viaja solo, así que se muestra al lado del precio principal.
   */
  precio_noche_1_persona: number | null;
  /** Días ISO en los que aplica (1 = lunes). `null` = todos. */
  dias_semana: number[] | null;
};

export type AlojamientoPublico = Alojamiento & {
  galeria: ImagenGaleria[];
  /** Tarifas base ordenadas por el orden de los planes. */
  tarifas: TarifaDePlan[];
  /** Precio más bajo publicado, para el "desde". `null` si no hay tarifas. */
  precio_desde: number | null;
};

const COLUMNAS_ALOJAMIENTO =
  "id, nombre, slug, descripcion, capacidad, amenidades, orden, activo, created_at";

/** Galerías de todas las cabañas, agrupadas por `alojamiento_id`. */
const getGaleriasPorAlojamiento = cache(
  async (): Promise<Map<string, ImagenGaleria[]>> => {
    const agrupadas = new Map<string, ImagenGaleria[]>();

    try {
      const supabase = crearClientePublico();
      const { data, error } = await supabase
        .from("imagenes")
        .select("alojamiento_id, url, alt, orden")
        .not("alojamiento_id", "is", null)
        .order("orden", { ascending: true });

      if (error) {
        console.error("[contenido] galerías:", error.message);
        return agrupadas;
      }

      for (const fila of data ?? []) {
        if (!fila.alojamiento_id) continue;
        const lista = agrupadas.get(fila.alojamiento_id) ?? [];
        lista.push({ url: fila.url, alt: fila.alt ?? "" });
        agrupadas.set(fila.alojamiento_id, lista);
      }
    } catch (error) {
      console.error(
        "[contenido] galerías:",
        error instanceof Error ? error.message : error,
      );
    }

    return agrupadas;
  },
);

export const getPlanes = cache(async (): Promise<Plan[]> => {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase
      .from("planes")
      .select(
        "id, nombre, descripcion, incluye, tipo, dias_aplica, horario, precio_base, orden, activo",
      )
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[contenido] planes:", error.message);
      return [];
    }
    return (data ?? []) as Plan[];
  } catch (error) {
    console.error(
      "[contenido] planes:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
});

/** Tarifas base (sin vigencia) agrupadas por cabaña. */
const getTarifasPorAlojamiento = cache(
  async (): Promise<Map<string, TarifaDePlan[]>> => {
    const agrupadas = new Map<string, TarifaDePlan[]>();

    const [planes, filas] = await Promise.all([
      getPlanes(),
      (async () => {
        try {
          const supabase = crearClientePublico();
          const { data, error } = await supabase
            .from("tarifas")
            .select(
              "alojamiento_id, plan_id, precio_noche, precio_noche_1_persona, dias_semana, vigencia",
            )
            .is("vigencia", null);

          if (error) {
            console.error("[contenido] tarifas:", error.message);
            return [];
          }
          return data ?? [];
        } catch (error) {
          console.error(
            "[contenido] tarifas:",
            error instanceof Error ? error.message : error,
          );
          return [];
        }
      })(),
    ]);

    const planesPorId = new Map(planes.map((plan) => [plan.id, plan]));

    for (const fila of filas) {
      const plan = planesPorId.get(fila.plan_id);
      if (!plan || !fila.alojamiento_id) continue;
      const lista = agrupadas.get(fila.alojamiento_id) ?? [];
      lista.push({
        plan,
        precio_noche: fila.precio_noche,
        precio_noche_1_persona: fila.precio_noche_1_persona ?? null,
        dias_semana: fila.dias_semana,
      });
      agrupadas.set(fila.alojamiento_id, lista);
    }

    for (const lista of agrupadas.values()) {
      lista.sort((a, b) => a.plan.orden - b.plan.orden);
    }

    return agrupadas;
  },
);

export const getAlojamientos = cache(
  async (): Promise<AlojamientoPublico[]> => {
    let filas: Alojamiento[] = [];

    try {
      const supabase = crearClientePublico();
      const { data, error } = await supabase
        .from("alojamientos")
        .select(COLUMNAS_ALOJAMIENTO)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (error) {
        console.error("[contenido] alojamientos:", error.message);
        return [];
      }
      filas = (data ?? []) as Alojamiento[];
    } catch (error) {
      console.error(
        "[contenido] alojamientos:",
        error instanceof Error ? error.message : error,
      );
      return [];
    }

    const [galerias, tarifas] = await Promise.all([
      getGaleriasPorAlojamiento(),
      getTarifasPorAlojamiento(),
    ]);

    return filas.map((fila) => {
      const suTarifas = tarifas.get(fila.id) ?? [];
      const precios = suTarifas.map((t) => t.precio_noche);
      return {
        ...fila,
        amenidades: fila.amenidades ?? [],
        galeria: galerias.get(fila.id) ?? [],
        tarifas: suTarifas,
        precio_desde: precios.length ? Math.min(...precios) : null,
      };
    });
  },
);

export const getAlojamientoPorSlug = cache(
  async (slug: string): Promise<AlojamientoPublico | null> => {
    const todos = await getAlojamientos();
    return todos.find((alojamiento) => alojamiento.slug === slug) ?? null;
  },
);

export const getExtras = cache(async (): Promise<Extra[]> => {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase
      .from("extras")
      .select("id, tipo, nombre, descripcion, precio, imagen_url, activo, orden")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[contenido] extras:", error.message);
      return [];
    }
    return (data ?? []) as Extra[];
  } catch (error) {
    console.error(
      "[contenido] extras:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
});

export const getExperiencias = cache(async (): Promise<Extra[]> => {
  const extras = await getExtras();
  return extras.filter((extra) => extra.tipo === "experiencia");
});

/**
 * Adicionales: lo que se suma a la reserva y no es una celebración entera.
 *
 * Hoy son el Fondue ($25.000) y la segunda mascota ($50.000). Se separan de las
 * experiencias porque el compromiso es distinto —uno es «celebramos tu
 * aniversario», el otro es «tráete el segundo perro»— y mezclarlos en la misma
 * rejilla de tarjetas grandes le daba a una mascota el mismo peso visual que a
 * una decoración de $150.000.
 */
export const getAdicionales = cache(async (): Promise<Extra[]> => {
  const extras = await getExtras();
  return extras.filter((extra) => extra.tipo === "adicional");
});

/** Precio más bajo publicado en todo el hotel: el "desde" de la portada. */
export const getPrecioDesde = cache(async (): Promise<number | null> => {
  const alojamientos = await getAlojamientos();
  const precios = alojamientos
    .map((alojamiento) => alojamiento.precio_desde)
    .filter((precio): precio is number => typeof precio === "number");
  return precios.length ? Math.min(...precios) : null;
});

/**
 * Precio de un plan a lo largo de todas las cabañas.
 *
 * Hoy todas las cabañas comparten precio, pero el modelo permite que difieran:
 * si difieren, la portada muestra el más bajo con un "desde".
 */
export type PlanConPrecio = {
  plan: Plan;
  precio_minimo: number | null;
  /** `true` si no todas las cabañas cobran lo mismo por este plan. */
  varia: boolean;
  /**
   * Precio más bajo para UNA sola persona, si el plan lo publica.
   *
   * Hoy solo Entre Semana: $350.000 para dos, $200.000 para una. Ocultarlo
   * dejaría fuera a quien viaja solo entre semana, que es justo el huésped que
   * el plan busca.
   */
  precio_1_persona: number | null;
};

export const getPlanesConPrecio = cache(async (): Promise<PlanConPrecio[]> => {
  const [planes, alojamientos] = await Promise.all([
    getPlanes(),
    getAlojamientos(),
  ]);

  return planes.map((plan) => {
    /*
      LOS PLANES DE DÍA NO TIENEN TARIFA POR CABAÑA.
      El Día de Calma no ocupa cabaña ni noche: su precio vive en
      `planes.precio_base`. Sin esta rama saldría en la portada como «Consulta
      la tarifa» teniendo un precio publicado de $250.000.
    */
    if (plan.tipo === "dia") {
      return {
        plan,
        precio_minimo: plan.precio_base,
        varia: false,
        precio_1_persona: null,
      };
    }

    const tarifas = alojamientos
      .flatMap((alojamiento) => alojamiento.tarifas)
      .filter((tarifa) => tarifa.plan.id === plan.id);

    const precios = tarifas.map((tarifa) => tarifa.precio_noche);
    const preciosUnaPersona = tarifas
      .map((tarifa) => tarifa.precio_noche_1_persona)
      .filter((precio): precio is number => typeof precio === "number");

    return {
      plan,
      precio_minimo: precios.length ? Math.min(...precios) : null,
      varia: new Set(precios).size > 1,
      precio_1_persona: preciosUnaPersona.length
        ? Math.min(...preciosUnaPersona)
        : null,
    };
  });
});

/* ===========================================================================
 * Fechas de última modificación (para el `lastmod` del sitemap)
 * ======================================================================== */

export type UltimaModificacion = {
  /** Por slug de cabaña. */
  alojamientos: Map<string, Date>;
  alojamientosMasReciente: Date | null;
  extras: Date | null;
  contenido: Date | null;
};

function aFechaONulo(valor: unknown): Date | null {
  if (typeof valor !== "string") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function masReciente(...fechas: (Date | null | undefined)[]): Date | null {
  const validas = fechas.filter((f): f is Date => f instanceof Date);
  if (!validas.length) return null;
  return new Date(Math.max(...validas.map((f) => f.getTime())));
}

export const getUltimaModificacion = cache(
  async (): Promise<UltimaModificacion> => {
    const vacio: UltimaModificacion = {
      alojamientos: new Map(),
      alojamientosMasReciente: null,
      extras: null,
      contenido: null,
    };

    try {
      const supabase = crearClientePublico();
      const [alojamientos, tarifas, extras, contenido] = await Promise.all([
        supabase
          .from("alojamientos")
          .select("id, slug, created_at")
          .eq("activo", true),
        supabase.from("tarifas").select("alojamiento_id, created_at"),
        supabase.from("extras").select("id").eq("activo", true).limit(1),
        supabase.from("contenido").select("actualizado_at"),
      ]);

      const porAlojamiento = new Map<string, Date>();
      for (const fila of tarifas.data ?? []) {
        const fecha = aFechaONulo(fila.created_at);
        if (!fecha || !fila.alojamiento_id) continue;
        const actual = porAlojamiento.get(fila.alojamiento_id);
        porAlojamiento.set(
          fila.alojamiento_id,
          masReciente(actual, fecha) ?? fecha,
        );
      }

      const porSlug = new Map<string, Date>();
      for (const fila of alojamientos.data ?? []) {
        const fecha = masReciente(
          aFechaONulo(fila.created_at),
          porAlojamiento.get(fila.id),
        );
        if (fecha) porSlug.set(fila.slug, fecha);
      }

      const fechaContenido = masReciente(
        ...(contenido.data ?? []).map((fila) =>
          aFechaONulo(fila.actualizado_at),
        ),
      );

      return {
        alojamientos: porSlug,
        alojamientosMasReciente: masReciente(...porSlug.values()),
        /* `extras` no guarda fecha de actualización; su contenido lo edita el
           panel a través de la tabla `contenido`, así que se usa esa. */
        extras: extras.error ? null : fechaContenido,
        contenido: fechaContenido,
      };
    } catch (error) {
      console.error(
        "[contenido] última modificación:",
        error instanceof Error ? error.message : error,
      );
      return vacio;
    }
  },
);

/* ===========================================================================
 * Utilidades
 * ======================================================================== */

/**
 * Portada de una galería, con respaldo seguro si viene vacía.
 *
 * El respaldo es una foto de zonas comunes y no de una cabaña concreta: si una
 * cabaña se quedó sin fotos en la base, enseñar la habitación de OTRA cabaña
 * sería mentir sobre lo que se está reservando.
 */
export function portada(
  galeria: ImagenGaleria[],
  altRespaldo: string,
): ImagenGaleria {
  return (
    galeria[0] ?? {
      url: FOTO.panoramica,
      alt: altRespaldo,
    }
  );
}
