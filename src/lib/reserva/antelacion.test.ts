import { describe, expect, it } from "vitest";

import { hoyEnBogota } from "../utils/formato";
import {
  DIAS_MINIMOS_ANTELACION,
  MENSAJE_SIN_ANTELACION,
  MOTIVO_SIN_ANTELACION,
  primeraLlegadaReservable,
  validarAntelacion,
} from "./noches";

/**
 * LA REGLA: POR EL SITIO NO SE RESERVA PARA HOY.
 *
 * Decisión del cliente del 2026-10-02. La llegada más temprana que se puede
 * elegir en el sitio público es **mañana**, tanto en hospedaje como en el Día de
 * Calma, y la constante `DIAS_MINIMOS_ANTELACION` es el único sitio donde eso
 * está escrito.
 *
 * Estas pruebas son puras: no hay red, ni base, ni reloj del sistema. El «hoy»
 * entra como dato, que es exactamente como lo recibe la función en producción
 * —`hoyEnBogota()` lo calcula una vez en el servidor—. La única que mira un
 * instante es la del cambio de día a las 11 de la noche de Bogotá, y le pasa el
 * `Date` a mano.
 *
 * Fechas de referencia (jueves 2026-10-01 … domingo 2026-10-04):
 *   jue 1 · vie 2 · sáb 3 · dom 4
 */

const HOY = "2026-10-01";
const MANANA = "2026-10-02";
const AYER = "2026-09-30";

describe("DIAS_MINIMOS_ANTELACION", () => {
  it("vale 1: la primera llegada reservable es mañana", () => {
    expect(DIAS_MINIMOS_ANTELACION).toBe(1);
    expect(primeraLlegadaReservable(HOY)).toBe(MANANA);
  });

  it("la primera fecha reservable cruza el fin de mes sin corregirse a mano", () => {
    expect(primeraLlegadaReservable("2026-10-31")).toBe("2026-11-01");
    expect(primeraLlegadaReservable("2026-12-31")).toBe("2027-01-01");
    /* Año bisiesto: 2028 lo es, así que el 28 de febrero tiene un 29 detrás. */
    expect(primeraLlegadaReservable("2028-02-28")).toBe("2028-02-29");
  });
});

describe("validarAntelacion — hospedaje", () => {
  it("RECHAZA una llegada de hoy", () => {
    const resultado = validarAntelacion(HOY, HOY);
    expect(resultado.valido).toBe(false);
    if (!resultado.valido) {
      expect(resultado.motivo).toBe(MENSAJE_SIN_ANTELACION);
      /* El mensaje es para el huésped: en español y con la salida por WhatsApp. */
      expect(resultado.motivo).toContain("WhatsApp");
    }
  });

  it("ACEPTA una llegada de mañana", () => {
    expect(validarAntelacion(MANANA, HOY)).toEqual({ valido: true });
  });

  it("acepta cualquier fecha posterior a mañana", () => {
    expect(validarAntelacion("2026-10-03", HOY).valido).toBe(true);
    expect(validarAntelacion("2027-03-15", HOY).valido).toBe(true);
  });

  it("rechaza una llegada que ya pasó, y lo dice con esas palabras", () => {
    const resultado = validarAntelacion(AYER, HOY);
    expect(resultado.valido).toBe(false);
    if (!resultado.valido) {
      expect(resultado.motivo).toContain("ya pasó");
    }
  });

  it("rechaza una fecha que no es una fecha", () => {
    for (const basura of ["", "mañana", "2026-13-01", "2026-02-31", null, undefined]) {
      const resultado = validarAntelacion(basura as string | null, HOY);
      expect(resultado.valido).toBe(false);
    }
  });

  it("no se fía de un «hoy» ilegible: cierra la puerta en vez de dejar pasar", () => {
    expect(validarAntelacion(MANANA, "ayer").valido).toBe(false);
  });
});

describe("validarAntelacion — Día de Calma", () => {
  /*
    El Día de Calma es una llegada SIN salida: su fecha única se comprueba con
    la misma función y la misma constante, así que la regla no puede irse
    separando de la del hospedaje. El servidor la aplica antes de separar los dos
    caminos (`cotizarEnServidor`).
  */
  it("rechaza un Día de Calma para hoy", () => {
    expect(validarAntelacion(HOY, HOY).valido).toBe(false);
  });

  it("acepta un Día de Calma para mañana", () => {
    expect(validarAntelacion(MANANA, HOY).valido).toBe(true);
  });

  it("usa exactamente el mismo corte que el hospedaje", () => {
    /* Sin fechas mágicas: se recorre la frontera día a día. */
    for (const dia of [AYER, HOY, MANANA, "2026-10-03"]) {
      expect(validarAntelacion(dia, HOY).valido).toBe(dia >= MANANA);
    }
  });
});

describe("el «hoy» del hotel es el de Bogotá, no el del servidor", () => {
  /*
    EL CASO QUE DE VERDAD IMPORTA.

    A las 11 de la noche del 1 de octubre en Bogotá (UTC−5) en UTC ya son las
    4 de la mañana del día 2. Si el «hoy» saliera del reloj UTC, «mañana» se
    correría a pasado mañana y el huésped perdería un día entero de calendario
    sin entender por qué.
  */
  it("a las 23:00 de Bogotá sigue siendo el mismo día, y mañana sigue siendo mañana", () => {
    const onceDeLaNoche = new Date("2026-10-02T04:00:00Z"); // 2026-10-01 23:00 en Bogotá
    expect(hoyEnBogota(onceDeLaNoche)).toBe(HOY);
    expect(primeraLlegadaReservable(hoyEnBogota(onceDeLaNoche))).toBe(MANANA);
    expect(validarAntelacion(MANANA, hoyEnBogota(onceDeLaNoche)).valido).toBe(true);
    expect(validarAntelacion(HOY, hoyEnBogota(onceDeLaNoche)).valido).toBe(false);
  });

  it("un minuto después de medianoche en Bogotá ya es el día siguiente", () => {
    const pasadaMedianoche = new Date("2026-10-02T05:01:00Z"); // 2026-10-02 00:01 en Bogotá
    expect(hoyEnBogota(pasadaMedianoche)).toBe(MANANA);
    /* Y entonces lo que era «mañana» pasa a estar prohibido. */
    expect(validarAntelacion(MANANA, hoyEnBogota(pasadaMedianoche)).valido).toBe(
      false,
    );
    expect(validarAntelacion("2026-10-03", hoyEnBogota(pasadaMedianoche)).valido).toBe(
      true,
    );
  });

  it("a mediodía UTC —7 de la mañana en Bogotá— es el mismo día en los dos relojes", () => {
    expect(hoyEnBogota(new Date("2026-10-01T12:00:00Z"))).toBe(HOY);
  });
});

describe("los textos de la regla", () => {
  it("el motivo corto del calendario nombra el problema sin jerga", () => {
    expect(MOTIVO_SIN_ANTELACION).toBe("no se puede reservar para hoy");
  });

  it("el mensaje largo manda a WhatsApp, que es la salida real del huésped", () => {
    expect(MENSAJE_SIN_ANTELACION).toContain("mañana");
    expect(MENSAJE_SIN_ANTELACION).toContain("WhatsApp");
  });
});
