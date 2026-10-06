/**
 * GUARDAR UNA RESERVA Y SUS EXPERIENCIAS: TODO O NADA.
 *
 * Antes eran tres escrituras sueltas —la reserva, borrar sus experiencias,
 * insertar las nuevas—. Si fallaban las experiencias, la reserva ya estaba
 * escrita: el panel decía «error», el equipo volvía a pulsar «Guardar» y la
 * reserva nueva chocaba consigo misma. Ahora es UNA llamada a la función
 * `guardar_reserva` de Postgres (migración 023), que PostgREST ejecuta en UNA
 * transacción.
 *
 * La usan el panel (alta y edición manual, con la sesión del usuario) y la web
 * (la reserva que se va a pagar, con la clave de servicio). La función solo
 * deja pasar a `service_role` o a una cuenta con rol del panel.
 *
 * El código `LF-AAAA-NNNN` no se manda: lo pone la base (contador por año,
 * migración 019). Si llegara en `reserva`, se quita.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Una línea de `reserva_extras`, con el precio ya congelado. */
export type ExtraDeReserva = {
  extra_id: string;
  cantidad: number;
  precio_unitario: number;
  /** Noche a la que se añade (`AAAA-MM-DD`); `null` = toda la estadía o el día. */
  noche: string | null;
};

export type ReservaGuardadaEnBase =
  | { ok: true; id: string; codigo: string }
  | { ok: false; error: { code?: string; message: string } };

/** El error de Postgres cuando la reserva que se edita ya no existe. */
export const RESERVA_NO_EXISTE = "P0002";
/** El error de Postgres cuando la cuenta no tiene permiso. */
export const SIN_PERMISO = "42501";

/**
 * Crea (`id` nulo) o edita una reserva y reemplaza sus experiencias, en una
 * sola transacción. Nunca lanza: un error de la base vuelve como dato, con su
 * código de Postgres (23P01, LF010, 23514, P0002, 42501…), para que quien
 * llama lo traduzca al español.
 */
export async function guardarReservaAtomica(
  supabase: SupabaseClient,
  {
    id,
    reserva,
    extras,
  }: { id: string | null; reserva: Record<string, unknown>; extras: ExtraDeReserva[] },
): Promise<ReservaGuardadaEnBase> {
  const { codigo: _ignorado, ...sinCodigo } = reserva;
  void _ignorado;

  try {
    const { data, error } = await supabase.rpc("guardar_reserva", {
      p_id: id,
      p_reserva: sinCodigo,
      p_extras: extras,
    });
    if (error) return { ok: false, error };

    const guardada = data as { id?: unknown; codigo?: unknown } | null;
    if (!guardada?.id || typeof guardada.codigo !== "string") {
      return {
        ok: false,
        error: { message: "La base no devolvió la reserva guardada." },
      };
    }
    return { ok: true, id: String(guardada.id), codigo: guardada.codigo };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : "No se pudo hablar con la base.",
      },
    };
  }
}
