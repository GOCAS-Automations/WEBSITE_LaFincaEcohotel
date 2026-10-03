import { describe, expect, it } from "vitest";

import { parsearCalendarios } from "./calendarios-config";
import {
  accesoEnEspanol,
  armarDiagnostico,
  calendariosAComprobar,
  type ComprobacionDeCalendario,
} from "./diagnostico-calendarios";

/**
 * Pruebas del diagnóstico del calendario.
 *
 * La primera y la más importante es la de la regresión que motivó este módulo:
 * **un calendario que se lee bien tiene que salir como accesible aunque no
 * aparezca en la lista de suscripciones de la cuenta de servicio.** Esa lista
 * (`calendarList`) está vacía con los siete calendarios del hotel compartidos y
 * funcionando, porque compartir concede la ACL y no una suscripción. Mientras el
 * diagnóstico dependió de ella, el panel decía «no veo ningún calendario» con
 * todo correcto, y eso manda al equipo del hotel a buscar un problema que no
 * existe.
 *
 * La segunda es el aviso grave: el hotel comparte un solo calendario con permiso
 * de escritura, y si ese permiso se cae, las reservas del panel no se apuntan en
 * ningún sitio sin que nadie se entere.
 */

const ESCRITURA = "escritura@group.calendar.google.com";
const GENERAL = "general@group.calendar.google.com";
const CAB1 = "cab1@group.calendar.google.com";

const PUEDE_ESCRIBIR: ComprobacionDeCalendario = {
  ok: true,
  nombre: "Reservas - Sitio Web",
  acceso: "writer",
  puedeEscribir: true,
};
const SOLO_LECTURA: ComprobacionDeCalendario = {
  ok: true,
  nombre: "Reservas del hotel",
  acceso: "reader",
  puedeEscribir: false,
};

/** El diagnóstico con lo mínimo puesto, para no repetirlo en cada prueba. */
function diagnosticar({
  ids,
  escribirEn,
  comprobaciones = {},
  suscritos = [],
  credencial = true,
}: {
  ids: string;
  escribirEn?: string;
  comprobaciones?: Record<string, ComprobacionDeCalendario>;
  suscritos?: { id: string; nombre: string; acceso: string }[] | null;
  credencial?: boolean;
}) {
  return armarDiagnostico({
    credencial,
    correoCuenta: "cuenta@proyecto.iam.gserviceaccount.com",
    config: parsearCalendarios(ids, escribirEn),
    comprobaciones,
    suscritos,
    errorSuscritos: null,
  });
}

describe("armarDiagnostico · la lectura manda, no las suscripciones", () => {
  it("un calendario que responde está accesible aunque no esté suscrito", () => {
    const diagnostico = diagnosticar({
      ids: `${ESCRITURA}, ${CAB1}=1`,
      escribirEn: ESCRITURA,
      comprobaciones: {
        [ESCRITURA]: PUEDE_ESCRIBIR,
        [CAB1]: SOLO_LECTURA,
      },
      /* Lo que de verdad devuelve Google para una cuenta de servicio con
         calendarios compartidos: nada. */
      suscritos: [],
    });

    expect(diagnostico.responden).toBe(2);
    expect(diagnostico.configurados.map((calendario) => calendario.responde)).toEqual([
      true,
      true,
    ]);
    expect(diagnostico.configurados[0].nombre).toBe("Reservas - Sitio Web");
    expect(diagnostico.configurados[1].acceso).toBe("reader");
    expect(diagnostico.avisos).toEqual([]);
    expect(diagnostico.suscritosSinConfigurar).toEqual([]);
  });

  it("no poder preguntar por las suscripciones no ensucia el diagnóstico", () => {
    const diagnostico = armarDiagnostico({
      credencial: true,
      correoCuenta: null,
      config: parsearCalendarios(ESCRITURA),
      comprobaciones: { [ESCRITURA]: PUEDE_ESCRIBIR },
      suscritos: null,
      errorSuscritos: "Google no contestó.",
    });

    expect(diagnostico.responden).toBe(1);
    expect(diagnostico.suscritosSinConfigurar).toBeNull();
    expect(diagnostico.errorSuscritos).toBe("Google no contestó.");
    expect(diagnostico.avisos).toEqual([]);
  });

  it("los identificadores se comparan sin distinguir mayúsculas", () => {
    const diagnostico = diagnosticar({
      ids: "Mixto@Group.Calendar.Google.com",
      comprobaciones: { "mixto@group.calendar.google.com": PUEDE_ESCRIBIR },
    });

    expect(diagnostico.configurados[0].responde).toBe(true);
    expect(diagnostico.configurados[0].deEscritura).toBe(true);
  });
});

describe("armarDiagnostico · un calendario que no responde", () => {
  it("sale con su error y deja aviso, sin tocar a los demás", () => {
    const diagnostico = diagnosticar({
      ids: `${ESCRITURA}, ${CAB1}=1`,
      escribirEn: ESCRITURA,
      comprobaciones: {
        [ESCRITURA]: PUEDE_ESCRIBIR,
        [CAB1]: { ok: false, mensaje: "No existe ese calendario." },
      },
    });

    expect(diagnostico.responden).toBe(1);
    expect(diagnostico.configurados[1].responde).toBe(false);
    expect(diagnostico.configurados[1].error).toBe("No existe ese calendario.");
    expect(diagnostico.configurados[1].acceso).toBeNull();
    expect(diagnostico.avisos).toHaveLength(1);
    expect(diagnostico.avisos[0]).toContain(CAB1);
    expect(diagnostico.avisos[0]).toContain("No existe ese calendario.");
  });

  it("sin credencial no se afirma que falle: no se llegó a preguntar", () => {
    const diagnostico = diagnosticar({
      ids: ESCRITURA,
      comprobaciones: {},
      credencial: false,
    });

    expect(diagnostico.configurado).toBe(false);
    expect(diagnostico.responden).toBe(0);
    expect(diagnostico.configurados[0].responde).toBe(false);
    expect(diagnostico.configurados[0].error).toBeNull();
    expect(diagnostico.escrituraSinPermiso).toBe(false);
    expect(diagnostico.avisos).toEqual([]);
  });
});

describe("armarDiagnostico · el permiso de escritura", () => {
  it("con «writer» no hay nada que avisar", () => {
    const diagnostico = diagnosticar({
      ids: `${ESCRITURA}, ${GENERAL}`,
      escribirEn: ESCRITURA,
      comprobaciones: { [ESCRITURA]: PUEDE_ESCRIBIR, [GENERAL]: SOLO_LECTURA },
    });

    expect(diagnostico.escritura?.id).toBe(ESCRITURA);
    expect(diagnostico.escritura?.puedeEscribir).toBe(true);
    expect(diagnostico.escrituraSinPermiso).toBe(false);
    expect(diagnostico.avisos).toEqual([]);
  });

  it("con «reader» en el calendario de escritura, aviso grave", () => {
    const diagnostico = diagnosticar({
      ids: `${GENERAL}, ${CAB1}=1`,
      escribirEn: GENERAL,
      comprobaciones: { [GENERAL]: SOLO_LECTURA, [CAB1]: SOLO_LECTURA },
    });

    expect(diagnostico.escrituraSinPermiso).toBe(true);
    expect(diagnostico.avisos).toHaveLength(1);
    expect(diagnostico.avisos[0]).toContain("Reservas del hotel");
    expect(diagnostico.avisos[0]).toContain("NO se apuntarán");
    expect(diagnostico.avisos[0]).toContain("Hacer cambios en eventos");
  });

  it("si el calendario de escritura no respondió, no se inventa el permiso", () => {
    const diagnostico = diagnosticar({
      ids: GENERAL,
      comprobaciones: { [GENERAL]: { ok: false, mensaje: "Google no responde." } },
    });

    expect(diagnostico.escritura?.responde).toBe(false);
    expect(diagnostico.escrituraSinPermiso).toBe(false);
    /* El aviso que sale es el de la lectura, no uno sobre un permiso que nadie
       pudo consultar. */
    expect(diagnostico.avisos).toHaveLength(1);
    expect(diagnostico.avisos[0]).toContain("Google no responde.");
  });

  it("un calendario de escritura fuera de la lista también se comprueba", () => {
    const diagnostico = diagnosticar({
      ids: `${GENERAL}, ${CAB1}=1`,
      escribirEn: ESCRITURA,
      comprobaciones: {
        [GENERAL]: SOLO_LECTURA,
        [CAB1]: SOLO_LECTURA,
        [ESCRITURA]: PUEDE_ESCRIBIR,
      },
    });

    expect(diagnostico.escrituraFueraDeLista).toBe(true);
    expect(diagnostico.escritura?.id).toBe(ESCRITURA);
    expect(diagnostico.escritura?.responde).toBe(true);
    expect(diagnostico.escritura?.deEscritura).toBe(true);
    /* No se cuela entre los que se leen: ahí solo van los de la variable. */
    expect(diagnostico.configurados.map((calendario) => calendario.id)).toEqual([
      GENERAL,
      CAB1,
    ]);
    expect(diagnostico.responden).toBe(2);
  });

  it("sin calendarios no hay calendario de escritura", () => {
    const diagnostico = diagnosticar({ ids: "" });
    expect(diagnostico.escritura).toBeNull();
    expect(diagnostico.escribirEn).toBeNull();
    expect(diagnostico.escrituraSinPermiso).toBe(false);
  });
});

describe("calendariosAComprobar", () => {
  it("son los que se leen, sin repetir el de escritura", () => {
    const config = parsearCalendarios(`${ESCRITURA}, ${CAB1}=1`, ESCRITURA);
    expect(calendariosAComprobar(config)).toEqual([ESCRITURA, CAB1]);
  });

  it("añade el de escritura cuando no está en la lista", () => {
    const config = parsearCalendarios(`${GENERAL}, ${CAB1}=1`, ESCRITURA);
    expect(calendariosAComprobar(config)).toEqual([GENERAL, CAB1, ESCRITURA]);
  });

  it("sin nada configurado no hay nada que comprobar", () => {
    expect(calendariosAComprobar(parsearCalendarios(""))).toEqual([]);
  });
});

describe("armarDiagnostico · suscripciones que sí sirven de algo", () => {
  it("solo se ofrecen las que no están configuradas", () => {
    const diagnostico = diagnosticar({
      ids: GENERAL,
      escribirEn: ESCRITURA,
      comprobaciones: { [GENERAL]: SOLO_LECTURA, [ESCRITURA]: PUEDE_ESCRIBIR },
      suscritos: [
        { id: GENERAL, nombre: "Ya configurado", acceso: "reader" },
        { id: ESCRITURA, nombre: "Es el de escritura", acceso: "writer" },
        { id: "suelto@group.calendar.google.com", nombre: "Suelto", acceso: "owner" },
      ],
    });

    expect(diagnostico.suscritosSinConfigurar).toEqual([
      { id: "suelto@group.calendar.google.com", nombre: "Suelto", acceso: "owner" },
    ]);
  });
});

describe("accesoEnEspanol", () => {
  it("traduce los cuatro permisos de Google", () => {
    expect(accesoEnEspanol("owner")).toContain("escribir");
    expect(accesoEnEspanol("writer")).toContain("escribir");
    expect(accesoEnEspanol("reader")).toBe("solo lectura");
    expect(accesoEnEspanol("freeBusyReader")).toContain("no los títulos");
  });

  it("lo que no conoce lo deja tal cual, y el vacío se dice", () => {
    expect(accesoEnEspanol(null)).toBe("sin comprobar");
    expect(accesoEnEspanol("inventado")).toBe("inventado");
  });
});
