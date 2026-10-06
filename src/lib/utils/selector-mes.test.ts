import { describe, expect, it } from "vitest";

import {
  acotarMes,
  aniosDelSelector,
  esClaveMes,
  limitesDelCalendario,
  limitesDelPanel,
  MESES_VISIBLES_CALENDARIO,
  mesEnPalabras,
  mesesDelAnio,
  mesPermitido,
  moverMes,
  puedeAvanzar,
  puedeRetroceder,
} from "./selector-mes";

describe("aritmética de meses", () => {
  it("suma y resta meses cruzando el año", () => {
    expect(moverMes("2026-12", 1)).toBe("2027-01");
    expect(moverMes("2027-01", -1)).toBe("2026-12");
    expect(moverMes("2026-10", 23)).toBe("2028-09");
    expect(moverMes("2026-10", -22)).toBe("2024-12");
  });

  it("reconoce solo AAAA-MM con un mes de verdad", () => {
    expect(esClaveMes("2026-10")).toBe(true);
    expect(esClaveMes("2026-13")).toBe(false);
    expect(esClaveMes("2026-00")).toBe(false);
    expect(esClaveMes("2026-1")).toBe(false);
    expect(esClaveMes(202610)).toBe(false);
  });

  it("nombra el mes en español", () => {
    expect(mesEnPalabras("2026-10")).toBe("octubre de 2026");
  });
});

describe("límites del calendario de fechas del sitio", () => {
  const limites = limitesDelCalendario("2026-10-06");

  it("empieza en el mes de la primera fecha elegible y dura dos años", () => {
    expect(MESES_VISIBLES_CALENDARIO).toBe(24);
    expect(limites).toEqual({ minimo: "2026-10", maximo: "2028-09" });
  });

  it("las flechas se apagan exactamente en los extremos", () => {
    expect(puedeRetroceder("2026-10", limites)).toBe(false);
    expect(puedeRetroceder("2026-11", limites)).toBe(true);
    expect(puedeAvanzar("2028-08", limites)).toBe(true);
    expect(puedeAvanzar("2028-09", limites)).toBe(false);
  });

  it("el selector no ofrece un mes al que las flechas no llegan", () => {
    /* Recorrer con la flecha «siguiente» desde el primero hasta que se apaga
       visita exactamente los meses que el selector deja elegir. */
    const conFlechas = new Set<string>();
    let mes = limites.minimo;
    conFlechas.add(mes);
    while (puedeAvanzar(mes, limites)) {
      mes = moverMes(mes, 1);
      conFlechas.add(mes);
    }
    const conSelector = aniosDelSelector(limites)
      .flatMap((anio) => mesesDelAnio(anio, limites))
      .filter((opcion) => opcion.permitido)
      .map((opcion) => opcion.clave);
    expect(new Set(conSelector)).toEqual(conFlechas);
    expect(conSelector).toHaveLength(24);
  });

  it("apaga los meses pasados del primer año y los lejanos del último", () => {
    const de2026 = mesesDelAnio(2026, limites);
    expect(de2026.filter((m) => m.permitido).map((m) => m.corto)).toEqual([
      "oct",
      "nov",
      "dic",
    ]);
    const de2028 = mesesDelAnio(2028, limites);
    expect(de2028.find((m) => m.clave === "2028-09")?.permitido).toBe(true);
    expect(de2028.find((m) => m.clave === "2028-10")?.permitido).toBe(false);
    expect(aniosDelSelector(limites)).toEqual([2026, 2027, 2028]);
  });

  it("con la antelación de un día, el 31 de diciembre ya mira enero", () => {
    /* La primera llegada del sitio es mañana: el 31/12 eso es el 1/1. */
    expect(limitesDelCalendario("2027-01-01").minimo).toBe("2027-01");
  });

  it("acota un mes que llega de fuera de los límites", () => {
    expect(acotarMes("2025-05", limites)).toBe("2026-10");
    expect(acotarMes("2031-01", limites)).toBe("2028-09");
    expect(acotarMes("2027-03", limites)).toBe("2027-03");
    expect(mesPermitido("2027-03", limites)).toBe(true);
  });
});

describe("límites del calendario de ocupación del panel", () => {
  it("dos años hacia atrás y dos hacia delante, de enero a diciembre", () => {
    expect(limitesDelPanel("2026-10-05")).toEqual({
      minimo: "2024-01",
      maximo: "2028-12",
    });
  });
});
