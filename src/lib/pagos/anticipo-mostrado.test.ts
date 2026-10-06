import { describe, expect, it } from "vitest";

import {
  anticipoCambio,
  leerAnticipoEsperado,
  mensajeAnticipoCambio,
} from "./anticipo-mostrado";

/**
 * EL HUÉSPED NO VA A LA PASARELA CON UN MONTO QUE NO VIO.
 *
 * El navegador no comparaba el anticipo que devolvía el servidor con el que
 * había enseñado. Ahora lo manda (`anticipoEsperado`), el servidor responde
 * 409 con el monto nuevo si no coincide (probado en
 * `respuesta-publica.test.ts`) y el botón pide confirmación.
 */
describe("leerAnticipoEsperado", () => {
  it("acepta un número positivo y lo redondea a pesos", () => {
    expect(leerAnticipoEsperado(362_500)).toBe(362_500);
    expect(leerAnticipoEsperado(362_500.4)).toBe(362_500);
  });

  it.each([undefined, null, "362500", Number.NaN, 0, -5, {}])(
    "lo que no es un monto (%s) cuenta como «no se mandó» y no se compara",
    (valor) => {
      expect(leerAnticipoEsperado(valor)).toBeNull();
    },
  );
});

describe("anticipoCambio", () => {
  it("distinto es distinto, aunque sea un peso", () => {
    expect(anticipoCambio(362_500, 362_501)).toBe(true);
    expect(anticipoCambio(362_500, 400_000)).toBe(true);
  });

  it("igual no es cambio", () => {
    expect(anticipoCambio(362_500, 362_500)).toBe(false);
  });

  it("sin anticipo mostrado (un navegador viejo) no se compara", () => {
    expect(anticipoCambio(null, 362_500)).toBe(false);
  });
});

describe("mensajeAnticipoCambio", () => {
  it("dice el monto de antes, el nuevo, y pregunta", () => {
    const mensaje = mensajeAnticipoCambio(362_500, 400_000);
    expect(mensaje).toContain("362.500");
    expect(mensaje).toContain("400.000");
    expect(mensaje).toMatch(/¿Quieres pagar .*400\.000\?$/);
  });
});
