import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { TarifaCotizable } from "@/lib/reserva/cotizacion";
import {
  estadoDeTemporada,
  temporadasDeTarifa,
  type PlanConBases,
  type Temporada,
} from "@/lib/reserva/temporadas";
import { leerTemporadas } from "@/lib/reserva/temporadas-db";

/**
 * Consultas del panel para la sección «Temporadas» y para quien necesita
 * cotizar con ellas (la reserva manual). Todas reciben el cliente con la
 * sesión del equipo: RLS sigue aplicando y el panel ve también las pasadas.
 */

/** Las cabañas, para el desplegable de alcance y para nombrar el alcance. */
export type CabanaDeTemporada = { id: string; nombre: string; activo: boolean };

/**
 * Los planes de hospedaje con sus tarifas base. Los de día (Día de Calma)
 * quedan fuera: su precio vive en el plan, no en `tarifas`, y una temporada no
 * los toca.
 */
export async function planesConBases(
  supabase: SupabaseClient,
): Promise<PlanConBases[]> {
  const [planes, tarifas, cabanas] = await Promise.all([
    supabase
      .from("planes")
      .select("id, nombre, tipo, orden")
      .eq("tipo", "hospedaje")
      .order("orden", { ascending: true }),
    supabase
      .from("tarifas")
      .select("alojamiento_id, plan_id, precio_noche, precio_noche_1_persona")
      .is("vigencia", null),
    cabanasParaTemporadas(supabase),
  ]);
  if (planes.error) throw new Error(planes.error.message);
  if (tarifas.error) throw new Error(tarifas.error.message);

  const nombreCabana = new Map(cabanas.map((cabana) => [cabana.id, cabana]));

  return (planes.data ?? []).map((plan) => ({
    planId: String(plan.id),
    nombre: String(plan.nombre),
    bases: (tarifas.data ?? [])
      .filter((fila) => String(fila.plan_id) === String(plan.id))
      .map((fila) => ({
        alojamientoId: String(fila.alojamiento_id),
        cabana: nombreCabana.get(String(fila.alojamiento_id))?.nombre ?? "Cabaña",
        precio: Number(fila.precio_noche),
        precioUnaPersona:
          fila.precio_noche_1_persona === null
            ? null
            : Number(fila.precio_noche_1_persona),
      }))
      .sort((a, b) => a.cabana.localeCompare(b.cabana, "es")),
  }));
}

export async function cabanasParaTemporadas(
  supabase: SupabaseClient,
): Promise<CabanaDeTemporada[]> {
  const { data, error } = await supabase
    .from("alojamientos")
    .select("id, nombre, activo")
    .order("orden", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((fila) => ({
    id: String(fila.id),
    nombre: String(fila.nombre),
    activo: Boolean(fila.activo),
  }));
}

export async function listarTemporadas(
  supabase: SupabaseClient,
): Promise<Temporada[]> {
  return leerTemporadas(supabase);
}

export async function obtenerTemporada(
  supabase: SupabaseClient,
  id: string,
): Promise<Temporada | null> {
  const todas = await leerTemporadas(supabase);
  return todas.find((temporada) => temporada.id === id) ?? null;
}

/** Las temporadas activas o próximas que afectan a una cabaña (suyas o de todas). */
export async function temporadasQueAfectan(
  supabase: SupabaseClient,
  alojamientoId: string,
  hoy: string,
): Promise<Temporada[]> {
  const temporadas = await leerTemporadas(supabase, { alojamientoId });
  return temporadas.filter(
    (temporada) => estadoDeTemporada(temporada, hoy) !== "pasada",
  );
}

/**
 * Las tarifas de cada cabaña × plan con sus temporadas, para que el formulario
 * de reserva manual sugiera el valor con `precioDeNoche()`, la misma función
 * que usa el sitio para cobrar. Clave: `alojamientoId|planId`.
 */
export async function tarifasParaReservaManual(
  supabase: SupabaseClient,
): Promise<Record<string, TarifaCotizable>> {
  const [tarifas, temporadas] = await Promise.all([
    supabase
      .from("tarifas")
      .select(
        "alojamiento_id, plan_id, precio_noche, precio_noche_1_persona, planes(nombre, tipo, dias_aplica)",
      )
      .is("vigencia", null),
    leerTemporadas(supabase),
  ]);
  if (tarifas.error) throw new Error(tarifas.error.message);

  const mapa: Record<string, TarifaCotizable> = {};
  for (const fila of tarifas.data ?? []) {
    const plan = (Array.isArray(fila.planes) ? fila.planes[0] : fila.planes) as
      | { nombre: string; tipo: string | null; dias_aplica: number[] | null }
      | null
      | undefined;
    const alojamientoId = String(fila.alojamiento_id);
    const planId = String(fila.plan_id);
    mapa[`${alojamientoId}|${planId}`] = {
      plan: {
        nombre: plan?.nombre ?? "",
        tipo: plan?.tipo ?? "hospedaje",
        dias_aplica: plan?.dias_aplica ?? null,
      },
      precio_noche: Number(fila.precio_noche),
      precio_noche_1_persona:
        fila.precio_noche_1_persona === null
          ? null
          : Number(fila.precio_noche_1_persona),
      temporadas: temporadasDeTarifa(temporadas, alojamientoId, planId),
    };
  }
  return mapa;
}
