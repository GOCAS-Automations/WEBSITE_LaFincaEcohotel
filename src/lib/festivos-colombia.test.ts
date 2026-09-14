import { describe, expect, it } from "vitest";

import {
  diaISO,
  domingoDePascua,
  esFestivo,
  festivosDeColombia,
  nombreDelFestivo,
  tipoDeNoche,
} from "./festivos-colombia";

/**
 * Pruebas del calendario de festivos.
 *
 * Las dos listas de abajo NO salen de ejecutar el código y copiar el
 * resultado: son los calendarios oficiales de 2026 y 2027 tal como los publica
 * el Estado, escritos a mano. Una prueba que compare la función consigo misma
 * pasa siempre y no prueba nada.
 */

/** Festivos de Colombia en 2026 (18). */
const FESTIVOS_2026 = [
  "2026-01-01", // Año Nuevo (jueves)
  "2026-01-12", // Reyes: el 6 cae martes → lunes 12
  "2026-03-23", // San José: el 19 cae jueves → lunes 23
  "2026-04-02", // Jueves Santo
  "2026-04-03", // Viernes Santo
  "2026-05-01", // Día del Trabajo (viernes)
  "2026-05-18", // Ascensión → lunes
  "2026-06-08", // Corpus Christi → lunes
  "2026-06-15", // Sagrado Corazón → lunes
  "2026-06-29", // San Pedro y San Pablo: YA cae lunes, no se mueve
  "2026-07-20", // Independencia (lunes, fijo)
  "2026-08-07", // Batalla de Boyacá (viernes, fijo)
  "2026-08-17", // Asunción: el 15 cae sábado → lunes 17
  "2026-10-12", // Día de la Raza: YA cae lunes
  "2026-11-02", // Todos los Santos: el 1 cae domingo → lunes 2
  "2026-11-16", // Independencia de Cartagena: el 11 cae miércoles → lunes 16
  "2026-12-08", // Inmaculada (martes, fijo)
  "2026-12-25", // Navidad (viernes, fijo)
];

/** Festivos de Colombia en 2027 (18). */
const FESTIVOS_2027 = [
  "2027-01-01",
  "2027-01-11", // Reyes: el 6 cae miércoles → lunes 11
  "2027-03-22", // San José: el 19 cae viernes → lunes 22
  "2027-03-25", // Jueves Santo
  "2027-03-26", // Viernes Santo
  "2027-05-01", // Día del Trabajo (sábado, fijo: NO se traslada)
  "2027-05-10", // Ascensión
  "2027-05-31", // Corpus Christi
  "2027-06-07", // Sagrado Corazón
  "2027-07-05", // San Pedro y San Pablo: el 29 cae martes → lunes 5 de julio
  "2027-07-20",
  "2027-08-07",
  "2027-08-16", // Asunción: el 15 cae domingo → lunes 16
  "2027-10-18", // Día de la Raza: el 12 cae martes → lunes 18
  "2027-11-01", // Todos los Santos: YA cae lunes
  "2027-11-15", // Cartagena: el 11 cae jueves → lunes 15
  "2027-12-08",
  "2027-12-25",
];

describe("domingoDePascua", () => {
  it("acierta los domingos de Pascua conocidos", () => {
    const esperado: Record<number, string> = {
      2024: "2024-03-31",
      2025: "2025-04-20",
      2026: "2026-04-05",
      2027: "2027-03-28",
      2028: "2028-04-16",
      2030: "2030-04-21",
    };
    for (const [anio, fecha] of Object.entries(esperado)) {
      expect(domingoDePascua(Number(anio)).toISOString().slice(0, 10)).toBe(
        fecha,
      );
    }
  });

  it("siempre cae en domingo", () => {
    for (let anio = 2020; anio <= 2060; anio++) {
      expect(domingoDePascua(anio).getUTCDay()).toBe(0);
    }
  });
});

describe("festivosDeColombia", () => {
  it("reproduce el calendario oficial de 2026", () => {
    expect(festivosDeColombia(2026).map((f) => f.fecha)).toEqual(FESTIVOS_2026);
  });

  it("reproduce el calendario oficial de 2027", () => {
    expect(festivosDeColombia(2027).map((f) => f.fecha)).toEqual(FESTIVOS_2027);
  });

  /*
    2025 tuvo 17 festivos, no 18: el Sagrado Corazón y San Pedro y San Pablo
    cayeron los dos en el lunes 30 de junio. Vuelve a pasar en 2030, 2038,
    2041, 2052 y 2057. No es un fallo del cálculo: es el calendario real.
  */
  const ANIOS_DE_17 = new Set([2025, 2030, 2038, 2041, 2052, 2057]);

  it("son 18 festivos, salvo los años en que dos caen el mismo lunes", () => {
    for (let anio = 2020; anio <= 2060; anio++) {
      expect(festivosDeColombia(anio)).toHaveLength(
        ANIOS_DE_17.has(anio) ? 17 : 18,
      );
    }
  });

  it("2025 tuvo 17 festivos y el 30 de junio valía por dos", () => {
    expect(festivosDeColombia(2025)).toHaveLength(17);
    expect(esFestivo("2025-06-30")).toBe(true);
    expect(nombreDelFestivo("2025-06-30")).toBe(
      "Sagrado Corazón de Jesús y San Pedro y San Pablo",
    );
  });

  it("los trasladables terminan SIEMPRE en lunes", () => {
    const trasladables = new Set([
      "Día de los Reyes Magos",
      "Día de San José",
      "Ascensión del Señor",
      "Corpus Christi",
      "Sagrado Corazón de Jesús",
      "San Pedro y San Pablo",
      "Asunción de la Virgen",
      "Día de la Raza",
      "Día de Todos los Santos",
      "Independencia de Cartagena",
    ]);
    for (let anio = 2020; anio <= 2060; anio++) {
      for (const festivo of festivosDeColombia(anio)) {
        /* En los años de coincidencia el nombre viene fusionado con una « y »;
         basta con que empiece por el de un trasladable. */
      if (
        [...trasladables].some((nombre) => festivo.nombre.startsWith(nombre))
      ) {
          expect(diaISO(festivo.fecha)).toBe(1);
        }
      }
    }
  });

  it("los fijos NO se trasladan aunque caigan en fin de semana", () => {
    /* 1 de mayo de 2027 es sábado y sigue siendo el 1 de mayo. */
    expect(esFestivo("2027-05-01")).toBe(true);
    expect(esFestivo("2027-05-03")).toBe(false);
    /* 20 de julio de 2025 fue domingo. */
    expect(esFestivo("2025-07-20")).toBe(true);
    expect(esFestivo("2025-07-21")).toBe(false);
  });

  it("un trasladable que YA cae en lunes se queda donde está", () => {
    /* 29 de junio de 2026 es lunes: no salta al 6 de julio. */
    expect(nombreDelFestivo("2026-06-29")).toBe("San Pedro y San Pablo");
    expect(esFestivo("2026-07-06")).toBe(false);
  });

  it("Jueves y Viernes Santo no se trasladan", () => {
    expect(nombreDelFestivo("2026-04-02")).toBe("Jueves Santo");
    expect(nombreDelFestivo("2026-04-03")).toBe("Viernes Santo");
    /* El Lunes de Pascua NO es festivo en Colombia. */
    expect(esFestivo("2026-04-06")).toBe(false);
  });

  it("no repite ninguna fecha", () => {
    for (let anio = 2020; anio <= 2060; anio++) {
      const fechas = festivosDeColombia(anio).map((f) => f.fecha);
      expect(new Set(fechas).size).toBe(fechas.length);
    }
  });
});

describe("diaISO", () => {
  it("numera de lunes (1) a domingo (7)", () => {
    expect(diaISO("2026-09-14")).toBe(1); // lunes
    expect(diaISO("2026-09-18")).toBe(5); // viernes
    expect(diaISO("2026-09-19")).toBe(6); // sábado
    expect(diaISO("2026-09-20")).toBe(7); // domingo
  });
});

describe("tipoDeNoche", () => {
  it("de lunes a jueves es noche de entre semana", () => {
    expect(tipoDeNoche("2026-09-14")).toBe("entre-semana"); // lunes
    expect(tipoDeNoche("2026-09-15")).toBe("entre-semana");
    expect(tipoDeNoche("2026-09-16")).toBe("entre-semana");
    expect(tipoDeNoche("2026-09-17")).toBe("entre-semana"); // jueves
  });

  it("de viernes a domingo es noche de fin de semana", () => {
    expect(tipoDeNoche("2026-09-18")).toBe("fin-de-semana"); // viernes
    expect(tipoDeNoche("2026-09-19")).toBe("fin-de-semana");
    expect(tipoDeNoche("2026-09-20")).toBe("fin-de-semana"); // domingo
  });

  it("un lunes FESTIVO cuenta como fin de semana", () => {
    /* 12 de octubre de 2026: Día de la Raza, y cae lunes. */
    expect(diaISO("2026-10-12")).toBe(1);
    expect(tipoDeNoche("2026-10-12")).toBe("fin-de-semana");
    /* El lunes siguiente ya es un lunes cualquiera. */
    expect(tipoDeNoche("2026-10-19")).toBe("entre-semana");
  });

  it("un jueves festivo también cuenta como fin de semana", () => {
    /* Jueves Santo de 2026. */
    expect(diaISO("2026-04-02")).toBe(4);
    expect(tipoDeNoche("2026-04-02")).toBe("fin-de-semana");
  });

  it("la VÍSPERA de un festivo entre semana NO cuenta, por ahora", () => {
    /*
      Domingo 11 de octubre de 2026, víspera del lunes festivo: ya es fin de
      semana por ser domingo, así que no sirve de caso. El caso real es el
      miércoles 1 de abril de 2026, víspera del Jueves Santo.
      Está pendiente de confirmación del cliente (ver
      `VISPERA_CUENTA_COMO_FIN_DE_SEMANA`), y hasta entonces es entre semana.
    */
    expect(tipoDeNoche("2026-04-01")).toBe("entre-semana");
  });
});
