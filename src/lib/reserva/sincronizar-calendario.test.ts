import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * EL EVENTO DE UNA RESERVA: SE RECREA SOLO SI DE VERDAD YA NO EXISTE.
 *
 * Dos fallos de antes, los dos con el calendario del hotel:
 *
 *   1. Si el equipo borraba en Google el evento de una reserva, el PATCH (sin
 *      `status`) lo ponía al día pero lo dejaba borrado. Lo arregla
 *      `actualizarEvento` (ver `src/lib/google/calendario.test.ts`).
 *   2. Si el PATCH fallaba por CUALQUIER motivo —un 429, un 5xx, un `timeout`—
 *      se creaba un evento nuevo: el viejo seguía ahí y la reserva salía dos
 *      veces. Ahora solo se recrea ante un 404 o un 410.
 */
vi.mock("@/lib/google/calendario", () => ({
  actualizarEvento: vi.fn(),
  calendarioConfigurado: vi.fn(() => true),
  calendarioDeEscritura: vi.fn(() => "escritura@group.calendar.google.com"),
  crearEvento: vi.fn(),
  eliminarEvento: vi.fn(),
}));
vi.mock("@/lib/admin/datos", () => ({ obtenerReserva: vi.fn() }));
vi.mock("./ocupacion-externa", () => ({ invalidarCacheCalendario: vi.fn() }));

import { obtenerReserva } from "@/lib/admin/datos";
import { actualizarEvento, crearEvento } from "@/lib/google/calendario";
import { eventoYaNoExiste, sincronizarReservaEnCalendario } from "./sincronizar-calendario";

const RESERVA = {
  id: "reserva-1",
  codigo: "LF-2026-0007",
  tipo: "hospedaje",
  estado: "confirmada",
  entrada: "2026-12-15",
  salida: "2026-12-18",
  alojamiento_nombre: "Cabaña 03",
  plan_nombre: "Estándar",
  huesped_nombre: "Ana Pérez",
  huesped_telefono: "+57 300 000 0000",
  num_personas: 2,
  total: 1_440_000,
  monto_pagado: 720_000,
  referencia_externa: "evento-viejo",
};

/** Solo hace falta el `update` de la referencia. */
function baseFalsa() {
  const referencias: unknown[] = [];
  const supabase = {
    from: () => ({
      update: (datos: { referencia_externa: unknown }) => {
        referencias.push(datos.referencia_externa);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  } as unknown as SupabaseClient;
  return { supabase, referencias };
}

beforeEach(() => {
  vi.mocked(actualizarEvento).mockReset();
  vi.mocked(crearEvento).mockReset();
  vi.mocked(obtenerReserva).mockResolvedValue(RESERVA as never);
  vi.mocked(crearEvento).mockResolvedValue({ ok: true, datos: { id: "evento-nuevo" } });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("sincronizarReservaEnCalendario con un evento ya apuntado", () => {
  it("si el PATCH sale bien, no se crea nada", async () => {
    vi.mocked(actualizarEvento).mockResolvedValue({ ok: true, datos: { id: "evento-viejo" } });
    const { supabase, referencias } = baseFalsa();

    expect(await sincronizarReservaEnCalendario(supabase, "reserva-1")).toBeNull();
    expect(crearEvento).not.toHaveBeenCalled();
    expect(referencias).toEqual([]);
  });

  it.each([404, 410])("ante un %i (ya no existe) se crea uno nuevo y se guarda su id", async (http) => {
    vi.mocked(actualizarEvento).mockResolvedValue({
      ok: false,
      motivo: "error",
      mensaje: "Ese evento ya no existe.",
      http,
    });
    const { supabase, referencias } = baseFalsa();

    expect(await sincronizarReservaEnCalendario(supabase, "reserva-1")).toBeNull();
    expect(crearEvento).toHaveBeenCalledOnce();
    expect(referencias).toEqual(["evento-nuevo"]);
  });

  it.each([
    ["un 429", 429],
    ["un 503", 503],
    ["un timeout", undefined],
    ["un 403 (sin permiso)", 403],
  ])("ante %s NO se duplica: se avisa y la referencia no cambia", async (_caso, http) => {
    vi.mocked(actualizarEvento).mockResolvedValue({
      ok: false,
      motivo: "error",
      mensaje: "Google Calendar no está respondiendo bien ahora mismo.",
      ...(http === undefined ? {} : { http }),
    });
    const { supabase, referencias } = baseFalsa();

    const aviso = await sincronizarReservaEnCalendario(supabase, "reserva-1");

    expect(crearEvento).not.toHaveBeenCalled();
    expect(referencias).toEqual([]);
    expect(aviso).toContain("La reserva se guardó, pero no se pudo poner al día su evento");
    expect(aviso).toContain("no lo crees a mano");
  });
});

describe("eventoYaNoExiste", () => {
  it("solo 404 y 410", () => {
    expect(eventoYaNoExiste({ ok: false, http: 404 })).toBe(true);
    expect(eventoYaNoExiste({ ok: false, http: 410 })).toBe(true);
    expect(eventoYaNoExiste({ ok: false, http: 429 })).toBe(false);
    expect(eventoYaNoExiste({ ok: false, http: 500 })).toBe(false);
    expect(eventoYaNoExiste({ ok: false })).toBe(false);
    expect(eventoYaNoExiste({ ok: true, http: 404 })).toBe(false);
  });
});
