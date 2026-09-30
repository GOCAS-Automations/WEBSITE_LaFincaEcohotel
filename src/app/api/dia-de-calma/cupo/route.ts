import { NextResponse } from "next/server";

import { frenar } from "@/lib/api/limite-peticiones";
import { CUPO_DIA_DE_CALMA, cupoDelDia } from "@/lib/reserva/dia-de-calma";
import { esFechaISO, sumarDias } from "@/lib/reserva/noches";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Cuántos cupos quedan en un Día de Calma.
 *
 *     GET /api/dia-de-calma/cupo?fecha=2026-09-18
 *     → { "fecha": "2026-09-18", "cupo": 10, "usado": 4, "restante": 6 }
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HACE FALTA UN ENDPOINT
 * ---------------------------------------------------------------------------
 * `reservas` no tiene lectura pública —y no debe tenerla: son datos personales
 * de los huéspedes (§3 regla 3 de `CLAUDE.md`)—. Pero el visitante necesita
 * saber si su fecha tiene sitio ANTES de escribir por WhatsApp. Este handler
 * es la rendija justa: consulta con `service_role` en el servidor y devuelve
 * **un solo número agregado**. Ni nombres, ni códigos, ni cuántas reservas hay
 * detrás de ese número.
 *
 * La respuesta es orientativa: la palabra final la tiene el trigger
 * `reservas_cupo_dia_de_calma` de la base (migración 009), que vuelve a contar
 * en el momento de escribir.
 */

export const dynamic = "force-dynamic";
/** Nunca se guarda en caché: un cupo de hace una hora es un cupo equivocado. */
export const revalidate = 0;

/** Estados que ocupan cupo. Coincide con el `where` del trigger. */
const ESTADOS_QUE_OCUPAN = ["pendiente", "confirmada"];

/**
 * Freno de peticiones.
 *
 * Aquí el riesgo no es solo el coste: el número que devuelve es **agregado**,
 * pero pedirlo día a día durante meses permitiría dibujar la ocupación completa
 * del hotel. Sesenta por minuto sobran para alguien eligiendo una fecha.
 */
const LIMITE = { peticiones: 60, segundos: 60 };

export async function GET(peticion: Request) {
  const frenada = frenar(peticion, "cupo-dia", LIMITE);
  if (frenada) return frenada;

  const { searchParams } = new URL(peticion.url);
  const fecha = searchParams.get("fecha") ?? "";

  if (!esFechaISO(fecha)) {
    return NextResponse.json(
      { error: "Escribe la fecha en formato AAAA-MM-DD." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const supabase = crearClienteAdmin();
    const { data, error } = await supabase
      .from("reservas")
      .select("num_personas")
      .eq("tipo", "dia")
      .in("estado", ESTADOS_QUE_OCUPAN)
      .overlaps("estancia", `[${fecha},${sumarDias(fecha, 1)})`);

    if (error) throw new Error(error.message);

    const usado = (data ?? []).reduce(
      (suma, fila) => suma + Number(fila.num_personas ?? 0),
      0,
    );
    const cupo = cupoDelDia(fecha, usado);

    return NextResponse.json(
      {
        fecha: cupo.fecha,
        cupo: CUPO_DIA_DE_CALMA,
        usado: cupo.usado,
        restante: cupo.restante,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[api] cupo del Día de Calma:",
      error instanceof Error ? error.message : error,
    );
    /* Si la consulta falla, el sitio NO se cae ni miente: dice que no pudo
       comprobarlo y el visitante sigue pudiendo escribir por WhatsApp. */
    return NextResponse.json(
      { error: "No pudimos comprobar el cupo de ese día." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
