/**
 * Código legible de una reserva: `LF-2026-0001`.
 *
 * Es lo que el huésped ve y lo que el equipo dicta por teléfono, así que tiene
 * que ser corto y sin ambigüedades. La numeración es por año: cada 1.º de enero
 * vuelve a 0001, que es como se llevan los talonarios de toda la vida.
 *
 * La unicidad la garantiza el índice único de `reservas.codigo`, NO un SELECT
 * previo: entre "consultar el último número" y "escribir el siguiente" cabe
 * otra reserva. El patrón correcto es intentar el INSERT y, si Postgres
 * devuelve `23505`, volver a calcular y reintentar. Por eso este módulo expone
 * un generador de candidatos y no un "número siguiente".
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const PREFIJO = "LF";

/** Año en curso en Colombia (UTC-5). */
function anioActual(): number {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).getUTCFullYear();
}

function formatear(anio: number, numero: number): string {
  return `${PREFIJO}-${anio}-${String(numero).padStart(4, "0")}`;
}

/**
 * Propone el siguiente código de un año, contando las reservas que ya lo usan.
 *
 * `desplazamiento` sube el número en los reintentos: si `LF-2026-0007` ya
 * existe porque otra reserva se creó en el mismo instante, el segundo intento
 * pide `LF-2026-0008`.
 */
export async function siguienteCodigo(
  supabase: SupabaseClient,
  desplazamiento = 0,
): Promise<string> {
  const anio = anioActual();

  const { count, error } = await supabase
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .like("codigo", `${PREFIJO}-${anio}-%`);

  if (error) {
    // Sin conteo fiable se cae a un número alto derivado del reloj: es feo pero
    // no colisiona, y el índice único sigue siendo la red de seguridad.
    const respaldo = 9000 + (Date.now() % 1000);
    return formatear(anio, respaldo + desplazamiento);
  }

  return formatear(anio, (count ?? 0) + 1 + desplazamiento);
}

/** Cuántas veces se reintenta ante una colisión de código. */
export const REINTENTOS_CODIGO = 6;
