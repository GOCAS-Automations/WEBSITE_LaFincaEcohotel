import { describe, expect, it } from "vitest";

import { leerEnteroEscrito } from "./importe";

/**
 * El error que esto evita: «552.000,50» se guardaba como 55.200.050 porque se
 * borraban todos los separadores y los centavos pasaban a ser cifras.
 */
describe("leerEnteroEscrito", () => {
  it.each([
    ["552000", 552000],
    ["552.000", 552000],
    ["552,000", 552000],
    ["552 000", 552000],
    ["1.250.000", 1250000],
    ["1,250,000", 1250000],
    ["$552.000", 552000],
    ["$ 552.000", 552000],
    ["  480000  ", 480000],
    ["552 000", 552000],
    ["0", 0],
    ["7", 7],
    ["-5", -5],
    ["-$5.000", -5000],
  ])("acepta «%s» como %d", (texto, esperado) => {
    expect(leerEnteroEscrito(texto)).toEqual({ ok: true, valor: esperado });
  });

  it.each([
    "552.000,50",
    "552.000,5",
    "552000,50",
    "552,5",
    "552,00",
    "350000.00",
    "1.5",
    "552.000.50",
  ])("rechaza «%s» por centavos", (texto) => {
    expect(leerEnteroEscrito(texto)).toEqual({ ok: false, problema: "centavos" });
  });

  it.each([
    "552.0000",
    "1.234,567",
    "1,234.567",
    "55.20.000",
    "552000.000",
    "12a",
    "$",
    "-",
    "cinco mil",
    "1e6",
  ])("rechaza «%s» por formato", (texto) => {
    expect(leerEnteroEscrito(texto)).toEqual({ ok: false, problema: "formato" });
  });

  it("vacío o solo espacios es «vacío», no cero", () => {
    expect(leerEnteroEscrito("")).toEqual({ ok: false, problema: "vacio" });
    expect(leerEnteroEscrito("   ")).toEqual({ ok: false, problema: "vacio" });
    expect(leerEnteroEscrito(null)).toEqual({ ok: false, problema: "vacio" });
  });

  it("no se pasa del entero seguro de JavaScript", () => {
    expect(leerEnteroEscrito("99999999999999999999")).toEqual({
      ok: false,
      problema: "formato",
    });
  });
});
