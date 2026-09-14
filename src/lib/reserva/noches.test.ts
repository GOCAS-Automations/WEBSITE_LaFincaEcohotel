import { describe, expect, it } from "vitest";

import {
  CONTAR_VISPERA,
  contarPorTipo,
  diaDeLaSemana,
  esFechaISO,
  esMixta,
  esVisperaDeFestivo,
  etiquetaTipoNoche,
  nochesDe,
  resumenEnPalabras,
  sumarDias,
  tieneFinDeSemana,
  tipoDeNoche,
  tiposPresentes,
  validarRango,
} from "./noches";

/**
 * Pruebas del troceado en noches.
 *
 * Las fechas de referencia están escritas a mano con su día de la semana
 * anotado al lado: una prueba que llame a la función para saber qué día es
 * el 2026-09-17 se estaría comparando consigo misma.
 *
 * Semana de referencia de septiembre de 2026 (sin ningún festivo cerca):
 *   lun 14 · mar 15 · mié 16 · jue 17 · vie 18 · sáb 19 · dom 20 · lun 21
 */

describe("aritmética de fechas", () => {
  it("suma y resta días cruzando fin de mes y fin de año", () => {
    expect(sumarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
    /* 2028 es bisiesto. */
    expect(sumarDias("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("cuenta el día de la semana en ISO (1 = lunes, 7 = domingo)", () => {
    expect(diaDeLaSemana("2026-09-14")).toBe(1); // lunes
    expect(diaDeLaSemana("2026-09-17")).toBe(4); // jueves
    expect(diaDeLaSemana("2026-09-18")).toBe(5); // viernes
    expect(diaDeLaSemana("2026-09-20")).toBe(7); // domingo
  });

  it("rechaza fechas con formato correcto que no existen", () => {
    expect(esFechaISO("2026-09-14")).toBe(true);
    expect(esFechaISO("2026-02-31")).toBe(false);
    expect(esFechaISO("2026-13-01")).toBe(false);
    expect(esFechaISO("14/09/2026")).toBe(false);
    expect(esFechaISO(null)).toBe(false);
    expect(esFechaISO(20260914)).toBe(false);
  });
});

describe("tipoDeNoche", () => {
  it("de lunes a jueves es noche entre semana", () => {
    expect(tipoDeNoche("2026-09-14")).toBe("entre_semana"); // lunes
    expect(tipoDeNoche("2026-09-15")).toBe("entre_semana"); // martes
    expect(tipoDeNoche("2026-09-16")).toBe("entre_semana"); // miércoles
    expect(tipoDeNoche("2026-09-17")).toBe("entre_semana"); // jueves
  });

  it("de viernes a domingo es noche de fin de semana", () => {
    expect(tipoDeNoche("2026-09-18")).toBe("fin_de_semana"); // viernes
    expect(tipoDeNoche("2026-09-19")).toBe("fin_de_semana"); // sábado
    expect(tipoDeNoche("2026-09-20")).toBe("fin_de_semana"); // domingo
  });

  it("un festivo entre semana cuenta como fin de semana", () => {
    /* Reyes de 2026: el 6 cae martes, así que se traslada al lunes 12. */
    expect(diaDeLaSemana("2026-01-12")).toBe(1);
    expect(tipoDeNoche("2026-01-12")).toBe("fin_de_semana");
    /* Jueves Santo de 2026, que no se traslada. */
    expect(diaDeLaSemana("2026-04-02")).toBe(4);
    expect(tipoDeNoche("2026-04-02")).toBe("fin_de_semana");
  });

  it("el lunes siguiente a un festivo vuelve a ser entre semana", () => {
    expect(tipoDeNoche("2026-01-13")).toBe("entre_semana"); // martes 13
  });
});

describe("la víspera de un festivo", () => {
  it("detecta la víspera de un festivo que cae entre semana", () => {
    /* Domingo 11 de enero de 2026, víspera del lunes 12 (Reyes trasladado):
       ya es fin de semana por sí solo, así que no es el caso interesante. */
    expect(esVisperaDeFestivo("2026-01-11")).toBe(true);
    /* Miércoles 1 de abril de 2026, víspera del Jueves Santo (2 de abril). */
    expect(diaDeLaSemana("2026-04-01")).toBe(3);
    expect(esVisperaDeFestivo("2026-04-01")).toBe(true);
    /* Un miércoles cualquiera no lo es. */
    expect(esVisperaDeFestivo("2026-09-16")).toBe(false);
  });

  it("no es víspera si el festivo cae en fin de semana", () => {
    /* Viernes Santo de 2026 (3 de abril) es viernes: el jueves 2 —que además
       es festivo— no se marca como víspera, porque el siguiente es viernes. */
    expect(esVisperaDeFestivo("2026-04-02")).toBe(false);
  });

  it("mientras CONTAR_VISPERA esté apagada, la víspera se cobra entre semana", () => {
    /* `TODO` del cliente: cuando Amapola confirme, se enciende la constante.
       Esta prueba deja escrito el comportamiento en los dos mundos, así que
       cambiar la constante no rompe la suite sin explicar por qué. */
    const vispera = "2026-04-01"; // miércoles, víspera de Jueves Santo
    expect(tipoDeNoche(vispera)).toBe(
      CONTAR_VISPERA ? "fin_de_semana" : "entre_semana",
    );
  });
});

describe("nochesDe", () => {
  it("el rango es semiabierto: no se duerme la noche de la salida", () => {
    const noches = nochesDe("2026-09-17", "2026-09-19"); // jue → sáb
    expect(noches.map((n) => n.fecha)).toEqual(["2026-09-17", "2026-09-18"]);
  });

  it("jueves → sábado da 1 noche entre semana y 1 de fin de semana", () => {
    const noches = nochesDe("2026-09-17", "2026-09-19");
    expect(noches.map((n) => n.tipo)).toEqual(["entre_semana", "fin_de_semana"]);
  });

  it("el ejemplo del encargo: jueves → domingo son 3 noches, 1 + 2", () => {
    const noches = nochesDe("2026-09-17", "2026-09-20"); // jue → dom
    expect(noches).toHaveLength(3);
    expect(noches.map((n) => n.tipo)).toEqual([
      "entre_semana", // jueves 17
      "fin_de_semana", // viernes 18
      "fin_de_semana", // sábado 19
    ]);
    expect(contarPorTipo(noches)).toEqual({
      entre_semana: 1,
      fin_de_semana: 2,
    });
    expect(esMixta(noches)).toBe(true);
  });

  it("una sola noche funciona", () => {
    const noches = nochesDe("2026-09-18", "2026-09-19");
    expect(noches).toHaveLength(1);
    expect(noches[0].tipo).toBe("fin_de_semana");
  });

  it("anota el nombre del festivo de cada noche", () => {
    const noches = nochesDe("2026-01-12", "2026-01-13");
    expect(noches[0].festivo).toBe("Día de los Reyes Magos");
    expect(nochesDe("2026-09-14", "2026-09-15")[0].festivo).toBeNull();
  });

  it("devuelve una lista vacía con rangos imposibles, sin lanzar", () => {
    expect(nochesDe("2026-09-19", "2026-09-17")).toEqual([]);
    expect(nochesDe("2026-09-19", "2026-09-19")).toEqual([]);
    expect(nochesDe("no-es-fecha", "2026-09-19")).toEqual([]);
  });

  it("una estadía larga no desborda el tope de seguridad", () => {
    expect(nochesDe("2026-01-01", "2030-01-01")).toHaveLength(366);
  });
});

describe("resúmenes", () => {
  it("tiposPresentes devuelve siempre entre semana primero", () => {
    expect(tiposPresentes(nochesDe("2026-09-17", "2026-09-20"))).toEqual([
      "entre_semana",
      "fin_de_semana",
    ]);
    expect(tiposPresentes(nochesDe("2026-09-14", "2026-09-16"))).toEqual([
      "entre_semana",
    ]);
    expect(tiposPresentes(nochesDe("2026-09-18", "2026-09-20"))).toEqual([
      "fin_de_semana",
    ]);
    expect(tiposPresentes([])).toEqual([]);
  });

  it("tieneFinDeSemana solo es cierto si hay alguna", () => {
    expect(tieneFinDeSemana(nochesDe("2026-09-17", "2026-09-19"))).toBe(true);
    expect(tieneFinDeSemana(nochesDe("2026-09-14", "2026-09-17"))).toBe(false);
  });

  it("escribe el resumen en español con singular y plural", () => {
    expect(resumenEnPalabras(nochesDe("2026-09-17", "2026-09-20"))).toBe(
      "1 noche entre semana y 2 noches de fin de semana o festivo",
    );
    expect(resumenEnPalabras(nochesDe("2026-09-14", "2026-09-16"))).toBe(
      "2 noches entre semana",
    );
  });

  it("etiquetaTipoNoche concuerda en número", () => {
    expect(etiquetaTipoNoche("entre_semana")).toBe("noche entre semana");
    expect(etiquetaTipoNoche("fin_de_semana", true)).toBe(
      "noches de fin de semana o festivo",
    );
  });
});

describe("validarRango", () => {
  it("acepta un rango correcto y devuelve las noches", () => {
    const resultado = validarRango("2026-09-17", "2026-09-19");
    expect(resultado.valido).toBe(true);
    if (resultado.valido) expect(resultado.noches).toHaveLength(2);
  });

  it("rechaza una salida anterior o igual a la llegada, en español", () => {
    const resultado = validarRango("2026-09-19", "2026-09-17");
    expect(resultado.valido).toBe(false);
    if (!resultado.valido) {
      expect(resultado.motivo).toContain("posterior a la de llegada");
    }
  });

  it("rechaza fechas que faltan o no existen", () => {
    expect(validarRango(null, "2026-09-19").valido).toBe(false);
    expect(validarRango("2026-02-31", "2026-03-02").valido).toBe(false);
  });

  it("NINGUNA combinación de fechas se rechaza por culpa de un plan", () => {
    /* Es el bug que esta reescritura corrige: la versión anterior rechazaba
       las estadías mixtas y, con ellas, dejaba el plan congelado. */
    const mixta = validarRango("2026-09-17", "2026-09-20"); // jue → dom
    expect(mixta.valido).toBe(true);
  });
});
