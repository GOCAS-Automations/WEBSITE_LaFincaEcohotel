import { describe, expect, it } from "vitest";

import {
  armarCalendarioMes,
  cabanasEnDia,
  sinCabanaEnTitulo,
} from "./calendario-mes";
import type { BloqueoAdmin, OpcionAlojamiento, ReservaAdmin } from "./tipos";
import type { OcupacionExterna } from "../reserva/calendario-externo";

const AHORA = new Date("2026-10-05T15:00:00Z");
const MES = { anio: 2026, mes: 10 };

const CABANAS: OpcionAlojamiento[] = [
  { id: "c1", nombre: "Cabaña 01", capacidad: 2, activo: true },
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
    subtotal_alojamiento: 0,
    subtotal_extras: 0,
    total: 0,
    monto_pagado: 0,
    estado: "confirmada",
    origen: "whatsapp",
    porcentaje_anticipo: 50,
    monto_anticipo: null,
    referencia_externa: null,
    expira_at: null,
    autorizacion_datos_en: null,
    autorizacion_datos_version: null,
    autorizacion_datos_canal: null,
    created_at: "",
    ...parcial,
  };
}

function franja(parcial: Partial<OcupacionExterna>): OcupacionExterna {
  return {
    eventoId: "e1",
    titulo: "Juan Pérez cabaña 3",
    inicio: "2026-10-03",
    fin: "2026-10-05",
    cabana: 3,
    motivo: "cabana_reconocida",
    ...parcial,
  };
}

function armar({
  reservas = [] as ReservaAdmin[],
  bloqueos = [] as BloqueoAdmin[],
  franjas = [] as OcupacionExterna[],
} = {}) {
  return armarCalendarioMes({
    mes: MES,
    hoy: "2026-10-05",
    alojamientos: CABANAS,
    reservas,
    bloqueos,
    franjas,
    personasDeDia: new Map([["2026-10-10", 6]]),
    ahora: AHORA,
  });
}

describe("armarCalendarioMes", () => {
  it("los días traen tono de fin de semana, festivo y hoy", () => {
    const { dias } = armar();
    expect(dias).toHaveLength(31);
    expect(dias[2]).toMatchObject({ iso: "2026-10-03", semana: "sáb", destacado: true });
    expect(dias[4]).toMatchObject({ iso: "2026-10-05", esHoy: true, destacado: false });
    /* 12 de octubre: Día de la Raza, festivo en lunes. */
    expect(dias[11].festivo).not.toBeNull();
    expect(dias[11].destacado).toBe(true);
  });

  it("una estadía es UNA barra que abarca todas sus noches", () => {
    const { filas } = armar({ reservas: [reserva({})] });
    const barras = filas.find((fila) => fila.id === "c3")!.barras;
    expect(barras).toHaveLength(1);
    expect(barras[0]).toMatchObject({
      fuente: "reserva",
      inicio: 11,
      noches: 3,
      etiqueta: "Ana Pérez",
      href: "/admin/reservas/r1",
      continuaAntes: false,
      continuaDespues: false,
    });
    expect(barras[0].detalle).toContain("lun 12/10/2026 al jue 15/10/2026");
  });

  it("la barra de un evento de Google no repite la cabaña en la etiqueta", () => {
    const { filas } = armar({ franjas: [franja({})] });
    const barra = filas.find((fila) => fila.id === "c3")!.barras[0];
    expect(barra).toMatchObject({ fuente: "google", etiqueta: "Juan Pérez", noches: 2 });
    expect(barra.detalle).toContain("«Juan Pérez cabaña 3»");
    expect(filas.find((fila) => fila.id === "c1")!.barras).toHaveLength(0);
  });

  it("un evento sin cabaña se pinta en todas, marcado, y uno con cabaña manda sobre él", () => {
    const sinCabana = franja({
      eventoId: "e2",
      titulo: "Cristian plan día",
      cabana: null,
      motivo: "sin_cabana",
      inicio: "2026-10-04",
      fin: "2026-10-05",
    });
    const conCabana = franja({ inicio: "2026-10-04", fin: "2026-10-05" });
    const { filas } = armar({ franjas: [conCabana, sinCabana] });
    expect(filas.find((fila) => fila.id === "c1")!.barras[0]).toMatchObject({
      sinCabana: true,
      etiqueta: "Cristian plan día",
    });
    expect(filas.find((fila) => fila.id === "c3")!.barras[0]).toMatchObject({
      sinCabana: false,
      etiqueta: "Juan Pérez",
    });
  });

  it("la reserva de la base manda sobre el evento de Google en la misma noche", () => {
    const { filas } = armar({
      reservas: [reserva({ entrada: "2026-10-03", salida: "2026-10-04" })],
      franjas: [franja({})],
    });
    const barras = filas.find((fila) => fila.id === "c3")!.barras;
    expect(barras.map((barra) => [barra.fuente, barra.inicio, barra.noches])).toEqual([
      ["reserva", 2, 1],
      ["google", 3, 1],
    ]);
    /* El trozo de Google que queda viene de antes: borde recto a la izquierda. */
    expect(barras[1].continuaAntes).toBe(true);
  });

  it("una cancelada o un hold vencido no ocupan", () => {
    const { filas } = armar({
      reservas: [
        reserva({ id: "a", estado: "cancelada" }),
        reserva({ id: "b", estado: "pendiente", expira_at: "2026-10-05T14:00:00Z" }),
      ],
    });
    expect(filas.find((fila) => fila.id === "c3")!.barras).toHaveLength(0);
  });

  it("una estadía que cruza de mes sale con los bordes rectos", () => {
    const { filas } = armar({
      reservas: [
        reserva({ id: "x", entrada: "2026-09-29", salida: "2026-10-02" }),
        reserva({ id: "y", entrada: "2026-10-30", salida: "2026-11-03" }),
      ],
    });
    const [primera, ultima] = filas.find((fila) => fila.id === "c3")!.barras;
    expect(primera).toMatchObject({ inicio: 0, noches: 1, continuaAntes: true, continuaDespues: false });
    expect(ultima).toMatchObject({ inicio: 29, noches: 2, continuaAntes: false, continuaDespues: true });
  });

  it("el Día de Calma lleva sus personas por fecha", () => {
    expect(armar().personasDeDia).toEqual({ "2026-10-10": 6 });
  });
});

describe("cabanasEnDia (la agenda del celular)", () => {
  it("dice quién duerme, quién llega y quién sale por la mañana", () => {
    const calendario = armar({
      reservas: [
        reserva({ id: "sale", entrada: "2026-10-10", salida: "2026-10-12" }),
        reserva({ id: "llega", huesped_nombre: "Luis", entrada: "2026-10-12", salida: "2026-10-13" }),
      ],
    });
    const [c1, c3] = cabanasEnDia(calendario, 11); // 12 de octubre
    expect(c1.noche).toBeNull();
    expect(c3.noche?.etiqueta).toBe("Luis");
    expect(c3.llega).toBe(true);
    expect(c3.sale?.etiqueta).toBe("Ana Pérez");
  });
});

describe("sinCabanaEnTitulo", () => {
  it.each([
    ["Diana Montoya cabaña 1", "Diana Montoya"],
    ["Ximena Rojas Cabaña 2", "Ximena Rojas"],
    ["Jhon Hernández (B.R. Atarnan O.) cabaña 2", "Jhon Hernández (B.R. Atarnan O.)"],
    ["Diego Camargo bono regalo cabaña 3", "Diego Camargo bono regalo"],
    ["Cabaña 04 - Kelly Vega", "Kelly Vega"],
    ["Ana · cab. 5", "Ana"],
  ])("«%s» → «%s»", (titulo, esperado) => {
    expect(sinCabanaEnTitulo(titulo)).toBe(esperado);
  });

  it("si solo dice la cabaña, deja el título tal cual", () => {
    expect(sinCabanaEnTitulo("Cabaña 3")).toBe("Cabaña 3");
  });
});
