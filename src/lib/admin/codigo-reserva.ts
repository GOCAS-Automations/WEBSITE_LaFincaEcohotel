/**
 * Código legible de una reserva: `LF-2026-0001`.
 *
 * Es lo que el huésped ve y lo que el equipo dicta por teléfono. La numeración
 * es por año: cada 1.º de enero vuelve a 0001.
 *
 * ---------------------------------------------------------------------------
 * EL CÓDIGO LO PONE LA BASE, NO LA APLICACIÓN
 * ---------------------------------------------------------------------------
 * Hasta el 2026-10-05 se calculaba aquí contando las reservas del año y
 * sumando uno. Tras borrar reservas el conteo bajaba: el número que salía ya
 * existía, los reintentos chocaban con el índice único y no se podía crear
 * ninguna reserva más; y si la borrada era la última, el código se repetía.
 *
 * Desde la migración 019 el código sale de un contador por año en Postgres
 * (`reservas_contador`), que se sube en una sola sentencia atómica y nunca
 * baja. El trigger `reservas_codigo_contador` lo pone cuando la reserva llega
 * SIN código. El panel y la web guardan con `guardarReservaAtomica()`
 * (`src/lib/reserva/guardar-reserva.ts`), que nunca lo manda, y leen el que
 * devuelve la base. Nunca se cuentan filas.
 */

/** Formato de un código de reserva propio. */
export const PATRON_CODIGO_RESERVA = /^LF-\d{4}-\d{4,}$/;
