import { describe, expect, it } from "vitest";

import { estadiasDelHotel } from "./estadisticas";
import {
  armarListado,
  cambiarFiltro,
  leerFiltrosListado,
  parametrosDeFiltros,
  type FiltrosListado,
} from "./listado-reservas";
import type { OpcionAlojamiento, ReservaAdmin } from "./tipos";
import type { DiaDeCalmaExterno, OcupacionExterna } from "../reserva/calendario-externo";

const AHORA = new Date("2026-10-05T15:00:00Z");
const OCTUBRE = { desde: "2026-10-01", hasta: "2026-11-01" };
const TODOS: FiltrosListado = { vista: "mes", origen: "todos", estado: "todos" };

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
    origen: "web",
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

const PLAN: DiaDeCalmaExterno = {
  eventoId: "cristian",
  titulo: "Cristian Arcila plan día",
  inicio: "2026-10-04",
  fin: "2026-10-05",
  personas: 2,
};

/** Lo que trae la página en la vista del mes, ya armado. */
function delMes(filtros: FiltrosListado = TODOS) {
  return armarListado({
    reservas: [
      reserva({ id: "web", huesped_nombre: "Ana Pérez", origen: "web" }),
      reserva({
        id: "panel",
        huesped_nombre: "Bruno Díaz",
        origen: "whatsapp",
        estado: "pendiente",
        alojamiento_id: "c1",
        alojamiento_nombre: "Cabaña 01",
        entrada: "2026-10-20",
        salida: "2026-10-22",
      }),
      /* Salió la mañana del 1: no tiene ninguna noche en octubre. */
      reserva({ id: "septiembre", entrada: "2026-09-28", salida: "2026-10-01" }),
    ],
    franjas: [
      franja({ eventoId: "juan" }),
      /* El mismo huésped que la reserva «web», apuntado otra vez a mano. */
      franja({ eventoId: "repetido", titulo: "Ana cabaña 3", inicio: "2026-10-12", fin: "2026-10-15" }),
      /* De septiembre: fuera del mes. */
      franja({ eventoId: "viejo", inicio: "2026-09-10", fin: "2026-09-12" }),
    ],
    diasDeCalma: [PLAN],
    alojamientos: CABANAS,
    rango: OCTUBRE,
    filtros,
    ahora: AHORA,
  });
}

describe("los filtros del listado", () => {
  it("sin nada en la dirección: el mes, todos los orígenes y todos los estados", () => {
    expect(leerFiltrosListado({})).toEqual(TODOS);
    expect(leerFiltrosListado({ ver: "raro", origen: "x", estado: "y" })).toEqual(TODOS);
    expect(leerFiltrosListado({ ver: "todas", origen: "panel", estado: "pendiente" })).toEqual({
      vista: "todas",
      origen: "panel",
      estado: "pendiente",
    });
  });

  it("«Calendario del hotel» no tiene estado ni se ve en «Todas las fechas»", () => {
    expect(
      leerFiltrosListado({ ver: "todas", origen: "calendario", estado: "pendiente" }),
    ).toEqual({ vista: "mes", origen: "calendario", estado: "todos" });
  });

  it("el botón que se toca manda y el filtro que choca cede", () => {
    const pendientes: FiltrosListado = { vista: "mes", origen: "todos", estado: "pendiente" };
    expect(cambiarFiltro(pendientes, { origen: "calendario" })).toEqual({
      vista: "mes",
      origen: "calendario",
      estado: "todos",
    });
    const calendario: FiltrosListado = { vista: "mes", origen: "calendario", estado: "todos" };
    expect(cambiarFiltro(calendario, { estado: "confirmada" })).toEqual({
      vista: "mes",
      origen: "todos",
      estado: "confirmada",
    });
    expect(cambiarFiltro(calendario, { vista: "todas" })).toEqual({
      vista: "todas",
      origen: "todos",
      estado: "todos",
    });
    /* Lo que no choca se conserva. */
    expect(cambiarFiltro(pendientes, { origen: "sitio" })).toEqual({
      vista: "mes",
      origen: "sitio",
      estado: "pendiente",
    });
  });

  it("en la dirección solo va lo que no es por defecto", () => {
    expect(parametrosDeFiltros(TODOS).toString()).toBe("");
    expect(
      parametrosDeFiltros({ vista: "todas", origen: "panel", estado: "pendiente" }).toString(),
    ).toBe("ver=todas&origen=panel&estado=pendiente");
  });
});

describe("armarListado, vista del mes", () => {
  it("junta la base y el calendario del hotel, sin repetir y por fecha de llegada", () => {
    const { filas } = delMes();
    expect(
      filas.map((fila) =>
        fila.tipo === "reserva"
          ? `${fila.fuente}:${fila.reserva.huesped_nombre}`
          : `${fila.fuente}:${fila.estadia.nombre}:${fila.estadia.cabana}`,
      ),
    ).toEqual([
      "calendario:Juan Pérez:Cabaña 03",
      "calendario:Cristian Arcila plan día:Día de Calma",
      "sitio:Ana Pérez",
      "panel:Bruno Díaz",
    ]);
  });

  it("es la misma lectura de Google que la del Resumen", () => {
    const reservas = [reserva({ id: "web" })];
    const franjas = [
      franja({ eventoId: "juan" }),
      franja({ eventoId: "repetido", inicio: "2026-10-12", fin: "2026-10-15" }),
      franja({ eventoId: "todas", titulo: "Evento sin cabaña", cabana: null, motivo: "sin_cabana" }),
    ];
    const { filas } = armarListado({
      reservas,
      franjas,
      diasDeCalma: [PLAN],
      alojamientos: CABANAS,
      rango: OCTUBRE,
      filtros: TODOS,
      ahora: AHORA,
    });
    const delResumen = estadiasDelHotel({
      reservas,
      franjas,
      diasDeCalma: [PLAN],
      alojamientos: CABANAS,
      ahora: AHORA,
    }).filter((estadia) => estadia.fuente === "calendario");
    expect(
      filas.flatMap((fila) => (fila.tipo === "calendario" ? [fila.clave] : [])).sort(),
    ).toEqual(delResumen.map((estadia) => estadia.clave).sort());
  });

  it("un evento que repite una reserva CANCELADA sí sale: esa ya no ocupa", () => {
    const { filas } = armarListado({
      reservas: [reserva({ id: "web", estado: "cancelada" })],
      franjas: [franja({ eventoId: "repetido", inicio: "2026-10-12", fin: "2026-10-15" })],
      alojamientos: CABANAS,
      rango: OCTUBRE,
      filtros: TODOS,
      ahora: AHORA,
    });
    expect(filas.map((fila) => fila.tipo)).toEqual(["reserva", "calendario"]);
  });

  it("filtra por origen y cuenta lo que saldría con cada botón", () => {
    const listado = delMes({ ...TODOS, origen: "calendario" });
    expect(listado.filas.every((fila) => fila.fuente === "calendario")).toBe(true);
    expect(listado.cuantos).toEqual({ todos: 4, sitio: 1, panel: 1, calendario: 2 });
  });

  it("con un estado elegido salen solo reservas de la base, y dice cuántos eventos quedan fuera", () => {
    const listado = delMes({ ...TODOS, estado: "pendiente" });
    expect(listado.filas.map((fila) => fila.clave)).toEqual(["reserva:panel"]);
    expect(listado.ocultosPorEstado).toBe(2);
    /* «Calendario del hotel» quita el estado: cuenta sus 2 eventos. */
    expect(listado.cuantos).toEqual({ todos: 1, sitio: 0, panel: 1, calendario: 2 });
  });
});

describe("armarListado, todas las fechas", () => {
  it("solo la base, en el orden en que llega, y sin cifra para el calendario del hotel", () => {
    const listado = armarListado({
      reservas: [
        reserva({ id: "nueva", entrada: "2027-03-01", salida: "2027-03-03" }),
        reserva({ id: "vieja", entrada: "2026-01-01", salida: "2026-01-02", origen: "telefono" }),
      ],
      franjas: [franja({})],
      diasDeCalma: [PLAN],
      alojamientos: CABANAS,
      rango: null,
      filtros: { ...TODOS, vista: "todas" },
      ahora: AHORA,
    });
    expect(listado.filas.map((fila) => fila.clave)).toEqual(["reserva:nueva", "reserva:vieja"]);
    expect(listado.cuantos).toEqual({ todos: 2, sitio: 1, panel: 1, calendario: null });
    expect(listado.ocultosPorEstado).toBe(0);
  });
});
