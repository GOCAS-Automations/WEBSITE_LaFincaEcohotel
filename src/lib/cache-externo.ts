import "server-only";

/**
 * `cache_externo` — las respuestas de terceros, guardadas en nuestra base.
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ
 * ---------------------------------------------------------------------------
 * Un servicio externo que se paga por llamada (Places API de Google) no puede
 * consultarse «cuando haga falta»: hay que decidir **cuántas veces al mes** se
 * le llama y que ese número no dependa de cuánta gente visite el sitio ni de
 * cuántas instancias levante Vercel.
 *
 * El reparto de papeles es este:
 *
 *   · El **sitio** lee de esta tabla. Nunca llama al tercero durante una visita.
 *   · El **cron diario** (`/api/salud`) llama al tercero una vez al día y guarda
 *     aquí lo que recibe.
 *   · Si el tercero falla, **no se borra nada**: lo último guardado sigue siendo
 *     lo que ve el visitante. Un adorno social no puede estropear una portada.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO SIRVE EL CACHÉ DE NEXT PARA ESTO
 * ---------------------------------------------------------------------------
 * `next: { revalidate: 86400 }` suena a «una llamada al día», pero la Data Cache
 * de Next vive **por instancia y por región**: tres instancias en dos regiones
 * son hasta seis llamadas el mismo día, y mañana pueden ser dos. No es un
 * número que se pueda presupuestar. Una fila en Postgres sí: hay una, es la
 * misma para todos, y su `actualizado_at` dice exactamente cuándo se refrescó.
 *
 * ---------------------------------------------------------------------------
 * Y POR QUÉ LA LECTURA DE ESTA TABLA **TAMPOCO** SE CACHEA EN NEXT
 * ---------------------------------------------------------------------------
 * La primera versión leía la tabla con `next: { revalidate: 3600, tags }`, para
 * que cada visita no volviera a consultar Postgres. Parecía gratis y no lo era:
 * en el arranque en frío, la lectura que ocurre ANTES de guardar devuelve
 * «no hay fila», y Next **cachea ese vacío una hora**. Resultado real, visto en
 * la prueba: la primera visita traía las reseñas y las guardaba, y la segunda
 * seguía viendo el hueco cacheado, así que la portada mostraba los testimonios
 * del CMS y el `aggregateRating` del JSON-LD desaparecía. El mismo vacío se
 * colaba en el `build` desde `.next/cache/fetch-cache`.
 *
 * Así que esta lectura va **sin opciones de caché**. No hace falta ninguna:
 *
 *   · Las páginas públicas son estáticas con ISR de una hora. La lectura solo
 *     ocurre cuando la página se regenera, no en cada visita. Verificado: `/`
 *     sigue saliendo como `○ (Static) · Revalidate 1h` en el `build`, y su HTML
 *     prerenderizado trae el `aggregateRating`.
 *   · Un `select` por clave primaria a Postgres no es un recurso que haya que
 *     racionar; una llamada de pago a Google sí. Cachear lo baratísimo para
 *     romper lo caro es exactamente el intercambio que no interesa.
 *
 * Quien quiera que un refresco se vea YA no debe cachear menos: debe invalidar
 * la página (`revalidatePath("/")`, que es lo que hace el cron).
 *
 * ---------------------------------------------------------------------------
 * PERMISOS
 * ---------------------------------------------------------------------------
 * La tabla tiene RLS activo y ninguna política: nadie entra salvo quien se salta
 * RLS, que es `service_role`. Por eso aquí se usa el cliente administrador
 * incluso para LEER, y por eso este módulo es `server-only`.
 */

import { crearClienteAdmin } from "./supabase/admin";

/** Nombre de la tabla (migración `014_cache_externo.sql`). */
const TABLA = "cache_externo";

/**
 * Cuánto tarda en poder retomarse un turno que nadie cerró.
 *
 * Si quien ganó el turno del arranque en frío se cayó antes de guardar (red,
 * tiempo de función agotado), su fila de turno se queda ahí. Pasados estos
 * minutos, el siguiente render puede retomarla. Sin esto, un único fallo de red
 * dejaría el caché vacío hasta el cron del día siguiente.
 */
const MINUTOS_PARA_RETOMAR_TURNO = 10;

export type FilaCache = {
  valor: unknown;
  /** ISO 8601 en UTC. */
  actualizadoEn: string;
};

/** Clave de la fila que hace de candado para una clave de datos dada. */
function claveDelTurno(clave: string): string {
  return `${clave}:turno`;
}

/**
 * Lee una clave del caché. Devuelve `null` si no existe o si la base falla.
 *
 * NUNCA lanza: quien la consume está en medio de un render y lo peor que debe
 * pasarle es quedarse sin el dato.
 */
export async function leerCache(clave: string): Promise<FilaCache | null> {
  try {
    const supabase = crearClienteAdmin();

    const { data, error } = await supabase
      .from(TABLA)
      .select("valor, actualizado_at")
      .eq("clave", clave)
      .maybeSingle();

    if (error) {
      console.error(`[cache-externo] no se pudo leer «${clave}»:`, error.message);
      return null;
    }

    if (!data) return null;

    return {
      valor: data.valor,
      actualizadoEn: String(data.actualizado_at),
    };
  } catch (error) {
    console.error(
      `[cache-externo] no se pudo leer «${clave}»:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Guarda (o reemplaza) el valor de una clave y pisa `actualizado_at`.
 *
 * `actualizado_at` se manda explícito porque el `default now()` de la columna
 * solo corre en el INSERT: en el UPDATE de un upsert habría que tocarlo a mano
 * de todas formas, y dejarlo en manos del servidor de base de datos aquí no
 * aporta nada.
 *
 * Devuelve `true` si quedó guardado. NUNCA lanza.
 */
export async function guardarCache(
  clave: string,
  valor: unknown,
): Promise<boolean> {
  try {
    const supabase = crearClienteAdmin();

    const { error } = await supabase.from(TABLA).upsert(
      {
        clave,
        valor,
        actualizado_at: new Date().toISOString(),
      },
      { onConflict: "clave" },
    );

    if (error) {
      console.error(
        `[cache-externo] no se pudo guardar «${clave}»:`,
        error.message,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[cache-externo] no se pudo guardar «${clave}»:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Pide el turno para hacer la ÚNICA llamada del arranque en frío.
 *
 * ---------------------------------------------------------------------------
 * EL PROBLEMA: LA ESTAMPIDA
 * ---------------------------------------------------------------------------
 * Con la tabla vacía, «si no hay dato, llámalo y guárdalo» parece suficiente
 * hasta que llegan diez visitas en el mismo segundo: las diez ven la tabla
 * vacía, las diez llaman a Google. Diez llamadas de pago por un dato que es el
 * mismo para todas.
 *
 * ---------------------------------------------------------------------------
 * LA SALIDA: QUE LA BASE DECIDA QUIÉN LLAMA
 * ---------------------------------------------------------------------------
 * El turno es una fila aparte (`<clave>:turno`) y la decisión es un
 * `insert … on conflict do nothing returning …`: **una sola sentencia**, atómica
 * por definición. Si devuelve fila, la clave primaria no existía y el turno es
 * mío; si no devuelve nada, otro llegó antes y yo **no llamo**.
 *
 * Es una fila aparte y no una columna `estado` en la fila de datos para que el
 * candado y el dato no se pisen: el dato nunca está «a medio escribir», y leerlo
 * no obliga a entender en qué fase está el candado.
 *
 * Si el turno ya existe pero su `actualizado_at` es más viejo que
 * `MINUTOS_PARA_RETOMAR_TURNO`, se intenta retomar con un `update … where
 * actualizado_at < límite returning …`, que también es una sola sentencia: de
 * diez que lo intenten a la vez, exactamente una ve la fila que cambió.
 *
 * Devuelve `true` solo si el turno es de quien pregunta. NUNCA lanza: ante
 * cualquier error devuelve `false`, y no llamar al tercero siempre es la
 * decisión segura.
 */
export async function tomarTurno(clave: string): Promise<boolean> {
  const turno = claveDelTurno(clave);
  const ahora = new Date();

  try {
    const supabase = crearClienteAdmin();

    /* 1. ¿Soy el primero? El `returning` de un INSERT que no choca. */
    const { data: estrenado, error: errorInsert } = await supabase
      .from(TABLA)
      .upsert(
        { clave: turno, valor: {}, actualizado_at: ahora.toISOString() },
        { onConflict: "clave", ignoreDuplicates: true },
      )
      .select("clave");

    if (errorInsert) {
      console.error(
        `[cache-externo] no se pudo pedir el turno «${turno}»:`,
        errorInsert.message,
      );
      return false;
    }

    if (estrenado && estrenado.length > 0) return true;

    /* 2. El turno ya existía. Solo se retoma si lleva demasiado tiempo quieto. */
    const limite = new Date(
      ahora.getTime() - MINUTOS_PARA_RETOMAR_TURNO * 60_000,
    ).toISOString();

    const { data: retomado, error: errorUpdate } = await supabase
      .from(TABLA)
      .update({ actualizado_at: ahora.toISOString() })
      .eq("clave", turno)
      .lt("actualizado_at", limite)
      .select("clave");

    if (errorUpdate) {
      console.error(
        `[cache-externo] no se pudo retomar el turno «${turno}»:`,
        errorUpdate.message,
      );
      return false;
    }

    return Boolean(retomado && retomado.length > 0);
  } catch (error) {
    console.error(
      `[cache-externo] no se pudo pedir el turno «${turno}»:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
