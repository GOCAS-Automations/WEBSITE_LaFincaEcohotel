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
 *   puede ser un enlace a Google Maps. Place Details (New) **no tiene ningún
 *   parámetro para ordenar** las reseñas (solo `languageCode`, `regionCode` y
 *   `sessionToken`; revisado en la documentación el 2026-10-06), y la API
 *   clásica con `reviews_sort=newest` está deshabilitada en esta cuenta
 *   (`REQUEST_DENIED`).
 *
 *   Consecuencia: si una de esas cinco tiene menos de 4★, el sitio se quedaba
 *   con cuatro. Por eso cada refresco **acumula** lo que llega en un REPERTORIO
 *   propio (`resenas_google:repertorio`, ver `actualizarRepertorio()`), y las
 *   cinco publicadas se eligen de ahí (`seleccionarResenas()`), no solo de la
 *   respuesta del día. Mismo número de llamadas: una al día.
 * · Los términos exigen mostrar la **atribución al autor** y dejar claro que
 *   las reseñas vienen de Google. Eso lo resuelve el componente.
 * · Se permite cachear los datos hasta 30 días. Por eso una reseña del
 *   repertorio que Google deja de devolver se borra a los 30 días de la última
 *   vez que vino (`DIAS_VIGENCIA_REPERTORIO`): si su autor la borró o la editó,
 *   el sitio no la sigue mostrando indefinidamente.
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

/** Solo se publican reseñas de 4 o 5 estrellas. Nunca menos. */
const CALIFICACION_MINIMA = 4;

/** Cuántas reseñas se publican. La meta es que siempre sean estas cinco. */
const MAXIMO_RESENAS = 5;

/** «Del último año»: reseñas publicadas en los últimos 12 meses. */
const VENTANA_MESES = 12;

/** Clave de la fila de `cache_externo` donde se acumulan las reseñas vistas. */
export const CLAVE_REPERTORIO = `${CLAVE_CACHE_RESENAS}:repertorio`;

/**
 * Tope del repertorio: las 50 más recientes. Con unas 50 calificaciones en la
 * ficha y cinco por consulta, es holgado; está para que la fila no crezca sin
 * límite si algún día Google empieza a rotar mucho.
 */
const TOPE_REPERTORIO = 50;

/**
 * Días que una reseña sigue en el repertorio desde la ÚLTIMA vez que Google la
 * devolvió. Es el plazo de caché que se toma como permitido (ver arriba): una
 * reseña que su autor borró o cambió deja de mostrarse, como mucho, a los 30
 * días. Mientras Google la siga devolviendo, se renueva cada día.
 */
const DIAS_VIGENCIA_REPERTORIO = 30;

/* ===========================================================================
 * Tipos propios
 * ---------------------------------------------------------------------------
 * Deliberadamente NO se exporta la forma cruda de Google. El resto del sitio
 * habla español y no debería enterarse de `authorAttribution.displayName`: si
 * Google cambia su esquema, el cambio se absorbe aquí dentro.
 * ======================================================================== */

export type ResenaGoogle = {
  /**
   * Identificador de Google (`places/…/reviews/…`), si vino. Sirve para no
   * guardar dos veces la misma reseña en el repertorio. Las guardadas antes de
   * que existiera el repertorio no lo tienen.
   */
  id?: string;
  autor: string;
  /** URL de la foto de perfil, o `null` si el autor no tiene o no es de Google. */
  foto: string | null;
  /** Perfil público del autor en Google Maps. `null` si no vino. */
  perfil: string | null;
  /** Entero de 1 a 5. */
  calificacion: number;
  texto: string;
  /**
   * «Hace 3 meses». Al publicar se recalcula desde `publicadaEn`
   * (`describirAntiguedad()`), porque una reseña del repertorio puede haber
   * llegado hace semanas y el texto de Google de ese día ya estaría viejo.
   */
  tiempoRelativo: string;
  /** Fecha ISO 8601 en UTC, útil para `<time dateTime>` y para ordenar. */
  publicadaEn: string;
};

/** Una reseña del repertorio: la reseña y la última vez que Google la devolvió. */
export type EntradaRepertorio = ResenaGoogle & {
  /** ISO 8601 en UTC. */
  vistaEn: string;
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
  /** Cuántas devolvió Google en el último refresco (antes de cualquier filtro). */
  devueltas: number;
  /** Cuántas reseñas había en el repertorio al elegir (de todas las estrellas). */
  enRepertorio: number;
  /** Cuántas se publicaron (4★ o más; máximo cinco). */
  aprobadas: number;
  /** De las publicadas, cuántas son de los últimos 12 meses. */
  delUltimoAno: number;
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

  const id = textoValido(crudo.name);

  return {
    ...(id ? { id } : {}),
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
 * Reglas de negocio (puras, exportadas solo para probarlas)
 * ---------------------------------------------------------------------------
 * Separadas del `fetch` y de la base a propósito: aquí se decide qué reseñas
 * se guardan en el repertorio, cuáles se publican y en qué orden. Es la única
 * parte que merece pruebas, y sin red ni base se prueba en milisegundos.
 * ======================================================================== */

/** Lo que interesa de una respuesta de Google, ya validado, antes de elegir. */
export type FichaGoogle = {
  promedio: number;
  total: number;
  mapsUrl: string;
  /** Todas las reseñas válidas que vinieron, de cualquier puntuación. */
  resenas: ResenaGoogle[];
  /** Cuántas venían en la respuesta, antes de validarlas. */
  devueltas: number;
};

const MS_DIA = 86_400_000;

/** Resta `meses` a una fecha, en UTC. Pura, para poder probar la ventana. */
function restarMeses(fecha: Date, meses: number): Date {
  const limite = new Date(fecha.getTime());
  limite.setUTCMonth(limite.getUTCMonth() - meses);
  return limite;
}

/**
 * «Hace 3 meses», calculado desde la fecha de publicación con el mismo estilo
 * que usa Google en español («Hace un mes», «Hace 2 semanas», «Hace un año»).
 *
 * Existe por el repertorio: una reseña que llegó hace tres semanas traería el
 * texto relativo de aquel día, y publicarlo tal cual diría «Hace 2 meses» de
 * algo que ya tiene casi tres.
 */
export function describirAntiguedad(
  publicadaEn: string,
  ahora: Date = new Date(),
): string {
  const fecha = new Date(publicadaEn);

  let meses =
    (ahora.getUTCFullYear() - fecha.getUTCFullYear()) * 12 +
    (ahora.getUTCMonth() - fecha.getUTCMonth());
  if (ahora.getUTCDate() < fecha.getUTCDate()) meses -= 1;

  if (meses >= 12) {
    const anos = Math.floor(meses / 12);
    return anos === 1 ? "Hace un año" : `Hace ${anos} años`;
  }
  if (meses >= 1) return meses === 1 ? "Hace un mes" : `Hace ${meses} meses`;

  const dias = Math.max(
    0,
    Math.floor((ahora.getTime() - fecha.getTime()) / MS_DIA),
  );
  if (dias >= 7) {
    const semanas = Math.floor(dias / 7);
    return semanas === 1 ? "Hace una semana" : `Hace ${semanas} semanas`;
  }
  if (dias >= 1) return dias === 1 ? "Hace un día" : `Hace ${dias} días`;
  return "Hoy";
}

/**
 * ¿Son la misma reseña? Se compara, en este orden:
 *
 *   1. El `id` de Google, si las dos lo tienen.
 *   2. El perfil del autor: Google admite UNA reseña por cuenta y lugar, así
 *      que el mismo perfil es la misma reseña, aunque su autor la haya editado
 *      (texto, estrellas o fecha nuevos).
 *   3. Autor y fecha de publicación, para las guardadas antes de que existiera
 *      el repertorio, que no tienen `id`.
 */
function mismaResena(a: ResenaGoogle, b: ResenaGoogle): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.perfil && b.perfil && a.perfil === b.perfil) return true;
  return (
    a.autor.trim().toLocaleLowerCase("es") ===
      b.autor.trim().toLocaleLowerCase("es") &&
    Date.parse(a.publicadaEn) === Date.parse(b.publicadaEn)
  );
}

/**
 * Suma al repertorio las reseñas que acaban de llegar de Google.
 *
 *   · Sin duplicados (ver `mismaResena()`): si una ya estaba, se queda la
 *     versión que acaba de llegar —es la que Google muestra hoy— y se le
 *     renueva `vistaEn`.
 *   · Se guardan TODAS, también las de menos de 4★: así, si alguien baja su
 *     reseña de 5 a 2 estrellas, la versión nueva reemplaza a la vieja en vez
 *     de quedar la de 5 publicada. El filtro de estrellas es de la selección.
 *   · Una reseña que Google no devuelve hace más de `DIAS_VIGENCIA_REPERTORIO`
 *     días sale del repertorio.
 *   · Tope de `TOPE_REPERTORIO`, las más recientes.
 */
export function actualizarRepertorio(
  previo: EntradaRepertorio[],
  llegadas: ResenaGoogle[],
  ahora: Date = new Date(),
): EntradaRepertorio[] {
  const vistaEn = ahora.toISOString();
  let lista = [...previo];

  for (const resena of llegadas) {
    const anteriores = lista.filter((entrada) => mismaResena(entrada, resena));
    lista = lista.filter((entrada) => !mismaResena(entrada, resena));
    const id = resena.id ?? anteriores.find((entrada) => entrada.id)?.id;
    lista.push({ ...resena, ...(id ? { id } : {}), vistaEn });
  }

  const vigenteDesde = ahora.getTime() - DIAS_VIGENCIA_REPERTORIO * MS_DIA;

  return lista
    .filter((entrada) => Date.parse(entrada.vistaEn) >= vigenteDesde)
    .sort((a, b) => Date.parse(b.publicadaEn) - Date.parse(a.publicadaEn))
    .slice(0, TOPE_REPERTORIO);
}

/**
 * El criterio de selección, sobre el repertorio entero (no solo sobre las cinco
 * del día):
 *
 *   1. Solo 4★ o más. Nunca menos, aunque eso deje menos de cinco.
 *   2. Primero las de los últimos 12 meses: las mejores y, a igual puntuación,
 *      las más recientes.
 *   3. Si no llegan a cinco, se completa con las mejores de 4★ o más más
 *      antiguas, con el mismo orden.
 *   4. Cinco como máximo, y en ese orden: las del último año delante.
 */
export function seleccionarResenas(
  candidatas: ResenaGoogle[],
  ahora: Date = new Date(),
): { resenas: ResenaGoogle[]; delUltimoAno: number } {
  const desde = restarMeses(ahora, VENTANA_MESES).getTime();

  const mejorPrimero = (a: ResenaGoogle, b: ResenaGoogle) =>
    b.calificacion - a.calificacion ||
    Date.parse(b.publicadaEn) - Date.parse(a.publicadaEn);

  const buenas = candidatas.filter(
    (resena) => resena.calificacion >= CALIFICACION_MINIMA,
  );

  const recientes = buenas
    .filter((resena) => Date.parse(resena.publicadaEn) >= desde)
    .sort(mejorPrimero)
    .slice(0, MAXIMO_RESENAS);

  const antiguas = buenas
    .filter((resena) => Date.parse(resena.publicadaEn) < desde)
    .sort(mejorPrimero)
    .slice(0, MAXIMO_RESENAS - recientes.length);

  return {
    resenas: [...recientes, ...antiguas],
    delUltimoAno: recientes.length,
  };
}

/**
 * Valida la respuesta cruda de Places API. `null` si no trae `rating` o
 * `userRatingCount`: sin ellos, las estrellas de la portada y el
 * `aggregateRating` del JSON-LD saldrían de la nada.
 *
 * Cada reseña pasa por `normalizarResena()`; a las que les falta algo
 * imprescindible se caen. Aquí todavía NO se filtra por estrellas.
 */
export function leerRespuestaGoogle(datos: unknown): FichaGoogle | null {
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

  return {
    promedio,
    total: Math.round(total),
    mapsUrl: enlaceValido(datos.googleMapsUri) ?? MAPS_URL_RESPALDO,
    resenas: crudas
      .map(normalizarResena)
      .filter((resena): resena is ResenaGoogle => resena !== null),
    devueltas: crudas.length,
  };
}

/** La reseña tal como se publica: sin `vistaEn` y con la antigüedad de hoy. */
function paraPublicar(resena: ResenaGoogle, ahora: Date): ResenaGoogle {
  return {
    ...(resena.id ? { id: resena.id } : {}),
    autor: resena.autor,
    foto: resena.foto,
    perfil: resena.perfil,
    calificacion: resena.calificacion,
    texto: resena.texto,
    tiempoRelativo: describirAntiguedad(resena.publicadaEn, ahora),
    publicadaEn: resena.publicadaEn,
  };
}

/**
 * El resumen que se publica: el promedio y el total de la ficha de hoy, y las
 * reseñas elegidas del repertorio. `null` si no queda ninguna de 4★ o más:
 * mejor los testimonios del CMS que una sección vacía con un promedio huérfano.
 */
export function armarResumen(
  ficha: FichaGoogle,
  repertorio: ResenaGoogle[],
  ahora: Date = new Date(),
): ResumenGoogle | null {
  const { resenas, delUltimoAno } = seleccionarResenas(repertorio, ahora);

  if (resenas.length === 0) {
    console.error(
      "[resenas-google] No quedaron reseñas de 4+ estrellas para publicar.",
    );
    return null;
  }

  return {
    promedio: ficha.promedio,
    total: ficha.total,
    mapsUrl: ficha.mapsUrl,
    resenas: resenas.map((resena) => paraPublicar(resena, ahora)),
    seleccion: {
      devueltas: ficha.devueltas,
      enRepertorio: repertorio.length,
      aprobadas: resenas.length,
      delUltimoAno,
    },
  };
}

/**
 * Una respuesta de Google convertida en resumen SIN repertorio previo: lo que
 * se publicaría si solo existiera lo que llegó hoy. Es lo que hace el primer
 * refresco de una base vacía, y es cómoda para probar la validación.
 */
export function normalizarRespuestaGoogle(
  datos: unknown,
  ahora: Date = new Date(),
): ResumenGoogle | null {
  const ficha = leerRespuestaGoogle(datos);
  if (!ficha) return null;
  return armarResumen(ficha, actualizarRepertorio([], ficha.resenas, ahora), ahora);
}

/* ===========================================================================
 * Revalidación de lo que sale de la base
 * ======================================================================== */

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

  /* El diagnóstico solo se conserva si está completo. Las filas de antes del
     repertorio traen otra forma (`ventanaMeses`) y simplemente lo pierden. */
  const sel = esObjeto(valor.seleccion) ? valor.seleccion : null;
  const devueltas = numeroValido(sel?.devueltas);
  const enRepertorio = numeroValido(sel?.enRepertorio);
  const aprobadas = numeroValido(sel?.aprobadas);
  const delUltimoAno = numeroValido(sel?.delUltimoAno);
  const seleccion: SeleccionResenas | undefined =
    devueltas !== null &&
    enRepertorio !== null &&
    aprobadas !== null &&
    delUltimoAno !== null
      ? { devueltas, enRepertorio, aprobadas, delUltimoAno }
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

  const id = textoValido(crudo.id);

  return {
    ...(id ? { id } : {}),
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

/**
 * Revalida el repertorio guardado (`{ resenas: EntradaRepertorio[] }`).
 * `null` si la fila no tiene esa forma; las entradas dañadas se descartan una a
 * una sin tirar las demás.
 */
export function normalizarRepertorioGuardado(
  valor: unknown,
): EntradaRepertorio[] | null {
  if (!esObjeto(valor) || !Array.isArray(valor.resenas)) return null;

  return valor.resenas.flatMap((crudo): EntradaRepertorio[] => {
    const resena = normalizarResenaGuardada(crudo);
    const vistaEn = esObjeto(crudo) ? textoValido(crudo.vistaEn) : null;
    if (!resena || !vistaEn || Number.isNaN(Date.parse(vistaEn))) return [];
    return [{ ...resena, vistaEn }];
  });
}

/* ===========================================================================
 * La llamada a Google (la que se paga)
 * ======================================================================== */

/**
 * Pide la ficha a Places API. **Este es el único punto del proyecto que gasta
 * cuota de Google.** Devuelve el JSON crudo; validarlo es cosa de
 * `leerRespuestaGoogle()`.
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
): Promise<unknown> {
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

    return await respuesta.json();
  } catch (error) {
    console.error("[resenas-google] No se pudo consultar Places API:", error);
    return null;
  }
}

/* ===========================================================================
 * El repertorio en la base
 * ======================================================================== */

/**
 * Lee el repertorio. Si todavía no existe —el primer refresco tras estrenar el
 * repertorio— se siembra con las reseñas que ya están publicadas: son reseñas
 * que Google devolvió y que ya pasaron el filtro, y se conservan con la fecha
 * del último refresco como `vistaEn`.
 *
 * Si la lectura FALLA (no que falte la fila), `leerCache()` también devuelve
 * `null` y se siembra igual. Es una degradación acotada: el repertorio se
 * rehace con lo publicado más lo que llegue hoy, y vuelve a crecer solo.
 */
async function leerRepertorio(): Promise<EntradaRepertorio[]> {
  const fila = await leerCache(CLAVE_REPERTORIO);
  const guardado = normalizarRepertorioGuardado(fila?.valor);
  if (guardado) return guardado;

  const filaResumen = await leerCache(CLAVE_CACHE_RESENAS);
  const resumen = normalizarResumenGuardado(filaResumen?.valor);
  if (!filaResumen || !resumen) return [];

  const vistaEn = Number.isNaN(Date.parse(filaResumen.actualizadoEn))
    ? new Date().toISOString()
    : new Date(filaResumen.actualizadoEn).toISOString();

  return resumen.resenas.map((resena) => ({ ...resena, vistaEn }));
}

/**
 * Una consulta a Google de punta a punta: pedir, validar, sumar al repertorio
 * (y guardarlo) y elegir las cinco. Devuelve el resumen para que quien llama lo
 * guarde, o `null` si Google falló o no hay nada publicable.
 *
 * Si Google falla no se toca NADA, tampoco el repertorio.
 */
async function consultarYElegir(
  motivo: "cron-diario" | "arranque-en-frio",
): Promise<ResumenGoogle | null> {
  const datos = await consultarPlacesApi(motivo);
  if (datos === null) return null;

  const ficha = leerRespuestaGoogle(datos);
  if (!ficha) return null;

  const ahora = new Date();
  const repertorio = actualizarRepertorio(
    await leerRepertorio(),
    ficha.resenas,
    ahora,
  );

  /* Si no se pudo guardar, la selección de hoy sigue siendo buena: se publica
     igual y mañana el refresco vuelve a sumar lo que llegue. */
  if (!(await guardarCache(CLAVE_REPERTORIO, { resenas: repertorio }))) {
    console.error(
      "[resenas-google] No se pudo guardar el repertorio; se publica la selección de hoy igualmente.",
    );
  }

  return armarResumen(ficha, repertorio, ahora);
}

/* ===========================================================================
 * Lo que usa el sitio
 * ======================================================================== */

/**
 * El resumen que pinta la portada. **Lee de la base, no de Google.**
 *
 * Camino normal (prácticamente todas las visitas): una lectura de
 * `cache_externo`. Ver en `cache-externo.ts` por qué esa lectura no pasa por la
 * Data Cache de Next.
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

    const resumen = await consultarYElegir("arranque-en-frio");
    if (!resumen) return null;

    await guardarCache(CLAVE_CACHE_RESENAS, resumen);
    return resumen;
  },
);

/* ===========================================================================
 * Lo que usa el cron
 * ======================================================================== */

export type RefrescoResenas = {
  /** `true` solo si Google respondió bien Y se guardó el resumen. */
  refrescado: boolean;
  /** Cuántas reseñas quedaron publicadas. `0` si no se refrescó. */
  resenas: number;
  /** Cuántas devolvió Google hoy (máximo 5). Ausente si no se refrescó. */
  devueltas?: number;
  /** Cuántas hay en el repertorio, de todas las estrellas. */
  enRepertorio?: number;
  /** De las publicadas, cuántas son de los últimos 12 meses. */
  delUltimoAno?: number;
};

/**
 * El refresco diario. Lo llama el cron de `/api/salud`, y es la única llamada a
 * Google que el proyecto hace de forma rutinaria: **una al día, unas 30 al mes**,
 * contra las 1.000 gratuitas. El repertorio no cambia esa cuenta: se alimenta
 * de la misma llamada.
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
  const resumen = await consultarYElegir("cron-diario");
  if (!resumen) return { refrescado: false, resenas: 0 };

  const guardado = await guardarCache(CLAVE_CACHE_RESENAS, resumen);
  if (!guardado) return { refrescado: false, resenas: 0 };

  const { seleccion } = resumen;
  console.info(
    `[resenas-google] selección: Google devolvió ${seleccion?.devueltas ?? "?"}, ` +
      `repertorio de ${seleccion?.enRepertorio ?? "?"}, ` +
      `publicadas ${resumen.resenas.length} ` +
      `(${seleccion?.delUltimoAno ?? "?"} del último año).`,
  );

  return {
    refrescado: true,
    resenas: resumen.resenas.length,
    devueltas: seleccion?.devueltas,
    enRepertorio: seleccion?.enRepertorio,
    delUltimoAno: seleccion?.delUltimoAno,
  };
}
