/**
 * Lectura de las temporadas desde la base.
 *
 * Un solo lector para los tres que las necesitan, cada uno con su cliente:
 *
 *   · el sitio público (`src/lib/contenido.ts`), con el cliente anónimo y la
 *     caché de Next — RLS ya le esconde las temporadas terminadas;
 *   · el servidor que cobra (`cotizarEnServidor`), con `service_role` y sin
 *     caché, filtrando a las que tocan la estadía;
 *   · el panel, con la sesión del equipo.
 *
 * Devuelve `Temporada[]` (fechas ya leídas como `[desde, hasta)`); lo que se
 * hace con ellas es puro y vive en `temporadas.ts`. Si la base falla, LANZA:
 * quien llama decide si puede seguir sin temporadas (el sitio, para mirar) o
 * no (el servidor, para cobrar).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { FechaISO } from "../utils/formato";
import { leerNoches, type Temporada } from "./temporadas";

export type FiltroTemporadas = {
  /** Solo las de esta cabaña y las de todas. */
  alojamientoId?: string;
  /** Solo las que tocan alguna noche de `[desde, hasta)`. */
  desde?: FechaISO;
  hasta?: FechaISO;
};

export async function leerTemporadas(
  supabase: SupabaseClient,
  filtro: FiltroTemporadas = {},
): Promise<Temporada[]> {
  let consulta = supabase
    .from("temporadas")
    .select("id, nombre, alojamiento_id, noches")
    .order("noches", { ascending: true });

  if (filtro.alojamientoId) {
    consulta = consulta.or(
      `alojamiento_id.is.null,alojamiento_id.eq.${filtro.alojamientoId}`,
    );
  }
  if (filtro.desde && filtro.hasta) {
    consulta = consulta.overlaps("noches", `[${filtro.desde},${filtro.hasta})`);
  }

  const { data: filas, error } = await consulta;
  if (error) throw new Error(`temporadas: ${error.message}`);
  if (!filas || filas.length === 0) return [];

  const ids = filas.map((fila) => String(fila.id));
  const { data: precios, error: errorPrecios } = await supabase
    .from("tarifas")
    .select("temporada_id, plan_id, precio_noche, precio_noche_1_persona")
    .in("temporada_id", ids);
  if (errorPrecios) throw new Error(`tarifas de temporada: ${errorPrecios.message}`);

  const temporadas: Temporada[] = [];
  for (const fila of filas) {
    const noches = leerNoches(fila.noches);
    if (!noches) continue;
    temporadas.push({
      id: String(fila.id),
      nombre: String(fila.nombre),
      alojamientoId: fila.alojamiento_id ? String(fila.alojamiento_id) : null,
      desde: noches.desde,
      hasta: noches.hasta,
      precios: (precios ?? [])
        .filter((precio) => String(precio.temporada_id) === String(fila.id))
        .map((precio) => ({
          planId: String(precio.plan_id),
          precio_noche: Number(precio.precio_noche),
          precio_noche_1_persona:
            precio.precio_noche_1_persona === null ||
            precio.precio_noche_1_persona === undefined
              ? null
              : Number(precio.precio_noche_1_persona),
        })),
    });
  }
  return temporadas;
}
