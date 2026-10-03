import { describe, expect, it } from "vitest";

import { parsearCalendarios } from "./calendarios-config";

/**
 * Pruebas del parseo de `GOOGLE_CALENDAR_ID`.
 *
 * Esta variable la escribe una persona a mano en el panel de Vercel, y un error
 * suyo no puede dejar el sitio vendiendo noches ocupadas ni, al contrario,
 * apagarle la disponibilidad entera. Así que lo que se prueba aquí es sobre todo
 * **cómo se degrada**: un mapeo que no se entiende tiene que volverse calendario
 * general (que bloquea más) y dejar aviso, nunca desaparecer en silencio.
 */

const GENERAL = "general@group.calendar.google.com";
const CAB1 = "cab1@group.calendar.google.com";
const CAB2 = "cab2@group.calendar.google.com";

describe("parsearCalendarios · compatibilidad con un solo calendario", () => {
  it("un identificador suelto sigue siendo un calendario general", () => {
    const config = parsearCalendarios(GENERAL);
    expect(config.calendarios).toEqual([{ id: GENERAL, cabana: null }]);
    expect(config.escribirEn).toBe(GENERAL);
    expect(config.escrituraForzada).toBe(false);
    expect(config.avisos).toEqual([]);
  });

  it("sin variable no hay calendarios ni avisos", () => {
    for (const vacio of [undefined, null, "", "   ", ",,  ,"]) {
      const config = parsearCalendarios(vacio);
      expect(config.calendarios).toEqual([]);
      expect(config.escribirEn).toBeNull();
      expect(config.avisos).toEqual([]);
    }
  });
});

describe("parsearCalendarios · lista y mapeo a cabaña", () => {
  it("lee varios calendarios separados por coma", () => {
    const config = parsearCalendarios(`${GENERAL}, ${CAB1}=1, ${CAB2}=2`);
    expect(config.calendarios).toEqual([
      { id: GENERAL, cabana: null },
      { id: CAB1, cabana: 1 },
      { id: CAB2, cabana: 2 },
    ]);
    expect(config.avisos).toEqual([]);
  });

  it("tolera espacios, saltos de línea y punto y coma", () => {
    const config = parsearCalendarios(
      `  ${GENERAL}\n  ${CAB1} = 1 ;\n\t${CAB2}=2,  `,
    );
    expect(config.calendarios.map((c) => c.id)).toEqual([GENERAL, CAB1, CAB2]);
    expect(config.calendarios.map((c) => c.cabana)).toEqual([null, 1, 2]);
  });

  it("entiende el mapeo escrito con palabras", () => {
    const config = parsearCalendarios(
      `a@x=cabaña 1, b@x=cabana-02, c@x=Cab. 3, d@x=cabana04, e@x=05`,
    );
    expect(config.calendarios.map((c) => c.cabana)).toEqual([1, 2, 3, 4, 5]);
    /* Ningún mapeo quedó sin entender. (Sí hay un aviso, pero es otro: aquí no
       hay calendario general, así que las reservas del panel irían al de la
       Cabaña 1 y eso se avisa aparte.) */
    expect(config.avisos.filter((aviso) => aviso.includes("No se entendió"))).toEqual([]);
  });
});

describe("parsearCalendarios · lo que está mal escrito no rompe nada", () => {
  it("un número fuera de rango se lee como calendario general, con aviso", () => {
    const config = parsearCalendarios(`${GENERAL}, ${CAB1}=9`);
    expect(config.calendarios).toEqual([
      { id: GENERAL, cabana: null },
      { id: CAB1, cabana: null },
    ]);
    expect(config.avisos).toHaveLength(1);
    expect(config.avisos[0]).toContain(CAB1);
    expect(config.avisos[0]).toContain("del 1 al 5");
  });

  it("un mapeo que no es una cabaña se lee como general, con aviso", () => {
    const config = parsearCalendarios(`${CAB1}=cocina`);
    expect(config.calendarios).toEqual([{ id: CAB1, cabana: null }]);
    expect(config.avisos).toHaveLength(1);
    expect(config.avisos[0]).toContain("cocina");
  });

  it("un identificador repetido se queda con el primero y avisa", () => {
    const config = parsearCalendarios(`${CAB1}=1, ${CAB1}=2, ${CAB1.toUpperCase()}=3`);
    expect(config.calendarios).toEqual([{ id: CAB1, cabana: 1 }]);
    /* Dos avisos de repetido: el segundo y el tercero (mayúsculas incluidas). */
    expect(config.avisos.filter((aviso) => aviso.includes("repetido"))).toHaveLength(2);
  });

  it("un trozo sin identificador se ignora sin ruido", () => {
    const config = parsearCalendarios(`${GENERAL}, =3`);
    expect(config.calendarios).toEqual([{ id: GENERAL, cabana: null }]);
    expect(config.avisos).toEqual([]);
  });
});

describe("parsearCalendarios · dónde se escribe", () => {
  it("por defecto se escribe en el primero de la lista", () => {
    const config = parsearCalendarios(`${GENERAL}, ${CAB1}=1`);
    expect(config.escribirEn).toBe(GENERAL);
    expect(config.escrituraForzada).toBe(false);
    expect(config.escrituraFueraDeLista).toBe(false);
  });

  it("GOOGLE_CALENDAR_ESCRIBIR_EN manda si está en la lista", () => {
    const config = parsearCalendarios(`${GENERAL}, ${CAB1}=1`, CAB1);
    expect(config.escribirEn).toBe(CAB1);
    expect(config.escrituraForzada).toBe(true);
    expect(config.escrituraFueraDeLista).toBe(false);
    /* Escribir en el calendario de una cabaña es legítimo, pero hay que decirlo:
       todas las reservas acabarían ahí. */
    expect(config.avisos.join(" ")).toContain("Cabaña 1");
  });

  it("si no está en la lista se usa igual, pero avisando", () => {
    const fuera = "otro@group.calendar.google.com";
    const config = parsearCalendarios(GENERAL, fuera);
    expect(config.escribirEn).toBe(fuera);
    expect(config.escrituraFueraDeLista).toBe(true);
    expect(config.avisos.join(" ")).toContain(fuera);
  });

  it("si trae un «=número» de más se usa solo el identificador", () => {
    const config = parsearCalendarios(`${GENERAL}, ${CAB1}=1`, `${CAB1}=1`);
    expect(config.escribirEn).toBe(CAB1);
    expect(config.avisos.join(" ")).toContain("un solo identificador");
  });

  it("sin calendarios no hay dónde escribir", () => {
    expect(parsearCalendarios("").escribirEn).toBeNull();
  });
});
