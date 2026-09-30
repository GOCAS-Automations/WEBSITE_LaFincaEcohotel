/**
 * Pruebas del hold.
 *
 * Lo que se prueba aquí no se puede mirar en una captura de pantalla: si
 * `ocupaCalendario()` dijera «libre» donde la base dice «ocupado» —o al
 * contrario—, el sitio vendería dos veces la misma noche y nadie lo vería hasta
 * que llegaran los dos huéspedes.
 */
import { describe, expect, it } from "vitest";

import {
  MINUTOS_HOLD,
  MINUTOS_VENCE_PRONTO,
  MOTIVO_VENCIDA,
  calcularVencimiento,
  cuentaAtras,
  estaVencida,
  minutosRestantes,
  ocupaCalendario,
  plazoEnPalabras,
  vencePronto,
  vencimientoISO,
} from "./holds";

/** Un instante fijo, para que las pruebas no dependan del reloj de nadie. */
const AHORA = new Date("2026-10-01T15:00:00.000Z");

function enMinutos(minutos: number): string {
  return new Date(AHORA.getTime() + minutos * 60_000).toISOString();
}

describe("el plazo", () => {
  it("son 30 minutos", () => {
    expect(MINUTOS_HOLD).toBe(30);
  });

  it("calcularVencimiento suma el plazo al instante dado", () => {
    expect(calcularVencimiento(AHORA).toISOString()).toBe(
      "2026-10-01T15:30:00.000Z",
    );
  });

  it("admite otro plazo sin tocar el módulo", () => {
    expect(calcularVencimiento(AHORA, 45).toISOString()).toBe(
      "2026-10-01T15:45:00.000Z",
    );
  });

  it("vencimientoISO devuelve texto listo para la columna timestamptz", () => {
    expect(vencimientoISO(AHORA)).toBe("2026-10-01T15:30:00.000Z");
  });

  it("el plazo se escribe en palabras para el correo", () => {
    expect(plazoEnPalabras(30)).toBe("30 minutos");
    expect(plazoEnPalabras(60)).toBe("1 hora");
    expect(plazoEnPalabras(120)).toBe("2 horas");
    expect(plazoEnPalabras(90)).toBe("1 h 30 min");
  });
});

describe("estaVencida", () => {
  it("una pendiente con el vencimiento pasado está vencida", () => {
    expect(
      estaVencida({ estado: "pendiente", expira_at: enMinutos(-1) }, AHORA),
    ).toBe(true);
  });

  it("justo en el instante del vencimiento ya está vencida", () => {
    expect(
      estaVencida({ estado: "pendiente", expira_at: AHORA.toISOString() }, AHORA),
    ).toBe(true);
  });

  it("una pendiente con vencimiento futuro no está vencida", () => {
    expect(
      estaVencida({ estado: "pendiente", expira_at: enMinutos(5) }, AHORA),
    ).toBe(false);
  });

  it("una pendiente sin vencimiento NUNCA vence (las del panel)", () => {
    expect(estaVencida({ estado: "pendiente", expira_at: null }, AHORA)).toBe(
      false,
    );
    expect(estaVencida({ estado: "pendiente" }, AHORA)).toBe(false);
  });

  it("solo vencen las pendientes: una confirmada con expira_at heredado no", () => {
    expect(
      estaVencida({ estado: "confirmada", expira_at: enMinutos(-600) }, AHORA),
    ).toBe(false);
    expect(
      estaVencida({ estado: "completada", expira_at: enMinutos(-600) }, AHORA),
    ).toBe(false);
  });

  it("una fecha ilegible se trata como «sin vencimiento», no como vencida", () => {
    /* Prefiero apartar una noche de más a liberar una que sí estaba vendida. */
    expect(
      estaVencida({ estado: "pendiente", expira_at: "no es una fecha" }, AHORA),
    ).toBe(false);
  });
});

describe("ocupaCalendario — la regla del motor", () => {
  it("una cancelada nunca ocupa, ni siquiera sin vencimiento", () => {
    expect(ocupaCalendario({ estado: "cancelada", expira_at: null }, AHORA)).toBe(
      false,
    );
    expect(
      ocupaCalendario({ estado: "cancelada", expira_at: enMinutos(600) }, AHORA),
    ).toBe(false);
  });

  it("una confirmada y una completada ocupan siempre", () => {
    expect(ocupaCalendario({ estado: "confirmada" }, AHORA)).toBe(true);
    expect(ocupaCalendario({ estado: "completada" }, AHORA)).toBe(true);
  });

  it("una pendiente con hold vivo ocupa", () => {
    expect(
      ocupaCalendario({ estado: "pendiente", expira_at: enMinutos(12) }, AHORA),
    ).toBe(true);
  });

  it("una pendiente con hold vencido libera la fecha", () => {
    expect(
      ocupaCalendario({ estado: "pendiente", expira_at: enMinutos(-1) }, AHORA),
    ).toBe(false);
  });

  it("una pendiente del panel (sin vencimiento) ocupa indefinidamente", () => {
    expect(ocupaCalendario({ estado: "pendiente", expira_at: null }, AHORA)).toBe(
      true,
    );
  });
});

describe("minutosRestantes", () => {
  it("cuenta los minutos que faltan", () => {
    expect(minutosRestantes(enMinutos(18), AHORA)).toBe(18);
  });

  it("es negativo si ya venció", () => {
    expect(minutosRestantes(enMinutos(-7), AHORA)).toBe(-7);
  });

  it("es null si no vence", () => {
    expect(minutosRestantes(null, AHORA)).toBeNull();
    expect(minutosRestantes(undefined, AHORA)).toBeNull();
  });

  it("acepta un Date igual que un texto ISO", () => {
    expect(minutosRestantes(new Date(AHORA.getTime() + 600_000), AHORA)).toBe(10);
  });
});

describe("vencePronto", () => {
  it("destaca las que caen dentro de los próximos diez minutos", () => {
    expect(
      vencePronto({ estado: "pendiente", expira_at: enMinutos(4) }, AHORA),
    ).toBe(true);
    expect(
      vencePronto(
        { estado: "pendiente", expira_at: enMinutos(MINUTOS_VENCE_PRONTO) },
        AHORA,
      ),
    ).toBe(true);
  });

  it("no destaca las que tienen margen", () => {
    expect(
      vencePronto({ estado: "pendiente", expira_at: enMinutos(25) }, AHORA),
    ).toBe(false);
  });

  it("una ya vencida no «vence pronto»: vencida es otra cosa", () => {
    expect(
      vencePronto({ estado: "pendiente", expira_at: enMinutos(-2) }, AHORA),
    ).toBe(false);
  });

  it("solo las pendientes con vencimiento", () => {
    expect(
      vencePronto({ estado: "confirmada", expira_at: enMinutos(3) }, AHORA),
    ).toBe(false);
    expect(vencePronto({ estado: "pendiente", expira_at: null }, AHORA)).toBe(
      false,
    );
  });
});

describe("cuentaAtras", () => {
  it("minutos en singular y en plural", () => {
    expect(cuentaAtras(enMinutos(1), AHORA)).toBe("Vence en 1 minuto");
    expect(cuentaAtras(enMinutos(23), AHORA)).toBe("Vence en 23 minutos");
  });

  it("horas cerradas y horas con minutos", () => {
    expect(cuentaAtras(enMinutos(60), AHORA)).toBe("Vence en 1 hora");
    expect(cuentaAtras(enMinutos(120), AHORA)).toBe("Vence en 2 horas");
    expect(cuentaAtras(enMinutos(65), AHORA)).toBe("Vence en 1 h 05 min");
  });

  it("lo ya vencido se dice en pasado", () => {
    expect(cuentaAtras(enMinutos(-1), AHORA)).toBe("Vencida hace 1 minuto");
    expect(cuentaAtras(enMinutos(-8), AHORA)).toBe("Vencida hace 8 minutos");
    expect(cuentaAtras(enMinutos(-130), AHORA)).toBe("Vencida hace 2 horas");
  });

  it("sin vencimiento no se escribe nada", () => {
    expect(cuentaAtras(null, AHORA)).toBeNull();
  });
});

describe("el motivo del barrido", () => {
  /*
    La función SQL `liberar_reservas_vencidas` no duplica la nota si ya la
    encuentra en el campo, y esa comprobación es por CONTENIDO
    (`position(motivo in notas) > 0`). Si este texto y el `default` de la
    migración 013 se separaran, una reserva barrida dos veces acumularía dos
    notas idénticas.
  */
  it("es el mismo texto que el default de la migración 013", () => {
    expect(MOTIVO_VENCIDA).toBe(
      "Reserva vencida: la solicitud caducó sin completar el pago.",
    );
  });
});
