/**
 * Datos estructurados (schema.org) alimentados desde la base de datos.
 *
 * Se publican como un solo `@graph` por página, con `@id` estables para que las
 * entidades se referencien entre sí en vez de repetirse: el hotel se declara
 * UNA vez en la portada y cada ficha de cabaña lo referencia como
 * `containedInPlace`. Dos descripciones distintas de la misma entidad hacen que
 * el buscador se quede con una al azar.
 *
 * Nada de lo que hay aquí puede prometer algo que la página no muestre: los
 * precios salen de `tarifas` y las fotos, de las galerías reales.
 */
import type { AlojamientoPublico, ContactoSitio, PreguntaFrecuente } from "./contenido";
import { ID_HOTEL, ID_SITIO_WEB } from "./seo";
import { SITIO, urlAbsoluta } from "./sitio";

/** Dirección postal reutilizable. */
function direccion(contacto: ContactoSitio) {
  return {
    "@type": "PostalAddress",
    streetAddress: contacto.direccion,
    addressLocality: contacto.ciudad,
    addressRegion: contacto.region,
    addressCountry: "CO",
  };
}

/** Perfiles sociales verificables, para `sameAs`. */
function perfiles(contacto: ContactoSitio): string[] {
  return [contacto.instagram, contacto.facebook, contacto.tiktok].filter(
    (url): url is string => Boolean(url),
  );
}

/**
 * `LodgingBusiness` de la portada.
 *
 * `priceRange` se calcula con la tarifa más baja publicada, no a mano: si el
 * cliente cambia un precio desde el panel, el dato estructurado cambia con él.
 */
export function grafoHotel({
  contacto,
  precioDesde,
  imagenes,
  descripcion,
  numeroDeCabanas,
  calificacion,
}: {
  contacto: ContactoSitio;
  precioDesde: number | null;
  imagenes: string[];
  descripcion: string;
  numeroDeCabanas: number;
  /**
   * Promedio y número de calificaciones de la ficha de Google.
   *
   * Se pasa desde la página, que ya llamó a `getResenasGoogle()` para pintar
   * las reseñas: así el dato estructurado y lo que se ve en pantalla salen de
   * la MISMA lectura. Si la API no respondió, llega `undefined` y el bloque no
   * se emite: schema.org prohíbe declarar un `aggregateRating` sin respaldo, y
   * Google penaliza el marcado que no corresponde a contenido visible.
   */
  calificacion?: { promedio: number; total: number };
}) {
  const telefono = contacto.whatsapp ? `+${contacto.whatsapp}` : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": ID_SITIO_WEB,
        url: SITIO.url,
        name: SITIO.nombre,
        inLanguage: "es-CO",
        publisher: { "@id": ID_HOTEL },
      },
      {
        "@type": "LodgingBusiness",
        "@id": ID_HOTEL,
        name: SITIO.nombre,
        description: descripcion,
        url: SITIO.url,
        image: imagenes,
        address: direccion(contacto),
        geo: {
          "@type": "GeoCoordinates",
          latitude: SITIO.geo.latitud,
          longitude: SITIO.geo.longitud,
        },
        ...(telefono ? { telephone: telefono } : {}),
        ...(contacto.correo ? { email: contacto.correo } : {}),
        sameAs: perfiles(contacto),
        ...(precioDesde
          ? { priceRange: `Desde $${precioDesde.toLocaleString("es-CO")} COP` }
          : {}),
        currenciesAccepted: "COP",
        petsAllowed: SITIO.estadia.admiteMascotas,
        smokingAllowed: SITIO.estadia.permiteFumar,
        checkinTime: SITIO.estadia.checkIn,
        checkoutTime: SITIO.estadia.checkOut,
        numberOfRooms: numeroDeCabanas,
        ...(calificacion
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: calificacion.promedio,
                reviewCount: calificacion.total,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        /*
          Las amenidades son las que el hotel confirmó (§6 de
          `docs/DATOS_CLIENTE.md`), incluidas las que se declaran en NEGATIVO:
          que no hay televisor es una decisión del hotel y un dato que el
          huésped quiere saber antes de reservar, no una carencia que esconder.
        */
        amenityFeature: [
          ["Jacuzzi climatizado", true],
          ["Turco", true],
          ["Piscina de agua fría", true],
          ["Restaurante", true],
          ["WiFi", true],
          ["Parqueadero externo vigilado 24 horas", true],
          ["Senderos y miradores", true],
          ["Avistamiento de aves", true],
          ["Fogata", true],
          ["Salón para eventos", true],
          ["Estación de café y aromáticas", true],
          ["Televisor en las habitaciones", false],
        ].map(([nombre, value]) => ({
          "@type": "LocationFeatureSpecification",
          name: nombre,
          value,
        })),
      },
    ],
  };
}

/**
 * Ficha de una cabaña: `Accommodation` (lo que es) + `Product` con `offers`
 * (lo que se vende). Google usa el segundo para mostrar el precio; el primero
 * describe la habitación con su vocabulario propio.
 */
export function grafoCabana({
  alojamiento,
  contacto,
  descripcion,
}: {
  alojamiento: AlojamientoPublico;
  contacto: ContactoSitio;
  descripcion: string;
}) {
  const ruta = `/alojamientos/${alojamiento.slug}`;
  const url = urlAbsoluta(ruta);
  const fotos = alojamiento.galeria.map((imagen) => imagen.url);
  const precio = alojamiento.precio_desde;

  const alojamientoLd = {
    "@type": ["Accommodation", "HotelRoom"],
    "@id": `${url}#alojamiento`,
    name: alojamiento.nombre,
    description: descripcion,
    url,
    ...(fotos.length ? { image: fotos } : {}),
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: alojamiento.capacidad,
      unitCode: "C62",
    },
    bed: { "@type": "BedDetails", typeOfBed: "Double", numberOfBeds: 1 },
    ...(alojamiento.amenidades?.length
      ? {
          amenityFeature: alojamiento.amenidades.map((nombre) => ({
            "@type": "LocationFeatureSpecification",
            name: nombre,
            value: true,
          })),
        }
      : {}),
    containedInPlace: { "@id": ID_HOTEL },
  };

  const producto = {
    "@type": "Product",
    "@id": `${url}#producto`,
    name: `${alojamiento.nombre} · ${SITIO.nombre}`,
    description: descripcion,
    ...(fotos.length ? { image: fotos } : {}),
    brand: { "@type": "Brand", name: SITIO.nombre },
    ...(precio
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "COP",
            price: precio,
            /* "Por noche" no es un campo de `Offer`; se declara con la unidad de
               la especificación de precio, que es lo que entiende el buscador. */
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: precio,
              priceCurrency: "COP",
              unitCode: "DAY",
              unitText: "por noche",
            },
            availability: "https://schema.org/InStock",
            seller: { "@id": ID_HOTEL },
          },
        }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LodgingBusiness",
        "@id": ID_HOTEL,
        name: SITIO.nombre,
        url: SITIO.url,
        address: direccion(contacto),
        sameAs: perfiles(contacto),
      },
      alojamientoLd,
      producto,
    ],
  };
}

/** `FAQPage` a partir de las mismas preguntas que se pintan en `/faq`. */
export function grafoPreguntas(items: PreguntaFrecuente[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${urlAbsoluta("/faq")}#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.pregunta,
      acceptedAnswer: { "@type": "Answer", text: item.respuesta },
    })),
  };
}
