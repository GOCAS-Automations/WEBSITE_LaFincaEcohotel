import "server-only";

import { cache } from "react";

import { guardarCache, leerCache, tomarTurno } from "./cache-externo";

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
 *   puede ser un enlace a Google Maps. La API clásica con `reviews_sort=newest`
 *   está deshabilitada en esta cuenta (`REQUEST_DENIED`). Por tanto NO se puede
 *   elegir "las 5 mejores del último año" entre todas las del hotel: solo se
 *   filtra y ordena lo que Google entrega (ver `seleccionarResenas()`).
 * · Los términos exigen mostrar la **atribución al autor** y dejar claro que
 *   las reseñas vienen de Google. Eso lo resuelve el componente.
 * · Se permite cachear los datos hasta 30 días.
 *
 * ---------------------------------------------------------------------------
 * DE DÓNDE SALEN LAS LLAMADAS, Y CUÁNTAS SON
 * ---------------------------------------------------------------------------
 * Google retiró el crédito universal de Maps. Las reseñas están en el tramo más
 * caro de Place Details: **1.000 llamadas gratis al mes**, y 20 USD por cada
 * millar siguiente. Así que el número de llamadas no puede ser una consecuencia
 * del tráfico; tiene que ser una decisión.
 *
 * Antes este módulo pedía la ficha con `next: { revalidate: 86400 }`. Sobre el
 * papel, una llamada al día. En la práctica, la Data Cache de Next vive **por
 * instancia y por región**: con tres instancias en dos regiones son hasta seis
 * llamadas el mismo día, y mañana pueden ser dos. Un número que nadie puede
 * presupuestar.
 *
 * Ahora manda la base de datos (`cache_externo`, migración 014):
 *
 *   · `getResenasGoogle()` —lo que usa la portada— **LEE DE LA BASE**. Una visita
 *     no llama a Google. Nunca. La única excepción es el arranque en frío (la
 *     tabla vacía): entonces se hace UNA llamada, se guarda y se sirve, y para
 *     que diez visitas simultáneas no hagan diez llamadas hay que ganar antes un
 *     turno (`tomarTurno()` en `src/lib/cache-externo.ts`).
 *   · `refrescarResenasGoogle()` —lo que usa el cron diario de `/api/salud`— es
 *     el ÚNICO camino que llama a Google de forma rutinaria, y corre una vez al
 *     día.
 *
 *       1 llamada/día × 30 días = 30 llamadas/mes   frente a 1.000 gratis
 *
 *     Es el 3 % de la cuota gratuita, y es un número determinista: no depende de
 *     Vercel ni de que alguien recuerde fijar el tope de cuota en la consola de
 *     Google Cloud (ese tope sigue siendo buena idea, pero ya no es lo único que
 *     separa al hotel de una factura sorpresa).
 *
 * **Si se quita el cron**, el sitio no se rompe: sigue mostrando lo último que
 * guardó, indefinidamente. Lo que se pierde es que las reseñas nuevas aparezcan.
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

/** Clave de la fila de `cache_externo` donde vive el resumen ya cocinado. */
export const CLAVE_CACHE_RESENAS = "resenas_google";

/**
 * Cortes de tiempo de la llamada a Google, distintos según quién llame.
 *
 * No es una cifra de adorno: medido contra `places.googleapis.com`, el
 * handshake TLS de una conexión nueva puede irse a ocho o nueve segundos según
 * la red desde la que se salga. Un solo número tendría que elegir entre
 * sacrificar al visitante o sacrificar el refresco.
 *
 *   · `cron-diario`: diez segundos. Corre sin nadie esperando, dentro de los
 *     treinta de `maxDuration` de `/api/salud`, y si falla el sitio se queda un
 *     día más con las reseñas de ayer. Vale la pena esperar.
 *   · `arranque-en-frio`: cuatro segundos. Aquí hay una persona con la portada
 *     en blanco. Mejor caer a los testimonios del CMS —que es instantáneo— que
 *     tenerla mirando una pantalla vacía. El turno se podrá retomar en diez
 *     minutos, y de todas formas el cron llenará la fila.
 */
const ESPERA_MS = {
  "cron-diario": 10_000,
  "arranque-en-frio": 4000,
} as const;

/** Solo se publican reseñas de 4 o 5 estrellas. */
const CALIFICACION_MINIMA = 4;

/** Tope duro por si Google algún día devolviera más de cinco. */
const MAXIMO_RESENAS = 5;

/** Ventana normal: reseñas publicadas en los últimos 12 meses. */
const VENTANA_MESES = 12;

/** Ventana relajada cuando la normal deja menos de `MINIMO_RESENAS`. */
const VENTANA_RELAJADA_MESES = 24;

/** Por debajo de esto la sección se vería casi vacía: se relaja el criterio. */
const MINIMO_RESENAS = 3;

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
  /** Constancia de cómo se eligieron las reseñas (diagnóstico). */
  seleccion?: SeleccionResenas;
};

/**
 * Cómo se llegó a las reseñas publicadas. Se guarda junto a ellas para poder
 * diagnosticar, sin volver a llamar a Google, por qué hoy hay N y no cinco.
 */
export type SeleccionResenas = {
  /** Cuántas devolvió Google (antes de cualquier filtro). */
  devueltas: number;
  /** Cuántas pasaron el filtro de 4★+ y de la ventana aplicada. */
  aprobadas: number;
  /** Ventana aplicada en meses (12, 24) o `null` si se usó "sin filtro de fecha". */
  ventanaMeses: number | null;
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
 * Normalización de la respuesta de Google
 * ---------------------------------------------------------------------------
 * Separada del `fetch` a propósito: es la parte con reglas de negocio —qué
 * reseñas se publican y en qué orden— y es la única que merece pruebas. Se
 * exporta solo para poder probarla.
 * ======================================================================== */

/** Resta `meses` a una fecha, en UTC. Pura, para poder probar la ventana. */
function restarMeses(fecha: Date, meses: number): Date {
  const limite = new Date(fecha.getTime());
  limite.setUTCMonth(limite.getUTCMonth() - meses);
  return limite;
}

/**
 * El criterio de selección: «las mejores del último año».
 *
 * LÍMITE DE LA API: Places API (New) entrega como máximo 5 reseñas, elegidas por
 * Google. Aquí no se elige entre todas las del hotel: solo se filtra y ordena lo
 * que llegó, así que si alguna es vieja se publican menos de cinco.
 *
 *   1. Solo 4★ o más.
 *   2. Publicadas en los últimos 12 meses.
 *   3. Si quedan menos de 3, la ventana sube a 24 meses.
 *   4. Si aun así quedan menos de 3, las mejores disponibles sin filtro de fecha.
 *   5. Orden: puntuación descendente; a igual puntuación, la más reciente primero.
 *   6. Cinco como máximo.
 */
export function seleccionarResenas(
  candidatas: ResenaGoogle[],
  ahora: Date = new Date(),
): { resenas: ResenaGoogle[]; ventanaMeses: number | null } {
  const buenas = candidatas.filter(
    (resena) => resena.calificacion >= CALIFICACION_MINIMA,
  );

  const mejores = (lista: ResenaGoogle[]) =>
    [...lista]
      .sort(
        (a, b) =>
          b.calificacion - a.calificacion ||
          Date.parse(b.publicadaEn) - Date.parse(a.publicadaEn),
      )
      .slice(0, MAXIMO_RESENAS);

  for (const meses of [VENTANA_MESES, VENTANA_RELAJADA_MESES]) {
    const desde = restarMeses(ahora, meses).getTime();
    const enVentana = buenas.filter(
      (resena) => Date.parse(resena.publicadaEn) >= desde,
    );
    if (enVentana.length >= MINIMO_RESENAS) {
      return { resenas: mejores(enVentana), ventanaMeses: meses };
    }
  }

  return { resenas: mejores(buenas), ventanaMeses: null };
}

/**
 * Convierte la respuesta cruda de Places API en el resumen que usa el sitio, o
 * `null` si no hay nada publicable.
 *
 * Reglas, en este orden:
 *   1. Sin `rating` o sin `userRatingCount` no hay resumen: las estrellas de la
 *      portada y el `aggregateRating` del JSON-LD saldrían de la nada.
 *   2. Cada reseña pasa por `normalizarResena()`; a las que les falta algo
 *      imprescindible se caen.
 *   3. Selección con `seleccionarResenas()`: 4★+, últimos 12 meses (24 y luego
 *      sin límite si quedan menos de 3), por puntuación y luego por fecha,
 *      cinco como máximo.
 *   4. Si no queda ninguna, `null`: mejor los testimonios del CMS que una
 *      sección vacía con un promedio huérfano.
 */
export function normalizarRespuestaGoogle(
  datos: unknown,
  ahora: Date = new Date(),
): ResumenGoogle | null {
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

  const { resenas, ventanaMeses } = seleccionarResenas(
    crudas
      .map(normalizarResena)
      .filter((resena): resena is ResenaGoogle => resena !== null),
    ahora,
  );

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
    seleccion: {
      devueltas: crudas.length,
      aprobadas: resenas.length,
      ventanaMeses,
    },
  };
}

/**
 * Revalida lo que salió de la columna `jsonb`.
 *
 * Es nuestro propio dato, sí, pero `jsonb` no tiene tipos de TypeScript: lo que
 * vuelve es `unknown`. Una fila guardada por una versión anterior del código, o
 * editada a mano en el editor SQL del panel de Supabase, no puede tumbar la
 * portada. Cuesta microsegundos y convierte una promesa en una garantía.
 *
 * Deliberadamente **no** vuelve a filtrar por calificación ni a reordenar: eso
 * ya se hizo al guardar. Aquí solo se comprueba la forma.
 */
export function normalizarResumenGuardado(valor: unknown): ResumenGoogle | null {
  if (!esObjeto(valor)) return null;

  const promedio = numeroValido(valor.promedio);
  const total = numeroValido(valor.total);
  const mapsUrl = enlaceValido(valor.mapsUrl);

  if (promedio === null || total === null || !mapsUrl) return null;
  if (!Array.isArray(valor.resenas)) return null;

  const resenas = valor.resenas
    .map((resena) => normalizarResenaGuardada(resena))
    .filter((resena): resena is ResenaGoogle => resena !== null);

  if (resenas.length === 0) return null;

  const sel = esObjeto(valor.seleccion) ? valor.seleccion : null;
  const devueltas = numeroValido(sel?.devueltas);
  const aprobadas = numeroValido(sel?.aprobadas);
  const seleccion: SeleccionResenas | undefined =
    devueltas !== null && aprobadas !== null
      ? {
          devueltas,
          aprobadas,
          ventanaMeses: numeroValido(sel?.ventanaMeses),
        }
      : undefined;

  return {
    promedio,
    total: Math.round(total),
    mapsUrl,
    resenas,
    ...(seleccion ? { seleccion } : {}),
  };
}

/**
 * Una reseña tal como quedó guardada (en español, ya normalizada), no como la
 * manda Google. Por eso no reutiliza `normalizarResena()`: los nombres de los
 * campos son otros.
 */
function normalizarResenaGuardada(crudo: unknown): ResenaGoogle | null {
  if (!esObjeto(crudo)) return null;

  const autor = textoValido(crudo.autor);
  const texto = textoValido(crudo.texto);
  const calificacion = numeroValido(crudo.calificacion);
  const publicadaEn = textoValido(crudo.publicadaEn);

  if (!autor || !texto || calificacion === null || !publicadaEn) return null;
  if (Number.isNaN(Date.parse(publicadaEn))) return null;

  return {
    autor,
    foto: fotoValida(crudo.foto),
    perfil: enlaceValido(crudo.perfil),
    calificacion: Math.round(calificacion),
    texto,
    tiempoRelativo:
      textoValido(crudo.tiempoRelativo) ??
      `En ${new Date(publicadaEn).getFullYear()}`,
    publicadaEn,
  };
}

/* ===========================================================================
 * La llamada a Google (la que se paga)
 * ======================================================================== */

/**
 * Pide la ficha a Places API. **Este es el único punto del proyecto que gasta
 * cuota de Google.**
 *
 * NUNCA lanza: devuelve `null` y deja un `console.error` con el motivo real
 * (falta la clave, la API no está habilitada, la cuota se agotó, el JSON vino
 * raro). Sin `next: { revalidate }` y con `cache: "no-store"` a propósito: cuántas
 * llamadas se hacen ya no lo decide el caché de Next sino quién llama a esta
 * función y cuándo. Un caché escondido aquí solo serviría para que el número
 * volviera a ser imposible de razonar.
 */
async function consultarPlacesApi(
  motivo: "cron-diario" | "arranque-en-frio",
): Promise<ResumenGoogle | null> {
  const clave = process.env.GOOGLE_PLACES_API_KEY;

  if (!clave) {
    console.error(
      "[resenas-google] Falta GOOGLE_PLACES_API_KEY: no se puede refrescar.",
    );
    return null;
  }

  /*
    ESTA LÍNEA ES EL CONTADOR DE LA FACTURA.

    Queda a propósito en `info` y no en `debug`: buscar
    «llamada a Places API» en los registros de Vercel tiene que dar el número
    exacto de llamadas del mes, sin tener que fiarse de la consola de Google. Lo
    normal es ver una al día con `motivo=cron-diario`; un `arranque-en-frio`
    significa que la fila de `cache_externo` no estaba (base nueva, fila borrada,
    build desde cero) y debería ser rarísimo.
  */
  console.info(`[resenas-google] llamada a Places API (motivo: ${motivo}).`);

  let datos: unknown;

  try {
    const respuesta = await fetch(ENDPOINT, {
      headers: {
        "X-Goog-Api-Key": clave,
        "X-Goog-FieldMask": MASCARA_CAMPOS,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MS[motivo]),
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

  return normalizarRespuestaGoogle(datos);
}

/* ===========================================================================
 * Lo que usa el sitio
 * ======================================================================== */

/**
 * El resumen que pinta la portada. **Lee de la base, no de Google.**
 *
 * Camino normal (prácticamente todas las visitas): una lectura de
 * `cache_externo`, que además va por la Data Cache de Next, así que la mayoría
 * de las visitas no tocan ni la base.
 *
 * Arranque en frío (la fila no existe: base nueva, fila borrada a mano, build
 * desde cero): se pide el turno y **solo quien lo gana** llama a Google, una vez,
 * y guarda. Quien no lo gana devuelve `null` en ese render —la portada cae a los
 * testimonios del CMS— y en la siguiente revalidación ya encuentra el dato. Es
 * deliberado: reintentar aquí dentro significaría o una segunda llamada de pago,
 * o una lectura sin caché que volvería dinámica la portada entera.
 *
 * Va envuelta en `cache()` de React: la portada la llama dos veces (la página,
 * para el `aggregateRating` del JSON-LD, y `PaginaInicio`, para las estrellas en
 * pantalla) y las dos tienen que ver EXACTAMENTE lo mismo. Sin esto, en un
 * arranque en frío una podría ver el dato y la otra no.
 *
 * NUNCA lanza. Quien la consume solo tiene que hacer `if (!resumen) return null;`.
 */
export const getResenasGoogle = cache(
  async (): Promise<ResumenGoogle | null> => {
    const fila = await leerCache(CLAVE_CACHE_RESENAS);
    const guardado = normalizarResumenGuardado(fila?.valor);
    if (guardado) return guardado;

    /* Arranque en frío. Sin turno, no se llama: es la decisión segura. */
    if (!(await tomarTurno(CLAVE_CACHE_RESENAS))) {
      console.error(
        "[resenas-google] Caché vacío y el turno lo tiene otro: esta vez se usan los testimonios del CMS.",
      );
      return null;
    }

    const resumen = await consultarPlacesApi("arranque-en-frio");
    if (!resumen) return null;

    await guardarCache(CLAVE_CACHE_RESENAS, resumen);
    return resumen;
  },
);

/* ===========================================================================
 * Lo que usa el cron
 * ======================================================================== */

export type RefrescoResenas = {
  /** `true` solo si Google respondió bien Y se guardó. */
  refrescado: boolean;
  /** Cuántas reseñas quedaron guardadas. `0` si no se refrescó. */
  resenas: number;
  /** Cuántas devolvió Google (máximo 5). Ausente si no se refrescó. */
  devueltas?: number;
  /** Ventana aplicada en meses; `null` = sin filtro de fecha. */
  ventanaMeses?: number | null;
};

/**
 * El refresco diario. Lo llama el cron de `/api/salud`, y es la única llamada a
 * Google que el proyecto hace de forma rutinaria: **una al día, unas 30 al mes**,
 * contra las 1.000 gratuitas.
 *
 * DEGRADACIÓN: si Google falla —cuota, red, clave revocada, respuesta rara— no se
 * borra ni se toca nada. La fila anterior sigue en su sitio con su
 * `actualizado_at` sin mover, y el sitio sigue mostrando exactamente lo mismo
 * que mostraba ayer. Un refresco que falla no es un incidente visible: es un
 * `false` en la respuesta del cron y una línea en los registros de Vercel.
 *
 * NUNCA lanza.
 */
export async function refrescarResenasGoogle(): Promise<RefrescoResenas> {
  const resumen = await consultarPlacesApi("cron-diario");
  if (!resumen) return { refrescado: false, resenas: 0 };

  const guardado = await guardarCache(CLAVE_CACHE_RESENAS, resumen);
  if (!guardado) return { refrescado: false, resenas: 0 };

  const { seleccion } = resumen;
  console.info(
    `[resenas-google] selección: Google devolvió ${seleccion?.devueltas ?? "?"}, ` +
      `pasaron el filtro ${seleccion?.aprobadas ?? resumen.resenas.length}, ` +
      `ventana ${seleccion?.ventanaMeses ?? "sin límite"} meses.`,
  );

  return {
    refrescado: true,
    resenas: resumen.resenas.length,
    devueltas: seleccion?.devueltas,
    ventanaMeses: seleccion?.ventanaMeses,
  };
}
