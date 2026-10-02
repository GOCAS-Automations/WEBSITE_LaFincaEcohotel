/**
 * Barrido de las reservas cuyo hold venció.
 *
 * Contraparte con base de datos de las reglas puras de `./holds.ts`. Se apoya en
 * la función `public.liberar_reservas_vencidas(motivo text)` de la migración
 * 013, que hace el trabajo en **una sola sentencia `UPDATE`**: entre un
 * `select` y un `update` hechos por separado cabría otra transacción, y el
 * barrido es justo lo que tiene que ser atómico.
 *
 * ---------------------------------------------------------------------------
 * ⚠ ESTA FUNCIÓN NO PUEDE CANCELAR UNA RESERVA PAGADA
 * ---------------------------------------------------------------------------
 * La migración **016** se lo prohíbe en SQL: la sentencia excluye toda reserva
 * con un pago `APPROVED` (sin plazo) y toda reserva con un pago en proceso movido
 * en los últimos quince minutos. Es la última línea de defensa del fallo del
 * 2026-10-01, cuando `LF-2026-0001` se canceló sola teniendo el pago hecho porque
 * nunca llegó el evento del webhook.
 *
 * Quien llame a esto desde el cron tiene además una obligación: **reconciliar
 * antes** (`reconciliarPagosPendientes()`), para que un pago aprobado no llegue
 * ni a estar en la lista. El orden está escrito en `src/app/api/salud/route.ts`.
 *
 * ---------------------------------------------------------------------------
 * CUÁNDO SE LLAMA
 * ---------------------------------------------------------------------------
 * **Antes de toda creación o reactivación de reserva** —la del sitio público y
 * la del panel—, porque `reservas_sin_solapamiento` es una restricción EXCLUDE
 * y su predicado no puede leer `now()`: sin el barrido rechazaría unas fechas
 * que en realidad están libres. También en el latido diario de `/api/salud` y
 * al abrir el calendario del panel, para que nadie vea una noche apartada por
 * una solicitud que caducó hace horas.
 *
 * ---------------------------------------------------------------------------
 * CUÁNDO NO
 * ---------------------------------------------------------------------------
 * En los caminos de solo lectura (el endpoint de disponibilidad, los listados).
 * Esos aplican `ocupaCalendario()` en memoria y dan la respuesta correcta sin
 * escribir en la base durante un render.
 *
 * NUNCA LANZA. Un fallo aquí no puede tumbar la reserva que se está creando: lo
 * peor que pasa es que la restricción rechace unas fechas libres y el huésped
 * lea «esas fechas se acaban de ocupar» — molesto, pero no una sobreventa.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MOTIVO_VENCIDA } from "./holds";

/**
 * Cancela las reservas vencidas y devuelve cuántas cayeron.
 *
 * El cliente que se le pase decide con qué permisos corre: el del panel (rol
 * `authenticated`) o el de servicio. La función SQL es `security invoker`, así
 * que no concede nada que quien llama no tuviera ya.
 */
export async function liberarReservasVencidas(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("liberar_reservas_vencidas", {
    motivo: MOTIVO_VENCIDA,
  });

  if (error) {
    console.error(
      "[reservas] no se pudieron liberar las reservas vencidas:",
      error.message,
    );
    return 0;
  }

  const liberadas = typeof data === "number" ? data : 0;
  if (liberadas > 0) {
    console.info(
      `[reservas] ${liberadas} reserva(s) vencida(s) liberada(s): esas fechas vuelven al calendario.`,
    );
  }
  return liberadas;
}
