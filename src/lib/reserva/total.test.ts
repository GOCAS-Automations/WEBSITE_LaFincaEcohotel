import { describe, expect, it } from "vitest";

import {
  agruparExtrasPorNoche,
  calcularAnticipo,
  esPorcentajeAnticipo,
  lineasDeExtras,
  resumenDePago,
  totalExtras,
  type ExtraElegido,
} from "./total";

/**
 * Pruebas del desglose con experiencias POR NOCHE y del anticipo.
 *
 * Los precios son los reales del hotel (§3 y §4 de `docs/DATOS_CLIENTE.md`):
 * noche Estándar $480.000, Premium $680.000, Aniversario con Amor $150.000 y
 * Fondue $25.000.
 */

const ANIVERSARIO = {
  extraId: "aniversario",
  nombre: "Aniversario con Amor",
  precioUnitario: 150_000,
};
const FONDUE = { extraId: "fondue", nombre: "Fondue", precioUnitario: 25_000 };
const MASCOTA = {
  extraId: "mascota",
  nombre: "Segunda mascota",
  precioUnitario: 50_000,
};

/** Viernes y sábado de una estadía de dos noches. */
const VIERNES = "2026-09-18";
const SABADO = "2026-09-19";
const NOCHES = [VIERNES, SABADO];

function elegido(
  base: { extraId: string; nombre: string; precioUnitario: number },
  noche: string | null,
  cantidad = 1,
): ExtraElegido {
  return { ...base, noche, cantidad };
}

describe("líneas de extras", () => {
  it("multiplica cantidad por precio", () => {
    const lineas = lineasDeExtras([elegido(FONDUE, VIERNES, 2)]);
    expect(lineas).toHaveLength(1);
    expect(lineas[0].importe).toBe(50_000);
  });

  it("descarta lo que tiene cantidad cero", () => {
    expect(lineasDeExtras([elegido(FONDUE, VIERNES, 0)])).toHaveLength(0);
    expect(totalExtras([elegido(FONDUE, VIERNES, 0)])).toBe(0);
  });

  it("suma el mismo extra repetido en noches distintas", () => {
    const total = totalExtras([
      elegido(FONDUE, VIERNES),
      elegido(FONDUE, SABADO),
    ]);
    expect(total).toBe(50_000);
  });
});

describe("agrupar por noche", () => {
  it("devuelve un grupo por noche, en el orden de la estadía", () => {
    const grupos = agruparExtrasPorNoche(
      [elegido(ANIVERSARIO, SABADO), elegido(FONDUE, VIERNES)],
      NOCHES,
    );
    expect(grupos.map((grupo) => grupo.noche)).toEqual([VIERNES, SABADO]);
    expect(grupos[0].subtotal).toBe(25_000);
    expect(grupos[1].subtotal).toBe(150_000);
  });

  it("deja al final lo que no pertenece a una noche", () => {
    const grupos = agruparExtrasPorNoche(
      [elegido(MASCOTA, null), elegido(FONDUE, VIERNES)],
      NOCHES,
    );
    expect(grupos.map((grupo) => grupo.noche)).toEqual([VIERNES, null]);
    expect(grupos[1].subtotal).toBe(50_000);
  });

  it("no pierde un extra cuya noche ya no está en la estadía", () => {
    const grupos = agruparExtrasPorNoche(
      [elegido(FONDUE, "2026-10-01")],
      NOCHES,
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0].noche).toBe("2026-10-01");
    expect(grupos[0].subtotal).toBe(25_000);
  });

  it("no crea grupos vacíos para las noches sin extras", () => {
    expect(agruparExtrasPorNoche([], NOCHES)).toEqual([]);
  });
});

describe("anticipo", () => {
  it("el 50 % es la mitad y el saldo la otra mitad", () => {
    expect(calcularAnticipo(960_000, 50)).toEqual({
      porcentaje: 50,
      anticipo: 480_000,
      saldo: 480_000,
    });
  });

  it("el 100 % no deja saldo", () => {
    expect(calcularAnticipo(960_000, 100)).toEqual({
      porcentaje: 100,
      anticipo: 960_000,
      saldo: 0,
    });
  });

  it("anticipo y saldo suman siempre el total, aunque el 50 % caiga en medio peso", () => {
    for (const total of [1, 3, 999_999, 1_285_001]) {
      const { anticipo, saldo } = calcularAnticipo(total, 50);
      expect(anticipo + saldo).toBe(total);
      expect(Number.isInteger(anticipo)).toBe(true);
      expect(Number.isInteger(saldo)).toBe(true);
    }
  });

  it("un total de cero no produce números negativos", () => {
    expect(calcularAnticipo(0, 50)).toEqual({
      porcentaje: 50,
      anticipo: 0,
      saldo: 0,
    });
  });

  it("solo reconoce 50 y 100 como porcentajes válidos", () => {
    expect(esPorcentajeAnticipo(50)).toBe(true);
    expect(esPorcentajeAnticipo(100)).toBe(true);
    expect(esPorcentajeAnticipo(30)).toBe(false);
    expect(esPorcentajeAnticipo("50")).toBe(false);
  });
});

describe("resumen de pago", () => {
  /* Dos noches Estándar ($480.000 × 2) con fondue el viernes y aniversario el
     sábado: es el caso que pidió el cliente para el paso 4. */
  const entrada = {
    subtotalAlojamiento: 960_000,
    extras: [elegido(FONDUE, VIERNES), elegido(ANIVERSARIO, SABADO)],
    noches: NOCHES,
  };

  it("suma noches y extras", () => {
    const resumen = resumenDePago(entrada);
    expect(resumen.subtotalAlojamiento).toBe(960_000);
    expect(resumen.subtotalExtras).toBe(175_000);
    expect(resumen.total).toBe(1_135_000);
  });

  it("por defecto cobra el 50 %", () => {
    const resumen = resumenDePago(entrada);
    expect(resumen.porcentaje).toBe(50);
    expect(resumen.anticipo).toBe(567_500);
    expect(resumen.saldo).toBe(567_500);
  });

  it("con el 100 % no queda saldo y el total no cambia", () => {
    const resumen = resumenDePago({ ...entrada, porcentaje: 100 });
    expect(resumen.total).toBe(1_135_000);
    expect(resumen.anticipo).toBe(1_135_000);
    expect(resumen.saldo).toBe(0);
  });

  it("trae los extras ya agrupados por noche", () => {
    const resumen = resumenDePago(entrada);
    expect(resumen.grupos.map((grupo) => grupo.noche)).toEqual([VIERNES, SABADO]);
  });

  it("sin extras, el total es solo el alojamiento", () => {
    const resumen = resumenDePago({ subtotalAlojamiento: 350_000 });
    expect(resumen.total).toBe(350_000);
    expect(resumen.subtotalExtras).toBe(0);
    expect(resumen.grupos).toEqual([]);
  });
});
