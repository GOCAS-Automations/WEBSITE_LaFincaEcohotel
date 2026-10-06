import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * El servidor RECHAZA una reserva sobre noches que el hotel ya tiene apuntadas
 * en su calendario de Google, y dice cuál es.
 *
 * La restricción de exclusión de Postgres solo ve la base. Los eventos de
 * Google los añade `buscarChoques()`, que es lo que llama la Server Action de
 * la reserva manual (y la de cambiar de estado) antes de escribir: con
 * cualquier choque, no se guarda y se muestra `describirChoquesEnCabana()`.
 *
 * La capa que habla con Google se sustituye por un doble: aquí se prueba la
 * decisión, no la red.
 */
vi.mock("../reserva/ocupacion-externa", () => ({
  choquesDelCalendario: vi.fn(),
  choquesDelCalendarioParaEscribir: vi.fn(),
}));

import {
  buscarChoques,
  describirChoquesEnCabana,
  tomaNochesNuevas,
} from "./disponibilidad";
import {
  choquesDelCalendario,
  choquesDelCalendarioParaEscribir,
} from "../reserva/ocupacion-externa";
import { CalendarioSinRespuesta } from "../reserva/calendario-sin-respuesta";

/** Un cliente de Supabase de mentira: cada tabla devuelve sus filas. */
function clienteFalso(filas: Record<string, unknown>): SupabaseClient {
  const consulta = (tabla: string) => {
    const resultado = { data: filas[tabla] ?? [], error: null };
    const cadena: Record<string, unknown> = {
      select: () => cadena,
      eq: () => cadena,
      in: () => cadena,
      maybeSingle: () => Promise.resolve(resultado),
      then: (resolver: (valor: unknown) => unknown) => Promise.resolve(resultado).then(resolver),
    };
    return cadena;
  };
  return { from: consulta } as unknown as SupabaseClient;
}

const EVENTO = {
  eventoId: "g1",
  titulo: "Juan Pérez cabaña 3",
  inicio: "2026-10-17",
  fin: "2026-10-19",
  cabana: 3,
  motivo: "cabana_reconocida" as const,
};

beforeEach(() => {
  vi.mocked(choquesDelCalendario).mockReset();
  vi.mocked(choquesDelCalendarioParaEscribir).mockReset();
  vi.mocked(choquesDelCalendario).mockResolvedValue([]);
  vi.mocked(choquesDelCalendarioParaEscribir).mockResolvedValue([]);
});

describe("buscarChoques con el calendario de Google", () => {
  it("un evento de Google en esas noches es un choque, y bloquea", async () => {
    vi.mocked(choquesDelCalendarioParaEscribir).mockResolvedValue([EVENTO]);
    const supabase = clienteFalso({
      reservas: [],
      bloqueos: [],
      alojamientos: { nombre: "Cabaña 03" },
    });

    const choques = await buscarChoques(supabase, "c3", "2026-10-16", "2026-10-18");

    /* Por defecto, la lectura para escribir: sin caché y sin tolerar fallos. */
    expect(choquesDelCalendarioParaEscribir).toHaveBeenCalledWith(
      "Cabaña 03",
      "2026-10-16",
      "2026-10-18",
    );
    expect(choquesDelCalendario).not.toHaveBeenCalled();
    expect(choques).toHaveLength(1);
    expect(choques[0]).toMatchObject({
      tipo: "calendario",
      quien: "Juan Pérez cabaña 3",
      inicio: "2026-10-17",
      fin: "2026-10-19",
    });
  });

  it("el mensaje dice la cabaña, el evento y que viene del calendario del hotel", () => {
    const mensaje = describirChoquesEnCabana(
      [
        {
          tipo: "calendario",
          descripcion: "",
          quien: "Juan Pérez cabaña 3",
          inicio: "2026-10-17",
          fin: "2026-10-19",
        },
      ],
      "Cabaña 03",
    );
    expect(mensaje).toContain(
      "Esas noches ya están ocupadas en la Cabaña 03 por «Juan Pérez cabaña 3» (calendario del hotel), del sáb 17/10/2026 al lun 19/10/2026.",
    );
    expect(mensaje).toContain("ya está apuntada en el calendario de Google del hotel");
  });

  it("al editar, la propia reserva no choca consigo misma (pero Google sí)", async () => {
    const supabase = clienteFalso({
      reservas: [
        {
          id: "propia",
          codigo: "LF-0001",
          huesped_nombre: "Ana",
          estancia: "[2026-10-12,2026-10-15)",
          estado: "confirmada",
          expira_at: null,
        },
      ],
      bloqueos: [],
      alojamientos: { nombre: "Cabaña 03" },
    });
    expect(await buscarChoques(supabase, "c3", "2026-10-12", "2026-10-16", "propia")).toEqual([]);
    const sinExcluir = await buscarChoques(supabase, "c3", "2026-10-12", "2026-10-16");
    expect(sinExcluir.map((choque) => choque.tipo)).toEqual(["reserva"]);
    expect(describirChoquesEnCabana(sinExcluir, "Cabaña 03")).toContain(
      "por la reserva de Ana · LF-0001 (Confirmada), del lun 12/10/2026 al jue 15/10/2026.",
    );
  });

  it("varios choques salen en lista, cada uno con su fuente", () => {
    const mensaje = describirChoquesEnCabana(
      [
        { tipo: "bloqueo", descripcion: "", quien: "Pintura", inicio: "2026-10-12", fin: "2026-10-13" },
        { tipo: "calendario", descripcion: "", quien: "Visita", inicio: "2026-10-13", fin: "2026-10-14", sinCabana: true },
      ],
      "Cabaña 02",
    );
    expect(mensaje.split("\n").slice(0, 3)).toEqual([
      "Esas noches ya están ocupadas en la Cabaña 02:",
      "• un bloqueo («Pintura»), del lun 12/10/2026 al mar 13/10/2026",
      "• «Visita» (calendario del hotel), del mar 13/10/2026 al mié 14/10/2026 — el evento no dice qué cabaña, así que ocupa todas",
    ]);
  });
});

describe("buscarChoques cuando Google no responde", () => {
  const supabase = () =>
    clienteFalso({ reservas: [], bloqueos: [], alojamientos: { nombre: "Cabaña 03" } });

  it("para tomar noches (por defecto) falla cerrado: lanza CalendarioSinRespuesta", async () => {
    vi.mocked(choquesDelCalendarioParaEscribir).mockRejectedValue(
      new CalendarioSinRespuesta("401 clave revocada"),
    );
    await expect(
      buscarChoques(supabase(), "c3", "2026-10-16", "2026-10-18"),
    ).rejects.toBeInstanceOf(CalendarioSinRespuesta);
  });

  it("un bloqueo (modo tolerante) no se frena: lee la caché y un fallo no impide", async () => {
    vi.mocked(choquesDelCalendarioParaEscribir).mockRejectedValue(
      new CalendarioSinRespuesta("timeout"),
    );
    const choques = await buscarChoques(supabase(), "c3", "2026-10-16", "2026-10-18", undefined, {
      calendario: "tolerante",
    });
    expect(choques).toEqual([]);
    expect(choquesDelCalendario).toHaveBeenCalledOnce();
    expect(choquesDelCalendarioParaEscribir).not.toHaveBeenCalled();
  });
});

describe("tomaNochesNuevas", () => {
  const guardada = {
    alojamientoId: "c3",
    inicio: "2026-10-12",
    fin: "2026-10-15",
    ocupaAhora: true,
  };

  it("una reserva nueva, una cancelada o una solicitud vencida toman noches", () => {
    const nueva = { alojamientoId: "c3", inicio: "2026-10-12", fin: "2026-10-15" };
    expect(tomaNochesNuevas(null, nueva)).toBe(true);
    expect(tomaNochesNuevas({ ...guardada, ocupaAhora: false }, nueva)).toBe(true);
  });

  it("retocar una reserva que ya aparta sus noches no toma nada nuevo", () => {
    expect(
      tomaNochesNuevas(guardada, { alojamientoId: "c3", inicio: "2026-10-12", fin: "2026-10-15" }),
    ).toBe(false);
    /* Acortarla tampoco. */
    expect(
      tomaNochesNuevas(guardada, { alojamientoId: "c3", inicio: "2026-10-13", fin: "2026-10-14" }),
    ).toBe(false);
  });

  it("cambiar de cabaña o alargarla sí", () => {
    expect(
      tomaNochesNuevas(guardada, { alojamientoId: "c4", inicio: "2026-10-12", fin: "2026-10-15" }),
    ).toBe(true);
    expect(
      tomaNochesNuevas(guardada, { alojamientoId: "c3", inicio: "2026-10-11", fin: "2026-10-15" }),
    ).toBe(true);
    expect(
      tomaNochesNuevas(guardada, { alojamientoId: "c3", inicio: "2026-10-12", fin: "2026-10-16" }),
    ).toBe(true);
  });
});
