import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { PATRON_CODIGO_RESERVA, insertarReservaConCodigo } from "./codigo-reserva";

/**
 * EL CÓDIGO DE RESERVA LO PONE LA BASE, Y NUNCA SE CUENTAN FILAS.
 *
 * El fallo de antes: el código era «reservas del año + 1». Tras borrar
 * reservas, el conteo bajaba y el siguiente número ya existía (no se podía
 * crear ninguna) o se repetía. Ahora el panel y la web insertan SIN código y la
 * base lo saca de un contador atómico (migración 019, probada contra la base
 * real en `scripts/verificar-integridad-reservas.mjs`).
 *
 * Aquí se vigila el lado de la aplicación: que no mande código, que no cuente
 * y que use el que devuelve la base. El doble imita lo que hace el trigger.
 */
function baseQueNumera(ultimo: number) {
  const llamadas: { metodo: string; args: unknown[] }[] = [];
  let contador = ultimo;
  const cliente = {
    from(tabla: string) {
      llamadas.push({ metodo: "from", args: [tabla] });
      let fila: Record<string, unknown> = {};
      const consulta = {
        insert(datos: Record<string, unknown>) {
          llamadas.push({ metodo: "insert", args: [datos] });
          fila = { ...datos };
          return consulta;
        },
        select(...args: unknown[]) {
          llamadas.push({ metodo: "select", args });
          return consulta;
        },
        like(...args: unknown[]) {
          llamadas.push({ metodo: "like", args });
          return consulta;
        },
        single() {
          contador += 1;
          const codigo =
            typeof fila.codigo === "string"
              ? fila.codigo
              : `LF-2026-${String(contador).padStart(4, "0")}`;
          return Promise.resolve({ data: { id: `r-${contador}`, codigo }, error: null });
        },
      };
      return consulta;
    },
  };
  return { supabase: cliente as unknown as SupabaseClient, llamadas };
}

describe("insertarReservaConCodigo", () => {
  it("inserta sin código y devuelve el que pone la base", async () => {
    const { supabase, llamadas } = baseQueNumera(7);
    const resultado = await insertarReservaConCodigo(supabase, { huesped_nombre: "Ana" });

    expect(resultado).toEqual({ ok: true, id: "r-8", codigo: "LF-2026-0008" });
    const insercion = llamadas.find((llamada) => llamada.metodo === "insert");
    expect(insercion?.args[0]).not.toHaveProperty("codigo");
    expect(PATRON_CODIGO_RESERVA.test(String((resultado as { codigo: string }).codigo))).toBe(true);
  });

  it("aunque le llegue un código, no lo manda: lo decide la base", async () => {
    const { supabase, llamadas } = baseQueNumera(41);
    const resultado = await insertarReservaConCodigo(supabase, {
      huesped_nombre: "Ana",
      codigo: "LF-2026-0001",
    });
    expect(resultado).toMatchObject({ ok: true, codigo: "LF-2026-0042" });
    expect(llamadas.find((llamada) => llamada.metodo === "insert")?.args[0]).not.toHaveProperty(
      "codigo",
    );
  });

  it("nunca cuenta filas para calcular el número", async () => {
    const { supabase, llamadas } = baseQueNumera(0);
    await insertarReservaConCodigo(supabase, { huesped_nombre: "Ana" });
    await insertarReservaConCodigo(supabase, { huesped_nombre: "Luis" });

    const conteos = llamadas.filter(
      (llamada) =>
        llamada.metodo === "like" ||
        (llamada.metodo === "select" &&
          llamada.args.some(
            (arg) => typeof arg === "object" && arg !== null && "count" in arg,
          )),
    );
    expect(conteos).toEqual([]);
  });

  it("un error de la base vuelve como dato, con su código de Postgres", async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: { code: "23P01", message: "conflicting key value violates exclusion constraint" },
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const resultado = await insertarReservaConCodigo(supabase, {});
    expect(resultado).toEqual({
      ok: false,
      error: { code: "23P01", message: "conflicting key value violates exclusion constraint" },
    });
  });
});
