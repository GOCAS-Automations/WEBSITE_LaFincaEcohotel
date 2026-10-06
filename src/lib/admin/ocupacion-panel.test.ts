import { describe, expect, it } from "vitest";

import {
  nochesOcupadasDeCabana,
  personasDeDiaSinLaPropia,
  type ReservaParaOcupacion,
} from "./ocupacion-panel";
import {
  bloqueoDeCabana,
  evaluadorDeDias,
  validarFechas,
} from "../reserva/elegibilidad-calendario";
import type { OcupacionExterna } from "../reserva/calendario-externo";

/**
 * La regla de ocupación del calendario de la reserva manual: las mismas tres
 * fuentes que el sitio, sin la propia reserva al editar, y sin la antelación
 * del sitio (el panel reserva para hoy).
 */

const AHORA = new Date("2026-10-05T15:00:00Z");
const DESDE = "2026-10-01";
const HASTA = "2026-12-01";

function reserva(parcial: Partial<ReservaParaOcupacion>): ReservaParaOcupacion {
  return {
    id: "propia",
    estado: "confirmada",
    expira_at: null,
    entrada: "2026-10-12",
    salida: "2026-10-15",
    ...parcial,
  };
}

const EVENTO_CABANA_3: OcupacionExterna = {
  eventoId: "g1",
  titulo: "Juan Pérez cabaña 3",
  inicio: "2026-10-17",
  fin: "2026-10-19",
  cabana: 3,
  motivo: "cabana_reconocida",
};

function ocupadas(
  parcial: Partial<Parameters<typeof nochesOcupadasDeCabana>[0]> = {},
): string[] {
  return nochesOcupadasDeCabana({
    nombreCabana: "Cabaña 03",
    reservas: [],
    bloqueos: [],
    franjas: [],
    desde: DESDE,
    hasta: HASTA,
    ahora: AHORA,
    ...parcial,
  });
}

describe("nochesOcupadasDeCabana", () => {
  it("suma reservas, bloqueos y eventos de Google, sin repetir noches", () => {
    expect(
      ocupadas({
        reservas: [reserva({ id: "otra" })],
        bloqueos: [{ inicio: "2026-10-14", fin: "2026-10-16" }],
        franjas: [EVENTO_CABANA_3],
      }),
    ).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-17",
      "2026-10-18",
    ]);
  });

  it("AL EDITAR, las noches de la propia reserva no cuentan", () => {
    const reservas = [reserva({ id: "propia" }), reserva({ id: "otra", entrada: "2026-10-20", salida: "2026-10-21" })];
    expect(ocupadas({ reservas })).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-20",
    ]);
    expect(ocupadas({ reservas, excluirReservaId: "propia" })).toEqual(["2026-10-20"]);
  });

  it("y con eso se pueden conservar o estirar las fechas que ya tenía", () => {
    const reservas = [reserva({ id: "propia" })];
    const bloqueo = bloqueoDeCabana({
      ocupadas: ocupadas({ reservas, excluirReservaId: "propia" }),
    });
    expect(
      validarFechas(
        { entrada: "2026-10-12", salida: "2026-10-16" },
        { hoy: "2026-10-05", bloqueo },
      ),
    ).toEqual({ valido: true });
  });

  it("un evento de Google de OTRA cabaña no ocupa esta; uno sin cabaña, sí", () => {
    const deOtra: OcupacionExterna = { ...EVENTO_CABANA_3, cabana: 1, titulo: "Ana cabaña 1" };
    const sinCabana: OcupacionExterna = {
      ...EVENTO_CABANA_3,
      eventoId: "g2",
      titulo: "Familia Gómez",
      cabana: null,
      motivo: "sin_cabana",
      inicio: "2026-10-04",
      fin: "2026-10-05",
    };
    expect(ocupadas({ franjas: [deOtra, sinCabana] })).toEqual(["2026-10-04"]);
  });

  it("una cancelada y una solicitud con el hold vencido no ocupan", () => {
    expect(
      ocupadas({
        reservas: [
          reserva({ id: "a", estado: "cancelada" }),
          reserva({ id: "b", estado: "pendiente", expira_at: "2026-10-05T14:59:00Z" }),
        ],
      }),
    ).toEqual([]);
  });

  it("recorta a la ventana pedida", () => {
    expect(
      ocupadas({
        reservas: [reserva({ id: "x", entrada: "2026-09-29", salida: "2026-10-02" })],
      }),
    ).toEqual(["2026-10-01"]);
  });
});

describe("el calendario del panel deja reservar para hoy", () => {
  it("sin `minima`, hoy es elegible como llegada (en el sitio no lo es)", () => {
    const panel = evaluadorDeDias({ entrada: "", salida: "" }, { hoy: "2026-10-05" });
    expect(panel.estado("2026-10-05").activable).toBe(true);
    const sitio = evaluadorDeDias(
      { entrada: "", salida: "" },
      { hoy: "2026-10-05", minima: "2026-10-06" },
    );
    expect(sitio.estado("2026-10-05").activable).toBe(false);
  });

  it("la Cabaña 02 (solo fin de semana) sigue sin noches entre semana", () => {
    const bloqueo = bloqueoDeCabana({
      ocupadas: [],
      tiposOfrecidos: ["fin_de_semana"],
      nombreCabana: "Cabaña 02",
    });
    const dias = evaluadorDeDias({ entrada: "", salida: "" }, { hoy: "2026-10-05", bloqueo });
    expect(dias.estado("2026-10-06").activable).toBe(false); // martes
    expect(dias.estado("2026-10-09").activable).toBe(true); // viernes
  });
});

describe("personasDeDiaSinLaPropia", () => {
  it("suma el cupo del Día de Calma sin la reserva que se edita", () => {
    const reservas = [
      { ...reserva({ id: "propia", entrada: "2026-10-10", salida: "2026-10-11" }), personas: 2 },
      { ...reserva({ id: "otra", entrada: "2026-10-10", salida: "2026-10-11" }), personas: 2 },
    ];
    expect(
      personasDeDiaSinLaPropia({ reservas, desde: DESDE, hasta: HASTA, ahora: AHORA }),
    ).toEqual({ "2026-10-10": 4 });
    expect(
      personasDeDiaSinLaPropia({
        reservas,
        desde: DESDE,
        hasta: HASTA,
        excluirReservaId: "propia",
        ahora: AHORA,
      }),
    ).toEqual({ "2026-10-10": 2 });
  });
});
