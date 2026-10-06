import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { MENSAJE_RESERVA_PAGADA, eliminarReserva } from "./eliminar-reserva";

/**
 * BORRAR UNA RESERVA PAGADA BORRABA EL PAGO.
 *
 * `pagos` cuelga de `reservas` con `on delete cascade`. Ahora:
 *   · con un pago aprobado no se borra (se ofrece cancelar), y la base lo
 *     impide igual (migración 021, en `scripts/verificar-integridad-reservas.mjs`);
 *   · primero se borra en la base y DESPUÉS el evento de Google;
 *   · los errores salen en español, nunca el texto de Postgres.
 */
type Escenario = {
  reserva?: Record<string, unknown> | null;
  aprobados?: unknown[];
  errorBorrado?: { code?: string; message: string } | null;
  borradas?: unknown[];
};

function baseFalsa(escenario: Escenario) {
  const orden: string[] = [];
  const supabase = {
    from(tabla: string) {
      let modo: "select" | "delete" = "select";
      const consulta: Record<string, unknown> = {
        select: () => consulta,
        eq: () => consulta,
        delete: () => {
          modo = "delete";
          orden.push(`delete ${tabla}`);
          return consulta;
        },
        maybeSingle: () =>
          Promise.resolve({
            data:
              escenario.reserva === undefined
                ? { id: "r1", codigo: "LF-2026-0007", referencia_externa: "evento-1" }
                : escenario.reserva,
            error: null,
          }),
        then: (resolver: (valor: unknown) => unknown) => {
          if (tabla === "pagos") {
            return Promise.resolve({ data: escenario.aprobados ?? [], error: null }).then(resolver);
          }
          if (modo === "delete") {
            return Promise.resolve(
              escenario.errorBorrado
                ? { data: null, error: escenario.errorBorrado }
                : { data: escenario.borradas ?? [{ id: "r1" }], error: null },
            ).then(resolver);
          }
          return Promise.resolve({ data: [], error: null }).then(resolver);
        },
      };
      return consulta;
    },
  } as unknown as SupabaseClient;
  return { supabase, orden };
}

describe("eliminarReserva", () => {
  it("con un pago aprobado NO se borra: se ofrece cancelar, y Google ni se toca", async () => {
    const { supabase, orden } = baseFalsa({ aprobados: [{ id: "pago-1" }] });
    const borrarEvento = vi.fn(async () => null);

    const resultado = await eliminarReserva(supabase, "r1", borrarEvento);

    expect(resultado).toEqual({ ok: false, mensaje: MENSAJE_RESERVA_PAGADA });
    expect(orden).toEqual([]);
    expect(borrarEvento).not.toHaveBeenCalled();
  });

  it("primero la base, después Google", async () => {
    const { supabase, orden } = baseFalsa({});
    const borrarEvento = vi.fn(async () => {
      orden.push("borrar evento de Google");
      return null;
    });

    const resultado = await eliminarReserva(supabase, "r1", borrarEvento);

    expect(resultado).toEqual({ ok: true, codigo: "LF-2026-0007", aviso: null });
    expect(orden).toEqual(["delete reservas", "borrar evento de Google"]);
    expect(borrarEvento).toHaveBeenCalledWith("evento-1");
  });

  it("si la base falla, el evento de Google se queda (no hay reserva viva sin evento)", async () => {
    const { supabase } = baseFalsa({
      errorBorrado: { code: "57014", message: "canceling statement due to statement timeout" },
    });
    const borrarEvento = vi.fn(async () => null);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const resultado = await eliminarReserva(supabase, "r1", borrarEvento);

    expect(borrarEvento).not.toHaveBeenCalled();
    expect(resultado.ok).toBe(false);
    const mensaje = (resultado as { mensaje: string }).mensaje;
    expect(mensaje).toMatch(/^No se pudo borrar la reserva/);
    /* Nada del texto crudo de Postgres. */
    expect(mensaje).not.toContain("statement");
    expect(mensaje).not.toContain("57014");
  });

  it("si entra un pago entre la comprobación y el borrado, manda la base (LF020)", async () => {
    const { supabase } = baseFalsa({
      errorBorrado: { code: "LF020", message: "Esta reserva tiene un pago aprobado…" },
    });
    const resultado = await eliminarReserva(supabase, "r1", vi.fn(async () => null));
    expect(resultado).toEqual({ ok: false, mensaje: MENSAJE_RESERVA_PAGADA });
  });

  it("si Google falla después, la reserva queda borrada y se avisa para quitar el evento a mano", async () => {
    const { supabase } = baseFalsa({});
    const resultado = await eliminarReserva(
      supabase,
      "r1",
      vi.fn(async () => "La reserva se eliminó, pero su evento sigue en el calendario del hotel: bórralo a mano en Google."),
    );
    expect(resultado).toMatchObject({ ok: true });
    expect((resultado as { aviso: string }).aviso).toContain("bórralo a mano");
  });

  it("una reserva que ya no existe se dice así", async () => {
    const { supabase } = baseFalsa({ reserva: null });
    expect(await eliminarReserva(supabase, "r1", vi.fn())).toEqual({
      ok: false,
      mensaje: "Esa reserva ya no existe.",
    });
  });
});
