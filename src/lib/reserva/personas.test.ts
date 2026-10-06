import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { cotizarEnServidor } from "../pagos/cotizar-en-servidor";
import { hoyEnBogota, sumarDias } from "../utils/formato";
import { motivoPersonasInvalidas, personasValidas } from "./personas";

/**
 * UN DÍA DE CALMA CON `personas` QUE NO ES UN NÚMERO YA NO SALTA EL CUPO.
 *
 * `/api/reservar` pasaba `Number(datos.personas)` y el servidor hacía
 * `Math.min(2, Math.max(1, Math.round(…)))`: con «dos» salía `NaN` por todo el
 * camino, llegaba a la base como NULL y el trigger del cupo lo dejaba pasar.
 * Ahora solo vale un entero 1 o 2; el resto, 400. (La base lo rechaza también:
 * migración 020, probada en `scripts/verificar-integridad-reservas.mjs`.)
 */
describe("personasValidas", () => {
  it("acepta 1 y 2", () => {
    expect(personasValidas(1)).toBe(1);
    expect(personasValidas(2)).toBe(2);
    expect(personasValidas("2")).toBe(2);
  });

  it.each([
    ["un texto", "dos"],
    ["NaN", Number.NaN],
    ["vacío", ""],
    ["null", null],
    ["undefined", undefined],
    ["un booleano", true],
    ["cero", 0],
    ["tres", 3],
    ["un decimal", 1.5],
    ["negativo", -1],
    ["un objeto", { personas: 2 }],
  ])("rechaza %s", (_caso, valor) => {
    expect(personasValidas(valor)).toBeNull();
  });
});

describe("cotizarEnServidor con personas inválidas", () => {
  /** Si llegara a leer la base, la prueba se rompe: tiene que cortar antes. */
  const sinBase = {
    from() {
      throw new Error("no debería leer la base");
    },
  } as unknown as SupabaseClient;

  it("un Día de Calma con «dos» no se cotiza, ni se acerca a la base", async () => {
    const resultado = await cotizarEnServidor(sinBase, {
      tipo: "dia",
      entrada: sumarDias(hoyEnBogota(), 10),
      salida: null,
      cabanaSlug: null,
      planFinDeSemana: null,
      personas: "dos" as unknown as number,
      extras: [],
      porcentajeAnticipo: 50,
    });
    expect(resultado).toEqual({ ok: false, motivo: motivoPersonasInvalidas("dia") });
  });

  it("tampoco un hospedaje con NaN personas", async () => {
    const entrada = sumarDias(hoyEnBogota(), 10);
    const resultado = await cotizarEnServidor(sinBase, {
      tipo: "hospedaje",
      entrada,
      salida: sumarDias(entrada, 2),
      cabanaSlug: "cabana-01",
      planFinDeSemana: null,
      personas: Number.NaN,
      extras: [],
      porcentajeAnticipo: 50,
    });
    expect(resultado.ok).toBe(false);
  });
});
