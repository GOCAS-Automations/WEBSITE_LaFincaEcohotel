import { describe, expect, it } from "vitest";

import {
  CUPO_DIA_DE_CALMA,
  cotizarDiaDeCalma,
  cupoDelDia,
  opcionesDePersonas,
  textoCupo,
} from "./dia-de-calma";

/**
 * Pruebas del Día de Calma: cupo de 10 personas por día y precio publicado de
 * $250.000 para dos (§3 de `docs/DATOS_CLIENTE.md`).
 *
 * La regla de oro que se prueba aquí: **no se inventa ningún precio**. A
 * partir de la tercera persona el módulo devuelve `precio: null` con su
 * explicación, porque el hotel no ha publicado el valor por persona adicional.
 */

const FECHA = "2026-09-18";
const PRECIO = 250_000;

describe("cupo", () => {
  it("son diez personas por día", () => {
    expect(CUPO_DIA_DE_CALMA).toBe(10);
  });

  it("resta lo vendido", () => {
    expect(cupoDelDia(FECHA, 4)).toEqual({
      fecha: FECHA,
      usado: 4,
      restante: 6,
      lleno: false,
    });
  });

  it("un día completo no deja cupos ni números negativos", () => {
    expect(cupoDelDia(FECHA, 10).lleno).toBe(true);
    expect(cupoDelDia(FECHA, 14)).toEqual({
      fecha: FECHA,
      usado: 10,
      restante: 0,
      lleno: true,
    });
  });

  it("lo escribe en español", () => {
    expect(textoCupo(3)).toBe("Quedan 3 cupos para ese día.");
    expect(textoCupo(1)).toBe("Queda 1 cupo para ese día.");
    expect(textoCupo(0)).toContain("completo");
  });

  it("ofrece tantas opciones de personas como cupos queden", () => {
    expect(opcionesDePersonas(3)).toEqual([1, 2, 3]);
    expect(opcionesDePersonas(0)).toEqual([]);
    expect(opcionesDePersonas(99)).toHaveLength(CUPO_DIA_DE_CALMA);
  });
});

describe("cotización", () => {
  it("dos personas pagan el precio publicado", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 2,
      precioBase: PRECIO,
      restante: 10,
    });
    expect(cotizacion.precio).toBe(PRECIO);
    expect(cotizacion.nota).toBeNull();
  });

  it("una sola persona paga lo mismo, y se le avisa", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 1,
      precioBase: PRECIO,
      restante: 10,
    });
    expect(cotizacion.precio).toBe(PRECIO);
    expect(cotizacion.nota).toContain("mismo");
  });

  it("no inventa el precio de la tercera persona", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 3,
      precioBase: PRECIO,
      restante: 10,
    });
    expect(cotizacion.precio).toBeNull();
    expect(cotizacion.sinCupo).toBe(false);
    expect(cotizacion.nota).toContain("WhatsApp");
  });

  it("avisa cuando piden más personas de las que quedan", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 2,
      precioBase: PRECIO,
      restante: 1,
    });
    expect(cotizacion.precio).toBeNull();
    expect(cotizacion.sinCupo).toBe(true);
  });

  it("un día completo se dice tal cual", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 1,
      precioBase: PRECIO,
      restante: 0,
    });
    expect(cotizacion.sinCupo).toBe(true);
    expect(cotizacion.nota).toContain("completo");
  });

  it("sin tarifa publicada no da ningún número", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 2,
      precioBase: null,
      restante: 10,
    });
    expect(cotizacion.precio).toBeNull();
    expect(cotizacion.nota).toContain("tarifa");
  });

  it("sin consultar el cupo todavía, cotiza igual", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 2,
      precioBase: PRECIO,
    });
    expect(cotizacion.precio).toBe(PRECIO);
    expect(cotizacion.sinCupo).toBe(false);
  });
});
