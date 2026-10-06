import { afterEach, describe, expect, it } from "vitest";

import {
  formatearEstadia,
  formatearFecha,
  formatearFechaConDia,
  formatearFechaHora,
  formatearRango,
  formatearRangoConDias,
  leerFechaNumerica,
} from "./formato";

/**
 * Fechas para personas: siempre `dd/mm/aaaa` (regla de Cesar, 2026-10-05).
 *
 * Lo que más se rompe aquí no es el formato sino el DÍA: una fecha de estadía
 * es un `date` de Bogotá, y pasarla por `Date` con la zona equivocada la corre
 * un día. Por eso hay casos con la zona del proceso cambiada.
 */

const ZONA_ORIGINAL = process.env.TZ;
afterEach(() => {
  if (ZONA_ORIGINAL === undefined) delete process.env.TZ;
  else process.env.TZ = ZONA_ORIGINAL;
});

describe("formatearFecha", () => {
  it("escribe dd/mm/aaaa, con ceros", () => {
    expect(formatearFecha("2026-10-05")).toBe("05/10/2026");
    expect(formatearFecha("2027-01-08")).toBe("08/01/2027");
    expect(formatearFecha("2026-12-31")).toBe("31/12/2026");
  });

  it("una fecha plana no se corre de día en ninguna zona", () => {
    /* En Bogotá, `new Date("2026-10-05")` es el 4 a las 7 de la noche: el
       formato de antes por `Date` local habría escrito el 4. */
    for (const zona of ["America/Bogota", "Pacific/Pago_Pago", "Pacific/Kiritimati", "UTC"]) {
      process.env.TZ = zona;
      expect(formatearFecha("2026-10-05"), zona).toBe("05/10/2026");
      expect(formatearFechaConDia("2026-10-05"), zona).toBe("lun 05/10/2026");
    }
  });

  it("un instante cuenta por el día de Bogotá, no por el de UTC", () => {
    /* 23:30 del 5 en Bogotá = 04:30 del 6 en UTC. El formateador anterior
       (`timeZone: "UTC"`) escribía el 6. */
    const noche = new Date("2026-10-05T23:30:00-05:00");
    expect(formatearFecha(noche)).toBe("05/10/2026");
    expect(formatearFecha("2026-10-06T04:30:00Z")).toBe("05/10/2026");
    process.env.TZ = "Asia/Tokyo";
    expect(formatearFecha(noche)).toBe("05/10/2026");
  });

  it("lo que no es fecha sale tal cual, sin «NaN»", () => {
    expect(formatearFecha("pronto")).toBe("pronto");
    expect(formatearFecha(new Date("no"))).toBe("");
  });
});

describe("formatearFechaConDia y rangos", () => {
  it("antepone el día de la semana abreviado", () => {
    expect(formatearFechaConDia("2026-12-15")).toBe("mar 15/12/2026");
    expect(formatearFechaConDia("2026-10-04")).toBe("dom 04/10/2026");
    expect(formatearFechaConDia("2026-12-19")).toBe("sáb 19/12/2026");
    expect(formatearFechaConDia("2026-12-16")).toBe("mié 16/12/2026");
  });

  it("rangos y estadías", () => {
    expect(formatearRango("2026-12-01", "2027-01-08")).toBe("01/12/2026 al 08/01/2027");
    expect(formatearRangoConDias("2026-10-13", "2026-10-16")).toBe(
      "mar 13/10/2026 al vie 16/10/2026",
    );
    expect(formatearEstadia("2026-12-15", "2026-12-18")).toBe(
      "15/12/2026 — 18/12/2026 · 3 noches",
    );
    expect(formatearEstadia("2026-12-15", "2026-12-16")).toBe(
      "15/12/2026 — 16/12/2026 · 1 noche",
    );
  });
});

describe("formatearFechaHora", () => {
  it("fecha y hora de Bogotá, de 00 a 23", () => {
    expect(formatearFechaHora("2026-10-05T19:35:00Z")).toBe("05/10/2026, 14:35");
    expect(formatearFechaHora("2026-10-06T05:00:00Z")).toBe("06/10/2026, 00:00");
    expect(formatearFechaHora("2026-10-06T04:59:00Z")).toBe("05/10/2026, 23:59");
    process.env.TZ = "Europe/Madrid";
    expect(formatearFechaHora("2026-10-05T19:35:00Z")).toBe("05/10/2026, 14:35");
  });

  it("sin dato, una raya", () => {
    expect(formatearFechaHora(null)).toBe("—");
    expect(formatearFechaHora(undefined)).toBe("—");
  });
});

describe("leerFechaNumerica (lo que se escribe en el panel)", () => {
  it("lee dd/mm/aaaa y sus variantes", () => {
    expect(leerFechaNumerica("05/10/2026")).toBe("2026-10-05");
    expect(leerFechaNumerica("5/10/2026")).toBe("2026-10-05");
    expect(leerFechaNumerica(" 05-10-2026 ")).toBe("2026-10-05");
    expect(leerFechaNumerica("05.10.2026")).toBe("2026-10-05");
    expect(leerFechaNumerica("05102026")).toBe("2026-10-05");
    expect(leerFechaNumerica("29/02/2028")).toBe("2028-02-29");
  });

  it("nunca lo lee al estilo de EE. UU.", () => {
    /* 10/05 es el 10 de mayo, no el 5 de octubre. */
    expect(leerFechaNumerica("10/05/2026")).toBe("2026-05-10");
    expect(leerFechaNumerica("12/31/2026")).toBeNull();
  });

  it("rechaza lo que no es una fecha", () => {
    expect(leerFechaNumerica("31/02/2026")).toBeNull();
    expect(leerFechaNumerica("29/02/2027")).toBeNull();
    expect(leerFechaNumerica("05/10/26")).toBeNull();
    expect(leerFechaNumerica("2026-10-05")).toBeNull();
    expect(leerFechaNumerica("")).toBeNull();
    expect(leerFechaNumerica("mañana")).toBeNull();
  });

  it("ida y vuelta con formatearFecha", () => {
    for (const iso of ["2026-01-01", "2026-10-05", "2027-12-31"]) {
      expect(leerFechaNumerica(formatearFecha(iso))).toBe(iso);
    }
  });
});
