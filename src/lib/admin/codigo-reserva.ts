/**
 * Código legible de una reserva: `LF-2026-0001`.
 *
 * Es lo que el huésped ve y lo que el equipo dicta por teléfono. La numeración
 * es por año: cada 1.º de enero vuelve a 0001.
 *
 * ---------------------------------------------------------------------------
 * EL CÓDIGO LO PONE LA BASE, NO ESTE ARCHIVO
 * ---------------------------------------------------------------------------
 * Hasta el 2026-10-05 se calculaba aquí contando las reservas del año y
 * sumando uno. Tras borrar reservas el conteo bajaba: el número que salía ya
 * existía, los reintentos chocaban con el índice único y no se podía crear
 * ninguna reserva más; y si la borrada era la última, el código se repetía.
 *
 * Desde la migración 019 el código sale de un contador por año en Postgres
 * (`reservas_contador`), que se sube en una sola sentencia atómica y nunca
 * baja. El trigger `reservas_codigo_contador` lo pone cuando la reserva llega
 * SIN código, así que el panel y la web insertan sin él y leen el que devuelve
 * la base. Nunca se cuentan filas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Formato de un código de reserva propio. */
export const PATRON_CODIGO_RESERVA = /^LF-\d{4}-\d{4,}$/;

export type ReservaInsertada =
  | { ok: true; id: string; codigo: string }
  | { ok: false; error: { code?: string; message: string } };

/**
 * Inserta una reserva **sin código** y devuelve el que le puso la base.
 *
 * `fila` no debe llevar `codigo`: si lo llevara, la base lo respetaría (y
 * subiría el contador hasta él), que es justo lo que no se quiere aquí.
 */
export async function insertarReservaConCodigo(
  supabase: SupabaseClient,
  fila: Record<string, unknown>,
): Promise<ReservaInsertada> {
  const { codigo: _ignorado, ...sinCodigo } = fila;
  void _ignorado;

  const { data, error } = await supabase
    .from("reservas")
    .insert(sinCodigo)
    .select("id, codigo")
    .single();

  if (error) return { ok: false, error };
  if (!data?.id || typeof data.codigo !== "string") {
    return { ok: false, error: { message: "La base no devolvió el código de la reserva." } };
  }
  return { ok: true, id: String(data.id), codigo: data.codigo };
}
