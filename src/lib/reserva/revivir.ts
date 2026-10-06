/**
 * ¿SIGUEN LIBRES LAS NOCHES DE UNA RESERVA QUE UN PAGO TARDÍO QUIERE REVIVIR?
 *
 * Un huésped paga, el webhook de Bold no llega, el hold de 30 minutos vence y
 * el barrido cancela la reserva. Horas después la reconciliación ve el pago
 * aprobado y la reserva tiene que volver (`aplicar-estado.ts`). Hasta el
 * 2026-10-05 volvía SIN comprobar nada más que la restricción de exclusión de
 * Postgres, que solo ve otras reservas pendientes o confirmadas: ni los
 * bloqueos, ni las completadas, ni el calendario de Google del hotel —donde hoy
 * viven todas las reservas reales—, ni los «plan día» del Día de Calma. El
 * hotel podía haber vendido esas noches por WhatsApp entretanto.
 *
 * Esto lo comprueba con las mismas reglas que una reserva nueva:
 *   · hospedaje: `buscarChoques()` en modo estricto (bloqueos, otras reservas y
 *     Google leído sin caché);
 *   · Día de Calma: el cupo del día con las reservas de la base y los «plan
 *     día» del calendario del hotel.
 *
 * Si Google está configurado y no responde, lanza `CalendarioSinRespuesta`:
 * quien llama NO revive nada y lo deja para el próximo intento. Si la base no
 * responde, lanza un `Error`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { buscarChoques, describirChoques } from "../admin/disponibilidad";
import { leerRangoFechas } from "../admin/fechas";
import { CUPO_DIA_DE_CALMA } from "./dia-de-calma";
import { ocupaCalendario } from "./holds";
import { personasDiaDeCalmaParaEscribir } from "./ocupacion-externa";

export type ReservaParaRevivir = {
  id: string;
  tipo: string | null;
  alojamientoId: string | null;
  /** El `daterange` tal como viene de la base (`[2026-12-15,2026-12-18)`). */
  estancia: unknown;
  numPersonas: number;
};

export type NochesParaRevivir =
  | { libres: true }
  /** `detalle` nombra lo que ocupa: SOLO para el equipo (lleva nombres). */
  | { libres: false; detalle: string };

export async function nochesSiguenLibres(
  supabase: SupabaseClient,
  reserva: ReservaParaRevivir,
  ahora: Date = new Date(),
): Promise<NochesParaRevivir> {
  const rango = leerRangoFechas(reserva.estancia);
  if (!rango) {
    return { libres: false, detalle: "la reserva no tiene unas fechas que se puedan leer" };
  }

  if (reserva.tipo === "dia") {
    const { data, error } = await supabase
      .from("reservas")
      .select("id, num_personas, estado, expira_at")
      .eq("tipo", "dia")
      .in("estado", ["pendiente", "confirmada"])
      .overlaps("estancia", `[${rango.inicio},${rango.fin})`);
    if (error) throw new Error(`No se pudo leer el cupo del Día de Calma: ${error.message}`);

    const deLaBase = (data ?? [])
      .filter((fila) => String(fila.id) !== reserva.id)
      .filter((fila) =>
        ocupaCalendario(
          {
            estado: String(fila.estado ?? ""),
            expira_at: typeof fila.expira_at === "string" ? fila.expira_at : null,
          },
          ahora,
        ),
      )
      .reduce((suma, fila) => suma + Number(fila.num_personas ?? 0), 0);

    const delHotel =
      (await personasDiaDeCalmaParaEscribir(rango.inicio, rango.fin))[rango.inicio] ?? 0;

    const ocupadas = deLaBase + delHotel;
    if (ocupadas + reserva.numPersonas > CUPO_DIA_DE_CALMA) {
      return {
        libres: false,
        detalle: `el Día de Calma de esa fecha ya tiene ${ocupadas} de ${CUPO_DIA_DE_CALMA} personas${
          delHotel > 0 ? ` (${delHotel} de «plan día» del calendario del hotel)` : ""
        } y esta reserva es de ${reserva.numPersonas}`,
      };
    }
    return { libres: true };
  }

  if (!reserva.alojamientoId) {
    return { libres: false, detalle: "la reserva no tiene cabaña" };
  }

  const choques = await buscarChoques(
    supabase,
    reserva.alojamientoId,
    rango.inicio,
    rango.fin,
    reserva.id,
  );
  if (choques.length > 0) {
    return { libres: false, detalle: describirChoques(choques) };
  }
  return { libres: true };
}
