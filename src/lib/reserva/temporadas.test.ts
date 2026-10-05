import { describe, expect, it } from "vitest";

import {
  cotizar,
  desgloseEnTexto,
  elegibilidadDeCabana,
  precioDeNoche,
  rangoDePrecios,
  type CabanaCotizable,
  type PlanCotizable,
  type TarifaCotizable,
} from "./cotizacion";
import { nochesDe } from "./noches";
import {
  avisoDeTemporadas,
  crucesDeTemporada,
  estadoDeTemporada,
  fechasDeTemporada,
  leerNoches,
  planesDelAlcance,
  rangoLegible,
  temporadaDeNoche,
  temporadasDeTarifa,
  textoDiferencia,
  validarPreciosDeTemporada,
  type PlanConBases,
  type Temporada,
} from "./temporadas";

/**
 * Pruebas de las temporadas (tarifas para fechas concretas).
 *
 * El catálogo es el REAL (§3 de `docs/DATOS_CLIENTE.md`) y la temporada es la
 * que mandó el hotel: «Temporada de fin de año», todas las cabañas, primera
 * noche 1 dic 2026, última noche 8 ene 2027, +15 % sobre la base.
 */

const ENTRE_SEMANA: PlanCotizable = {
  nombre: "Entre Semana",
  tipo: "hospedaje",
  dias_aplica: [1, 2, 3, 4],
};
const ESTANDAR: PlanCotizable = {
  nombre: "Estándar",
  tipo: "hospedaje",
  dias_aplica: [5, 6, 7],
};
const PREMIUM: PlanCotizable = {
  nombre: "Premium",
  tipo: "hospedaje",
  dias_aplica: [5, 6, 7],
};

const ID = {
  entreSemana: "plan-entre-semana",
  estandar: "plan-estandar",
  premium: "plan-premium",
  cabana01: "cabana-01",
  cabana02: "cabana-02",
};

/** La temporada que mandó el hotel. `hasta` es el día siguiente a la última noche. */
const FIN_DE_ANO: Temporada = {
  id: "t-fin-de-ano",
  nombre: "Temporada de fin de año",
  alojamientoId: null,
  desde: "2026-12-01",
  hasta: "2027-01-09",
  precios: [
    { planId: ID.entreSemana, precio_noche: 402_500, precio_noche_1_persona: 230_000 },
    { planId: ID.estandar, precio_noche: 552_000, precio_noche_1_persona: null },
    { planId: ID.premium, precio_noche: 782_000, precio_noche_1_persona: null },
  ],
};

/** Base de cada plan, con su id para poder colgarle temporadas. */
const BASE: { planId: string; tarifa: Omit<TarifaCotizable, "temporadas"> }[] = [
  {
    planId: ID.entreSemana,
    tarifa: { plan: ENTRE_SEMANA, precio_noche: 350_000, precio_noche_1_persona: 200_000 },
  },
  {
    planId: ID.estandar,
    tarifa: { plan: ESTANDAR, precio_noche: 480_000, precio_noche_1_persona: null },
  },
  {
    planId: ID.premium,
    tarifa: { plan: PREMIUM, precio_noche: 680_000, precio_noche_1_persona: null },
  },
];

/**
 * Arma una cabaña como lo hace el servidor: SOLO con las tarifas base que
 * tiene, y a cada una le cuelga sus temporadas.
 */
function cabana(
  alojamientoId: string,
  nombre: string,
  planes: string[],
  temporadas: Temporada[],
): CabanaCotizable {
  return {
    slug: alojamientoId,
    nombre,
    tarifas: BASE.filter((base) => planes.includes(base.planId)).map((base) => ({
      ...base.tarifa,
      temporadas: temporadasDeTarifa(temporadas, alojamientoId, base.planId),
    })),
  };
}

const TODOS_LOS_PLANES = [ID.entreSemana, ID.estandar, ID.premium];

describe("precio de cada noche con la temporada de fin de año", () => {
  const c01 = cabana(ID.cabana01, "Cabaña 01", TODOS_LOS_PLANES, [FIN_DE_ANO]);

  it("la primera noche (1 dic) ya es de temporada", () => {
    const cotizacion = cotizar({
      noches: nochesDe("2026-12-01", "2026-12-02"),
      cabana: c01,
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;
    expect(cotizacion.lineas[0]).toMatchObject({
      plan: "Entre Semana",
      precio: 402_500,
      temporada: "Temporada de fin de año",
    });
  });

  it("la última noche (8 ene) es de temporada y la siguiente (9 ene) ya no", () => {
    const cotizacion = cotizar({
      noches: nochesDe("2027-01-08", "2027-01-10"),
      cabana: c01,
      planFinDeSemana: "Estándar",
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;
    // 8 ene 2027 es viernes; 9 ene, sábado: las dos de fin de semana.
    expect(cotizacion.lineas.map((linea) => [linea.fecha, linea.precio, linea.temporada])).toEqual([
      ["2027-01-08", 552_000, "Temporada de fin de año"],
      ["2027-01-09", 480_000, null],
    ]);
  });

  it("la noche anterior a la primera (30 nov) se cobra con la base", () => {
    const tarifa = c01.tarifas[0];
    expect(precioDeNoche(tarifa, "2026-11-30", 2)).toEqual({
      precio: 350_000,
      unaPersona: false,
      temporada: null,
    });
  });

  it("una estadía que cruza el borde (30 nov → 2 dic) lleva una noche base y otra de temporada", () => {
    const cotizacion = cotizar({
      noches: nochesDe("2026-11-30", "2026-12-02"),
      cabana: c01,
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;
    expect(cotizacion.lineas.map((linea) => [linea.precio, linea.temporada])).toEqual([
      [350_000, null],
      [402_500, "Temporada de fin de año"],
    ]);
    expect(cotizacion.total).toBe(752_500);
  });

  it("fin de semana de diciembre: Estándar y Premium con su precio de temporada", () => {
    const noches = nochesDe("2026-12-04", "2026-12-06"); // viernes y sábado
    const estandar = cotizar({ noches, cabana: c01, planFinDeSemana: "Estándar", adultos: 2 });
    const premium = cotizar({ noches, cabana: c01, planFinDeSemana: "Premium", adultos: 2 });
    expect(estandar.posible && estandar.total).toBe(2 * 552_000);
    expect(premium.posible && premium.total).toBe(2 * 782_000);
  });

  it("la temporada no cambia qué plan le toca a la noche: un martes sigue siendo Entre Semana", () => {
    const cotizacion = cotizar({
      noches: nochesDe("2026-12-08", "2026-12-09"), // martes 8 dic: festivo (Inmaculada)
      cabana: c01,
      planFinDeSemana: "Premium",
      adultos: 2,
    });
    // El 8 de diciembre es festivo → noche de fin de semana → Premium.
    expect(cotizacion.posible && cotizacion.lineas[0].plan).toBe("Premium");
    const martes = cotizar({
      noches: nochesDe("2026-12-15", "2026-12-16"),
      cabana: c01,
      planFinDeSemana: "Premium",
      adultos: 2,
    });
    expect(martes.posible && martes.lineas[0].plan).toBe("Entre Semana");
    expect(martes.posible && martes.lineas[0].precio).toBe(402_500);
  });

  it("una persona entre semana paga el precio de 1 persona de la temporada", () => {
    const cotizacion = cotizar({
      noches: nochesDe("2026-12-15", "2026-12-16"),
      cabana: c01,
      adultos: 1,
    });
    expect(cotizacion.posible && cotizacion.lineas[0]).toMatchObject({
      precio: 230_000,
      tarifaUnaPersona: true,
      temporada: "Temporada de fin de año",
    });
  });

  it("el desglose para WhatsApp nombra la temporada", () => {
    const cotizacion = cotizar({
      noches: nochesDe("2026-11-30", "2026-12-02"),
      cabana: c01,
      adultos: 2,
    });
    if (!cotizacion.posible) throw new Error("debía poder cotizarse");
    const texto = desgloseEnTexto(cotizacion, (v) => `$${v}`, (f) => f);
    expect(texto[0]).toBe("• 2026-11-30 — Entre Semana: $350000");
    expect(texto[1]).toBe("• 2026-12-01 — Entre Semana, Temporada de fin de año: $402500");
  });

  it("las tarjetas ven el rango cuando las noches no cuestan lo mismo", () => {
    const estandar = c01.tarifas[1];
    expect(rangoDePrecios(estandar, ["2026-11-27", "2026-12-04"], 2)).toEqual({
      minimo: 480_000,
      maximo: 552_000,
    });
    expect(rangoDePrecios(estandar, [], 2)).toEqual({ minimo: 480_000, maximo: 480_000 });
  });
});

describe("precedencia: cabaña concreta > todas > base", () => {
  const NAVIDAD_C01: Temporada = {
    id: "t-navidad-c01",
    nombre: "Navidad en la 01",
    alojamientoId: ID.cabana01,
    desde: "2026-12-20",
    hasta: "2026-12-27",
    precios: [{ planId: ID.premium, precio_noche: 900_000, precio_noche_1_persona: null }],
  };

  it("en la Cabaña 01 manda la de la cabaña en las noches que comparten", () => {
    const c01 = cabana(ID.cabana01, "Cabaña 01", TODOS_LOS_PLANES, [FIN_DE_ANO, NAVIDAD_C01]);
    const premium = c01.tarifas[2];
    expect(precioDeNoche(premium, "2026-12-25", 2)).toMatchObject({
      precio: 900_000,
      temporada: "Navidad en la 01",
    });
    // Fuera de la de la cabaña, pero dentro de la de todas.
    expect(precioDeNoche(premium, "2026-12-27", 2)).toMatchObject({
      precio: 782_000,
      temporada: "Temporada de fin de año",
    });
    // Fuera de las dos: la base.
    expect(precioDeNoche(premium, "2027-01-15", 2)).toMatchObject({
      precio: 680_000,
      temporada: null,
    });
  });

  it("el orden en que llegan las temporadas no cambia el resultado", () => {
    const a = cabana(ID.cabana01, "Cabaña 01", TODOS_LOS_PLANES, [FIN_DE_ANO, NAVIDAD_C01]);
    const b = cabana(ID.cabana01, "Cabaña 01", TODOS_LOS_PLANES, [NAVIDAD_C01, FIN_DE_ANO]);
    expect(precioDeNoche(a.tarifas[2], "2026-12-22", 2)).toEqual(
      precioDeNoche(b.tarifas[2], "2026-12-22", 2),
    );
  });

  it("la de una cabaña no toca a las demás cabañas", () => {
    const c03 = cabana("cabana-03", "Cabaña 03", TODOS_LOS_PLANES, [FIN_DE_ANO, NAVIDAD_C01]);
    expect(precioDeNoche(c03.tarifas[2], "2026-12-25", 2).precio).toBe(782_000);
  });

  it("un plan sin precio en la temporada de la cabaña sigue con la de todas, y sin ninguna, con la base", () => {
    const c01 = cabana(ID.cabana01, "Cabaña 01", TODOS_LOS_PLANES, [FIN_DE_ANO, NAVIDAD_C01]);
    // Navidad en la 01 solo fija Premium: Estándar sigue con la de todas.
    expect(precioDeNoche(c01.tarifas[1], "2026-12-25", 2).precio).toBe(552_000);

    const SOLO_PREMIUM: Temporada = { ...FIN_DE_ANO, precios: [FIN_DE_ANO.precios[2]] };
    const conSoloPremium = cabana(ID.cabana01, "Cabaña 01", TODOS_LOS_PLANES, [SOLO_PREMIUM]);
    expect(precioDeNoche(conSoloPremium.tarifas[1], "2026-12-25", 2)).toEqual({
      precio: 480_000,
      unaPersona: false,
      temporada: null,
    });
  });

  it("temporadaDeNoche elige la de cabaña aunque la de todas empiece después", () => {
    const todas = { ...FIN_DE_ANO, deCabana: false, precio_noche: 1, precio_noche_1_persona: null };
    const deCabana = {
      ...todas,
      nombre: "de cabaña",
      deCabana: true,
      desde: "2026-11-01",
    };
    expect(temporadaDeNoche([todas, deCabana], "2026-12-10")?.nombre).toBe("de cabaña");
    expect(temporadaDeNoche([], "2026-12-10")).toBeNull();
    expect(temporadaDeNoche(undefined, "2026-12-10")).toBeNull();
  });
});

describe("una temporada nunca habilita un plan que la cabaña no tiene", () => {
  // La Cabaña 02 solo tiene Estándar en su tarifa base.
  const c02 = cabana(ID.cabana02, "Cabaña 02", [ID.estandar], [FIN_DE_ANO]);

  it("la temporada de todas no le cuelga Entre Semana a la 02", () => {
    expect(c02.tarifas.map((tarifa) => tarifa.plan.nombre)).toEqual(["Estándar"]);
    expect(temporadasDeTarifa([FIN_DE_ANO], ID.cabana02, ID.estandar)).toHaveLength(1);
  });

  it("la 02 sigue sin ofrecerse entre semana en diciembre", () => {
    const noches = nochesDe("2026-12-15", "2026-12-16"); // martes
    expect(elegibilidadDeCabana(c02, noches).elegible).toBe(false);
    const cotizacion = cotizar({ noches, cabana: c02, adultos: 2 });
    expect(cotizacion.posible).toBe(false);
  });

  it("y sus fines de semana de diciembre sí cobran la temporada", () => {
    const cotizacion = cotizar({
      noches: nochesDe("2026-12-05", "2026-12-06"),
      cabana: c02,
      planFinDeSemana: "Estándar",
      adultos: 2,
    });
    expect(cotizacion.posible && cotizacion.total).toBe(552_000);
  });

  it("el formulario no ofrece a la 02 los planes que no tiene", () => {
    const planes: PlanConBases[] = [
      {
        planId: ID.entreSemana,
        nombre: "Entre Semana",
        bases: [{ alojamientoId: ID.cabana01, cabana: "Cabaña 01", precio: 350_000, precioUnaPersona: 200_000 }],
      },
      {
        planId: ID.estandar,
        nombre: "Estándar",
        bases: [
          { alojamientoId: ID.cabana01, cabana: "Cabaña 01", precio: 480_000, precioUnaPersona: null },
          { alojamientoId: ID.cabana02, cabana: "Cabaña 02", precio: 480_000, precioUnaPersona: null },
        ],
      },
    ];
    expect(planesDelAlcance(planes, ID.cabana02).map((plan) => plan.nombre)).toEqual(["Estándar"]);
    expect(planesDelAlcance(planes, null).map((plan) => plan.nombre)).toEqual([
      "Entre Semana",
      "Estándar",
    ]);
    expect(planesDelAlcance(planes, null)[0].tieneUnaPersona).toBe(true);
    expect(planesDelAlcance(planes, null)[1].tieneUnaPersona).toBe(false);
  });
});

describe("precio de una persona: los dos o ninguno", () => {
  const planes = [
    { planId: ID.entreSemana, nombre: "Entre Semana", tieneUnaPersona: true },
    { planId: ID.estandar, nombre: "Estándar", tieneUnaPersona: false },
  ];

  it("acepta los dos precios", () => {
    const resultado = validarPreciosDeTemporada(planes, [
      { planId: ID.entreSemana, precio: 402_500, precioUnaPersona: 230_000 },
    ]);
    expect(resultado).toEqual({
      valido: true,
      precios: [{ planId: ID.entreSemana, precio_noche: 402_500, precio_noche_1_persona: 230_000 }],
    });
  });

  it("rechaza el de dos personas sin el de una", () => {
    const resultado = validarPreciosDeTemporada(planes, [
      { planId: ID.entreSemana, precio: 402_500, precioUnaPersona: null },
    ]);
    expect(resultado.valido).toBe(false);
    if (!resultado.valido) expect(resultado.motivo).toContain("necesita los dos");
  });

  it("rechaza el de una persona sin el de dos", () => {
    const resultado = validarPreciosDeTemporada(planes, [
      { planId: ID.entreSemana, precio: null, precioUnaPersona: 230_000 },
    ]);
    expect(resultado.valido).toBe(false);
  });

  it("rechaza un precio de una persona en un plan que no lo tiene en la base", () => {
    const resultado = validarPreciosDeTemporada(planes, [
      { planId: ID.estandar, precio: 552_000, precioUnaPersona: 300_000 },
    ]);
    expect(resultado.valido).toBe(false);
  });

  it("un plan en blanco no se guarda (usa la base), pero hace falta al menos uno", () => {
    const uno = validarPreciosDeTemporada(planes, [
      { planId: ID.entreSemana, precio: null, precioUnaPersona: null },
      { planId: ID.estandar, precio: 552_000, precioUnaPersona: null },
    ]);
    expect(uno.valido && uno.precios.map((precio) => precio.planId)).toEqual([ID.estandar]);
    expect(validarPreciosDeTemporada(planes, []).valido).toBe(false);
  });

  it("rechaza precios en cero", () => {
    expect(
      validarPreciosDeTemporada(planes, [
        { planId: ID.estandar, precio: 0, precioUnaPersona: null },
      ]).valido,
    ).toBe(false);
  });
});

describe("solapes", () => {
  const candidata = {
    alojamientoId: null,
    desde: "2026-12-24",
    hasta: "2026-12-26",
    planIds: [ID.premium],
  };

  it("dos de todas que se cruzan en el mismo plan chocan", () => {
    const cruces = crucesDeTemporada(candidata, [FIN_DE_ANO]);
    expect(cruces).toHaveLength(1);
    expect(cruces[0].planIds).toEqual([ID.premium]);
  });

  it("dos de la misma cabaña que se cruzan en el mismo plan chocan", () => {
    const deLa01: Temporada = { ...FIN_DE_ANO, id: "otra", alojamientoId: ID.cabana01 };
    expect(crucesDeTemporada({ ...candidata, alojamientoId: ID.cabana01 }, [deLa01])).toHaveLength(1);
  });

  it("una de cabaña y una de todas no chocan: gana la de cabaña", () => {
    expect(crucesDeTemporada({ ...candidata, alojamientoId: ID.cabana01 }, [FIN_DE_ANO])).toEqual([]);
  });

  it("dos de cabañas distintas no chocan", () => {
    const deLa01: Temporada = { ...FIN_DE_ANO, alojamientoId: ID.cabana01 };
    expect(crucesDeTemporada({ ...candidata, alojamientoId: ID.cabana02 }, [deLa01])).toEqual([]);
  });

  it("si fijan precio a planes distintos, no chocan", () => {
    const soloEntreSemana: Temporada = { ...FIN_DE_ANO, precios: [FIN_DE_ANO.precios[0]] };
    expect(crucesDeTemporada(candidata, [soloEntreSemana])).toEqual([]);
  });

  it("tocarse en el borde no es cruzarse (la siguiente empieza el día de salida)", () => {
    expect(
      crucesDeTemporada({ ...candidata, desde: "2027-01-09", hasta: "2027-01-20" }, [FIN_DE_ANO]),
    ).toEqual([]);
    expect(
      crucesDeTemporada({ ...candidata, desde: "2027-01-08", hasta: "2027-01-20" }, [FIN_DE_ANO]),
    ).toHaveLength(1);
  });

  it("al editar, la temporada no choca consigo misma", () => {
    expect(crucesDeTemporada({ ...candidata, id: FIN_DE_ANO.id }, [FIN_DE_ANO])).toEqual([]);
  });
});

describe("fechas: «Primera noche» y «Última noche», las dos incluidas", () => {
  it("se guardan como [primera, última + 1)", () => {
    expect(fechasDeTemporada("2026-12-01", "2027-01-08")).toEqual({
      valido: true,
      desde: "2026-12-01",
      hasta: "2027-01-09",
    });
  });

  it("una sola noche es válida", () => {
    expect(fechasDeTemporada("2026-12-31", "2026-12-31")).toEqual({
      valido: true,
      desde: "2026-12-31",
      hasta: "2027-01-01",
    });
  });

  it("rechaza la última antes que la primera, fechas vacías y más de un año", () => {
    expect(fechasDeTemporada("2026-12-08", "2026-12-01").valido).toBe(false);
    expect(fechasDeTemporada("", "2026-12-01").valido).toBe(false);
    expect(fechasDeTemporada("2026-12-01", "2028-12-01").valido).toBe(false);
  });

  it("lee el daterange de Postgres y lo escribe legible", () => {
    const noches = leerNoches("[2026-12-01,2027-01-09)");
    expect(noches).toEqual({ desde: "2026-12-01", hasta: "2027-01-09" });
    expect(leerNoches("(2026-11-30,2027-01-08]")).toEqual(noches);
    expect(leerNoches("basura")).toBeNull();
    expect(rangoLegible(noches!)).toBe("1 dic 2026 – 8 ene 2027");
  });

  it("activa, próxima o pasada según el hoy del hotel", () => {
    expect(estadoDeTemporada(FIN_DE_ANO, "2026-10-05")).toBe("proxima");
    expect(estadoDeTemporada(FIN_DE_ANO, "2026-12-01")).toBe("activa");
    expect(estadoDeTemporada(FIN_DE_ANO, "2027-01-08")).toBe("activa");
    expect(estadoDeTemporada(FIN_DE_ANO, "2027-01-09")).toBe("pasada");
  });
});

describe("textos", () => {
  it("los cuatro precios del hotel son +15 % sobre la base", () => {
    expect(textoDiferencia([350_000], 402_500)).toBe("+15 % sobre la base");
    expect(textoDiferencia([200_000], 230_000)).toBe("+15 % sobre la base");
    expect(textoDiferencia([480_000], 552_000)).toBe("+15 % sobre la base");
    expect(textoDiferencia([680_000], 782_000)).toBe("+15 % sobre la base");
  });

  it("varias bases dan un rango; bajar o igualar también se dice", () => {
    expect(textoDiferencia([350_000, 400_000], 440_000)).toBe(
      "+10 % a +25,7 % frente a la base, según la cabaña",
    );
    expect(textoDiferencia([480_000], 432_000)).toBe("−10 % bajo la base");
    expect(textoDiferencia([480_000], 480_000)).toBe("Igual a la base");
    expect(textoDiferencia([480_000], null)).toBeNull();
  });

  it("la línea de la ficha de la cabaña", () => {
    expect(avisoDeTemporadas([FIN_DE_ANO, FIN_DE_ANO], "2026-10-05")).toBe(
      "Del 1 de diciembre al 8 de enero aplican tarifas de temporada; al reservar ves el precio exacto de cada noche.",
    );
    expect(avisoDeTemporadas([FIN_DE_ANO], "2027-01-09")).toBeNull();
    expect(avisoDeTemporadas([], "2026-10-05")).toBeNull();
  });
});
