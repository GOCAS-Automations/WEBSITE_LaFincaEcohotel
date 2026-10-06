import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorDeConfiguracionDePrecio,
  cotizarEnServidor,
  exigirPreciosPositivos,
} from "../pagos/cotizar-en-servidor";
import { hoyEnBogota, sumarDias } from "../utils/formato";

/**
 * EL SERVIDOR NUNCA COBRA $0 POR UNA NOCHE.
 *
 * Una tarifa guardada en 0 (o un Día de Calma con precio 0) se sumaba tal
 * cual: el huésped pagaba de menos y nadie se enteraba. Ahora es un error de
 * configuración: el registro del servidor lo dice y el huésped lee que escriba
 * por WhatsApp (503, no un precio inventado).
 */
type Fila = Record<string, unknown>;

function baseFalsa(tablas: Record<string, Fila[]>): SupabaseClient {
  return {
    from(tabla: string) {
      let filas = [...(tablas[tabla] ?? [])];
      const consulta = {
        select: () => consulta,
        order: () => consulta,
        or: () => consulta,
        overlaps: () => consulta,
        eq(columna: string, valor: unknown) {
          filas = filas.filter((fila) => fila[columna] === valor);
          return consulta;
        },
        is(columna: string, valor: unknown) {
          filas = filas.filter((fila) => (fila[columna] ?? null) === valor);
          return consulta;
        },
        in(columna: string, valores: unknown[]) {
          filas = filas.filter((fila) => valores.includes(fila[columna]));
          return consulta;
        },
        not(columna: string) {
          filas = filas.filter((fila) => (fila[columna] ?? null) !== null);
          return consulta;
        },
        maybeSingle: () => Promise.resolve({ data: filas[0] ?? null, error: null }),
        then(resolver: (valor: { data: Fila[]; error: null }) => unknown) {
          return Promise.resolve({ data: filas, error: null }).then(resolver);
        },
      };
      return consulta;
    },
  } as unknown as SupabaseClient;
}

let errores: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errores = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errores.mockRestore());

describe("exigirPreciosPositivos", () => {
  it("lanza un error de configuración si alguna noche cuesta 0", () => {
    expect(() =>
      exigirPreciosPositivos(
        [
          { fecha: "2026-12-15", plan: "Estándar", precio: 480_000 },
          { fecha: "2026-12-16", plan: "Estándar", precio: 0 },
        ],
        "Cabaña 01",
      ),
    ).toThrow(ErrorDeConfiguracionDePrecio);
  });

  it("deja pasar cuando todas tienen precio", () => {
    expect(() =>
      exigirPreciosPositivos([{ fecha: "2026-12-15", plan: "Estándar", precio: 480_000 }], "Cabaña 01"),
    ).not.toThrow();
  });
});

describe("cotizarEnServidor con un precio en 0", () => {
  const entrada = sumarDias(hoyEnBogota(), 20);

  it("una tarifa base en 0: no cobra, avisa en el registro y responde como fallo del servidor", async () => {
    const resultado = await cotizarEnServidor(
      baseFalsa({
        planes: [
          { id: "p-todo", nombre: "Estándar", tipo: "hospedaje", dias_aplica: null, precio_base: null, orden: 1, activo: true },
        ],
        alojamientos: [{ id: "a-01", nombre: "Cabaña 01", slug: "cabana-01", capacidad: 2, activo: true }],
        tarifas: [
          { alojamiento_id: "a-01", plan_id: "p-todo", precio_noche: 0, precio_noche_1_persona: null, vigencia: null, temporada_id: null },
        ],
        temporadas: [],
      }),
      {
        tipo: "hospedaje",
        entrada,
        salida: sumarDias(entrada, 2),
        cabanaSlug: "cabana-01",
        planFinDeSemana: null,
        personas: 2,
        extras: [],
        porcentajeAnticipo: 50,
      },
    );

    expect(resultado).toEqual({
      ok: false,
      servidor: true,
      motivo:
        "No pudimos calcular el precio de esas fechas porque falta configurar una tarifa. Escríbenos por WhatsApp y te ayudamos con la reserva.",
    });
    expect(String(errores.mock.calls.flat().join(" "))).toContain("ERROR DE CONFIGURACIÓN");
  });

  it("un Día de Calma con precio 0 tampoco se cobra", async () => {
    const resultado = await cotizarEnServidor(
      baseFalsa({
        planes: [
          { id: "p-dia", nombre: "Día de Calma", tipo: "dia", dias_aplica: null, precio_base: 0, orden: 9, activo: true },
        ],
        reservas: [],
      }),
      {
        tipo: "dia",
        entrada,
        salida: null,
        cabanaSlug: null,
        planFinDeSemana: null,
        personas: 2,
        extras: [],
        porcentajeAnticipo: 100,
      },
    );
    expect(resultado).toMatchObject({ ok: false, servidor: true });
  });
});
