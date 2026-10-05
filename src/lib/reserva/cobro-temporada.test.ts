import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { cotizarEnServidor, type SolicitudDeReserva } from "../pagos/cotizar-en-servidor";

/**
 * EL SERVIDOR COBRA EL PRECIO DE TEMPORADA.
 *
 * `/api/reservar` no confía en el navegador: recalcula con `cotizarEnServidor()`
 * leyendo la base, y de ahí sale el monto que va a Bold. Esta prueba le pone
 * delante una base falsa con el catálogo real y la «Temporada de fin de año»
 * tal como la guarda la migración 017 (una fila en `temporadas` y sus precios
 * como filas de `tarifas` con `temporada_id`), y comprueba lo que cobraría.
 *
 * La base falsa entiende `eq`, `is`, `in` y `not … is null`, que es lo que usa
 * el código; `or` y `overlaps` los deja pasar (devuelven de más), así que la
 * prueba también comprueba que el filtrado por cabaña y fechas no depende de
 * que la base lo haga bien.
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
        then(
          resolver: (valor: { data: Fila[]; error: null }) => unknown,
          rechazar?: (error: unknown) => unknown,
        ) {
          return Promise.resolve({ data: filas, error: null }).then(resolver, rechazar);
        },
      };
      return consulta;
    },
  } as unknown as SupabaseClient;
}

const PLANES: Fila[] = [
  { id: "p-es", nombre: "Entre Semana", tipo: "hospedaje", dias_aplica: [1, 2, 3, 4], precio_base: null, activo: true },
  { id: "p-est", nombre: "Estándar", tipo: "hospedaje", dias_aplica: [5, 6, 7], precio_base: null, activo: true },
  { id: "p-pre", nombre: "Premium", tipo: "hospedaje", dias_aplica: [5, 6, 7], precio_base: null, activo: true },
];

const ALOJAMIENTOS: Fila[] = [
  { id: "a-01", nombre: "Cabaña 01", slug: "cabana-01", capacidad: 2, activo: true },
  { id: "a-02", nombre: "Cabaña 02", slug: "cabana-02", capacidad: 2, activo: true },
];

const TEMPORADA = "t-fin";
const NOCHES = "[2026-12-01,2027-01-09)";

const TARIFAS: Fila[] = [
  // Base. La Cabaña 02 solo tiene Estándar.
  { alojamiento_id: "a-01", plan_id: "p-es", precio_noche: 350_000, precio_noche_1_persona: 200_000, vigencia: null, temporada_id: null },
  { alojamiento_id: "a-01", plan_id: "p-est", precio_noche: 480_000, precio_noche_1_persona: null, vigencia: null, temporada_id: null },
  { alojamiento_id: "a-01", plan_id: "p-pre", precio_noche: 680_000, precio_noche_1_persona: null, vigencia: null, temporada_id: null },
  { alojamiento_id: "a-02", plan_id: "p-est", precio_noche: 480_000, precio_noche_1_persona: null, vigencia: null, temporada_id: null },
  // Temporada de fin de año, todas las cabañas (+15 %).
  { alojamiento_id: null, plan_id: "p-es", precio_noche: 402_500, precio_noche_1_persona: 230_000, vigencia: NOCHES, temporada_id: TEMPORADA },
  { alojamiento_id: null, plan_id: "p-est", precio_noche: 552_000, precio_noche_1_persona: null, vigencia: NOCHES, temporada_id: TEMPORADA },
  { alojamiento_id: null, plan_id: "p-pre", precio_noche: 782_000, precio_noche_1_persona: null, vigencia: NOCHES, temporada_id: TEMPORADA },
];

const BASE = baseFalsa({
  planes: PLANES,
  alojamientos: ALOJAMIENTOS,
  tarifas: TARIFAS,
  temporadas: [
    { id: TEMPORADA, nombre: "Temporada de fin de año", alojamiento_id: null, noches: NOCHES },
  ],
});

const HOY = new Date("2026-10-05T15:00:00Z");

function solicitud(cambios: Partial<SolicitudDeReserva>): SolicitudDeReserva {
  return {
    tipo: "hospedaje",
    entrada: "2026-12-15",
    salida: "2026-12-16",
    cabanaSlug: "cabana-01",
    planFinDeSemana: "Estándar",
    personas: 2,
    extras: [],
    porcentajeAnticipo: 50,
    ...cambios,
  };
}

describe("/api/reservar cobra el precio de temporada (cotizarEnServidor)", () => {
  it("una noche entre semana de diciembre se cobra a $402.500 y el anticipo sale de ahí", async () => {
    const resultado = await cotizarEnServidor(BASE, solicitud({}), HOY);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.cotizacion.pago.subtotalAlojamiento).toBe(402_500);
    expect(resultado.cotizacion.pago.anticipo).toBe(201_250);
    expect(resultado.cotizacion.noches[0].temporada).toBe("Temporada de fin de año");
  });

  it("fin de semana de diciembre: Estándar y Premium a precio de temporada", async () => {
    const estandar = await cotizarEnServidor(
      BASE,
      solicitud({ entrada: "2026-12-04", salida: "2026-12-06" }),
      HOY,
    );
    const premium = await cotizarEnServidor(
      BASE,
      solicitud({ entrada: "2026-12-04", salida: "2026-12-06", planFinDeSemana: "Premium" }),
      HOY,
    );
    expect(estandar.ok && estandar.cotizacion.pago.total).toBe(2 * 552_000);
    expect(premium.ok && premium.cotizacion.pago.total).toBe(2 * 782_000);
  });

  it("la estadía que cruza el borde (30 nov → 2 dic) cobra una noche base y otra de temporada", async () => {
    const resultado = await cotizarEnServidor(
      BASE,
      solicitud({ entrada: "2026-11-30", salida: "2026-12-02" }),
      HOY,
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.cotizacion.noches.map((linea) => linea.precio)).toEqual([350_000, 402_500]);
    expect(resultado.cotizacion.pago.total).toBe(752_500);
  });

  it("una persona entre semana paga el precio de 1 persona de la temporada", async () => {
    const resultado = await cotizarEnServidor(BASE, solicitud({ personas: 1 }), HOY);
    expect(resultado.ok && resultado.cotizacion.pago.total).toBe(230_000);
  });

  it("fuera de la temporada se cobra la base", async () => {
    const resultado = await cotizarEnServidor(
      BASE,
      solicitud({ entrada: "2026-11-17", salida: "2026-11-18" }),
      HOY,
    );
    expect(resultado.ok && resultado.cotizacion.pago.total).toBe(350_000);
  });

  it("la Cabaña 02 sigue sin venderse entre semana aunque la temporada de todas tenga Entre Semana", async () => {
    const resultado = await cotizarEnServidor(
      BASE,
      solicitud({ cabanaSlug: "cabana-02" }),
      HOY,
    );
    expect(resultado.ok).toBe(false);
  });
});
