/**
 * Constantes del sitio: identidad, contacto, redes, navegación y rutas.
 *
 * Todo lo que hay aquí es el **respaldo en código** de lo que el panel podrá
 * editar desde la tabla `contenido` (fila `sitio.contacto`). El header, el pie,
 * el botón de WhatsApp y los datos estructurados tienen que renderizar SIEMPRE,
 * aunque la base de datos no responda durante el build.
 */

/** URL canónica de producción. Se sobreescribe con `NEXT_PUBLIC_SITE_URL`. */
const URL_SITIO = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lafincaecohotel.com"
).replace(/\/+$/, "");

export const SITIO = {
  nombre: "La Finca Eco Hotel",
  nombreCorto: "La Finca",
  lema: "Sumérgete en un bosque rodeado de neblina y aves",
  url: URL_SITIO,

  /**
   * Registro Nacional de Turismo. Publicarlo en el pie NO es opcional: es una
   * obligación legal para los prestadores de servicios turísticos en Colombia
   * (Ley 300 de 1996 y sus reglamentos).
   */
  rnt: "114565",

  contacto: {
    /** Solo dígitos con indicativo, para enlaces `wa.me` y `tel:+`. */
    whatsapp: "573160476671",
    whatsappVisible: "+57 316 047 6671",
    correo: "",
    direccion: "Km 18 vía Cali–Buenaventura, Vereda Loma Alta",
    ciudad: "Cali",
    region: "Valle del Cauca",
    pais: "Colombia",
    direccionCompleta:
      "Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca, Colombia",
    /* El sitio viejo decía 8:00 a. m. – 11:00 p. m. El hotel confirmó el
       horario real en septiembre de 2026 (§6 de `docs/DATOS_CLIENTE.md`), y
       además aclaró que el restaurante es SOLO para huéspedes: publicarlo sin
       esa coletilla traía gente a almorzar que no podía entrar. */
    horarioRestaurante:
      "9:00 a. m. – 8:00 p. m., todos los días · exclusivo para huéspedes",
  },

  /**
   * Ficha del hotel en Google.
   *
   * El `place_id` es la identidad del negocio en Google Maps y es el mismo que
   * usa `src/lib/resenas-google.ts` para leer las reseñas: mientras los dos
   * salgan de aquí, el mapa y las opiniones no pueden apuntar a sitios
   * distintos.
   */
  google: {
    placeId: "ChIJeyNhUdivMI4Rk9zjFWJ_Hrk",
  },

  /**
   * Coordenadas REALES del pin del hotel, leídas de su ficha de Google con el
   * `place_id` de arriba (Places API, campo `location`).
   *
   * Las anteriores —3.5008 / −76.6386— eran una estimación del Km 18 escrita a
   * mano y caían a algo más de un kilómetro del hotel. Las publica el JSON-LD
   * (`LodgingBusiness.geo`), así que un error aquí es un error en la ficha que
   * Google muestra en los resultados.
   */
  geo: {
    latitud: 3.5068719,
    longitud: -76.6267478,
  },

  mapa: {
    /*
      EL MAPA MOSTRABA UNA RUTA A BUENAVENTURA.
      La búsqueda anterior era la cadena «La Finca Eco Hotel Km 18 vía Cali
      Buenaventura». Google leía «vía Cali Buenaventura» como una indicación de
      trayecto y pintaba la carretera al puerto entera, con La Finca en algún
      punto invisible del recorrido. Ahora se pide el LUGAR por su `place_id`,
      que es un identificador exacto y no admite interpretación.
    */
    url: "https://www.google.com/maps/search/?api=1&query=La%20Finca%20Eco%20Hotel&query_place_id=ChIJeyNhUdivMI4Rk9zjFWJ_Hrk",
    /*
      El iframe va por COORDENADAS con etiqueta, no por `place_id`.
      El embed gratuito (`maps.google.com/maps?q=…&output=embed`) no entiende
      `q=place_id:…`: se probó y devolvía el mapamundi entero. Sí entiende
      `q=lat,lng(Etiqueta)`, que centra el mapa, pone el pin y lo rotula con el
      nombre del hotel. Las coordenadas son las de la propia ficha de Google
      (ver `geo`), así que el pin cae donde cae el hotel.
      El Embed API con `place_id` existe, pero exige clave y facturación.
    */
    embed:
      "https://maps.google.com/maps?q=3.5068719,-76.6267478(La+Finca+Eco+Hotel)&z=15&hl=es&ie=UTF8&output=embed",
    /*
      «Cómo llegar»: indicaciones DESDE CALI hasta el hotel. Sin `origin`,
      Google usa la ubicación de quien mira —que casi nunca está en Cali— y el
      resultado no se parece al viaje que el huésped va a hacer. Con el origen
      fijado, el enlace cuenta lo que el hotel promete: 45 minutos desde la
      ciudad.
    */
    comoLlegar:
      "https://www.google.com/maps/dir/?api=1&origin=Cali,+Valle+del+Cauca&destination=La+Finca+Eco+Hotel&destination_place_id=ChIJeyNhUdivMI4Rk9zjFWJ_Hrk",
  },

  redes: {
    instagram: "https://www.instagram.com/lafinca_cali/",
    instagramUsuario: "@lafinca_cali",
    facebook: "https://www.facebook.com/share/1Pz1wCY8af/?mibextid=JRoKGi",
    tiktok: "https://www.tiktok.com/@lafincacali",
    tiktokUsuario: "@lafincacali",
  },

  /**
   * Condiciones de estadía. Están aquí porque las publican a la vez los datos
   * estructurados, las preguntas frecuentes y los documentos legales: si mañana
   * cambia el horario de entrada, debe cambiar en un solo sitio.
   *
   * CONFIRMADAS por el hotel en septiembre de 2026 (§5 de
   * `docs/DATOS_CLIENTE.md`). Antes eran los valores habituales del sector; el
   * check-out real es la 1:00 p. m., no el mediodía.
   *
   * `llegadaZonas` no es el check-in: desde la 1:00 p. m. ya se pueden usar el
   * restaurante, los senderos y las zonas sociales, aunque la cabaña se
   * entregue a las 3:00 p. m.
   *
   * TODO (Amapola): ¿aplica mínimo de noches en fines de semana o festivos?
   * Entre semana confirmaron que no hay mínimo.
   */
  estadia: {
    llegadaZonas: "13:00",
    checkIn: "15:00",
    checkOut: "13:00",
    admiteMascotas: true,
    permiteFumar: false,
  },
} as const;

/* ---------------------------------------------------------------------------
 * Imágenes del bucket público de Supabase
 * ------------------------------------------------------------------------- */

const URL_SUPABASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://yyfuhytmoiehqmnrekkq.supabase.co";

export const BASE_MEDIOS = `${URL_SUPABASE}/storage/v1/object/public/imagenes`;

/**
 * Bucket de VIDEOS (migración 007).
 *
 * Va aparte del de imágenes por tres motivos: su lista blanca de tipos es
 * distinta (mp4/webm), su límite de tamaño es seis veces mayor, y la limpieza
 * de huérfanos del panel recorre referencias de imágenes —mezclarlos haría que
 * borrase un video por no encontrarlo donde busca fotos—.
 */
export const BASE_VIDEOS = `${URL_SUPABASE}/storage/v1/object/public/videos`;

/** Dirección pública de un video: `video("sitio/cop16-la-finca.mp4")`. */
export function video(ruta: string): string {
  return `${BASE_VIDEOS}/${ruta.replace(/^\/+/, "")}`;
}

/**
 * Dirección pública de una foto del bucket:
 * `medio("web/zonas-comunes/02.webp")`.
 *
 * Todas las fotos del sitio viven en Supabase Storage y no en `/public`, para
 * que el panel pueda reemplazarlas sin volver a desplegar. En `/public` solo
 * queda el logo, que es identidad de marca y no contenido editable.
 */
export function medio(ruta: string): string {
  return `${BASE_MEDIOS}/${ruta.replace(/^\/+/, "")}`;
}

/** Convierte una ruta propia en dirección absoluta (metadatos y JSON-LD). */
export function urlAbsoluta(ruta: string): string {
  if (/^https?:\/\//i.test(ruta)) return ruta;
  if (ruta === "/") return SITIO.url;
  return `${SITIO.url}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
}

/* ---------------------------------------------------------------------------
 * Navegación
 * ------------------------------------------------------------------------- */

export type EnlaceNav = { href: string; etiqueta: string };

/** Menú principal, en orden. "Reservar" va aparte, como botón destacado. */
export const NAVEGACION: readonly EnlaceNav[] = [
  { href: "/alojamientos", etiqueta: "Cabañas" },
  { href: "/experiencias", etiqueta: "Experiencias" },
  { href: "/conocenos", etiqueta: "Conócenos" },
  { href: "/galeria", etiqueta: "Galería" },
  { href: "/faq", etiqueta: "Preguntas" },
  { href: "/contacto", etiqueta: "Contacto" },
] as const;

/* ---------------------------------------------------------------------------
 * Documentos legales
 * -------------------------------------------------------------------------
 * No son decorativos: Wompi (y cualquier pasarela colombiana) exige que el
 * comercio publique política de tratamiento de datos, términos y política de
 * cancelación antes de aprobar la cuenta. Además dan confianza al huésped.
 */

export type EnlaceLegal = {
  href: string;
  /** Título completo: encabezado de la página y `title` del metadata. */
  titulo: string;
  /** Versión corta, para la fila del pie. */
  corto: string;
};

export const DOCUMENTOS_LEGALES: readonly EnlaceLegal[] = [
  {
    href: "/legal/privacidad",
    titulo: "Política de privacidad",
    corto: "Privacidad",
  },
  {
    href: "/legal/terminos",
    titulo: "Términos y condiciones",
    corto: "Términos",
  },
  {
    href: "/legal/datos",
    titulo: "Política de tratamiento de datos personales",
    corto: "Datos personales",
  },
  {
    href: "/legal/cancelacion",
    titulo: "Política de cancelación y reembolsos",
    corto: "Cancelación",
  },
] as const;

/**
 * Fecha de la última revisión de los textos legales.
 *
 * La usan las propias páginas ("Última actualización: …") y el `lastmod` del
 * sitemap. Debe cambiarse A MANO cuando se edite un documento: un `lastmod`
 * atado a la fecha de despliegue le diría a Google que la política de
 * privacidad cambia cada vez que se recompila el sitio.
 */
export const LEGAL_ACTUALIZADO = "2026-09-30";

/* ---------------------------------------------------------------------------
 * Imagen social por defecto
 * ------------------------------------------------------------------------- */

/**
 * Imagen de OpenGraph / Twitter cuando una página no aporta la suya.
 *
 * Es una tarjeta DEDICADA de 1200×630, compuesta con
 * `npm run imagenes:social` (`scripts/generar-imagen-social.mjs`): el hero de
 * la portada bajo el velo de petróleo de la marca, con el **logotipo oficial
 * del diseñador** —el lockup completo, colibrí y wordmark— teñido en crema.
 * Antes se compartía el banner del hero declarado 1200×630 sin serlo: WhatsApp
 * y Facebook recortan al centro, y ese recorte se comía el cielo y la cabaña.
 *
 * ---------------------------------------------------------------------------
 * ESTO ES EL RESPALDO, NO LA FUENTE
 * ---------------------------------------------------------------------------
 * La imagen que de verdad se publica sale del CMS (`sitio.seo` → `imagen`), y
 * el hotel la cambia desde el panel subiendo un archivo o pegando una
 * dirección. Este objeto es lo que se usa si la base no responde durante el
 * build, y es también el valor con el que nace la fila del seed.
 *
 * La ruta lleva `marca-oficial` porque la anterior (`tarjeta-og-1200x630`)
 * componía el wordmark con una tipografía de sistema: en el bucket ninguna
 * imagen se sobrescribe —una URL siempre devuelve el mismo archivo— así que
 * una tarjeta distinta es una ruta distinta. Se pudo cambiar ahora porque el
 * sitio todavía no está publicado y nadie ha compartido aún el enlace; de aquí
 * en adelante esta dirección se queda quieta.
 */
export const IMAGEN_SOCIAL = {
  url: medio("sitio/social/tarjeta-og-marca-oficial-1200x630.webp"),
  ancho: 1200,
  alto: 630,
  alt: "La Finca Eco Hotel — cabañas en el bosque de niebla del Km 18, cerca de Cali",
} as const;
