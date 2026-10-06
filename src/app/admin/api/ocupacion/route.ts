import { NextResponse } from "next/server";

import { esFechaISO, leerRangoFechas, nochesEntre } from "@/lib/admin/fechas";
import {
  nochesOcupadasDeCabana,
  personasDeDiaSinLaPropia,
} from "@/lib/admin/ocupacion-panel";
import { ESTADOS_QUE_OCUPAN } from "@/lib/admin/tipos";
import {
  personasDeDiaDeCalmaPorFecha,
  sumarPorFecha,
} from "@/lib/reserva/calendario-externo";
import { MAXIMO_DIAS_DISPONIBILIDAD } from "@/lib/reserva/elegibilidad-calendario";
import { ocupacionDelCalendario } from "@/lib/reserva/ocupacion-externa";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Ocupación de UNA cabaña para el calendario de la reserva manual del panel.
 *
 *     GET /admin/api/ocupacion?alojamiento=<uuid>&desde=2026-10-01&hasta=2026-12-01&excluir=<uuid>
 *     → { "noches": ["2026-10-03", …], "dia": { "2026-10-04": 6 }, "calendario": "conectado" }
 *
 * · `noches`: noches tomadas de esa cabaña por reservas de la base, bloqueos y
 *   eventos del calendario de Google del hotel. Sin `alojamiento` (Día de
 *   Calma) va vacío.
 * · `dia`: personas del Día de Calma por fecha.
 * · `excluir`: la reserva que se está editando. Sus noches y sus personas no
 *   cuentan: si contaran, no se podrían conservar las fechas que ya tiene.
 * · `calendario`: si Google respondió. Si no, el formulario lo dice en una
 *   línea: lo tachado es solo lo de la base.
 *
 * Vive bajo `/admin` para quedar dentro del `matcher` del middleware, y además
 * comprueba la sesión aquí mismo (el middleware es comodidad, no frontera).
 * Lee con la sesión del equipo: RLS sigue aplicando. A diferencia de
 * `/api/disponibilidad` (público), aquí sí se puede pedir una cabaña pausada,
 * y no sale ningún dato personal: solo fechas y números.
 *
 * Las reglas son las de `nochesOcupadasDeCabana()`, pura y probada.
 */

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_CACHE = { "cache-control": "no-store" };

function error(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado, headers: SIN_CACHE });
}

export async function GET(peticion: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user: usuario },
  } = await supabase.auth.getUser();
  if (!usuario) return error("Tu sesión expiró. Vuelve a entrar al panel.", 401);

  const { searchParams } = new URL(peticion.url);
  const alojamientoId = searchParams.get("alojamiento") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const excluir = searchParams.get("excluir") ?? "";

  if (!esFechaISO(desde) || !esFechaISO(hasta)) {
    return error("Las fechas tienen que venir como AAAA-MM-DD.", 400);
  }
  const dias = nochesEntre(desde, hasta);
  if (dias <= 0 || dias > MAXIMO_DIAS_DISPONIBILIDAD) {
    return error(`El periodo no puede pasar de ${MAXIMO_DIAS_DISPONIBILIDAD} días.`, 400);
  }
  if (alojamientoId && !UUID.test(alojamientoId)) return error("Cabaña no válida.", 400);
  if (excluir && !UUID.test(excluir)) return error("Reserva no válida.", 400);

  const rango = `[${desde},${hasta})`;

  try {
    const [cabana, reservas, bloqueos, deDia, calendario] = await Promise.all([
      alojamientoId
        ? supabase.from("alojamientos").select("nombre").eq("id", alojamientoId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      alojamientoId
        ? supabase
            .from("reservas")
            .select("id, estancia, estado, expira_at")
            .eq("alojamiento_id", alojamientoId)
            .in("estado", ESTADOS_QUE_OCUPAN)
            .overlaps("estancia", rango)
        : Promise.resolve({ data: [], error: null }),
      alojamientoId
        ? supabase
            .from("bloqueos")
            .select("rango")
            .eq("alojamiento_id", alojamientoId)
            .overlaps("rango", rango)
        : Promise.resolve({ data: [], error: null }),
      /* Los mismos estados que gastan cupo en el trigger de la base. */
      supabase
        .from("reservas")
        .select("id, estancia, estado, expira_at, num_personas")
        .eq("tipo", "dia")
        .in("estado", ["pendiente", "confirmada"])
        .overlaps("estancia", rango),
      /* Siempre: también el Día de Calma lo necesita, porque los «plan día»
         del calendario general gastan cupo (regla 2b de
         `calendario-externo.ts`). Nunca lanza y sale de la caché. */
      ocupacionDelCalendario(desde, hasta),
    ]);

    for (const respuesta of [cabana, reservas, bloqueos, deDia]) {
      if (respuesta.error) throw new Error(respuesta.error.message);
    }
    if (alojamientoId && !cabana.data) return error("Esa cabaña ya no existe.", 404);

    const ahora = new Date();
    const aRango = (fila: { estancia?: unknown; rango?: unknown }) =>
      leerRangoFechas(fila.estancia ?? fila.rango);

    const noches = alojamientoId
      ? nochesOcupadasDeCabana({
          nombreCabana: String(cabana.data?.nombre ?? ""),
          reservas: (reservas.data ?? []).flatMap((fila) => {
            const r = aRango(fila);
            return r
              ? [
                  {
                    id: String(fila.id),
                    estado: String(fila.estado ?? ""),
                    expira_at: typeof fila.expira_at === "string" ? fila.expira_at : null,
                    entrada: r.inicio,
                    salida: r.fin,
                  },
                ]
              : [];
          }),
          bloqueos: (bloqueos.data ?? []).flatMap((fila) => {
            const r = aRango(fila);
            return r ? [{ inicio: r.inicio, fin: r.fin }] : [];
          }),
          franjas: calendario.estado === "conectado" ? calendario.ocupacion : [],
          desde,
          hasta,
          excluirReservaId: excluir || null,
          ahora,
        })
      : [];

    const deLaBase = personasDeDiaSinLaPropia({
      reservas: (deDia.data ?? []).flatMap((fila) => {
        const r = aRango(fila);
        return r
          ? [
              {
                id: String(fila.id),
                estado: String(fila.estado ?? ""),
                expira_at: typeof fila.expira_at === "string" ? fila.expira_at : null,
                entrada: r.inicio,
                salida: r.fin,
                personas: Number(fila.num_personas ?? 0),
              },
            ]
          : [];
      }),
      desde,
      hasta,
      excluirReservaId: excluir || null,
      ahora,
    });
    const dia = sumarPorFecha(
      deLaBase,
      calendario.estado === "conectado"
        ? personasDeDiaDeCalmaPorFecha(calendario.diasDeCalma, desde, hasta)
        : {},
    );

    return NextResponse.json(
      {
        desde,
        hasta,
        noches,
        dia,
        calendario: alojamientoId ? calendario.estado : "no_aplica",
      },
      { headers: SIN_CACHE },
    );
  } catch (fallo) {
    console.error(
      "[panel] no se pudo leer la ocupación:",
      fallo instanceof Error ? fallo.message : fallo,
    );
    return error("No se pudo consultar la ocupación ahora mismo.", 503);
  }
}
