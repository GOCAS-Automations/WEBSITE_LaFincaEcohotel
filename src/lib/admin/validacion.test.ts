import { describe, expect, it } from "vitest";

import {
  ErrorDeValidacion,
  VIOLACION_EXCLUSION,
  VIOLACION_LLAVE_FORANEA,
  VIOLACION_UNICA,
  enteroOpcional,
  enteroRequerido,
  precioOpcional,
  precioRequerido,
} from "./validacion";

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) form.set(clave, valor);
  return form;
}

/** El mensaje del `ErrorDeValidacion` que lanza `fn`, o falla el test. */
function mensajeDe(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorDeValidacion);
    return (error as Error).message;
  }
  throw new Error("Se esperaba un ErrorDeValidacion y no se lanzó nada.");
}

describe("precioRequerido — los precios del panel", () => {
  const precio = (valor: string, rango?: { min?: number; max?: number }) =>
    precioRequerido(formulario({ precio: valor }), "precio", "Precio por noche", rango);

  it("acepta pesos enteros con o sin separador de miles", () => {
    expect(precio("552000")).toBe(552000);
    expect(precio("552.000")).toBe(552000);
    expect(precio("552,000")).toBe(552000);
    expect(precio("$552.000")).toBe(552000);
    expect(precio("1.250.000")).toBe(1250000);
  });

  it("rechaza los centavos en vez de multiplicar el precio", () => {
    for (const valor of ["552.000,50", "552000,5", "552.000.50", "350000.00"]) {
      expect(mensajeDe(() => precio(valor))).toBe(
        "Escribe el precio sin centavos en «Precio por noche»: por ejemplo, 552.000.",
      );
    }
  });

  it("rechaza el cero y los negativos en un precio de noche", () => {
    expect(mensajeDe(() => precio("0"))).toBe(
      "El precio de «Precio por noche» tiene que ser mayor que $0.",
    );
    expect(mensajeDe(() => precio("-350.000"))).toBe(
      "El precio de «Precio por noche» tiene que ser mayor que $0.",
    );
  });

  it("con min 0 (adicional de cortesía) acepta el cero pero no los negativos", () => {
    expect(precio("0", { min: 0 })).toBe(0);
    expect(mensajeDe(() => precio("-1", { min: 0 }))).toBe(
      "El precio de «Precio por noche» no puede ser negativo.",
    );
  });

  it("rechaza lo que no es un número claro", () => {
    expect(mensajeDe(() => precio("552.0000"))).toMatch(/No se entiende el precio/);
    expect(mensajeDe(() => precio("1.234,567"))).toMatch(/No se entiende el precio/);
    expect(mensajeDe(() => precio("abc"))).toMatch(/No se entiende el precio/);
  });

  it("pone un tope y lo dice en pesos", () => {
    expect(mensajeDe(() => precio("100.000.001"))).toMatch(
      /^El precio de «Precio por noche» no puede pasar de \$\s?100\.000\.000\. Revisa que no le sobre un cero\.$/,
    );
  });

  it("vacío es obligatorio; en el opcional es null", () => {
    expect(mensajeDe(() => precio(""))).toBe(
      "El campo «Precio por noche» es obligatorio.",
    );
    expect(
      precioOpcional(formulario({ precio: "  " }), "precio", "Precio por noche"),
    ).toBeNull();
    expect(
      precioOpcional(formulario({ precio: "480.000" }), "precio", "Precio por noche"),
    ).toBe(480000);
  });
});

describe("enteroRequerido — también los importes de la reserva manual", () => {
  const entero = (valor: string) =>
    enteroRequerido(formulario({ campo: valor }), "campo", "Valor del alojamiento", {
      min: 0,
      max: 1_000_000_000,
    });

  it("lee el separador de miles", () => {
    expect(entero("552.000")).toBe(552000);
    expect(entero("552,000")).toBe(552000);
  });

  it("ya no convierte «552.000,50» en 55.200.050", () => {
    expect(mensajeDe(() => entero("552.000,50"))).toBe(
      "Escribe «Valor del alojamiento» sin centavos ni decimales: solo el número entero, por ejemplo 552.000.",
    );
  });

  it("dice el rango con separador de miles", () => {
    expect(mensajeDe(() => entero("-5"))).toBe(
      "El campo «Valor del alojamiento» debe estar entre 0 y 1.000.000.000.",
    );
  });

  it("enteroOpcional: vacío es null", () => {
    expect(enteroOpcional(formulario({}), "campo", "Abonado")).toBeNull();
  });
});

describe("códigos de Postgres", () => {
  it("se conservan los de siempre", () => {
    expect(VIOLACION_UNICA).toBe("23505");
    expect(VIOLACION_LLAVE_FORANEA).toBe("23503");
    expect(VIOLACION_EXCLUSION).toBe("23P01");
  });
});
