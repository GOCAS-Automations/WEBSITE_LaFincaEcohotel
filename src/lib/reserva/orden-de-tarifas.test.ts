import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { cotizarEnServidor } from "../pagos/cotizar-en-servidor";
import { hoyEnBogota, sumarDias } from "../utils/formato";
import { cotizar, ordenarPorPlan, type CabanaCotizable } from "./cotizacion";
import { nochesDe } from "./noches";

/**
 * EL SERVIDOR ORDENA LAS TARIFAS COMO EL NAVEGADOR.
 *
 * `cotizar()` toma la primera tarifa que sirve para cada tipo de noche y, si
 * el huésped no eligió plan de fin de semana, el primero de la lista. El
 * navegador ordena las tarifas por `plan.orden` (`contenido.ts`); el servidor
 * que cobra no ordenaba nada y usaba el orden en que Postgres devolviera las
 * filas. Con el mismo catálogo podían escoger planes distintos: el huésped veía
 * Premium y se le cobraba Estándar, o al revés.
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

/* Premium va PRIMERO en el panel (orden 1), Estándar después (orden 2). */
const PLANES: Fila[] = [
  { id: "p-est", nombre: "Estándar", tipo: "hospedaje", dias_aplica: [5, 6, 7], precio_base: null, orden: 2, activo: true },
  { id: "p-pre", nombre: "Premium", tipo: "hospedaje", dias_aplica: [5, 6, 7], precio_base: null, orden: 1, activo: true },
];

/* …pero la base devuelve primero la fila de Estándar. */
const TARIFAS: Fila[] = [
  { alojamiento_id: "a-01", plan_id: "p-est", precio_noche: 480_000, precio_noche_1_persona: null, vigencia: null, temporada_id: null },
  { alojamiento_id: "a-01", plan_id: "p-pre", precio_noche: 680_000, precio_noche_1_persona: null, vigencia: null, temporada_id: null },
];

/** Un viernes, con margen de antelación y lejos de fin de año. */
function proximoViernes(): string {
  let dia = sumarDias(hoyEnBogota(), 14);
  while (new Date(`${dia}T12:00:00Z`).getUTCDay() !== 5) dia = sumarDias(dia, 1);
  return dia;
}

describe("ordenarPorPlan", () => {
  it("ordena por el orden del plan y, a igualdad, por su nombre", () => {
    const ordenadas = ordenarPorPlan([
      { plan: { nombre: "Estándar", orden: 2 } },
      { plan: { nombre: "Premium", orden: 1 } },
      { plan: { nombre: "Bosque", orden: 2 } },
    ]);
    expect(ordenadas.map((tarifa) => tarifa.plan.nombre)).toEqual(["Premium", "Bosque", "Estándar"]);
  });
});

describe("cotizarEnServidor elige el mismo plan que el navegador", () => {
  it("sin plan elegido, cobra el primero por orden (Premium), no el primero que devuelva la base", async () => {
    const entrada = proximoViernes();
    const salida = sumarDias(entrada, 2);

    const servidor = await cotizarEnServidor(
      baseFalsa({
        planes: PLANES,
        alojamientos: [{ id: "a-01", nombre: "Cabaña 01", slug: "cabana-01", capacidad: 2, activo: true }],
        tarifas: TARIFAS,
        temporadas: [],
      }),
      {
        tipo: "hospedaje",
        entrada,
        salida,
        cabanaSlug: "cabana-01",
        planFinDeSemana: null,
        personas: 2,
        extras: [],
        porcentajeAnticipo: 50,
      },
    );

    /* Lo que hace el navegador: las mismas tarifas, ordenadas con la misma regla. */
    const planesPorId = new Map(PLANES.map((plan) => [plan.id, plan]));
    const delNavegador: CabanaCotizable = {
      slug: "cabana-01",
      nombre: "Cabaña 01",
      tarifas: ordenarPorPlan(
        TARIFAS.map((tarifa) => {
          const plan = planesPorId.get(tarifa.plan_id)!;
          return {
            plan: {
              nombre: String(plan.nombre),
              tipo: String(plan.tipo),
              dias_aplica: plan.dias_aplica as number[],
              orden: Number(plan.orden),
            },
            precio_noche: Number(tarifa.precio_noche),
            precio_noche_1_persona: null,
          };
        }),
      ),
    };
    const navegador = cotizar({ noches: nochesDe(entrada, salida), cabana: delNavegador, adultos: 2 });

    expect(servidor.ok).toBe(true);
    expect(navegador.posible).toBe(true);
    if (!servidor.ok || !navegador.posible) return;
    expect(servidor.cotizacion.planNombre).toBe("Premium");
    expect(navegador.planes).toEqual(["Premium"]);
    expect(servidor.cotizacion.pago.subtotalAlojamiento).toBe(navegador.total);
  });
});
