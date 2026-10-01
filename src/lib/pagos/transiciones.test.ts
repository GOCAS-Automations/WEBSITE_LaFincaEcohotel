import { describe, expect, it } from "vitest";

import { decidirAccionDePago, pagadoTrasCobro } from "./transiciones";

/**
 * LA IDEMPOTENCIA DEL WEBHOOK, PROBADA SIN RED Y SIN BASE DE DATOS.
 *
 * ===========================================================================
 * QUÉ SE ESTÁ PROTEGIENDO
 * ===========================================================================
 * Bold reintenta una notificación **hasta cinco veces** (15 min, 1 h, 4 h, 8 h,
 * 24 h) y además dice que «puede enviarte múltiples notificaciones por una misma
 * transacción». Si los efectos del webhook dependieran del estado que llega en
 * vez de del **cambio** de estado, el huésped recibiría cinco correos de
 * confirmación y el hotel cinco avisos de un solo pago.
 *
 * Y hay un caso peor, que es el que la segunda regla cubre: el rechazo del
 * PRIMER intento de pago puede llegar reintentado **24 horas después** de que el
 * segundo intento fuera aprobado. Sin la regla, ese evento tardío cancelaría una
 * reserva pagada, y nadie lo notaría hasta que el huésped llegara a la finca.
 *
 * Requisito 4 de `docs/AUDITORIA_SEGURIDAD.md`: «El webhook es idempotente. La
 * misma transacción tiene que poder llegar dos veces sin cobrar dos veces ni
 * duplicar la reserva».
 */

describe("idempotencia: el mismo evento dos veces no hace nada", () => {
  it("un APPROVED sobre un pago ya APPROVED no vuelve a confirmar", () => {
    /* Es EL caso del reintento de Bold, y el que impide el segundo correo. */
    expect(decidirAccionDePago("APPROVED", "APPROVED")).toBe("nada");
  });

  it("un REJECTED sobre un pago ya REJECTED no hace nada", () => {
    expect(decidirAccionDePago("REJECTED", "REJECTED")).toBe("nada");
  });

  it("un VOIDED sobre un pago ya VOIDED no vuelve a cancelar", () => {
    expect(decidirAccionDePago("VOIDED", "VOIDED")).toBe("nada");
  });

  it("un PROCESSING sobre un PROCESSING no hace nada", () => {
    expect(decidirAccionDePago("PROCESSING", "PROCESSING")).toBe("nada");
  });

  it("no le afecta que el estado guardado venga con otra caja o espacios", () => {
    /* `pagos.estado` es `text` libre: una fila escrita a mano podría traer
       minúsculas y la decisión no puede cambiar por eso. */
    expect(decidirAccionDePago(" approved ", "APPROVED")).toBe("nada");
  });
});

describe("la primera aprobación sí confirma", () => {
  it("de PROCESSING a APPROVED confirma la reserva", () => {
    /* El camino normal: la fila nace en PROCESSING al abrir el checkout. */
    expect(decidirAccionDePago("PROCESSING", "APPROVED")).toBe("confirmar");
  });

  it("de un rechazo a una aprobación confirma: es el segundo intento", () => {
    /* Tarjeta rechazada y después PSE aprobado, con la misma referencia porque
       Bold reusó la venta. Tiene que confirmar. */
    expect(decidirAccionDePago("REJECTED", "APPROVED")).toBe("confirmar");
    expect(decidirAccionDePago("FAILED", "APPROVED")).toBe("confirmar");
  });

  it("confirma incluso si la fila no tenía estado", () => {
    expect(decidirAccionDePago(null, "APPROVED")).toBe("confirmar");
    expect(decidirAccionDePago("", "APPROVED")).toBe("confirmar");
  });
});

describe("un pago aprobado NO se deshace con un evento de rechazo tardío", () => {
  it("APPROVED → REJECTED no toca la reserva", () => {
    /*
      El reintento del rechazo del primer intento, llegando a las 24 horas. El
      dinero entró; el estado anterior manda.
    */
    expect(decidirAccionDePago("APPROVED", "REJECTED")).toBe("nada");
  });

  it("APPROVED → FAILED tampoco", () => {
    expect(decidirAccionDePago("APPROVED", "FAILED")).toBe("nada");
  });

  it("pero APPROVED → VOIDED sí cancela: una anulación es un hecho contable", () => {
    /* La única salida legítima de un pago aprobado: el dinero se devolvió. */
    expect(decidirAccionDePago("APPROVED", "VOIDED")).toBe("cancelar");
  });
});

describe("rechazos y estados intermedios", () => {
  it("un rechazo deja que la reserva venza sola, no la cancela", () => {
    /*
      Cancelarla en el momento le quitaría al huésped las fechas que está a punto
      de pagar con otra tarjeta. El barrido de los 30 minutos existe para esto.
    */
    expect(decidirAccionDePago("PROCESSING", "REJECTED")).toBe("dejar_vencer");
    expect(decidirAccionDePago("PROCESSING", "FAILED")).toBe("dejar_vencer");
  });

  it("una anulación sin aprobación previa también cancela", () => {
    expect(decidirAccionDePago("PROCESSING", "VOIDED")).toBe("cancelar");
  });

  it("los estados en proceso solo se guardan", () => {
    expect(decidirAccionDePago("PROCESSING", "PENDING")).toBe("solo_guardar");
    expect(decidirAccionDePago("PENDING", "PROCESSING")).toBe("solo_guardar");
    expect(decidirAccionDePago("PROCESSING", "NO_TRANSACTION_FOUND")).toBe(
      "solo_guardar",
    );
  });

  it("un estado que Bold añada mañana nunca confirma una reserva", () => {
    /* `normalizarEstadoBold` lo degrada a DESCONOCIDO y esto lo guarda sin
       actuar. Es lo contrario de fallar: el evento queda registrado y el dinero
       no se da por bueno. */
    expect(decidirAccionDePago("PROCESSING", "DESCONOCIDO")).toBe("solo_guardar");
  });
});

/* ===========================================================================
 * El dinero
 * ======================================================================== */

describe("cuánto queda pagado tras un cobro", () => {
  it("un anticipo del 50 % deja el saldo exacto", () => {
    const { pagado, saldo } = pagadoTrasCobro(350000, 0, 175000);
    expect(pagado).toBe(175000);
    expect(saldo).toBe(175000);
  });

  it("el pago del 100 % no deja saldo", () => {
    const { pagado, saldo } = pagadoTrasCobro(350000, 0, 350000);
    expect(pagado).toBe(350000);
    expect(saldo).toBe(0);
  });

  it("SUMA a lo que ya estaba abonado, no lo sustituye", () => {
    /*
      Dos casos reales: el hotel apuntó una transferencia a mano antes, o el
      huésped paga el saldo con un segundo cobro en línea. Sustituir en vez de
      sumar borraría dinero que el hotel ya recibió.
    */
    const { pagado, saldo } = pagadoTrasCobro(350000, 100000, 175000);
    expect(pagado).toBe(275000);
    expect(saldo).toBe(75000);
  });

  it("nunca pasa del total, aunque la suma se pase", () => {
    /* Un abono apuntado por error no puede dejar la ficha diciendo que pagaron
       más de lo que vale la estadía: se lee como un reembolso que nadie debe. */
    const { pagado, saldo } = pagadoTrasCobro(350000, 300000, 175000);
    expect(pagado).toBe(350000);
    expect(saldo).toBe(0);
  });

  it("el saldo nunca es negativo", () => {
    expect(pagadoTrasCobro(100000, 500000, 0).saldo).toBe(0);
  });

  it("aguanta números que no son números sin devolver NaN", () => {
    /* Los tres valores salen de `Number(fila.algo)` sobre columnas que podrían
       venir nulas. Un `NaN` escrito en `monto_pagado` sería una ficha ilegible y
       un `check` de Postgres rechazándolo en el peor momento. */
    const { pagado, saldo } = pagadoTrasCobro(Number.NaN, Number.NaN, 175000);
    expect(pagado).toBe(0);
    expect(saldo).toBe(0);
    expect(pagadoTrasCobro(350000, Number.NaN, Number.NaN).pagado).toBe(0);
  });

  it("redondea al peso: no hay centavos en COP", () => {
    const { pagado } = pagadoTrasCobro(350000, 0, 174999.6);
    expect(pagado).toBe(175000);
    expect(Number.isInteger(pagado)).toBe(true);
  });
});
