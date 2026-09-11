import "server-only";

/**
 * Reseñas de Google — capa de datos.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE MÓDULO ES "SERVER ONLY"
 * ---------------------------------------------------------------------------
 * La credencial `GOOGLE_PLACES_API_KEY` es una clave de facturación: si llegara
 * al navegador, cualquiera podría gastar la cuota del hotel. `server-only` no
 * es un comentario de buena voluntad, es una barrera real: si algún día alguien
 * importa este archivo desde un componente con `"use client"`, el build FALLA
 * en vez de publicar la clave. Por eso el componente de presentación
 * (`src/components/sitio/resenas-google.tsx`) NO llama a esta función: la llama
 * la página (Server Component) y le pasa el resultado ya cocinado por props.
 *
 * ---------------------------------------------------------------------------
 * QUÉ API SE USA (y cuál NO)
 * ---------------------------------------------------------------------------
 * En el proyecto de Google Cloud del hotel solo está habilitada la **Places API
 * (New)**: `https://places.googleapis.com/v1/places/{place_id}`. La API clásica
 * (`maps.googleapis.com/maps/api/place/details/json`) responde `REQUEST_DENIED`
 * y no debe usarse. La nueva pide dos cabeceras obligatorias:
 *
 *   · `X-Goog-Api-Key`     → la credencial.
 *   · `X-Goog-FieldMask`   → qué campos se quieren. Es OBLIGATORIA y además
 *                            determina cuánto cobra Google: pedir solo estos
 *                            cuatro campos mantiene la llamada en el tramo
 *                            barato en vez de traerse la ficha completa.
 *
 * ---------------------------------------------------------------------------
 * LÍMITES QUE IMPONE GOOGLE (no son decisiones nuestras)
 * ---------------------------------------------------------------------------
 * · Devuelve como máximo **5 reseñas**, las que su algoritmo considera más
 *   relevantes. No hay paginación ni forma de pedir más: un "ver todas" solo
 *   puede ser un enlace a Google Maps.
 * · Los términos exigen mostrar la **atribución al autor** y dejar claro que
 *   las reseñas vienen de Google. Eso lo resuelve el componente.
 * · Se permite cachear los datos hasta 30 días.
 */

/**
 * Identificador del hotel en Google ("La Finca - Eco Hotel").
 * Es estable: Google solo lo cambia si la ficha se fusiona con otra.
 */
export const PLACE_ID_LA_FINCA = "ChIJeyNhUdivMI4Rk9zjFWJ_Hrk";

/**
 * Enlace de respaldo a la ficha de Google Maps.
 *
 * La API devuelve su propio `googleMapsUri` (un enlace corto con `cid=` y un
 * parámetro de sesión), pero es un dato externo: si algún día no viniera, este
 * formato `place_id:` es el oficial de Google y funciona siempre.
 */
export const MAPS_URL_RESPALDO = `https://www.google.com/maps/place/?q=place_id:${PLACE_ID_LA_FINCA}`;

/** Host desde el que Google sirve las fotos de perfil de los autores. */
const HOST_FOTOS_GOOGLE = "lh3.googleusercontent.com";

const ENDPOINT = `https://places.googleapis.com/v1/places/${PLACE_ID_LA_FINCA}?languageCode=es`;

/** Campos pedidos. Cualquier campo extra encarece la llamada: no añadir. */
const MASCARA_CAMPOS = "rating,userRatingCount,reviews,googleMapsUri";

/**
 * 24 horas de caché (`revalidate`). Google permite hasta 30 días, pero un día
 * es el equilibrio: la portada refleja una reseña nueva al día siguiente y el
 * sitio hace una sola llamada diaria a la API, no una por visita.
 */
const REVALIDAR_SEGUNDOS = 60 * 60 * 24;

/** Solo se publican reseñas de 4 o 5 estrellas. */
const CALIFICACION_MINIMA = 4;

/** Tope duro por si Google algún día devolviera más de cinco. */
const MAXIMO_RESENAS = 5;

/* ===========================================================================
 * Tipos propios
 * ---------------------------------------------------------------------------
 * Deliberadamente NO se exporta la forma cruda de Google. El resto del sitio
 * habla español y no debería enterarse de `authorAttribution.displayName`: si
 * Google cambia su esquema, el cambio se absorbe aquí dentro.
 * ======================================================================== */

export type ResenaGoogle = {
  autor: string;
  /** URL de la foto de perfil, o `null` si el autor no tiene o no es de Google. */
  foto: string | null;
  /** Perfil público del autor en Google Maps. `null` si no vino. */
  perfil: string | null;
  /** Entero de 1 a 5. */
  calificacion: number;
  texto: string;
  /** Ya localizado por Google al pedir `languageCode=es`: "Hace 3 meses". */
  tiempoRelativo: string;
  /** Fecha ISO 8601 en UTC, útil para `<time dateTime>` y para ordenar. */
  publicadaEn: string;
};

export type ResumenGoogle = {
  /** Promedio con decimales tal cual lo calcula Google (ej. 4.7). */
  promedio: number;
  /** Total de calificaciones de la ficha, NO el número de reseñas mostradas. */
  total: number;
  mapsUrl: string;
  resenas: ResenaGoogle[];
};

/* ===========================================================================
 * Validación defensiva
 * ---------------------------------------------------------------------------
 * Todo lo que llega de la red es `unknown` hasta que se demuestre lo contrario.
 * Estos ayudantes evitan el patrón habitual de castear la respuesta a una
 * interfaz optimista y descubrir el `undefined` en producción.
 * ======================================================================== */

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Devuelve el texto si es una cadena con contenido real; si no, `null`. */
function textoValido(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

/** Devuelve el número si es finito; si no, `null` (descarta `NaN` e `Infinity`). */
function numeroValido(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/**
 * Acepta la foto del autor SOLO si es `https` y viene del host de Google.
 *
 * No es paranoia: `next/image` falla en tiempo de ejecución si le dan un host
 * que no está declarado en `next.config.ts`. Filtrar aquí significa que una
 * respuesta rara de Google degrada a "avatar con la inicial" en vez de tumbar
 * la portada entera.
 */
function fotoValida(valor: unknown): string | null {
  const crudo = textoValido(valor);
  if (!crudo) return null;
  try {
    const url = new URL(crudo);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== HOST_FOTOS_GOOGLE) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Igual que arriba, pero para enlaces de Google Maps (perfil del autor). */
function enlaceValido(valor: unknown): string | null {
  const crudo = textoValido(valor);
  if (!crudo) return null;
  try {
    return new URL(crudo).protocol === "https:" ? crudo : null;
  } catch {
    return null;
  }
}

/**
 * Convierte una reseña cruda al tipo del sitio. Devuelve `null` si le falta
 * cualquier cosa imprescindible (autor, texto, calificación o fecha).
 */
function normalizarResena(crudo: unknown): ResenaGoogle | null {
  if (!esObjeto(crudo)) return null;

  const calificacion = numeroValido(crudo.rating);
  if (calificacion === null || calificacion < 1 || calificacion > 5) return null;

  // El texto viene anidado: `text: { text, languageCode }`. Con
  // `languageCode=es` Google traduce, y deja el original en `originalText`;
  // se prefiere la traducción y se cae al original si la traducción falta.
  const bloqueTexto = esObjeto(crudo.text) ? crudo.text.text : null;
  const bloqueOriginal = esObjeto(crudo.originalText)
    ? crudo.originalText.text
    : null;
  const texto = textoValido(bloqueTexto) ?? textoValido(bloqueOriginal);
  if (!texto) return null; // Una calificación sin comentario no aporta nada.

  const atribucion = esObjeto(crudo.authorAttribution)
    ? crudo.authorAttribution
    : null;
  const autor = textoValido(atribucion?.displayName);
  if (!autor) return null; // Sin autor no se puede atribuir: los términos lo exigen.

  const publicadaEn = textoValido(crudo.publishTime);
  if (!publicadaEn || Number.isNaN(Date.parse(publicadaEn))) return null;

  return {
    autor,
    foto: fotoValida(atribucion?.photoUri),
    perfil: enlaceValido(atribucion?.uri),
    calificacion: Math.round(calificacion),
    texto,
    // Si Google no mandara el texto relativo, se arma uno neutro con el año.
    tiempoRelativo:
      textoValido(crudo.relativePublishTimeDescription) ??
      `En ${new Date(publicadaEn).getFullYear()}`,
    publicadaEn,
  };
}

/* ===========================================================================
 * Función pública
 * ======================================================================== */

/**
 * Trae el promedio, el total y hasta cinco reseñas de la ficha de Google.
 *
 * NUNCA lanza. Si no hay clave, si Google responde mal, si el JSON no tiene la
 * forma esperada o si no queda ninguna reseña de 4+ estrellas, devuelve `null`
 * y deja un `console.error` explicando el motivo. La razón es simple: este
 * bloque es un adorno social, y un adorno jamás puede impedir que el sitio del
 * hotel se construya o se muestre. Quien la consume solo tiene que hacer
 * `if (!resumen) return null;`.
 */
export async function getResenasGoogle(): Promise<ResumenGoogle | null> {
  const clave = process.env.GOOGLE_PLACES_API_KEY;

  if (!clave) {
    console.error(
      "[resenas-google] Falta GOOGLE_PLACES_API_KEY: el bloque de reseñas no se publica.",
    );
    return null;
  }

  let datos: unknown;

  try {
    const respuesta = await fetch(ENDPOINT, {
      headers: {
        "X-Goog-Api-Key": clave,
        "X-Goog-FieldMask": MASCARA_CAMPOS,
      },
      next: { revalidate: REVALIDAR_SEGUNDOS },
    });

    if (!respuesta.ok) {
      // El cuerpo del error de Google explica el motivo real (clave sin
      // permisos, API no habilitada, cuota agotada). Sin él, depurar es a ciegas.
      const detalle = await respuesta.text().catch(() => "");
      console.error(
        `[resenas-google] Google respondió ${respuesta.status}: ${detalle.slice(0, 400)}`,
      );
      return null;
    }

    datos = await respuesta.json();
  } catch (error) {
    console.error("[resenas-google] No se pudo consultar Places API:", error);
    return null;
  }

  if (!esObjeto(datos)) {
    console.error("[resenas-google] La respuesta no es un objeto JSON.");
    return null;
  }

  const promedio = numeroValido(datos.rating);
  const total = numeroValido(datos.userRatingCount);

  if (promedio === null || total === null) {
    console.error(
      "[resenas-google] La respuesta no trae `rating` o `userRatingCount`.",
    );
    return null;
  }

  const crudas = Array.isArray(datos.reviews) ? datos.reviews : [];

  const resenas = crudas
    .map(normalizarResena)
    .filter((resena): resena is ResenaGoogle => resena !== null)
    .filter((resena) => resena.calificacion >= CALIFICACION_MINIMA)
    // Más recientes primero: una reseña de hace tres semanas convence más que
    // una de hace tres años, aunque Google las ordene por "relevancia".
    .sort((a, b) => Date.parse(b.publicadaEn) - Date.parse(a.publicadaEn))
    .slice(0, MAXIMO_RESENAS);

  if (resenas.length === 0) {
    console.error(
      "[resenas-google] No quedaron reseñas de 4+ estrellas para publicar.",
    );
    return null;
  }

  return {
    promedio,
    total: Math.round(total),
    mapsUrl: enlaceValido(datos.googleMapsUri) ?? MAPS_URL_RESPALDO,
    resenas,
  };
}
