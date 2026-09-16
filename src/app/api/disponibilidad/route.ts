import { NextResponse } from "next/server";

import { leerRangoFechas, sumarDiasISO } from "@/lib/admin/fechas";
import { ESTADOS_QUE_OCUPAN } from "@/lib/admin/tipos";
import {
  cabanasAfectadas,
  diasDeLaFranja,
} from "@/lib/reserva/calendario-externo";
import { esFechaISO } from "@/lib/reserva/noches";
import { ocupacionDelCalendario } from "@/lib/reserva/ocupacion-externa";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Qué noches están ocupadas, cabaña por cabaña.
 *
 *     GET /api/disponibilidad?desde=2026-09-01&hasta=2026-10-01
 *     → { "desde": "...", "hasta": "...", "cabanas": [
 *          { "slug": "cabana-01", "nombre": "Cabaña 01", "ocupado": ["2026-09-12", …] } ] }
 *
 * ---------------------------------------------------------------------------
 * LAS TRES FUENTES, EN UN SOLO SITIO
 * ---------------------------------------------------------------------------
 * Una noche está ocupada si lo dice CUALQUIERA de las tres:
 *   1. `reservas` con un estado que ocupa calendario,
 *   2. `bloqueos` que puso el equipo desde el panel,
 *   3. el Google Calendar del hotel, que se sigue llenando a mano.
 *
 * Es la misma suma que hace `buscarChoques` en el panel antes de escribir. Si
 * el sitio público enseñara solo las dos primeras, ofrecería como libre una
 * noche que el hotel ya vendió por teléfono y apuntó en su calendario.
 *
 * ---------------------------------------------------------------------------
 * QUÉ SALE Y QUÉ NO
 * ---------------------------------------------------------------------------
 * Sale **una lista de fechas y nada más**. Ni nombres, ni códigos, ni motivos,
 * ni de cuál de las tres fuentes viene cada día: son datos personales de los
 * huéspedes (§3 regla 3 de `CLAUDE.md`) y el visitante no los necesita para
 * saber si su fin de semana está libre. Por eso la consulta va con
 * `service_role` en el servidor y lo que cruza la red es solo el agregado.
 *
 * La respuesta es orientativa. La palabra final la tienen las restricciones
 * EXCLUDE de Postgres en el momento de reservar.
 */

export const dynamic = "force-dynamic";
/** La capa de Google ya se cachea cinco minutos; la base se lee siempre fresca. */
export const revalidate = 0;

/** Tope de la ventana consultable: tres meses. Más es un abuso, no una consulta. */
const MAXIMO_DIAS = 92;

function diasEntre(desde: string, hasta: string): number {
  const [ad, md, dd] = desde.split("-").map(Number);
  const [ah, mh, dh] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(ah, mh - 1, dh) - Date.UTC(ad, md - 1, dd)) / 86_400_000,
  );
}

export async function GET(peticion: Request) {
  const { searchParams } = new URL(peticion.url);
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";

  if (!esFechaISO(desde) || !esFechaISO(hasta)) {
    return NextResponse.json(
      { error: "Escribe las fechas en formato AAAA-MM-DD." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const dias = diasEntre(desde, hasta);
  if (dias <= 0 || dias > MAXIMO_DIAS) {
    return NextResponse.json(
      { error: `El periodo consultado no puede pasar de ${MAXIMO_DIAS} días.` },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const supabase = crearClienteAdmin();

    const [alojamientos, reservas, bloqueos, calendario] = await Promise.all([
      supabase
        .from("alojamientos")
        .select("id, slug, nombre")
        .eq("activo", true)
        .order("orden", { ascending: true }),
      supabase
        .from("reservas")
        .select("alojamiento_id, estancia")
        .eq("tipo", "hospedaje")
        .in("estado", ESTADOS_QUE_OCUPAN)
        .overlaps("estancia", `[${desde},${hasta})`),
      supabase
        .from("bloqueos")
        .select("alojamiento_id, rango")
        .overlaps("rango", `[${desde},${hasta})`),
      ocupacionDelCalendario(desde, hasta),
    ]);

    if (alojamientos.error) throw new Error(alojamientos.error.message);
    if (reservas.error) throw new Error(reservas.error.message);
    if (bloqueos.error) throw new Error(bloqueos.error.message);

    const cabanas = (alojamientos.data ?? []).map((fila) => ({
      id: String(fila.id),
      slug: String(fila.slug),
      nombre: String(fila.nombre),
    }));

    /** Un conjunto de días por cabaña: el mismo día de dos fuentes cuenta una vez. */
    const ocupado = new Map<string, Set<string>>(
      cabanas.map((cabana) => [cabana.id, new Set<string>()]),
    );

    const marcar = (alojamientoId: string, inicio: string, fin: string) => {
      const conjunto = ocupado.get(alojamientoId);
      if (!conjunto) return;
      const tope = fin < hasta ? fin : hasta;
      for (
        let dia = inicio > desde ? inicio : desde;
        dia < tope;
        dia = sumarDiasISO(dia, 1)
      ) {
        conjunto.add(dia);
      }
    };

    for (const fila of reservas.data ?? []) {
      const rango = leerRangoFechas(fila.estancia);
      if (!rango || !fila.alojamiento_id) continue;
      marcar(String(fila.alojamiento_id), rango.inicio, rango.fin);
    }

    for (const fila of bloqueos.data ?? []) {
      const rango = leerRangoFechas(fila.rango);
      if (!rango || !fila.alojamiento_id) continue;
      marcar(String(fila.alojamiento_id), rango.inicio, rango.fin);
    }

    for (const franja of calendario.ocupacion) {
      for (const cabana of cabanasAfectadas(franja, cabanas)) {
        for (const dia of diasDeLaFranja(franja)) {
          if (dia >= desde && dia < hasta) ocupado.get(cabana.id)?.add(dia);
        }
      }
    }

    return NextResponse.json(
      {
        desde,
        hasta,
        cabanas: cabanas.map((cabana) => ({
          slug: cabana.slug,
          nombre: cabana.nombre,
          ocupado: [...(ocupado.get(cabana.id) ?? [])].sort(),
        })),
        /* Para poder decir en pantalla «esto todavía no incluye lo que el hotel
           apunta en su calendario» cuando la integración no está conectada. */
        calendario_hotel: calendario.estado,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[api] disponibilidad:",
      error instanceof Error ? error.message : error,
    );
    /* Igual que el cupo del Día de Calma: si falla, el sitio NO se cae ni
       miente. Dice que no pudo comprobarlo y el visitante escribe igual. */
    return NextResponse.json(
      { error: "No pudimos comprobar la disponibilidad ahora mismo." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
