import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { PATRON_CODIGO_RESERVA } from "../admin/codigo-reserva";
import { guardarReservaAtomica } from "./guardar-reserva";

/**
 * GUARDAR UNA RESERVA: UNA SOLA LLAMADA, SIN CÓDIGO Y SIN CONTAR FILAS.
 *
 * Dos fallos de antes que cierra este módulo (el lado de la base, migraciones
 * 019 y 023, se prueba contra la base real en
 * `scripts/verificar-integridad-reservas.mjs`):
 *
 *   · El código era «reservas del año + 1»: tras borrar reservas se repetía o
 *     no se podía crear ninguna. Ahora lo pone la base y aquí no se manda.
 *   · La reserva y sus experiencias eran escrituras sueltas: si fallaban las
 *     experiencias, al reintentar la reserva chocaba consigo misma. Ahora van
 *     juntas en UNA llamada a `guardar_reserva`.
 */
type Llamada = { metodo: string; args: unknown[] };

function baseFalsa(respuesta: { data: unknown; error: unknown }) {
  const llamadas: Llamada[] = [];
  const supabase = {
    rpc: (...args: unknown[]) => {
      llamadas.push({ metodo: "rpc", args });
      return Promise.resolve(respuesta);
    },
    from: (...args: unknown[]) => {
      llamadas.push({ metodo: "from", args });
      throw new Error("no debería leer ni escribir tablas sueltas");
    },
  } as unknown as SupabaseClient;
  return { supabase, llamadas };
}

const EXTRA = { extra_id: "e1", cantidad: 2, precio_unitario: 45_000, noche: "2026-12-15" };

describe("guardarReservaAtomica", () => {
  it("reserva y experiencias van en UNA llamada a guardar_reserva, sin código", async () => {
    const { supabase, llamadas } = baseFalsa({
      data: { id: "r-8", codigo: "LF-2026-0008" },
      error: null,
    });

    const resultado = await guardarReservaAtomica(supabase, {
      id: null,
      reserva: { huesped_nombre: "Ana", codigo: "LF-2026-0001" },
      extras: [EXTRA],
    });

    expect(resultado).toEqual({ ok: true, id: "r-8", codigo: "LF-2026-0008" });
    expect(PATRON_CODIGO_RESERVA.test("LF-2026-0008")).toBe(true);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]).toEqual({
      metodo: "rpc",
      args: [
        "guardar_reserva",
        { p_id: null, p_reserva: { huesped_nombre: "Ana" }, p_extras: [EXTRA] },
      ],
    });
  });

  it("nunca cuenta filas ni toca tablas sueltas", async () => {
    const { supabase, llamadas } = baseFalsa({ data: { id: "r-1", codigo: "LF-2026-0001" }, error: null });
    await guardarReservaAtomica(supabase, { id: null, reserva: {}, extras: [] });
    await guardarReservaAtomica(supabase, { id: "r-1", reserva: { notas: "x" }, extras: [] });
    expect(llamadas.every((llamada) => llamada.metodo === "rpc")).toBe(true);
  });

  it("al editar manda el id: la base reemplaza las experiencias en la misma transacción", async () => {
    const { supabase, llamadas } = baseFalsa({ data: { id: "r-1", codigo: "LF-2026-0001" }, error: null });
    await guardarReservaAtomica(supabase, { id: "r-1", reserva: { notas: "x" }, extras: [] });
    expect((llamadas[0].args[1] as { p_id: string }).p_id).toBe("r-1");
  });

  it("un error de la base vuelve como dato, con su código de Postgres", async () => {
    const { supabase } = baseFalsa({
      data: null,
      error: { code: "23503", message: "insert or update on table reserva_extras violates foreign key" },
    });
    expect(
      await guardarReservaAtomica(supabase, { id: null, reserva: {}, extras: [EXTRA] }),
    ).toEqual({
      ok: false,
      error: { code: "23503", message: "insert or update on table reserva_extras violates foreign key" },
    });
  });

  it("si la base no devuelve id y código, no se da por guardada", async () => {
    const { supabase } = baseFalsa({ data: null, error: null });
    const resultado = await guardarReservaAtomica(supabase, { id: null, reserva: {}, extras: [] });
    expect(resultado.ok).toBe(false);
  });
});
