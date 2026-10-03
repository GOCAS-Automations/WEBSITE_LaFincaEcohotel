import { NextResponse } from "next/server";

import { frenar } from "@/lib/api/limite-peticiones";
import { leerRangoFechas, sumarDiasISO } from "@/lib/admin/fechas";
import { ESTADOS_QUE_OCUPAN } from "@/lib/admin/tipos";
import {
  cabanasAfectadas,
  diasDeLaFranja,
} from "@/lib/reserva/calendario-externo";
import { cupoDelDia } from "@/lib/reserva/dia-de-calma";
import { MAXIMO_DIAS_DISPONIBILIDAD } from "@/lib/reserva/elegibilidad-calendario";
import { ocupaCalendario } from "@/lib/reserva/holds";
import { esFechaISO } from "@/lib/reserva/noches";
import { ocupacionDelCalendario } from "@/lib/reserva/ocupacion-externa";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Qué noches están ocupadas, cabaña por cabaña.
 *
 *     GET /api/disponibilidad?desde=2026-09-01&hasta=2026-10-01
 *     → { "desde": "...", "hasta": "...", "cabanas": [
 *          { "slug": "cabana-01", "nombre": "Cabaña 01", "ocupado": ["2026-09-12", …] } ],
 *        "dia": { "2026-09-13": 10, … } }
 *
 * Cada fecha de `ocupado` es UNA NOCHE tomada (rangos `[check_in, check_out)`):
 * la del día de salida de otra reserva no aparece, porque esa noche está libre.
 *
 * `dia` son las personas del Día de Calma ya apuntadas por fecha —solo las
 * fechas con alguien—. Es el mismo número que `/api/dia-de-calma/cupo` da para
 * un día suelto, pero de todo el periodo de una vez: con él el calendario tacha
 * los días sin cupo sin una consulta por día.
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

/**
 * Tope de la ventana consultable: tres meses. Más es un abuso, no una consulta.
 * La cifra vive en `elegibilidad-calendario.ts` porque el calendario del
 * navegador parte sus consultas para no pasarse de ella.
 */
const MAXIMO_DIAS = MAXIMO_DIAS_DISPONIBILIDAD;

/**
 * Los estados que gastan cupo del Día de Calma: los mismos que cuenta
 * `/api/dia-de-calma/cupo` (y el trigger de la base). Una `completada` es de
 * un día que ya pasó y no le quita sitio a nadie.
 */
const ESTADOS_QUE_GASTAN_CUPO = ["pendiente", "confirmada"];

/**
 * Freno de peticiones.
 *
 * Esta consulta es la más cara del sitio: lee `reservas` y `bloqueos` con
 * `service_role` y ADEMÁS llama al Google Calendar del hotel. Sin tope, un
 * script puede agotar la cuota de la API de Google y dejar al hotel sin
 * calendario. Treinta por minuto dan de sobra para el uso real: el calendario
 * del navegador pide dos meses de una vez —todas las cabañas en la misma
 * respuesta— y vuelve a pedir solo al pasar a meses que no tiene; el aviso de
 * disponibilidad del resumen pide una vez por rango elegido.
 */
const LIMITE = { peticiones: 30, segundos: 60 };

function diasEntre(desde: string, hasta: string): number {
  const [ad, md, dd] = desde.split("-").map(Number);
  const [ah, mh, dh] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(ah, mh - 1, dh) - Date.UTC(ad, md - 1, dd)) / 86_400_000,
  );
}

export async function GET(peticion: Request) {
  const frenada = frenar(peticion, "disponibilidad", LIMITE);
  if (frenada) return frenada;

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

    const [alojamientos, reservas, bloqueos, calendario, reservasDia] =
      await Promise.all([
        supabase
          .from("alojamientos")
          .select("id, slug, nombre")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        supabase
          .from("reservas")
          /* `estado` y `expira_at` viajan para poder aplicar `ocupaCalendario()`:
             el `in` de abajo solo acota la consulta. */
          .select("alojamiento_id, estancia, estado, expira_at")
          .eq("tipo", "hospedaje")
          .in("estado", ESTADOS_QUE_OCUPAN)
          .overlaps("estancia", `[${desde},${hasta})`),
        supabase
          .from("bloqueos")
          .select("alojamiento_id, rango")
          .overlaps("rango", `[${desde},${hasta})`),
        ocupacionDelCalendario(desde, hasta),
        supabase
          .from("reservas")
          .select("estancia, num_personas, estado, expira_at")
          .eq("tipo", "dia")
          .in("estado", ESTADOS_QUE_GASTAN_CUPO)
          .overlaps("estancia", `[${desde},${hasta})`),
      ]);

    if (alojamientos.error) throw new Error(alojamientos.error.message);
    if (reservas.error) throw new Error(reservas.error.message);
    if (bloqueos.error) throw new Error(bloqueos.error.message);
    if (reservasDia.error) throw new Error(reservasDia.error.message);

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

    /*
      EL HOLD, CON LA MISMA REGLA QUE EL PANEL.

      Una solicitud `pendiente` cuyo vencimiento ya pasó NO ocupa: quien no
      completó el pago no se queda con la noche. `ocupaCalendario()` es el único
      sitio donde vive esa decisión, y por eso la usan tanto este endpoint como
      `buscarChoques()` del panel: si cada uno llevara su copia, el sitio y el
      panel acabarían diciendo cosas distintas sobre la misma noche.

      Aquí NO se barre la base (no se escribe durante una respuesta de solo
      lectura): la comprobación en memoria da la misma respuesta. El barrido
      ocurre antes de escribir y en el latido diario.
    */
    const ahora = new Date();

    for (const fila of reservas.data ?? []) {
      if (
        !ocupaCalendario(
          {
            estado: String(fila.estado ?? ""),
            expira_at:
              typeof fila.expira_at === "string" ? fila.expira_at : null,
          },
          ahora,
        )
      ) {
        continue;
      }
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

    /*
      EL CUPO DEL DÍA DE CALMA, DÍA POR DÍA.
      Misma suma que `/api/dia-de-calma/cupo`: personas de las solicitudes que
      todavía ocupan (`ocupaCalendario()` descarta los holds vencidos). Solo
      sale el agregado por fecha, nunca quién viene.
    */
    const personasPorDia: Record<string, number> = {};
    for (const fila of reservasDia.data ?? []) {
      if (
        !ocupaCalendario(
          {
            estado: String(fila.estado ?? ""),
            expira_at:
              typeof fila.expira_at === "string" ? fila.expira_at : null,
          },
          ahora,
        )
      ) {
        continue;
      }
      const rango = leerRangoFechas(fila.estancia);
      if (!rango) continue;
      for (
        let dia = rango.inicio > desde ? rango.inicio : desde;
        dia < rango.fin && dia < hasta;
        dia = sumarDiasISO(dia, 1)
      ) {
        personasPorDia[dia] =
          (personasPorDia[dia] ?? 0) + Number(fila.num_personas ?? 0);
      }
    }
    const dia = Object.fromEntries(
      Object.entries(personasPorDia)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([fecha, usado]) => [fecha, cupoDelDia(fecha, usado).usado]),
    );

    return NextResponse.json(
      {
        desde,
        hasta,
        cabanas: cabanas.map((cabana) => ({
          slug: cabana.slug,
          nombre: cabana.nombre,
          ocupado: [...(ocupado.get(cabana.id) ?? [])].sort(),
        })),
        dia,
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
