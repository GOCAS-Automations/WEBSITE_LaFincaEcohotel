/**
 * Pruebas de la RECONCILIACIÓN de pagos.
 *
 * ===========================================================================
 * QUÉ SE PRUEBA AQUÍ, Y POR QUÉ SON ESTAS Y NO OTRAS
 * ===========================================================================
 * Lo que se prueba es la propiedad que cuesta un huésped si se rompe:
 *
 *   **Un pago aprobado en Bold acaba, siempre, en una reserva confirmada — y
 *   confirmarla dos veces no manda dos correos ni suma dos veces el dinero.**
 *
 * Existe porque pasó de verdad. El 2026-10-01 se hicieron dos pagos reales en el
 * sandbox de Bold, no llegó ni un evento de webhook y `LF-2026-0001` se canceló
 * sola al vencer su hold. La reconciliación es la respuesta, y una
 * reconciliación que duplicara correos o abonos sería peor que el problema.
 *
 * Los cinco casos del contrato: **aprobado, rechazado, en proceso,
 * idempotencia** y **no se duplican los correos**. Y tres más que salieron al
 * escribir el código: la reserva que el barrido ya había cancelado y que tiene
 * que volver, las fechas que entretanto se vendieron a otro, y la carrera entre
 * el webhook y la reconciliación.
 *
 * La base de datos se sustituye por un doble en memoria: lo que importa es la
 * DECISIÓN (qué se escribe, cuántos correos salen), no la sintaxis de PostgREST,
 * que ya está verificada contra la base real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ---------------------------------------------------------------------------
 * Los dobles. `vi.mock` se iza, así que las funciones se declaran dentro de la
 * factoría y se recuperan después con `vi.mocked`.
 * ------------------------------------------------------------------------- */

vi.mock("../email", () => ({
  avisarPagoAprobado: vi.fn(async () => ({ huesped: null, administracion: null })),
}));

vi.mock("../reserva/sincronizar-calendario", () => ({
  sincronizarReservaEnCalendario: vi.fn(async () => null),
}));

vi.mock("./bold", async (importarOriginal) => {
  const real = await importarOriginal<typeof import("./bold")>();
  return {
    ...real,
    /* Las llaves se dan por puestas: el entorno de pruebas no las tiene y lo que
       se prueba no es la configuración. */
    boldConfigurado: () => true,
    consultarEstadoPago: vi.fn(),
  };
});

import { avisarPagoAprobado } from "../email";
import { consultarEstadoPago, type ConsultaEstado } from "./bold";
import { aplicarEstadoDePago } from "./aplicar-estado";
import { reconciliarPago, reconciliarPagosPendientes } from "./reconciliar";

/* ===========================================================================
 * El doble de Supabase
 * ======================================================================== */

type Fila = Record<string, unknown>;

type Fallo = {
  tabla: string;
  modo: "select" | "update";
  error: { code?: string; message: string };
};

/**
 * Un Supabase de juguete con lo justo: `from().select().eq().maybeSingle()`,
 * `from().update().eq().neq().select()` y el listado con `gte/not/order/limit`.
 *
 * Lo importante no es que imite a PostgREST, sino que el `update` con `.neq()`
 * **de verdad no toque las filas que no cumplen el filtro**: ahí está la
 * idempotencia del motor de pagos, y una prueba que lo diera por bueno no
 * probaría nada.
 */
class BaseFalsa {
  pagos: Fila[] = [];
  reservas: Fila[] = [];
  fallo: Fallo | null = null;
  /** Cuántos `update` se ejecutaron de verdad, por tabla. */
  escrituras: Record<string, number> = { pagos: 0, reservas: 0 };

  from(tabla: string) {
    return new Consulta(this, tabla);
  }

  filas(tabla: string): Fila[] {
    if (tabla === "pagos") return this.pagos;
    if (tabla === "reservas") return this.reservas;
    throw new Error(`tabla inesperada en la prueba: ${tabla}`);
  }
}

type Filtro = { op: "eq" | "neq" | "gte" | "notIn"; col: string; val: unknown };

class Consulta {
  private filtros: Filtro[] = [];
  private modo: "select" | "update" = "select";
  private datos: Fila = {};
  private devolver = false;

  constructor(
    private base: BaseFalsa,
    private tabla: string,
  ) {}

  select() {
    if (this.modo === "update") this.devolver = true;
    return this;
  }

  update(datos: Fila) {
    this.modo = "update";
    this.datos = datos;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filtros.push({ op: "eq", col, val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filtros.push({ op: "neq", col, val });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filtros.push({ op: "gte", col, val });
    return this;
  }

  not(col: string, _op: string, val: unknown) {
    this.filtros.push({ op: "notIn", col, val });
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  private coincidentes(): Fila[] {
    return this.base.filas(this.tabla).filter((fila) =>
      this.filtros.every((filtro) => {
        const valor = fila[filtro.col];
        if (filtro.op === "eq") return valor === filtro.val;
        if (filtro.op === "neq") return valor !== filtro.val;
        if (filtro.op === "gte") return String(valor) >= String(filtro.val);
        /* `not("estado", "in", "(A,B)")` */
        const lista = String(filtro.val).replace(/[()]/g, "").split(",");
        return !lista.includes(String(valor));
      }),
    );
  }

  private ejecutar() {
    const fallo = this.base.fallo;
    if (fallo && fallo.tabla === this.tabla && fallo.modo === this.modo) {
      return { data: null, error: fallo.error };
    }

    const filas = this.coincidentes();

    if (this.modo === "select") return { data: filas, error: null };

    this.base.escrituras[this.tabla] =
      (this.base.escrituras[this.tabla] ?? 0) + filas.length;
    for (const fila of filas) Object.assign(fila, this.datos);

    return {
      data: this.devolver ? filas.map((fila) => ({ id: fila.id })) : null,
      error: null,
    };
  }

  async maybeSingle() {
    const { data, error } = this.ejecutar();
    if (error) return { data: null, error };
    const lista = (data ?? []) as Fila[];
    return { data: lista[0] ?? null, error: null };
  }

  /* `await consulta` sin `.maybeSingle()`: es lo que hacen los `update` sueltos
     y el listado del cron. */
  then<T>(resolver: (valor: { data: unknown; error: unknown }) => T) {
    return Promise.resolve(this.ejecutar()).then(resolver);
  }
}

/* ===========================================================================
 * Utilidades del escenario
 * ======================================================================== */

const REFERENCIA = "LF-2026-0001-1790890729481";
const ID_PAGO = "pago-1";
const ID_RESERVA = "reserva-1";

function escenario(
  opciones: {
    estadoPago?: string;
    estadoReserva?: string;
    montoPago?: number;
    total?: number;
    pagado?: number;
    expira?: string | null;
    notas?: string | null;
  } = {},
) {
  const base = new BaseFalsa();
  base.pagos.push({
    id: ID_PAGO,
    reserva_id: ID_RESERVA,
    referencia: REFERENCIA,
    monto: opciones.montoPago ?? 315_000,
    estado: opciones.estadoPago ?? "PROCESSING",
    created_at: new Date().toISOString(),
    actualizado_at: new Date().toISOString(),
  });
  base.reservas.push({
    id: ID_RESERVA,
    codigo: "LF-2026-0001",
    total: opciones.total ?? 630_000,
    monto_pagado: opciones.pagado ?? 0,
    estado: opciones.estadoReserva ?? "pendiente",
    notas: opciones.notas ?? null,
    expira_at: opciones.expira ?? new Date().toISOString(),
  });
  return base;
}

function respuestaBold(
  estado: ConsultaEstado["estado"],
  extra: Partial<ConsultaEstado> = {},
): ConsultaEstado {
  return {
    estado,
    transaccionId: "BOLD-TX-1",
    total: 315_000,
    metodo: "CARD",
    correoPagador: null,
    fecha: null,
    fallo: false,
    ...extra,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- el doble de Supabase no
   implementa `SupabaseClient` entero; implementarlo sería ruido sin valor. */
const comoSupabase = (base: BaseFalsa) => base as any;

beforeEach(() => {
  vi.mocked(avisarPagoAprobado).mockClear();
  vi.mocked(consultarEstadoPago).mockReset();
});

/* ===========================================================================
 * 1. Aprobado
 * ======================================================================== */

describe("reconciliarPago · aprobado", () => {
  it("confirma la reserva, abona el monto y borra el vencimiento", async () => {
    const base = escenario();
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("APPROVED"));

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.clave).toBe("aplicado");
    expect(resultado.aplicado?.clave).toBe("confirmada");
    expect(resultado.confirmada).toBe(true);
    expect(resultado.cambio).toBe(true);

    expect(base.pagos[0].estado).toBe("APPROVED");
    expect(base.pagos[0].transaccion_id).toBe("BOLD-TX-1");
    expect(base.pagos[0].metodo).toBe("Tarjeta");

    expect(base.reservas[0].estado).toBe("confirmada");
    expect(base.reservas[0].monto_pagado).toBe(315_000);
    /* Lo más importante de esta prueba: una reserva pagada NO puede seguir
       teniendo vencimiento, o el barrido la cancelaría con el dinero dentro. */
    expect(base.reservas[0].expira_at).toBeNull();

    expect(avisarPagoAprobado).toHaveBeenCalledTimes(1);
  });

  it("resucita la reserva que el barrido ya había cancelado, y lo deja anotado", async () => {
    /* Es exactamente el caso de `LF-2026-0001`. */
    const base = escenario({
      estadoReserva: "cancelada",
      notas: "Reserva vencida: la solicitud caducó sin completar el pago.",
    });
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("APPROVED"));

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.aplicado?.clave).toBe("confirmada");
    expect(base.reservas[0].estado).toBe("confirmada");
    /* La nota del huésped (aquí, la del barrido) se conserva y la nueva se anexa. */
    expect(String(base.reservas[0].notas)).toContain("caducó sin completar el pago");
    expect(String(base.reservas[0].notas)).toContain("se reactivó");
  });

  it("no inventa dinero: suma al abono previo y topa en el total", async () => {
    const base = escenario({ total: 400_000, pagado: 300_000 });
    vi.mocked(consultarEstadoPago).mockResolvedValue(
      respuestaBold("APPROVED", { total: 315_000 }),
    );

    await reconciliarPago(REFERENCIA, { supabase: comoSupabase(base) });

    expect(base.reservas[0].monto_pagado).toBe(400_000);
  });
});

/* ===========================================================================
 * 2. Rechazado
 * ======================================================================== */

describe("reconciliarPago · rechazado", () => {
  it("guarda el rechazo y NO toca la reserva ni manda correos", async () => {
    const base = escenario();
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("REJECTED"));

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.aplicado?.clave).toBe("no_aprobado");
    expect(base.pagos[0].estado).toBe("REJECTED");
    /* El huésped sigue dentro de su media hora: lo normal es que lo intente con
       otra tarjeta, así que no se le quitan las fechas aquí. */
    expect(base.reservas[0].estado).toBe("pendiente");
    expect(base.reservas[0].expira_at).not.toBeNull();
    expect(avisarPagoAprobado).not.toHaveBeenCalled();
  });

  it("una anulación cancela la reserva y descuenta lo devuelto", async () => {
    /*
      LA ANULACIÓN LLEGA POR EL WEBHOOK (`VOID_APPROVED`), no por reconciliación:
      la reconciliación no vuelve a preguntar por un pago que ya está en un estado
      final, y eso es deliberado (ver la prueba de más abajo). Lo que se verifica
      aquí es la transición, que es **el mismo código** para las dos vías.
    */
    const base = escenario({
      estadoPago: "APPROVED",
      estadoReserva: "confirmada",
      pagado: 315_000,
      expira: null,
    });

    const resultado = await aplicarEstadoDePago(comoSupabase(base), {
      referencia: REFERENCIA,
      estado: "VOIDED",
      montoCobrado: 315_000,
      origen: "webhook",
    });

    expect(resultado.clave).toBe("cancelada");
    expect(base.reservas[0].estado).toBe("cancelada");
    expect(base.reservas[0].monto_pagado).toBe(0);
    expect(String(base.reservas[0].notas)).toContain("anulado en Bold");
    expect(avisarPagoAprobado).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * 3. En proceso y sin respuesta
 * ======================================================================== */

describe("reconciliarPago · todavía no se sabe", () => {
  it("guarda el estado intermedio y deja la reserva como está", async () => {
    const base = escenario({ estadoPago: "NO_TRANSACTION_FOUND" });
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("PENDING"));

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.aplicado?.clave).toBe("intermedio");
    expect(base.pagos[0].estado).toBe("PENDING");
    expect(base.reservas[0].estado).toBe("pendiente");
    expect(avisarPagoAprobado).not.toHaveBeenCalled();
  });

  it("si Bold no responde, NO escribe nada", async () => {
    const base = escenario();
    vi.mocked(consultarEstadoPago).mockResolvedValue(
      respuestaBold("DESCONOCIDO", { fallo: true }),
    );

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.clave).toBe("sin_respuesta");
    expect(resultado.cambio).toBe(false);
    expect(base.escrituras.pagos).toBe(0);
    expect(base.escrituras.reservas).toBe(0);
  });

  it("`NO_TRANSACTION_FOUND` no es una negativa: no escribe nada", async () => {
    /* La API tarda «hasta 10 minutos» en ver una transacción, y en el sandbox
       archiva las referencias a las pocas horas. Tratarlo como un rechazo
       convertiría un pago bueno en un pago perdido. */
    const base = escenario();
    vi.mocked(consultarEstadoPago).mockResolvedValue(
      respuestaBold("NO_TRANSACTION_FOUND"),
    );

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.clave).toBe("sin_transaccion");
    expect(base.escrituras.pagos).toBe(0);
  });

  it("una referencia que no existe no provoca ni una llamada a Bold", async () => {
    const base = new BaseFalsa();

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.clave).toBe("pago_desconocido");
    expect(consultarEstadoPago).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * 4. Idempotencia y correos
 * ======================================================================== */

describe("reconciliarPago · idempotencia", () => {
  it("reconciliar dos veces no duplica el abono ni el correo", async () => {
    const base = escenario();
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("APPROVED"));

    await reconciliarPago(REFERENCIA, { supabase: comoSupabase(base) });
    const segunda = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(segunda.cambio).toBe(false);
    expect(segunda.confirmada).toBe(true);
    expect(base.reservas[0].monto_pagado).toBe(315_000);
    expect(avisarPagoAprobado).toHaveBeenCalledTimes(1);
  });

  it("lo que el webhook ya confirmó no se vuelve a preguntar ni a escribir", async () => {
    const base = escenario({
      estadoPago: "APPROVED",
      estadoReserva: "confirmada",
      pagado: 315_000,
      expira: null,
    });

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.clave).toBe("ya_resuelto");
    expect(resultado.confirmada).toBe(true);
    /* Ni una llamada de red, ni una escritura: reconciliar es gratis. */
    expect(consultarEstadoPago).not.toHaveBeenCalled();
    expect(base.escrituras.pagos).toBe(0);
    expect(base.escrituras.reservas).toBe(0);
    expect(avisarPagoAprobado).not.toHaveBeenCalled();
  });

  it("un pago aprobado con la reserva sin confirmar SÍ se arregla, y sin preguntar", async () => {
    /* El hueco que deja un webhook a medias: guardó el pago y falló al escribir
       la reserva. El estado ya lo sabemos, así que no hace falta Bold. */
    const base = escenario({ estadoPago: "APPROVED", estadoReserva: "pendiente" });

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(consultarEstadoPago).not.toHaveBeenCalled();
    expect(resultado.aplicado?.clave).toBe("confirmada");
    expect(base.reservas[0].estado).toBe("confirmada");
    expect(avisarPagoAprobado).toHaveBeenCalledTimes(1);
  });

  it("si el webhook se adelanta a la reconciliación, solo uno de los dos escribe", async () => {
    /* Es la carrera real: el huésped vuelve a la página de retorno justo cuando
       llega el evento. El `update … .neq(estado)` es el candado. */
    const base = escenario();
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("APPROVED"));

    const [uno, dos] = await Promise.all([
      aplicarEstadoDePago(comoSupabase(base), {
        referencia: REFERENCIA,
        estado: "APPROVED",
        origen: "webhook",
      }),
      reconciliarPago(REFERENCIA, { supabase: comoSupabase(base) }),
    ]);

    const claves = [uno.clave, dos.aplicado?.clave ?? dos.clave];
    expect(claves).toContain("confirmada");
    expect(avisarPagoAprobado).toHaveBeenCalledTimes(1);
    expect(base.reservas[0].monto_pagado).toBe(315_000);
  });
});

/* ===========================================================================
 * 5. El caso que pide una persona
 * ======================================================================== */

describe("reconciliarPago · fechas ya ocupadas", () => {
  it("no se calla: el pago entró pero la reserva no se puede confirmar", async () => {
    const base = escenario();
    base.fallo = {
      tabla: "reservas",
      modo: "update",
      error: { code: "23P01", message: "conflicting key value violates exclusion constraint" },
    };
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("APPROVED"));

    const resultado = await reconciliarPago(REFERENCIA, {
      supabase: comoSupabase(base),
    });

    expect(resultado.aplicado?.clave).toBe("fechas_ocupadas");
    /* El pago SÍ queda guardado como aprobado: es un hecho contable y perderlo
       sería peor que no poder confirmar la reserva. */
    expect(base.pagos[0].estado).toBe("APPROVED");
    expect(resultado.mensaje).toContain("a mano");
    /* Y no se le manda al huésped una confirmación que no existe. */
    expect(avisarPagoAprobado).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * 6. La pasada del cron
 * ======================================================================== */

describe("reconciliarPagosPendientes", () => {
  it("solo mira los pagos que no están en un estado final", async () => {
    const base = escenario();
    base.pagos.push({
      id: "pago-2",
      reserva_id: "reserva-2",
      referencia: "LF-2026-0002-111",
      monto: 100_000,
      estado: "APPROVED",
      created_at: new Date().toISOString(),
      actualizado_at: new Date().toISOString(),
    });
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("APPROVED"));

    const resumen = await reconciliarPagosPendientes(comoSupabase(base));

    expect(resumen.revisados).toBe(1);
    expect(resumen.confirmados).toBe(1);
    expect(consultarEstadoPago).toHaveBeenCalledTimes(1);
    expect(consultarEstadoPago).toHaveBeenCalledWith(REFERENCIA);
  });

  it("cuenta aparte los que piden una persona", async () => {
    const base = escenario();
    base.fallo = {
      tabla: "reservas",
      modo: "update",
      error: { code: "23P01", message: "exclusion" },
    };
    vi.mocked(consultarEstadoPago).mockResolvedValue(respuestaBold("APPROVED"));

    const resumen = await reconciliarPagosPendientes(comoSupabase(base));

    expect(resumen.requierenAtencion).toEqual([REFERENCIA]);
  });
});
