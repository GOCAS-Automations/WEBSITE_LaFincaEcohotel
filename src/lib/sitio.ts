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
    horarioRestaurante: "8:00 a. m. – 11:00 p. m., todos los días",
  },

  /** Coordenadas aproximadas del Km 18 (vía Cali–Buenaventura). */
  geo: {
    latitud: 3.5008,
    longitud: -76.6386,
  },

  mapa: {
    url: "https://www.google.com/maps/search/?api=1&query=La+Finca+Eco+Hotel+Km+18+v%C3%ADa+Cali+Buenaventura",
    /* Modo búsqueda pública: no necesita clave de API ni facturación. */
    embed:
      "https://maps.google.com/maps?q=La%20Finca%20Eco%20Hotel%20Km%2018%20v%C3%ADa%20Cali%20Buenaventura&t=&z=13&ie=UTF8&iwloc=&output=embed",
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
   * estructurados y los documentos legales: si mañana cambia el horario de
   * entrada, debe cambiar en un solo sitio.
   *
   * TODO confirmar con el cliente (§12 del plan): horas de check-in/out y
   * mínimo de noches. Los valores actuales son los habituales del sector, no
   * los del hotel.
   */
  estadia: {
    checkIn: "15:00",
    checkOut: "12:00",
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
 * Dirección pública de una foto del bucket:
 * `medio("sitio/home/banner-img-1075-baja-2.webp")`.
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
  { href: "/el-lugar", etiqueta: "El lugar" },
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
export const LEGAL_ACTUALIZADO = "2026-09-02";

/* ---------------------------------------------------------------------------
 * Imagen social por defecto
 * ------------------------------------------------------------------------- */

/**
 * Imagen de OpenGraph / Twitter cuando una página no aporta la suya.
 *
 * TODO: falta un recorte dedicado a 1200×630 en el bucket. Mientras tanto se
 * usa el banner del hero, que es el que mejor sobrevive al recorte central que
 * hacen WhatsApp y Facebook. Las medidas declaradas son una pista de
 * proporción para los lectores de OpenGraph.
 */
export const IMAGEN_SOCIAL = {
  url: medio("sitio/home/banner-img-1075-baja-2.webp"),
  ancho: 1200,
  alto: 630,
  alt: "La Finca Eco Hotel, bosque de niebla en el Valle del Cauca",
} as const;
