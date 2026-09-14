import type { ClaveContenido } from "@/lib/contenido";

/**
 * Las 18 claves del CMS, agrupadas en secciones que tengan sentido para quien
 * las edita.
 *
 * El contrato de cada clave —qué campos tiene su jsonb y dónde se ve— está en
 * `docs/CMS_CLAVES.md`. Este archivo NO inventa claves: solo decide en qué
 * pantalla del panel aparece cada una.
 */

export type SeccionContenido = {
  /** Segmento de la URL: `/admin/contenido/<slug>`. */
  slug: string;
  titulo: string;
  descripcion: string;
  /** Dónde se ve en el sitio, para poder ir a mirarlo. */
  verEn: string;
  claves: ClaveContenido[];
};

export const SECCIONES_CONTENIDO: SeccionContenido[] = [
  {
    slug: "portada",
    titulo: "Portada",
    descripcion:
      "Todo lo que se ve en la página de inicio: la primera pantalla, la bienvenida, los encabezados de cada bloque, la naturaleza, el reconocimiento COP16, los testimonios y el cierre.",
    verEn: "/",
    claves: [
      "home.hero",
      "home.intro",
      "home.cabanas",
      "home.planes",
      "home.experiencias",
      "home.esencia",
      "home.reconocimiento",
      "home.testimonios",
      "home.cta_final",
    ],
  },
  {
    slug: "cabeceras",
    titulo: "Cabeceras de las páginas",
    descripcion:
      "El título, el subtítulo y la foto grande que abre cada una de las siete páginas internas del sitio.",
    verEn: "/alojamientos",
    claves: ["heroes.listados"],
  },
  {
    slug: "experiencias",
    titulo: "Página de experiencias",
    descripcion:
      "El texto de entrada y las experiencias que hoy se ofrecen sin precio publicado. Las que sí tienen precio se editan en el módulo «Experiencias».",
    verEn: "/experiencias",
    claves: ["experiencias"],
  },
  {
    slug: "preguntas",
    titulo: "Preguntas frecuentes",
    descripcion:
      "Las preguntas y respuestas de la página de preguntas. Este texto también es el que puede mostrar Google en sus resultados.",
    verEn: "/faq",
    claves: ["faq"],
  },
  {
    slug: "lugar",
    titulo: "Conócenos",
    descripcion:
      "La historia de La Finca, las instalaciones y las indicaciones para llegar.",
    verEn: "/conocenos",
    claves: ["lugar"],
  },
  {
    slug: "galeria",
    titulo: "Galería",
    descripcion: "Las fotos de la página de galería y su texto de entrada.",
    verEn: "/galeria",
    claves: ["galeria"],
  },
  {
    slug: "reservar",
    titulo: "Reservar y página no encontrada",
    descripcion:
      "Los pasos que se explican en la página de reserva y el mensaje que ve quien llega a una dirección que no existe.",
    verEn: "/reservar",
    claves: ["reservar", "no_encontrado"],
  },
  {
    slug: "contacto",
    titulo: "Contacto, WhatsApp y redes",
    descripcion:
      "El número de WhatsApp, la dirección, el horario del restaurante, el RNT y las redes sociales. Es la información que aparece en el pie de todas las páginas.",
    verEn: "/contacto",
    claves: ["sitio.contacto"],
  },
  {
    slug: "buscadores",
    titulo: "Google y redes sociales",
    descripcion:
      "El título y la descripción con la que el sitio aparece en Google, y la imagen que se ve cuando alguien comparte el enlace por WhatsApp.",
    verEn: "/",
    claves: ["sitio.seo"],
  },
];

/**
 * Las siete páginas internas que tienen cabecera propia dentro de
 * `heroes.listados`. Las claves son fijas: el sitio ignora cualquier otra.
 */
export const PAGINAS_CON_CABECERA = [
  { clave: "alojamientos", nombre: "Cabañas", ruta: "/alojamientos" },
  { clave: "experiencias", nombre: "Experiencias", ruta: "/experiencias" },
  { clave: "conocenos", nombre: "Conócenos", ruta: "/conocenos" },
  { clave: "galeria", nombre: "Galería", ruta: "/galeria" },
  { clave: "faq", nombre: "Preguntas frecuentes", ruta: "/faq" },
  { clave: "contacto", nombre: "Contacto", ruta: "/contacto" },
  { clave: "reservar", nombre: "Reservar", ruta: "/reservar" },
] as const;

export function buscarSeccion(slug: string): SeccionContenido | null {
  return SECCIONES_CONTENIDO.find((seccion) => seccion.slug === slug) ?? null;
}
