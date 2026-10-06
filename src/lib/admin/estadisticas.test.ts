import { describe, expect, it } from "vitest";

import { estadiasDelHotel, porcentaje, resumirHotel } from "./estadisticas";
import type { BloqueoAdmin, OpcionAlojamiento, ReservaAdmin } from "./tipos";
import {
  ORIGEN_PROPIO,
  lecturaDeVariosCalendarios,
  ocupacionDesdeVariosCalendarios,
  type EventoCalendario,
} from "../reserva/calendario-externo";

/**
 * Las cifras del Resumen cuentan la base Y el calendario de Google del hotel,
 * sin contar dos veces la misma estadía.
 */

const AHORA = new Date("2026-10-05T15:00:00Z");
const HOY = "2026-10-05";
const MES = { anio: 2026, mes: 10 };

const CABANAS: OpcionAlojamiento[] = [
  { id: "c1", nombre: "Cabaña 01", capacidad: 2, activo: true },
  { id: "c2", nombre: "Cabaña 02", capacidad: 2, activo: true },
  { id: "c3", nombre: "Cabaña 03", capacidad: 2, activo: true },
];

function reserva(parcial: Partial<ReservaAdmin>): ReservaAdmin {
  return {
    id: "r1",
    codigo: "LF-0001",
    tipo: "hospedaje",
    alojamiento_id: "c3",
    alojamiento_nombre: "Cabaña 03",
    plan_id: null,
    plan_nombre: null,
    entrada: "2026-10-12",
    salida: "2026-10-15",
    huesped_nombre: "Ana Pérez",
    huesped_email: "",
    huesped_telefono: "",
    huesped_documento: null,
    num_personas: 2,
    notas: null,
    subtotal_alojamiento: 900_000,
    subtotal_extras: 0,
    total: 900_000,
    monto_pagado: 450_000,
    estado: "confirmada",
    origen: "web",
    porcentaje_anticipo: 50,
    monto_anticipo: 450_000,
    referencia_externa: null,
    expira_at: null,
    autorizacion_datos_en: null,
    autorizacion_datos_version: null,
    autorizacion_datos_canal: null,
    created_at: "",
    ...parcial,
  };
}

function evento(parcial: Partial<EventoCalendario>): EventoCalendario {
  return {
    id: "g1",
    estado: "confirmed",
    titulo: "Juan Pérez cabaña 1",
    descripcion: null,
    inicioFecha: "2026-10-05",
    finFecha: "2026-10-07",
    inicioHora: null,
    finHora: null,
    origen: null,
    reservaId: null,
    ...parcial,
  };
}

/** Del calendario de Google a franjas, por el mismo camino que el sitio. */
function franjasDe(...lotes: { cabana: number | null; eventos: EventoCalendario[] }[]) {
  return ocupacionDesdeVariosCalendarios(lotes);
}

function resumir(
  reservas: ReservaAdmin[],
  franjas: ReturnType<typeof franjasDe>,
  bloqueos: BloqueoAdmin[] = [],
) {
  return resumirHotel({
    hoy: HOY,
    mes: MES,
    alojamientos: CABANAS,
    reservas,
    bloqueos,
    franjas,
    tiposOfrecidos: { c2: ["fin_de_semana"] },
    ahora: AHORA,
  });
}

describe("sin doble conteo", () => {
  it("el evento que escribió el propio sitio en Google NO se cuenta: ya está en la base", () => {
    const deLaBase = reserva({ id: "r9", alojamiento_id: "c3", entrada: "2026-10-12", salida: "2026-10-15" });
    const espejo = evento({
      id: "g-propio",
      titulo: "Ana Pérez · Cabaña 03",
      inicioFecha: "2026-10-12",
      finFecha: "2026-10-15",
      origen: ORIGEN_PROPIO,
      reservaId: "r9",
    });
    const resumen = resumir([deLaBase], franjasDe({ cabana: null, eventos: [espejo] }));
    expect(resumen.porFuente).toEqual({ sitio: 1, panel: 0, calendario: 0 });
    expect(resumen.ocupacion.porCabana.find((c) => c.id === "c3")?.ocupadas).toBe(3);
  });

  it("el mismo evento en el calendario general y en el de su cabaña cuenta una vez", () => {
    const general = evento({ id: "g1" });
    const deCabana = evento({ id: "g1" });
    const resumen = resumir(
      [],
      franjasDe({ cabana: null, eventos: [general] }, { cabana: 1, eventos: [deCabana] }),
    );
    expect(resumen.porFuente.calendario).toBe(1);
    expect(resumen.llegadasHoy).toHaveLength(1);
  });

  it("una estadía apuntada a mano en Google que también está en la base cuenta como la de la base", () => {
    const deLaBase = reserva({
      id: "r2",
      origen: "whatsapp",
      alojamiento_id: "c1",
      alojamiento_nombre: "Cabaña 01",
      entrada: "2026-10-05",
      salida: "2026-10-07",
    });
    const aMano = evento({ id: "g7", titulo: "Ana Pérez cabaña 1" });
    const estadias = estadiasDelHotel({
      reservas: [deLaBase],
      franjas: franjasDe({ cabana: null, eventos: [aMano] }),
      alojamientos: CABANAS,
      ahora: AHORA,
    });
    expect(estadias).toHaveLength(1);
    expect(estadias[0].fuente).toBe("panel");
  });

  it("si dos fuentes se pisan, una noche ocupada sigue siendo UNA noche", () => {
    const deLaBase = reserva({ alojamiento_id: "c1", alojamiento_nombre: "Cabaña 01", entrada: "2026-10-05", salida: "2026-10-08" });
    const solapado = evento({ id: "g8", titulo: "Otro cabaña 1", inicioFecha: "2026-10-06", finFecha: "2026-10-09" });
    const resumen = resumir([deLaBase], franjasDe({ cabana: null, eventos: [solapado] }));
    /* 5, 6, 7 de la base y 6, 7, 8 de Google: cuatro noches, no seis. */
    expect(resumen.ocupacion.porCabana.find((c) => c.id === "c1")?.ocupadas).toBe(4);
  });
});

describe("resumirHotel", () => {
  const franjas = franjasDe({
    cabana: null,
    eventos: [
      evento({ id: "hoy", titulo: "Juan Pérez cabaña 1" }),
      evento({ id: "sale", titulo: "Marta cabaña 2", inicioFecha: "2026-10-03", finFecha: "2026-10-05" }),
      evento({ id: "semana", titulo: "Luis cabaña 3", inicioFecha: "2026-10-10", finFecha: "2026-10-11" }),
      evento({ id: "nada", titulo: "Visita familia Gómez", inicioFecha: "2026-10-09", finFecha: "2026-10-10" }),
    ],
  });
  const reservas = [
    reserva({ id: "web", entrada: "2026-10-12", salida: "2026-10-15" }),
    reserva({ id: "panel", origen: "telefono", alojamiento_id: "c2", alojamiento_nombre: "Cabaña 02", entrada: "2026-10-05", salida: "2026-10-06", total: 500_000, monto_pagado: 500_000 }),
    reserva({ id: "cancelada", estado: "cancelada", entrada: "2026-10-20", salida: "2026-10-21" }),
    reserva({ id: "dia", tipo: "dia", alojamiento_id: null, alojamiento_nombre: null, origen: "web", entrada: "2026-10-05", salida: "2026-10-06", num_personas: 2, total: 300_000, monto_pagado: 150_000 }),
  ];
  const resumen = resumir(reservas, franjas, [
    { id: "b1", alojamiento_id: "c3", alojamiento_nombre: "Cabaña 03", inicio: "2026-10-20", fin: "2026-10-25", motivo: "Pintura", created_at: "" },
  ]);

  it("llegadas de hoy con nombre y cabaña, de las dos fuentes", () => {
    expect(resumen.llegadasHoy.map((e) => [e.nombre, e.cabana, e.fuente])).toEqual([
      ["Juan Pérez", "Cabaña 01", "calendario"],
      ["Ana Pérez", "Cabaña 02", "panel"],
      ["Ana Pérez", "Día de Calma", "sitio"],
    ]);
  });

  it("quién sale hoy, quién duerme en casa y el Día de Calma", () => {
    expect(resumen.salidasHoy.map((e) => e.nombre)).toEqual(["Marta"]);
    expect(resumen.enCasa.map((e) => e.cabana)).toEqual(["Cabaña 01", "Cabaña 02"]);
    expect(resumen.personasDeDiaHoy).toBe(2);
  });

  it("las llegadas de los próximos 7 días, incluido el evento sin cabaña", () => {
    expect(resumen.llegadasProximas.map((e) => [e.entrada, e.cabana])).toEqual([
      ["2026-10-09", "Sin cabaña"],
      ["2026-10-10", "Cabaña 03"],
      ["2026-10-12", "Cabaña 03"],
    ]);
  });

  it("ocupación: noches ocupadas sobre las que se podían vender", () => {
    const porId = Object.fromEntries(resumen.ocupacion.porCabana.map((c) => [c.id, c]));
    /* Cabaña 01: 5 y 6 de octubre, de 31. */
    expect(porId.c1).toMatchObject({ ocupadas: 2, disponibles: 31 });
    /* Cabaña 02: solo vende fin de semana o festivo (15 noches en octubre de
       2026, con el lunes 12 festivo) más la del lunes 5, que sí se ocupó;
       ocupadas: 3 y 4 (Google) y 5 (panel). */
    expect(porId.c2).toMatchObject({ ocupadas: 3, disponibles: 16 });
    /* Cabaña 03: 31 menos 5 noches bloqueadas; ocupadas 10, 12, 13, 14. */
    expect(porId.c3).toMatchObject({ ocupadas: 4, disponibles: 26 });
    expect(resumen.ocupacion).toMatchObject({ ocupadas: 9, disponibles: 73, sinCabana: 1 });
  });

  it("reservas del mes por fuente (con llegada en el mes; la cancelada no cuenta)", () => {
    expect(resumen.porFuente).toEqual({ sitio: 2, panel: 1, calendario: 4 });
    expect(resumen.diasDeCalma).toBe(1);
  });

  it("los ingresos salen solo de la base", () => {
    expect(resumen.ingresos).toEqual({
      reservas: 3,
      total: 1_700_000,
      abonado: 1_100_000,
      porCobrar: 600_000,
    });
  });

  it("sin calendario de Google, cuenta lo de la base y no se rompe", () => {
    const soloBase = resumir(reservas, []);
    expect(soloBase.porFuente).toEqual({ sitio: 2, panel: 1, calendario: 0 });
    expect(soloBase.ingresos.total).toBe(1_700_000);
  });

  it("porcentaje no divide por cero", () => {
    expect(porcentaje(0, 0)).toBe(0);
    expect(porcentaje(9, 72)).toBe(13);
  });
});

describe("un «plan día» del calendario del hotel en el Resumen (regla 2b)", () => {
  it("cuenta 2 en el Día de Calma de hoy y no como evento sin cabaña", () => {
    const lectura = lecturaDeVariosCalendarios([
      {
        cabana: null,
        eventos: [
          evento({ id: "cristian", titulo: "Cristian Arcila plan día", finFecha: "2026-10-06" }),
        ],
      },
    ]);
    const resumen = resumirHotel({
      hoy: HOY,
      mes: MES,
      alojamientos: CABANAS,
      reservas: [],
      bloqueos: [],
      franjas: lectura.ocupacion,
      diasDeCalma: lectura.diasDeCalma,
      ahora: AHORA,
    });
    expect(resumen.personasDeDiaHoy).toBe(2);
    expect(resumen.ocupacion.sinCabana).toBe(0);
    expect(resumen.ocupacion.ocupadas).toBe(0);
    expect(resumen.enCasa).toHaveLength(0);
    expect(resumen.llegadasHoy.map((e) => e.cabana)).toEqual(["Día de Calma"]);
  });
});
