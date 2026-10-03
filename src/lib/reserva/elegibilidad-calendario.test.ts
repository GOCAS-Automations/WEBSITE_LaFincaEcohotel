import { describe, expect, it } from "vitest";

import {
  bloqueoComun,
  bloqueoDeCabana,
  diasDelMes,
  diasSinCupo,
  eligiendoSalida,
  evaluadorDeDias,
  MAXIMO_DIAS_DISPONIBILIDAD,
  mesDe,
  MOTIVO_ANTES_DE_LLEGADA,
  MOTIVO_OCUPADA,
  MOTIVO_PASADO,
  MOTIVO_SIN_CUPO,
  MOTIVO_TODAS_OCUPADAS,
  MOTIVO_TRAS_OCUPADA,
  nochesBloqueadas,
  repartirPorMes,
  sumarMeses,
  tiposOfrecidosDe,
  topeDeSalida,
  validarFechas,
  ventanaPorCargar,
  type ReglasCalendario,
} from "./elegibilidad-calendario";
import { MOTIVO_SIN_ANTELACION, primeraLlegadaReservable } from "./noches";

/**
 * EL CALENDARIO QUE TACHA LO OCUPADO.
 *
 * Semántica hotelera con rangos `[llegada, salida)`. El escenario de casi todas
 * las pruebas: otra reserva tiene las noches del **sábado 10** y el **domingo
 * 11** de octubre de 2026. Entonces:
 *
 *   · nadie puede LLEGAR el 10 ni el 11,
 *   · quien llega antes puede SALIR como tarde el 10 (la mañana en que el otro
 *     llega),
 *   · y se puede LLEGAR el 12, el día en que el otro sale.
 *
 * Fechas de referencia (octubre de 2026):
 *   jue 1 · vie 2 · sáb 3 · dom 4 · lun 5 · mar 6 · mié 7 · jue 8 · vie 9 ·
 *   sáb 10 · dom 11 · lun 12 (festivo, Día de la Raza) · mar 13 · mié 14
 */

const HOY = "2026-10-01";
const MINIMA = primeraLlegadaReservable(HOY); // 2026-10-02

const OCUPADA_10_Y_11 = bloqueoDeCabana({
  ocupadas: ["2026-10-10", "2026-10-11"],
});

const reglas = (extra: Partial<ReglasCalendario> = {}): ReglasCalendario => ({
  hoy: HOY,
  minima: MINIMA,
  bloqueo: OCUPADA_10_Y_11,
  ...extra,
});

const llegada = (dia: string, extra: Partial<ReglasCalendario> = {}) =>
  evaluadorDeDias({ entrada: "", salida: "" }, reglas(extra)).estado(dia);

const salidaDesde = (entrada: string, dia: string) =>
  evaluadorDeDias({ entrada, salida: "" }, reglas()).estado(dia);

/* ========================================================================= */

describe("llegada: un día con la noche ocupada no puede ser entrada", () => {
  it("el 10 y el 11 están ocupados: no se puede llegar, y dice por qué", () => {
    for (const dia of ["2026-10-10", "2026-10-11"]) {
      const estado = llegada(dia);
      expect(estado.activable).toBe(false);
      expect(estado.ocupado).toBe(true);
      expect(estado.motivo).toBe(MOTIVO_OCUPADA);
      expect(estado.motivo).toMatch(/^ocupado/);
    }
  });

  it("se puede llegar el 12, el mismo día en que el otro huésped sale", () => {
    expect(llegada("2026-10-12")).toEqual({
      activable: true,
      motivo: null,
      ocupado: false,
    });
  });

  it("el día anterior a la reserva ajena sí sirve para llegar", () => {
    expect(llegada("2026-10-09").activable).toBe(true);
  });
});

describe("salida: el rango no puede saltar por encima de una noche ocupada", () => {
  it("llegando el 8, el tope de salida es el 10", () => {
    expect(topeDeSalida("2026-10-08", OCUPADA_10_Y_11)).toBe("2026-10-10");
    const { tope } = evaluadorDeDias(
      { entrada: "2026-10-08", salida: "" },
      reglas(),
    );
    expect(tope).toBe("2026-10-10");
  });

  it("se puede salir justo el día en que llega el otro (el 10)", () => {
    expect(salidaDesde("2026-10-08", "2026-10-10").activable).toBe(true);
    expect(salidaDesde("2026-10-08", "2026-10-09").activable).toBe(true);
  });

  it("salir el 11 o después saltaría la noche ocupada: tachado y explicado", () => {
    for (const dia of ["2026-10-11", "2026-10-12", "2026-10-20"]) {
      const estado = salidaDesde("2026-10-08", dia);
      expect(estado.activable).toBe(false);
      expect(estado.ocupado).toBe(true);
      expect(estado.motivo).toBe(MOTIVO_TRAS_OCUPADA);
    }
  });

  it("la llegada y los días anteriores no son salida", () => {
    const estado = salidaDesde("2026-10-08", "2026-10-08");
    expect(estado.activable).toBe(false);
    expect(estado.ocupado).toBe(false);
    expect(estado.motivo).toBe(MOTIVO_ANTES_DE_LLEGADA);
  });

  it("llegando el 12, no hay tope dentro del horizonte: todo libre", () => {
    expect(topeDeSalida("2026-10-12", OCUPADA_10_Y_11)).toBeNull();
    expect(salidaDesde("2026-10-12", "2026-10-30").activable).toBe(true);
  });

  it("si la noche de la llegada está bloqueada, el tope es la llegada misma", () => {
    expect(topeDeSalida("2026-10-10", OCUPADA_10_Y_11)).toBe("2026-10-10");
    expect(salidaDesde("2026-10-10", "2026-10-11").activable).toBe(false);
  });

  it("con el rango completo, el siguiente clic vuelve a ser una llegada", () => {
    expect(eligiendoSalida({ entrada: "2026-10-08", salida: "2026-10-10" })).toBe(
      false,
    );
    const evaluador = evaluadorDeDias(
      { entrada: "2026-10-08", salida: "2026-10-10" },
      reglas(),
    );
    expect(evaluador.tope).toBeNull();
    expect(evaluador.estado("2026-10-10").activable).toBe(false);
  });
});

describe("rango entero libre", () => {
  it("del 13 al 16 no toca nada ocupado: vale", () => {
    expect(
      validarFechas({ entrada: "2026-10-13", salida: "2026-10-16" }, reglas()),
    ).toEqual({ valido: true });
  });

  it("del 12 al 14 (llegando el día que el otro sale) también vale", () => {
    expect(
      validarFechas({ entrada: "2026-10-12", salida: "2026-10-14" }, reglas()),
    ).toEqual({ valido: true });
  });

  it("del 8 al 10 (saliendo el día que el otro llega) también vale", () => {
    expect(
      validarFechas({ entrada: "2026-10-08", salida: "2026-10-10" }, reglas()),
    ).toEqual({ valido: true });
  });

  it("del 9 al 12 pisa el 10: no vale, y señala la primera noche que falla", () => {
    expect(
      validarFechas({ entrada: "2026-10-09", salida: "2026-10-12" }, reglas()),
    ).toEqual({
      valido: false,
      causa: "ocupada",
      motivo: MOTIVO_OCUPADA,
      fecha: "2026-10-10",
    });
  });

  it("solo con llegada, se mira solo la noche de la llegada", () => {
    expect(validarFechas({ entrada: "2026-10-11", salida: "" }, reglas())).toMatchObject({
      valido: false,
      fecha: "2026-10-11",
    });
    expect(validarFechas({ entrada: "2026-10-12", salida: "" }, reglas())).toEqual({
      valido: true,
    });
  });

  it("sin llegada no hay nada que comprobar", () => {
    expect(validarFechas({ entrada: "", salida: "" }, reglas())).toEqual({
      valido: true,
    });
  });
});

describe("la ocupación se combina con la antelación y la fecha mínima", () => {
  it("hoy no se puede reservar, aunque su noche esté libre", () => {
    const estado = llegada(HOY);
    expect(estado.activable).toBe(false);
    expect(estado.motivo).toBe(MOTIVO_SIN_ANTELACION);
    /* No es ocupación: se pinta como un día apagado, no como uno tomado. */
    expect(estado.ocupado).toBe(false);
  });

  it("el pasado es pasado, esté ocupado o no", () => {
    const ocupadoAyer = bloqueoDeCabana({ ocupadas: ["2026-09-30"] });
    const estado = llegada("2026-09-30", { bloqueo: ocupadoAyer });
    expect(estado.motivo).toBe(MOTIVO_PASADO);
    expect(estado.ocupado).toBe(false);
  });

  it("mañana es el primer día elegible si está libre", () => {
    expect(llegada(MINIMA).activable).toBe(true);
  });

  it("mañana ocupado: tachado por ocupación, no por antelación", () => {
    const estado = llegada(MINIMA, {
      bloqueo: bloqueoDeCabana({ ocupadas: [MINIMA] }),
    });
    expect(estado.activable).toBe(false);
    expect(estado.motivo).toBe(MOTIVO_OCUPADA);
  });

  it("con una mínima más lejana, los días previos se apagan con su motivo", () => {
    const estado = llegada("2026-10-04", { minima: "2026-10-05" });
    expect(estado.activable).toBe(false);
    expect(estado.motivo).toBe(MOTIVO_SIN_ANTELACION);
    expect(llegada("2026-10-05", { minima: "2026-10-05" }).activable).toBe(true);
  });

  it("una mínima anterior a hoy no abre el pasado", () => {
    expect(llegada("2026-09-30", { minima: "2026-09-01" }).activable).toBe(false);
  });

  it("la salida no se rige por la antelación: es regla de llegada", () => {
    expect(salidaDesde(MINIMA, "2026-10-03").activable).toBe(true);
  });

  it("validarFechas rechaza una llegada para hoy o del pasado", () => {
    expect(
      validarFechas({ entrada: HOY, salida: "2026-10-03" }, reglas()),
    ).toMatchObject({ valido: false, causa: "antelacion", motivo: MOTIVO_SIN_ANTELACION });
    expect(
      validarFechas({ entrada: "2026-09-20", salida: "2026-10-03" }, reglas()),
    ).toMatchObject({ valido: false, causa: "antelacion", motivo: MOTIVO_PASADO });
  });
});

describe("Cabaña 02: solo noches de fin de semana o festivo", () => {
  const ESTANDAR = { nombre: "Estándar", tipo: "hospedaje", dias_aplica: [5, 6, 7] };
  const PREMIUM = { nombre: "Premium", tipo: "hospedaje", dias_aplica: [5, 6, 7] };
  const ENTRE_SEMANA = {
    nombre: "Entre Semana",
    tipo: "hospedaje",
    dias_aplica: [1, 2, 3, 4],
  };

  it("los tipos que vende una cabaña salen de sus tarifas", () => {
    expect(tiposOfrecidosDe({ tarifas: [{ plan: ESTANDAR }] })).toEqual([
      "fin_de_semana",
    ]);
    expect(
      tiposOfrecidosDe({
        tarifas: [{ plan: ENTRE_SEMANA }, { plan: ESTANDAR }, { plan: PREMIUM }],
      }),
    ).toEqual(["entre_semana", "fin_de_semana"]);
  });

  it("sin tarifas cargadas no se apaga nada", () => {
    expect(tiposOfrecidosDe({ tarifas: [] })).toBeNull();
  });

  const DOS = bloqueoDeCabana({
    ocupadas: [],
    tiposOfrecidos: ["fin_de_semana"],
    nombreCabana: "Cabaña 02",
  });

  it("un martes no es llegada, y lo explica nombrando la cabaña", () => {
    const estado = llegada("2026-10-06", { bloqueo: DOS });
    expect(estado.activable).toBe(false);
    expect(estado.ocupado).toBe(true);
    expect(estado.motivo).toBe(
      "no disponible: la Cabaña 02 no se ofrece para noches entre semana",
    );
  });

  it("un viernes sí; y el lunes festivo cuenta como fin de semana", () => {
    expect(llegada("2026-10-09", { bloqueo: DOS }).activable).toBe(true);
    expect(llegada("2026-10-12", { bloqueo: DOS }).activable).toBe(true);
    /* Viernes, sábado, domingo y lunes festivo: el primer martes es el tope. */
    expect(topeDeSalida("2026-10-09", DOS)).toBe("2026-10-13");
  });

  it("validarFechas distingue la noche no ofrecida de la ocupada", () => {
    expect(
      validarFechas(
        { entrada: "2026-10-05", salida: "2026-10-07" },
        reglas({ bloqueo: DOS }),
      ),
    ).toMatchObject({ valido: false, causa: "no_ofrecida", fecha: "2026-10-05" });
  });

  it("una noche ocupada se nombra como ocupada aunque además sea entre semana", () => {
    const dosOcupada = bloqueoDeCabana({
      ocupadas: ["2026-10-06"],
      tiposOfrecidos: ["fin_de_semana"],
    });
    expect(dosOcupada("2026-10-06")?.causa).toBe("ocupada");
  });
});

describe("portada sin cabaña: solo se tacha si TODAS están bloqueadas", () => {
  const A = bloqueoDeCabana({ ocupadas: ["2026-10-10"] });
  const B = bloqueoDeCabana({ ocupadas: ["2026-10-10", "2026-10-11"] });

  it("el 10 está bloqueado en las dos; el 11 solo en una", () => {
    const comun = bloqueoComun([A, B]);
    expect(comun("2026-10-10")).toEqual({
      causa: "ocupada",
      motivo: MOTIVO_TODAS_OCUPADAS,
    });
    expect(comun("2026-10-11")).toBeNull();
  });

  it("sin cabañas no se inventa ocupación", () => {
    expect(bloqueoComun([])("2026-10-10")).toBeNull();
  });

  it("la regla de la 02 cuenta: un martes con las otras ocupadas no tiene cabaña", () => {
    const dos = bloqueoDeCabana({ ocupadas: [], tiposOfrecidos: ["fin_de_semana"] });
    const otra = bloqueoDeCabana({ ocupadas: ["2026-10-06"] });
    expect(bloqueoComun([dos, otra])("2026-10-06")).not.toBeNull();
    expect(bloqueoComun([dos, otra])("2026-10-07")).toBeNull();
  });

  it("nochesBloqueadas filtra una lista de fechas", () => {
    expect(
      nochesBloqueadas(diasDelMes("2026-10"), bloqueoComun([A, B])),
    ).toEqual(["2026-10-10"]);
  });
});

describe("Día de Calma: se tachan los días sin cupo, no las noches ocupadas", () => {
  const sinCupo = (dia: string) => dia === "2026-10-10";

  it("un día lleno no se puede elegir", () => {
    const estado = evaluadorDeDias(
      { entrada: "", salida: "", diaUnico: true },
      reglas({ sinCupo }),
    ).estado("2026-10-10");
    expect(estado).toEqual({ activable: false, motivo: MOTIVO_SIN_CUPO, ocupado: true });
  });

  it("una noche ocupada de cabaña no afecta al Día de Calma", () => {
    const estado = evaluadorDeDias(
      { entrada: "", salida: "", diaUnico: true },
      reglas({ sinCupo }),
    ).estado("2026-10-11");
    expect(estado.activable).toBe(true);
  });

  it("en modo día nunca se está eligiendo salida", () => {
    expect(eligiendoSalida({ entrada: "2026-10-09", salida: "", diaUnico: true })).toBe(
      false,
    );
  });

  it("validarFechas en modo día mira el cupo de ese día", () => {
    expect(
      validarFechas({ entrada: "2026-10-10", salida: "", diaUnico: true }, reglas({ sinCupo })),
    ).toMatchObject({ valido: false, causa: "sin_cupo" });
    expect(
      validarFechas({ entrada: "2026-10-11", salida: "", diaUnico: true }, reglas({ sinCupo })),
    ).toEqual({ valido: true });
  });

  it("diasSinCupo: lleno con diez personas, no con nueve", () => {
    expect(diasSinCupo({ "2026-10-11": 9, "2026-10-10": 10 })).toEqual([
      "2026-10-10",
    ]);
  });
});

describe("las consultas a /api/disponibilidad van por meses y caben en el tope", () => {
  const nada = () => false;

  it("sin nada cargado: el mes visible y el siguiente, en una sola consulta", () => {
    expect(ventanaPorCargar("2026-10", nada)).toEqual({
      desde: "2026-10-01",
      hasta: "2026-12-01",
      meses: ["2026-10", "2026-11"],
    });
  });

  it("con el visible ya cargado, adelanta los dos siguientes", () => {
    const cargados = new Set(["2026-10", "2026-11"]);
    expect(ventanaPorCargar("2026-11", (mes) => cargados.has(mes))).toEqual({
      desde: "2026-12-01",
      hasta: "2027-02-01",
      meses: ["2026-12", "2027-01"],
    });
  });

  it("si falta solo el visible (se volvió atrás), pide solo ese", () => {
    const cargados = new Set(["2026-11"]);
    expect(ventanaPorCargar("2026-10", (mes) => cargados.has(mes))?.meses).toEqual([
      "2026-10",
    ]);
  });

  it("con todo cargado no pide nada", () => {
    expect(ventanaPorCargar("2026-10", () => true)).toBeNull();
  });

  it("ninguna ventana pasa del tope del endpoint (92 días)", () => {
    for (const mes of ["2026-01", "2026-07", "2026-12", "2028-01"]) {
      const ventana = ventanaPorCargar(mes, nada)!;
      const dias =
        (Date.parse(`${ventana.hasta}T00:00:00Z`) -
          Date.parse(`${ventana.desde}T00:00:00Z`)) /
        86_400_000;
      expect(dias).toBeGreaterThan(0);
      expect(dias).toBeLessThanOrEqual(MAXIMO_DIAS_DISPONIBILIDAD);
    }
  });

  it("aritmética de meses, con cambio de año y bisiestos", () => {
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
    expect(sumarMeses("2027-01", -1)).toBe("2026-12");
    expect(mesDe("2026-10-03")).toBe("2026-10");
    expect(diasDelMes("2028-02")).toHaveLength(29);
    expect(diasDelMes("2026-10")[30]).toBe("2026-10-31");
  });

  it("repartirPorMes guarda cada mes por separado, también los vacíos", () => {
    const trozos = repartirPorMes(
      {
        cabanas: [
          { slug: "cabana-01", ocupado: ["2026-10-30", "2026-11-02"] },
          { slug: "cabana-02", ocupado: [] },
        ],
        dia: { "2026-11-07": 10 },
      },
      ["2026-10", "2026-11"],
    );
    expect(trozos["2026-10"].cabanas["cabana-01"]).toEqual(["2026-10-30"]);
    expect(trozos["2026-11"].cabanas["cabana-01"]).toEqual(["2026-11-02"]);
    expect(trozos["2026-10"].cabanas["cabana-02"]).toEqual([]);
    expect(trozos["2026-11"].dia).toEqual({ "2026-11-07": 10 });
    expect(trozos["2026-10"].dia).toEqual({});
  });
});
