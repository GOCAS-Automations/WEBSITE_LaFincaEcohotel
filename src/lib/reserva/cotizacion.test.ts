import { describe, expect, it } from "vitest";

import {
  cabanaCubre,
  cabanasElegibles,
  categoriaDePlan,
  cotizar,
  desgloseEnTexto,
  elegibilidadDeCabana,
  planCubre,
  planDeEntreSemana,
  planesDeFinDeSemana,
  type CabanaCotizable,
  type PlanCotizable,
} from "./cotizacion";
import { nochesDe } from "./noches";

/**
 * Pruebas del motor de precios.
 *
 * El catálogo de abajo es el REAL de La Finca (§2 y §3 de
 * `docs/DATOS_CLIENTE.md`): cinco cabañas, tres planes de hospedaje más el Día
 * de Calma, y la Cabaña 02 con solo el plan Estándar. Se escribe aquí a mano
 * para que las pruebas no dependan de la base de datos ni del seed.
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
const DIA_DE_CALMA: PlanCotizable = {
  nombre: "Día de Calma",
  tipo: "dia",
  dias_aplica: null,
};

const PLANES = [ENTRE_SEMANA, ESTANDAR, PREMIUM, DIA_DE_CALMA];

/** Precios reales, en enteros COP. */
const P_ENTRE_SEMANA = 350_000;
const P_ENTRE_SEMANA_1 = 200_000;
const P_ESTANDAR = 480_000;
const P_PREMIUM = 680_000;

/** Cabaña 01: los tres planes de hospedaje. */
const CABANA_01: CabanaCotizable = {
  slug: "cabana-01",
  nombre: "Cabaña 01",
  tarifas: [
    {
      plan: ENTRE_SEMANA,
      precio_noche: P_ENTRE_SEMANA,
      precio_noche_1_persona: P_ENTRE_SEMANA_1,
    },
    { plan: ESTANDAR, precio_noche: P_ESTANDAR, precio_noche_1_persona: null },
    { plan: PREMIUM, precio_noche: P_PREMIUM, precio_noche_1_persona: null },
  ],
};

/** Cabaña 02: SOLO Estándar. Es la excepción que manda el cliente. */
const CABANA_02: CabanaCotizable = {
  slug: "cabana-02",
  nombre: "Cabaña 02",
  tarifas: [
    { plan: ESTANDAR, precio_noche: P_ESTANDAR, precio_noche_1_persona: null },
  ],
};

const CATALOGO = [CABANA_01, CABANA_02];

const moneda = (valor: number) => `$${valor.toLocaleString("es-CO")}`;

describe("categoría de un plan", () => {
  it("sale de dias_aplica y de tipo, nunca del nombre", () => {
    expect(categoriaDePlan(ENTRE_SEMANA)).toBe("entre_semana");
    expect(categoriaDePlan(ESTANDAR)).toBe("fin_de_semana");
    expect(categoriaDePlan(PREMIUM)).toBe("fin_de_semana");
    expect(categoriaDePlan(DIA_DE_CALMA)).toBe("dia");
  });

  it("sigue funcionando si el hotel renombra el plan desde el panel", () => {
    const renombrado = { ...ESTANDAR, nombre: "Fin de Semana Clásico" };
    expect(categoriaDePlan(renombrado)).toBe("fin_de_semana");
  });

  it("un plan sin días declarados sirve para los dos tipos", () => {
    const abierto: PlanCotizable = { nombre: "Especial", tipo: "hospedaje" };
    expect(categoriaDePlan(abierto)).toBe("cualquiera");
    expect(planCubre(abierto, "entre_semana")).toBe(true);
    expect(planCubre(abierto, "fin_de_semana")).toBe(true);
  });

  it("separa los planes de fin de semana del de entre semana", () => {
    expect(planesDeFinDeSemana(PLANES).map((p) => p.nombre)).toEqual([
      "Estándar",
      "Premium",
    ]);
    expect(planDeEntreSemana(PLANES)?.nombre).toBe("Entre Semana");
  });
});

describe("elegibilidad de cabañas", () => {
  it("la Cabaña 02 no se ofrece para noches entre semana", () => {
    expect(cabanaCubre(CABANA_02, "entre_semana")).toBe(false);
    expect(cabanaCubre(CABANA_02, "fin_de_semana")).toBe(true);

    const entreSemana = nochesDe("2026-09-14", "2026-09-16"); // lun → mié
    const resultado = elegibilidadDeCabana(CABANA_02, entreSemana);
    expect(resultado.elegible).toBe(false);
    if (!resultado.elegible) {
      expect(resultado.faltan).toEqual(["entre_semana"]);
      expect(resultado.motivo).toContain("noches entre semana");
    }
  });

  it("tampoco se ofrece para una estadía MIXTA", () => {
    const mixta = nochesDe("2026-09-17", "2026-09-20"); // jue → dom
    expect(elegibilidadDeCabana(CABANA_02, mixta).elegible).toBe(false);
    expect(cabanasElegibles(CATALOGO, mixta).map((c) => c.slug)).toEqual([
      "cabana-01",
    ]);
  });

  it("sí se ofrece para un fin de semana completo", () => {
    const finDeSemana = nochesDe("2026-09-18", "2026-09-20"); // vie → dom
    expect(elegibilidadDeCabana(CABANA_02, finDeSemana).elegible).toBe(true);
    expect(cabanasElegibles(CATALOGO, finDeSemana).map((c) => c.slug)).toEqual([
      "cabana-01",
      "cabana-02",
    ]);
  });

  it("sin fechas todavía, todas las cabañas siguen en pie", () => {
    expect(cabanasElegibles(CATALOGO, [])).toHaveLength(2);
  });
});

describe("cotizar", () => {
  it("EL EJEMPLO DEL ENCARGO: jueves → sábado = 1 Entre Semana + 1 Estándar", () => {
    const noches = nochesDe("2026-09-17", "2026-09-19");
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Estándar",
      adultos: 2,
    });

    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;

    expect(cotizacion.lineas).toEqual([
      {
        fecha: "2026-09-17",
        tipo: "entre_semana",
        festivo: null,
        plan: "Entre Semana",
        precio: P_ENTRE_SEMANA,
        tarifaUnaPersona: false,
        temporada: null,
      },
      {
        fecha: "2026-09-18",
        tipo: "fin_de_semana",
        festivo: null,
        plan: "Estándar",
        precio: P_ESTANDAR,
        tarifaUnaPersona: false,
        temporada: null,
      },
    ]);
    expect(cotizacion.total).toBe(P_ENTRE_SEMANA + P_ESTANDAR); // 830.000
    expect(cotizacion.planes).toEqual(["Entre Semana", "Estándar"]);
  });

  it("jueves → domingo: 1 noche Entre Semana + 2 de fin de semana", () => {
    const noches = nochesDe("2026-09-17", "2026-09-20");

    const conEstandar = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Estándar",
      adultos: 2,
    });
    expect(conEstandar.posible && conEstandar.total).toBe(
      P_ENTRE_SEMANA + P_ESTANDAR * 2, // 1.310.000
    );

    const conPremium = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Premium",
      adultos: 2,
    });
    expect(conPremium.posible && conPremium.total).toBe(
      P_ENTRE_SEMANA + P_PREMIUM * 2, // 1.710.000
    );

    /* Cambiar de plan de fin de semana NO toca la noche entre semana. */
    if (conEstandar.posible && conPremium.posible) {
      expect(conEstandar.lineas[0]).toEqual(conPremium.lineas[0]);
      expect(conEstandar.lineas[1].plan).toBe("Estándar");
      expect(conPremium.lineas[1].plan).toBe("Premium");
    }
  });

  it("una sola persona paga la tarifa de una persona en las noches entre semana", () => {
    const noches = nochesDe("2026-09-14", "2026-09-16"); // lun → mié
    const cotizacion = cotizar({ noches, cabana: CABANA_01, adultos: 1 });

    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;
    expect(cotizacion.lineas.every((l) => l.tarifaUnaPersona)).toBe(true);
    expect(cotizacion.total).toBe(P_ENTRE_SEMANA_1 * 2); // 400.000
  });

  it("una sola persona en fin de semana paga la tarifa normal (no hay otra publicada)", () => {
    const noches = nochesDe("2026-09-18", "2026-09-20");
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Estándar",
      adultos: 1,
    });
    expect(cotizacion.posible && cotizacion.total).toBe(P_ESTANDAR * 2);
  });

  it("un festivo entre semana se cobra como fin de semana", () => {
    /* Lunes 12 de enero de 2026: Reyes trasladado. */
    const noches = nochesDe("2026-01-12", "2026-01-13");
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Premium",
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;
    expect(cotizacion.lineas[0].plan).toBe("Premium");
    expect(cotizacion.lineas[0].festivo).toBe("Día de los Reyes Magos");
    expect(cotizacion.total).toBe(P_PREMIUM);
  });

  it("la Cabaña 02 no puede cotizar noches entre semana, y lo dice", () => {
    const noches = nochesDe("2026-09-15", "2026-09-16"); // martes
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_02,
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(false);
    if (!cotizacion.posible) {
      expect(cotizacion.motivo).toContain("Cabaña 02");
      expect(cotizacion.motivo).toContain("noches entre semana");
    }
  });

  it("pedir Premium en la Cabaña 02 explica que no lo tiene", () => {
    const noches = nochesDe("2026-09-18", "2026-09-19");
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_02,
      planFinDeSemana: "Premium",
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(false);
    if (!cotizacion.posible) {
      expect(cotizacion.motivo).toContain("Premium");
    }
  });

  it("sin plan de fin de semana elegido cotiza con el primero disponible", () => {
    const noches = nochesDe("2026-09-18", "2026-09-19");
    const cotizacion = cotizar({ noches, cabana: CABANA_01, adultos: 2 });
    expect(cotizacion.posible && cotizacion.total).toBe(P_ESTANDAR);
  });

  it("sin fechas no inventa un total", () => {
    const cotizacion = cotizar({ noches: [], cabana: CABANA_01, adultos: 2 });
    expect(cotizacion.posible).toBe(false);
  });

  it("los precios son enteros COP, nunca decimales", () => {
    const noches = nochesDe("2026-09-17", "2026-09-20");
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Premium",
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;
    for (const linea of cotizacion.lineas) {
      expect(Number.isInteger(linea.precio)).toBe(true);
    }
    expect(Number.isInteger(cotizacion.total)).toBe(true);
  });
});

describe("desgloseEnTexto", () => {
  it("escribe una línea por noche y el total al final", () => {
    const noches = nochesDe("2026-09-17", "2026-09-19");
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Estándar",
      adultos: 2,
    });
    expect(cotizacion.posible).toBe(true);
    if (!cotizacion.posible) return;

    const texto = desgloseEnTexto(cotizacion, moneda, (fecha) => fecha);
    expect(texto).toEqual([
      "• 2026-09-17 — Entre Semana: $350.000",
      "• 2026-09-18 — Estándar: $480.000",
      "Total: $830.000",
    ]);
  });

  it("nombra el festivo en la línea de esa noche", () => {
    const noches = nochesDe("2026-01-12", "2026-01-13");
    const cotizacion = cotizar({
      noches,
      cabana: CABANA_01,
      planFinDeSemana: "Estándar",
      adultos: 2,
    });
    if (!cotizacion.posible) throw new Error("debería poder cotizar");
    const texto = desgloseEnTexto(cotizacion, moneda, (fecha) => fecha);
    expect(texto[0]).toContain("Día de los Reyes Magos");
  });
});
