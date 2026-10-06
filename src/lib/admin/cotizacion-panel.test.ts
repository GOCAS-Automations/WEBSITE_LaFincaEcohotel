import { describe, expect, it } from "vitest";

import { cotizarReservaManual, tramosDelDesglose } from "./cotizacion-panel";
import type { PlanCotizable, TarifaCotizable } from "../reserva/cotizacion";

/**
 * El valor sugerido de la reserva manual tiene que ser el que cobraría el
 * sitio. Fechas de octubre de 2026: jue 8, vie 9, sáb 10, dom 11, lun 12
 * (festivo), mar 13.
 */

const ENTRE_SEMANA: PlanCotizable = {
  nombre: "Entre Semana",
  tipo: "hospedaje",
  dias_aplica: [1, 2, 3, 4],
};
const ESTANDAR: PlanCotizable = {
  nombre: "Estándar",
  tipo: "hospedaje",
  dias_aplica: [5, 6, 7],
};
const PREMIUM: PlanCotizable = {
  nombre: "Premium",
  tipo: "hospedaje",
  dias_aplica: [5, 6, 7],
};

const PLANES = ["p-entre", "p-estandar", "p-premium"];

const TARIFAS: Record<string, TarifaCotizable> = {
  "c1|p-entre": {
    plan: ENTRE_SEMANA,
    precio_noche: 350_000,
    precio_noche_1_persona: 200_000,
  },
  "c1|p-estandar": {
    plan: ESTANDAR,
    precio_noche: 480_000,
    precio_noche_1_persona: null,
    temporadas: [
      {
        nombre: "Puente festivo",
        desde: "2026-10-10",
        hasta: "2026-10-12",
        deCabana: false,
        precio_noche: 520_000,
        precio_noche_1_persona: null,
      },
    ],
  },
  "c1|p-premium": {
    plan: PREMIUM,
    precio_noche: 680_000,
    precio_noche_1_persona: null,
  },
  /* La 02 solo tiene Estándar. */
  "c2|p-estandar": {
    plan: ESTANDAR,
    precio_noche: 480_000,
    precio_noche_1_persona: null,
  },
};

const base = {
  alojamientoId: "c1",
  nombreCabana: "Cabaña 01",
  planesIds: PLANES,
  tarifas: TARIFAS,
  personas: 2,
};

describe("cotizarReservaManual: el mismo número que el sitio", () => {
  it("jueves → sábado con Entre Semana: el viernes va con Estándar ($480.000), no a $350.000", () => {
    const cotizacion = cotizarReservaManual({
      ...base,
      planId: "p-entre",
      entrada: "2026-10-08",
      salida: "2026-10-10",
    });
    expect(cotizacion).toMatchObject({ posible: true, total: 350_000 + 480_000 });
    if (!cotizacion?.posible) throw new Error("debía ser posible");
    expect(cotizacion.lineas.map((linea) => [linea.fecha, linea.plan, linea.precio])).toEqual([
      ["2026-10-08", "Entre Semana", 350_000],
      ["2026-10-09", "Estándar", 480_000],
    ]);
  });

  it("con Premium elegido, el fin de semana va con Premium y el jueves con Entre Semana", () => {
    const cotizacion = cotizarReservaManual({
      ...base,
      planId: "p-premium",
      entrada: "2026-10-08",
      salida: "2026-10-10",
    });
    expect(cotizacion).toMatchObject({ posible: true, total: 350_000 + 680_000 });
  });

  it("aplica las tarifas diferenciales y el festivo como el sitio", () => {
    /* vie 9 base, sáb 10 y dom 11 con «Puente festivo», lun 12 festivo
       (noche de fin de semana) vuelve a la base. */
    const cotizacion = cotizarReservaManual({
      ...base,
      planId: "p-estandar",
      entrada: "2026-10-09",
      salida: "2026-10-13",
    });
    if (!cotizacion?.posible) throw new Error("debía ser posible");
    expect(cotizacion.lineas.map((linea) => linea.precio)).toEqual([
      480_000, 520_000, 520_000, 480_000,
    ]);
    expect(cotizacion.total).toBe(2_000_000);
    expect(tramosDelDesglose(cotizacion.lineas)).toEqual([
      { plan: "Estándar", precio: 480_000, noches: 2, temporada: null },
      { plan: "Estándar", precio: 520_000, noches: 2, temporada: "Puente festivo" },
    ]);
  });

  it("una persona sola paga el precio de una persona donde existe", () => {
    const cotizacion = cotizarReservaManual({
      ...base,
      planId: "p-entre",
      personas: 1,
      entrada: "2026-10-13",
      salida: "2026-10-15",
    });
    expect(cotizacion).toMatchObject({ posible: true, total: 400_000 });
  });

  it("la 02 entre semana no se puede: lo dice en vez de inventar un precio", () => {
    const cotizacion = cotizarReservaManual({
      ...base,
      alojamientoId: "c2",
      nombreCabana: "Cabaña 02",
      planId: "p-estandar",
      entrada: "2026-10-13",
      salida: "2026-10-14",
    });
    expect(cotizacion).toMatchObject({ posible: false });
    if (cotizacion?.posible !== false) throw new Error("no debía ser posible");
    expect(cotizacion.motivo).toMatch(/Cabaña 02 no se ofrece para noches entre semana/);
  });

  it("sin cabaña o sin fechas no hay cotización", () => {
    expect(
      cotizarReservaManual({ ...base, alojamientoId: "", planId: "p-entre", entrada: "2026-10-08", salida: "2026-10-09" }),
    ).toBeNull();
    expect(
      cotizarReservaManual({ ...base, planId: "p-entre", entrada: "2026-10-08", salida: "" }),
    ).toBeNull();
  });
});
