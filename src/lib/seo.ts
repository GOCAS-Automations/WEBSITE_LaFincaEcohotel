/**
 * Capa compartida de SEO: metadatos por página y datos estructurados.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTE MÓDULO
 * ---------------------------------------------------------------------------
 * En el App Router los metadatos se heredan del layout raíz, pero la mezcla es
 * SUPERFICIAL: si una página declara su propio objeto `openGraph`, ese objeto
 * REEMPLAZA entero al del layout en vez de fundirse con él. El resultado
 * habitual es que las páginas internas pierden `og:type`, `og:locale` y
 * `og:site_name`, y las legales se quedan sin `og:image`. Al revés pasa lo
 * mismo: si ninguna página declara `twitter`, todas heredan el del layout y
 * cada ficha se comparte con el título de la portada.
 *
 * `metadatosPagina()` arma las tres familias —canónica, OpenGraph y Twitter—
 * de una sola vez y a partir de los mismos datos, para que ninguna página
 * pueda quedarse a medias.
 */
import type { Metadata } from "next";

import { IMAGEN_SOCIAL, SITIO, urlAbsoluta } from "./sitio";

/**
 * El sitio se declara "publicado" (el dominio real ya apunta a Vercel) solo
 * cuando esta variable vale exactamente `"1"`. Ver `.env.example` para el
 * porqué. Mientras no lo esté, TODA página lleva `noindex, nofollow` sin
 * excepción, sin importar lo que pida `noIndexar` más abajo.
 */
const sitioPublicado = process.env.SITIO_PUBLICADO === "1";

export type ImagenSeo = {
  url: string;
  alt: string;
  ancho?: number;
  alto?: number;
};

export type SeoPagina = {
  /**
   * Título de la pestaña SIN la marca: la plantilla del layout raíz
   * (`%s · La Finca Eco Hotel`) la añade. Conviene que no pase de unos 45
   * caracteres para que el resultado completo no se corte en Google.
   */
  titulo: string;
  /** Cuando el título YA incluye la marca (la portada), se publica tal cual. */
  tituloAbsoluto?: boolean;
  /** ~155 caracteres. Es lo que se lee bajo el enlace en el buscador. */
  descripcion: string;
  /** Ruta canónica con barra inicial y sin barra final: `/alojamientos`. */
  ruta: string;
  /** Imagen de la tarjeta social. Sin ella se usa la genérica del sitio. */
  imagen?: ImagenSeo;
  /** Título para redes. Por defecto se compone `"<título> · La Finca…"`. */
  tituloSocial?: string;
  /** Descripción para redes cuando la del buscador resulta muy escueta. */
  descripcionSocial?: string;
  /** `true` en páginas que no deben indexarse. */
  noIndexar?: boolean;
};

export function metadatosPagina({
  titulo,
  tituloAbsoluto,
  descripcion,
  ruta,
  imagen,
  tituloSocial,
  descripcionSocial,
  noIndexar,
}: SeoPagina): Metadata {
  const social = tituloSocial ?? `${titulo} · ${SITIO.nombre}`;
  const textoSocial = descripcionSocial ?? descripcion;
  const foto: ImagenSeo = imagen ?? {
    url: IMAGEN_SOCIAL.url,
    alt: IMAGEN_SOCIAL.alt,
    ancho: IMAGEN_SOCIAL.ancho,
    alto: IMAGEN_SOCIAL.alto,
  };

  const robots = !sitioPublicado
    ? { index: false, follow: false }
    : noIndexar
      ? { index: false, follow: true }
      : undefined;

  return {
    title: tituloAbsoluto ? { absolute: titulo } : titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    ...(robots ? { robots } : {}),
    openGraph: {
      // Estas tres se repiten en cada página A PROPÓSITO: no se heredan.
      type: "website",
      locale: "es_CO",
      siteName: SITIO.nombre,
      url: ruta,
      title: social,
      description: textoSocial,
      images: [
        {
          url: foto.url,
          alt: foto.alt,
          ...(foto.ancho ? { width: foto.ancho } : {}),
          ...(foto.alto ? { height: foto.alto } : {}),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description: textoSocial,
      images: [{ url: foto.url, alt: foto.alt }],
    },
  };
}

/* ---------------------------------------------------------------------------
 * Descripciones
 * ------------------------------------------------------------------------- */

/** Longitud a partir de la cual Google empieza a recortar la descripción. */
export const LIMITE_DESCRIPCION = 160;

/**
 * Compone una descripción con la cola de contexto MÁS LARGA que quepa.
 *
 * El texto base de una ficha lo edita el cliente desde el panel y puede crecer,
 * así que la cola se elige en tiempo de render: se prueban de la más
 * informativa a la más escueta y se toma la primera que entre. Nunca se parte
 * una frase por la mitad. `colas` debe venir de más larga a más corta.
 */
export function componerDescripcion(
  base: string,
  colas: string[],
  limite = LIMITE_DESCRIPCION,
): string {
  const limpio = base.trim().replace(/\s+/g, " ");

  for (const cola of colas) {
    const candidato = cola ? `${limpio} ${cola.trim()}` : limpio;
    if (candidato.length <= limite) return candidato;
  }

  if (limpio.length <= limite) return limpio;

  const corte = limpio.slice(0, limite - 1);
  const ultimoEspacio = corte.lastIndexOf(" ");
  const recortado = ultimoEspacio > 40 ? corte.slice(0, ultimoEspacio) : corte;
  return `${recortado.replace(/[,;:.\s]+$/, "")}…`;
}

/** Colas de contexto de una ficha de cabaña, de la más informativa a la más corta. */
export function colasDeCabana(precio: string | null): string[] {
  if (precio === null) {
    return [
      "Cabaña para dos en La Finca Eco Hotel, Km 18 vía Cali–Buenaventura.",
      "En La Finca Eco Hotel, Km 18 vía Buenaventura.",
      "La Finca Eco Hotel, cerca de Cali.",
      "",
    ];
  }
  return [
    `Cabaña para dos en La Finca Eco Hotel, Km 18 vía Cali–Buenaventura. Desde ${precio} la noche.`,
    `En La Finca Eco Hotel, Km 18 vía Buenaventura. Desde ${precio} la noche.`,
    `La Finca Eco Hotel, cerca de Cali. Desde ${precio} la noche.`,
    `Cerca de Cali. Desde ${precio} la noche.`,
    `Desde ${precio} la noche.`,
    "",
  ];
}

/* ---------------------------------------------------------------------------
 * Datos estructurados (JSON-LD)
 * ------------------------------------------------------------------------- */

/** Identificadores estables del grafo; se referencian entre sí con `@id`. */
export const ID_HOTEL = `${SITIO.url}/#lodging`;
export const ID_SITIO_WEB = `${SITIO.url}/#website`;

export type Miga = { nombre: string; ruta: string };

/**
 * `BreadcrumbList` a partir de las MISMAS migas que se pintan en pantalla
 * (se pasan desde la página, no se duplican aquí): Google exige que el marcado
 * corresponda a algo visible. La última miga no lleva `item`: es la página
 * actual, y así lo recomienda la documentación de resultados enriquecidos.
 */
export function migasJsonLd(migas: Miga[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${urlAbsoluta(migas[migas.length - 1]?.ruta ?? "/")}#breadcrumb`,
    itemListElement: migas.map((miga, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: miga.nombre,
      ...(indice < migas.length - 1 ? { item: urlAbsoluta(miga.ruta) } : {}),
    })),
  };
}

/**
 * Serializa un grafo para incrustarlo en un `<script type="application/ld+json">`.
 *
 * Escapa el signo de "menor que" como secuencia unicode: parte de lo que entra
 * aquí —descripciones, nombres, textos alternativos— lo escribirá el cliente
 * desde el panel, y un `</script>` dentro de una cadena cerraría la etiqueta y
 * volcaría el resto como HTML. Sigue siendo JSON válido.
 */
export function serializarJsonLd(grafo: unknown): string {
  return JSON.stringify(grafo).replace(/</g, "\\u003c");
}
