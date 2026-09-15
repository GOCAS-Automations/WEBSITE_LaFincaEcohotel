import { describe, expect, it } from "vitest";

import {
  CUPO_DIA_DE_CALMA,
  MAX_PERSONAS_POR_RESERVA_DIA,
  cotizarDiaDeCalma,
  cupoDelDia,
  opcionesDePersonas,
  textoCupo,
  HORARIO_DIA_POR_DEFECTO,
} from "./dia-de-calma";
import {
  ANTICIPO_MAXIMO,
  ANTICIPO_MINIMO,
  normalizarPorcentajeAnticipo,
  resumenDePago,
} from "./total";
import { mensajeDiaDeCalma } from "../whatsapp";

/**
 * Pruebas del Día de Calma: cupo de 10 personas por día y precio publicado de
 * $250.000 para dos (§3 de `docs/DATOS_CLIENTE.md`).
 *
 * La regla que se prueba aquí: el plan se vende para **una o dos personas**
 * (decisión del cliente, 2026-09-15) y el módulo no inventa ningún precio —sin
 * tarifa publicada devuelve `precio: null` con su explicación—.
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

  it("nunca ofrece más de dos personas, aunque sobre cupo", () => {
    expect(MAX_PERSONAS_POR_RESERVA_DIA).toBe(2);
    expect(opcionesDePersonas(99)).toEqual([1, 2]);
    expect(opcionesDePersonas(CUPO_DIA_DE_CALMA)).toEqual([1, 2]);
  });

  it("si del día queda un solo cupo, solo se puede elegir 1", () => {
    expect(opcionesDePersonas(1)).toEqual([1]);
    expect(opcionesDePersonas(0)).toEqual([]);
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

  it("recorta a dos personas lo que venga con más (enlace viejo)", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 5,
      precioBase: PRECIO,
      restante: 10,
    });
    expect(cotizacion.personas).toBe(2);
    expect(cotizacion.precio).toBe(PRECIO);
    expect(cotizacion.sinCupo).toBe(false);
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

/* ===========================================================================
 * El cierre: total, anticipo y mensaje
 * ===========================================================================
 *
 * Desde la segunda ronda del 2026-09-15 el Día de Calma **se reserva y se paga
 * por el sitio**, con el mismo `resumenDePago()` y el mismo deslizante de 50 a
 * 100 % que el hospedaje. Lo que se prueba aquí es esa unión: que el total del
 * día entra en la misma cuenta, que el anticipo mínimo sigue siendo el 50 % y
 * que el mensaje de WhatsApp llega con la cifra ya escrita.
 * ======================================================================== */

describe("el cierre del Día de Calma con anticipo", () => {
  it("el total del día pasa por el mismo resumen que una estadía", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 2,
      precioBase: PRECIO,
    });
    expect(cotizacion.precio).toBe(PRECIO);

    const pago = resumenDePago({
      subtotalAlojamiento: cotizacion.precio!,
      porcentaje: ANTICIPO_MINIMO,
    });

    expect(pago.total).toBe(250_000);
    expect(pago.porcentaje).toBe(50);
    expect(pago.anticipo).toBe(125_000);
    expect(pago.saldo).toBe(125_000);
  });

  it("el anticipo y el saldo siempre suman el total, con y sin adicionales", () => {
    for (const porcentaje of [50, 55, 65, 85, 100]) {
      const pago = resumenDePago({
        subtotalAlojamiento: PRECIO,
        extras: [
          {
            extraId: "mascota",
            nombre: "Mascota adicional",
            noche: null,
            cantidad: 1,
            precioUnitario: 45_000,
          },
        ],
        noches: [],
        porcentaje,
      });
      expect(pago.total).toBe(295_000);
      expect(pago.anticipo + pago.saldo).toBe(pago.total);
    }
  });

  it("los adicionales del día se agrupan como «toda la estadía» (noche nula)", () => {
    const pago = resumenDePago({
      subtotalAlojamiento: PRECIO,
      extras: [
        {
          extraId: "mascota",
          nombre: "Mascota adicional",
          noche: null,
          cantidad: 2,
          precioUnitario: 45_000,
        },
      ],
      /* Un Día de Calma no tiene noches: la lista va vacía a propósito. */
      noches: [],
      porcentaje: ANTICIPO_MINIMO,
    });

    expect(pago.grupos).toHaveLength(1);
    expect(pago.grupos[0].noche).toBeNull();
    expect(pago.grupos[0].subtotal).toBe(90_000);
    expect(pago.subtotalExtras).toBe(90_000);
    expect(pago.total).toBe(340_000);
  });

  it("el 50 % es el mínimo también aquí: por debajo se sube solo", () => {
    expect(normalizarPorcentajeAnticipo(10)).toBe(ANTICIPO_MINIMO);
    expect(normalizarPorcentajeAnticipo(0)).toBe(ANTICIPO_MINIMO);
    expect(normalizarPorcentajeAnticipo(130)).toBe(ANTICIPO_MAXIMO);
    /* De cinco en cinco: un «63 %» no le dice nada a nadie. */
    expect(normalizarPorcentajeAnticipo(63)).toBe(65);
  });

  it("pagando el 100 % no queda saldo", () => {
    const pago = resumenDePago({
      subtotalAlojamiento: PRECIO,
      porcentaje: ANTICIPO_MAXIMO,
    });
    expect(pago.anticipo).toBe(250_000);
    expect(pago.saldo).toBe(0);
  });

  it("el mensaje de WhatsApp lleva el total, el anticipo y el saldo", () => {
    const pago = resumenDePago({
      subtotalAlojamiento: PRECIO,
      porcentaje: 60,
    });
    const mensaje = mensajeDiaDeCalma({
      fecha: FECHA,
      personas: 2,
      horario: HORARIO_DIA_POR_DEFECTO,
      total: pago.total,
      anticipo: {
        porcentaje: pago.porcentaje,
        monto: pago.anticipo,
        saldo: pago.saldo,
      },
    });

    expect(mensaje).toContain("Día de Calma");
    expect(mensaje).toContain("Total estimado");
    expect(mensaje).toContain("60 %");
    /* Nunca la palabra que el hotel rechaza. */
    expect(mensaje.toLowerCase()).not.toContain("pasadía");
  });

  it("el mensaje enumera los adicionales del día, sin hablar de noches", () => {
    const mensaje = mensajeDiaDeCalma({
      fecha: FECHA,
      personas: 1,
      extras: [{ nombre: "Mascota adicional", cantidad: 1, importe: 45_000 }],
      total: 295_000,
      anticipo: { porcentaje: 50, monto: 147_500, saldo: 147_500 },
    });

    expect(mensaje).toContain("Adicionales para el día:");
    expect(mensaje).toContain("Mascota adicional");
    expect(mensaje).not.toContain("Noche del");
  });

  it("sin tarifa publicada no hay cierre que valga: no se inventa un anticipo", () => {
    const cotizacion = cotizarDiaDeCalma({
      fecha: FECHA,
      personas: 2,
      precioBase: null,
    });
    expect(cotizacion.precio).toBeNull();
    /* La pantalla no pinta el deslizante en ese caso: sin total no hay
       porcentaje que calcular. Se comprueba aquí la condición que lo decide. */
    expect(typeof cotizacion.precio === "number").toBe(false);
  });
});
