import { describe, expect, it } from "vitest";

import {
  ORIGEN_PROPIO,
  cabanasAfectadas,
  diaEnBogota,
  diasDeLaFranja,
  franjasQueChocan,
  numeroDeCabana,
  ocupacionDesdeEventos,
  ocupacionDesdeVariosCalendarios,
  rangoDelEvento,
  type EventoCalendario,
} from "./calendario-externo";

/**
 * Pruebas del puente entre el Google Calendar del hotel y la disponibilidad.
 *
 * Son las reglas que más van a moverse —todavía no sabemos cómo escribe el
 * hotel sus eventos— y las que peor se revisan a ojo: un error de un día en la
 * conversión a hora de Colombia vende una noche que estaba ocupada.
 */

/** Evento de mentira con lo mínimo; cada prueba cambia lo que le interesa. */
function evento(parcial: Partial<EventoCalendario>): EventoCalendario {
  return {
    id: "evt-1",
    estado: "confirmed",
    titulo: "",
    descripcion: null,
    inicioFecha: null,
    finFecha: null,
    inicioHora: null,
    finHora: null,
    origen: null,
    reservaId: null,
    ...parcial,
  };
}

describe("numeroDeCabana", () => {
  it("reconoce las formas en que se escribe una cabaña", () => {
    expect(numeroDeCabana("Cabaña 3")).toBe(3);
    expect(numeroDeCabana("cabaña 03")).toBe(3);
    expect(numeroDeCabana("CABANA 5")).toBe(5);
    expect(numeroDeCabana("Cab. 2")).toBe(2);
    expect(numeroDeCabana("cab2")).toBe(2);
    expect(numeroDeCabana("Cabañas 4 — Ana Pérez")).toBe(4);
    expect(numeroDeCabana("La Finca · Cabaña 01 · Juan")).toBe(1);
    expect(numeroDeCabana("cabana #4")).toBe(4);
  });

  it("empareja con el nombre que tienen las cabañas en la base", () => {
    expect(numeroDeCabana("Cabaña 01")).toBe(1);
    expect(numeroDeCabana("Cabaña 05")).toBe(5);
  });

  it("no inventa cabañas donde no las hay", () => {
    expect(numeroDeCabana("Mantenimiento general")).toBeNull();
    expect(numeroDeCabana("Reserva 3 personas")).toBeNull();
    expect(numeroDeCabana("Cabaña del bosque")).toBeNull();
    expect(numeroDeCabana("")).toBeNull();
    expect(numeroDeCabana(null)).toBeNull();
  });

  it("descarta números fuera de las cinco cabañas de la finca", () => {
    expect(numeroDeCabana("Cabaña 7")).toBeNull();
    expect(numeroDeCabana("Cabaña 12")).toBeNull();
  });
});

describe("rangoDelEvento — eventos de todo el día", () => {
  it("respeta el fin exclusivo que ya da Google", () => {
    expect(
      rangoDelEvento(evento({ inicioFecha: "2026-09-12", finFecha: "2026-09-15" })),
    ).toEqual({ inicio: "2026-09-12", fin: "2026-09-15" });
  });

  it("un día suelto ocupa ese día", () => {
    expect(
      rangoDelEvento(evento({ inicioFecha: "2026-09-12", finFecha: "2026-09-13" })),
    ).toEqual({ inicio: "2026-09-12", fin: "2026-09-13" });
  });

  it("sin fecha de fin, ocupa un día", () => {
    expect(rangoDelEvento(evento({ inicioFecha: "2026-09-12" }))).toEqual({
      inicio: "2026-09-12",
      fin: "2026-09-13",
    });
  });
});

describe("rangoDelEvento — eventos con hora, en America/Bogota", () => {
  it("una estadía de 14:00 a 11:00 son las noches del 12 al 14", () => {
    expect(
      rangoDelEvento(
        evento({
          inicioHora: "2026-09-12T14:00:00-05:00",
          finHora: "2026-09-15T11:00:00-05:00",
        }),
      ),
    ).toEqual({ inicio: "2026-09-12", fin: "2026-09-15" });
  });

  it("una visita de 10:00 a 17:00 ocupa ese día entero", () => {
    expect(
      rangoDelEvento(
        evento({
          inicioHora: "2026-09-12T10:00:00-05:00",
          finHora: "2026-09-12T17:00:00-05:00",
        }),
      ),
    ).toEqual({ inicio: "2026-09-12", fin: "2026-09-13" });
  });

  it("lee bien una hora escrita en UTC", () => {
    /* 2026-09-13T02:00Z son las 21:00 del 12 en Colombia: la noche del 12. */
    expect(
      rangoDelEvento(
        evento({
          inicioHora: "2026-09-13T02:00:00Z",
          finHora: "2026-09-13T16:00:00Z",
        }),
      ),
    ).toEqual({ inicio: "2026-09-12", fin: "2026-09-13" });
  });

  it("una medianoche de Colombia no se adelanta al día anterior", () => {
    expect(diaEnBogota("2026-09-12T00:00:00-05:00")).toBe("2026-09-12");
    expect(diaEnBogota("2026-09-12T23:59:00-05:00")).toBe("2026-09-12");
  });

  it("descarta lo que no se entiende", () => {
    expect(rangoDelEvento(evento({}))).toBeNull();
    expect(rangoDelEvento(evento({ inicioHora: "no es una fecha" }))).toBeNull();
  });
});

describe("ocupacionDesdeEventos", () => {
  it("asigna la cabaña que nombra el título", () => {
    const franjas = ocupacionDesdeEventos([
      evento({
        id: "a",
        titulo: "Cabaña 2 · Marta",
        inicioFecha: "2026-09-10",
        finFecha: "2026-09-12",
      }),
    ]);
    expect(franjas).toHaveLength(1);
    expect(franjas[0]).toMatchObject({
      cabana: 2,
      motivo: "cabana_reconocida",
      inicio: "2026-09-10",
      fin: "2026-09-12",
    });
  });

  it("sin cabaña reconocible, bloquea todas (decisión conservadora)", () => {
    const franjas = ocupacionDesdeEventos([
      evento({
        id: "b",
        titulo: "Evento privado",
        inicioFecha: "2026-09-20",
        finFecha: "2026-09-22",
      }),
    ]);
    expect(franjas[0].cabana).toBeNull();
    expect(franjas[0].motivo).toBe("sin_cabana");
  });

  it("ignora los eventos cancelados", () => {
    expect(
      ocupacionDesdeEventos([
        evento({
          id: "c",
          estado: "cancelled",
          titulo: "Cabaña 1",
          inicioFecha: "2026-09-01",
          finFecha: "2026-09-03",
        }),
      ]),
    ).toEqual([]);
  });

  it("ignora los eventos que creó el propio sitio", () => {
    expect(
      ocupacionDesdeEventos([
        evento({
          id: "d",
          titulo: "Cabaña 1 · Ana · Estándar",
          origen: ORIGEN_PROPIO,
          reservaId: "uuid-de-la-reserva",
          inicioFecha: "2026-09-01",
          finFecha: "2026-09-03",
        }),
      ]),
    ).toEqual([]);
  });

  it("ordena por fecha de entrada", () => {
    const franjas = ocupacionDesdeEventos([
      evento({ id: "2", titulo: "Cabaña 1", inicioFecha: "2026-09-20", finFecha: "2026-09-21" }),
      evento({ id: "1", titulo: "Cabaña 1", inicioFecha: "2026-09-02", finFecha: "2026-09-04" }),
    ]);
    expect(franjas.map((f) => f.inicio)).toEqual(["2026-09-02", "2026-09-20"]);
  });
});

describe("cabanasAfectadas", () => {
  const cabanas = [
    { id: "id-1", nombre: "Cabaña 01" },
    { id: "id-2", nombre: "Cabaña 02" },
    { id: "id-3", nombre: "Cabaña 03" },
  ];

  it("empareja el número del título con el nombre de la base", () => {
    const [franja] = ocupacionDesdeEventos([
      evento({ titulo: "cab 3", inicioFecha: "2026-09-10", finFecha: "2026-09-11" }),
    ]);
    expect(cabanasAfectadas(franja, cabanas).map((c) => c.id)).toEqual(["id-3"]);
  });

  it("sin cabaña en el título, afecta a todas", () => {
    const [franja] = ocupacionDesdeEventos([
      evento({ titulo: "Cierre por mantenimiento", inicioFecha: "2026-09-10", finFecha: "2026-09-11" }),
    ]);
    expect(cabanasAfectadas(franja, cabanas)).toHaveLength(3);
  });

  it("un número que no existe en la base también bloquea todas", () => {
    const [franja] = ocupacionDesdeEventos([
      evento({ titulo: "Cabaña 5", inicioFecha: "2026-09-10", finFecha: "2026-09-11" }),
    ]);
    expect(cabanasAfectadas(franja, cabanas)).toHaveLength(3);
  });
});

describe("franjasQueChocan", () => {
  const franjas = ocupacionDesdeEventos([
    evento({ id: "a", titulo: "Cabaña 2 · Marta", inicioFecha: "2026-09-10", finFecha: "2026-09-13" }),
    evento({ id: "b", titulo: "Mantenimiento", inicioFecha: "2026-09-25", finFecha: "2026-09-27" }),
  ]);

  it("choca con la cabaña que nombra el evento", () => {
    expect(
      franjasQueChocan(franjas, "Cabaña 02", "2026-09-12", "2026-09-14").map((f) => f.eventoId),
    ).toEqual(["a"]);
  });

  it("no molesta a las demás cabañas", () => {
    expect(franjasQueChocan(franjas, "Cabaña 01", "2026-09-12", "2026-09-14")).toEqual([]);
  });

  it("un evento sin cabaña choca con todas", () => {
    expect(
      franjasQueChocan(franjas, "Cabaña 01", "2026-09-26", "2026-09-28").map((f) => f.eventoId),
    ).toEqual(["b"]);
  });

  it("la salida es exclusiva: salir el día que otro entra no choca", () => {
    expect(franjasQueChocan(franjas, "Cabaña 02", "2026-09-08", "2026-09-10")).toEqual([]);
    expect(franjasQueChocan(franjas, "Cabaña 02", "2026-09-13", "2026-09-15")).toEqual([]);
  });
});

describe("diasDeLaFranja", () => {
  it("enumera las noches ocupadas sin incluir la de salida", () => {
    const [franja] = ocupacionDesdeEventos([
      evento({ titulo: "Cabaña 1", inicioFecha: "2026-09-29", finFecha: "2026-10-02" }),
    ]);
    expect(diasDeLaFranja(franja)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });
});

describe("ocupacionDesdeVariosCalendarios", () => {
  const CABANAS = [1, 2, 3, 4, 5].map((n) => ({
    id: `id-${n}`,
    nombre: `Cabaña 0${n}`,
  }));

  /** Qué noches quedan ocupadas en cada cabaña: la pregunta que importa. */
  function nochesPorCabana(franjas: ReturnType<typeof ocupacionDesdeEventos>) {
    const mapa = new Map<string, Set<string>>(
      CABANAS.map((cabana) => [cabana.id, new Set<string>()]),
    );
    for (const franja of franjas) {
      for (const cabana of cabanasAfectadas(franja, CABANAS)) {
        for (const dia of diasDeLaFranja(franja)) mapa.get(cabana.id)?.add(dia);
      }
    }
    return Object.fromEntries(
      [...mapa].map(([id, dias]) => [id, [...dias].sort()]),
    );
  }

  it("en un calendario de cabaña no hace falta que el título la nombre", () => {
    const franjas = ocupacionDesdeVariosCalendarios([
      {
        cabana: 3,
        eventos: [
          evento({ id: "a", titulo: "Ana Pérez", inicioFecha: "2026-09-10", finFecha: "2026-09-12" }),
        ],
      },
    ]);
    expect(franjas).toHaveLength(1);
    expect(franjas[0].cabana).toBe(3);
    expect(franjas[0].motivo).toBe("calendario_de_cabana");
    /* Y no bloquea las otras cuatro, que es lo que haría el calendario general. */
    expect(cabanasAfectadas(franjas[0], CABANAS).map((c) => c.id)).toEqual(["id-3"]);
  });

  it("el calendario de cabaña manda sobre lo que diga el título", () => {
    const franjas = ocupacionDesdeVariosCalendarios([
      {
        cabana: 2,
        eventos: [
          evento({ id: "a", titulo: "Cabaña 5 · se cambiaron", inicioFecha: "2026-09-10", finFecha: "2026-09-11" }),
        ],
      },
    ]);
    expect(franjas[0].cabana).toBe(2);
  });

  it("el calendario general sigue leyendo el título, y lo anónimo bloquea las cinco", () => {
    const franjas = ocupacionDesdeVariosCalendarios([
      {
        cabana: null,
        eventos: [
          evento({ id: "a", titulo: "Cabaña 4 · Luis", inicioFecha: "2026-09-10", finFecha: "2026-09-11" }),
          evento({ id: "b", titulo: "Evento privado", inicioFecha: "2026-09-20", finFecha: "2026-09-21" }),
        ],
      },
    ]);
    expect(franjas.find((f) => f.eventoId === "a")?.cabana).toBe(4);
    expect(franjas.find((f) => f.eventoId === "b")?.cabana).toBeNull();
    expect(cabanasAfectadas(franjas.find((f) => f.eventoId === "b")!, CABANAS)).toHaveLength(5);
  });

  it("une los calendarios en vez de sumarlos: el mismo evento repetido ocupa lo mismo", () => {
    const enElGeneral = evento({
      id: "evt-compartido",
      titulo: "Cabaña 3 · Ana Pérez",
      inicioFecha: "2026-09-10",
      finFecha: "2026-09-13",
    });

    const soloGeneral = ocupacionDesdeVariosCalendarios([
      { cabana: null, eventos: [enElGeneral] },
    ]);
    const enLosDos = ocupacionDesdeVariosCalendarios([
      { cabana: null, eventos: [enElGeneral] },
      { cabana: 3, eventos: [enElGeneral] },
    ]);

    /* La copia idéntica se descarta: una sola barra en el panel. */
    expect(soloGeneral).toHaveLength(1);
    expect(enLosDos).toHaveLength(1);
    expect(nochesPorCabana(enLosDos)).toEqual(nochesPorCabana(soloGeneral));
  });

  it("aunque el subcalendario lo titule distinto, la ocupación es la misma", () => {
    const soloGeneral = ocupacionDesdeVariosCalendarios([
      {
        cabana: null,
        eventos: [
          evento({ id: "g", titulo: "Cabaña 3 · Ana Pérez", inicioFecha: "2026-09-10", finFecha: "2026-09-13" }),
        ],
      },
    ]);
    const enLosDos = ocupacionDesdeVariosCalendarios([
      {
        cabana: null,
        eventos: [
          evento({ id: "g", titulo: "Cabaña 3 · Ana Pérez", inicioFecha: "2026-09-10", finFecha: "2026-09-13" }),
        ],
      },
      {
        cabana: 3,
        eventos: [
          evento({ id: "s", titulo: "Ana", inicioFecha: "2026-09-10", finFecha: "2026-09-13" }),
        ],
      },
    ]);

    expect(nochesPorCabana(enLosDos)).toEqual(nochesPorCabana(soloGeneral));
  });

  it("sigue descartando lo cancelado y lo que escribió el propio sitio", () => {
    const franjas = ocupacionDesdeVariosCalendarios([
      {
        cabana: 1,
        eventos: [
          evento({ id: "a", estado: "cancelled", inicioFecha: "2026-09-10", finFecha: "2026-09-11" }),
          evento({ id: "b", origen: ORIGEN_PROPIO, inicioFecha: "2026-09-12", finFecha: "2026-09-13" }),
          evento({ id: "c", titulo: "Marta", inicioFecha: "2026-09-14", finFecha: "2026-09-15" }),
        ],
      },
    ]);
    expect(franjas.map((f) => f.eventoId)).toEqual(["c"]);
  });

  it("sale ordenado por fecha aunque los calendarios lleguen en cualquier orden", () => {
    const franjas = ocupacionDesdeVariosCalendarios([
      {
        cabana: 5,
        eventos: [evento({ id: "tarde", titulo: "x", inicioFecha: "2026-09-20", finFecha: "2026-09-21" })],
      },
      {
        cabana: 1,
        eventos: [evento({ id: "pronto", titulo: "y", inicioFecha: "2026-09-02", finFecha: "2026-09-03" })],
      },
    ]);
    expect(franjas.map((f) => f.eventoId)).toEqual(["pronto", "tarde"]);
  });

  it("sin calendarios no hay ocupación", () => {
    expect(ocupacionDesdeVariosCalendarios([])).toEqual([]);
  });
});
