import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SI GOOGLE NO RESPONDE, NO SE VENDE NADA.
 *
 * Hoy la base tiene cero reservas y todas las reales viven en el calendario de
 * Google del hotel. Antes, un fallo de lectura devolvía «ocupación vacía» y el
 * sitio vendía noches ocupadas. La lectura para ESCRIBIR
 * (`leerCalendarioParaEscribir`) falla cerrado y no usa la caché de cinco
 * minutos: una reserva apuntada por WhatsApp hace un minuto tiene que verse.
 *
 * La red se sustituye por un doble de `@/lib/google/calendario`.
 */
vi.mock("@/lib/google/calendario", () => ({
  accesoPermiteEscribir: vi.fn(() => true),
  calendarioConfigurado: vi.fn(() => true),
  comprobarCalendario: vi.fn(),
  configuracionDeCalendarios: vi.fn(),
  correoDeLaCuentaDeServicio: vi.fn(() => "cuenta@ejemplo.iam.gserviceaccount.com"),
  credencialConfigurada: vi.fn(() => true),
  leerCalendario: vi.fn(),
  listarCalendarios: vi.fn(),
}));

import {
  configuracionDeCalendarios,
  credencialConfigurada,
  leerCalendario,
} from "@/lib/google/calendario";
import { CalendarioSinRespuesta } from "./calendario-sin-respuesta";
import {
  choquesDelCalendarioParaEscribir,
  invalidarCacheCalendario,
  leerCalendarioParaEscribir,
  ocupacionDelCalendario,
} from "./ocupacion-externa";

const GENERAL = "general@group.calendar.google.com";
const CABANA_3 = "cab3@group.calendar.google.com";

function config(ids: { id: string; cabana: number | null }[]) {
  return {
    calendarios: ids,
    escribirEn: null,
    avisos: [],
  } as unknown as ReturnType<typeof configuracionDeCalendarios>;
}

function evento(id: string, titulo: string, inicio: string, fin: string) {
  return {
    id,
    estado: "confirmed",
    titulo,
    descripcion: null,
    inicioFecha: inicio,
    finFecha: fin,
    inicioHora: null,
    finHora: null,
    origen: null,
    reservaId: null,
  };
}

function responde(eventos: ReturnType<typeof evento>[]) {
  return { ok: true as const, datos: { eventos, nombre: "Reservas", acceso: "reader" } };
}

const NO_RESPONDE = {
  ok: false as const,
  motivo: "error" as const,
  mensaje: "Google rechazó la credencial del calendario.",
};

beforeEach(() => {
  invalidarCacheCalendario();
  vi.mocked(leerCalendario).mockReset();
  vi.mocked(credencialConfigurada).mockReturnValue(true);
  vi.mocked(configuracionDeCalendarios).mockReturnValue(
    config([{ id: GENERAL, cabana: null }]),
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("leerCalendarioParaEscribir", () => {
  it("sin calendarios configurados no cambia nada: no lanza y no llama a Google", async () => {
    vi.mocked(configuracionDeCalendarios).mockReturnValue(config([]));
    const lectura = await leerCalendarioParaEscribir("2026-10-16", "2026-10-18");
    expect(lectura.estado).toBe("sin_configurar");
    expect(leerCalendario).not.toHaveBeenCalled();
  });

  it("con calendarios pero sin credencial que cargue: falla cerrado", async () => {
    vi.mocked(credencialConfigurada).mockReturnValue(false);
    await expect(
      leerCalendarioParaEscribir("2026-10-16", "2026-10-18"),
    ).rejects.toBeInstanceOf(CalendarioSinRespuesta);
  });

  it("si Google no responde, lanza CalendarioSinRespuesta (antes devolvía ocupación vacía)", async () => {
    vi.mocked(leerCalendario).mockResolvedValue(NO_RESPONDE);
    await expect(
      leerCalendarioParaEscribir("2026-10-16", "2026-10-18"),
    ).rejects.toBeInstanceOf(CalendarioSinRespuesta);
    /* La lectura para pintar sigue sin lanzar. */
    const paraPintar = await ocupacionDelCalendario("2026-10-16", "2026-10-18");
    expect(paraPintar.estado).toBe("error");
  });

  it("si falla uno de varios calendarios, también falla cerrado", async () => {
    vi.mocked(configuracionDeCalendarios).mockReturnValue(
      config([
        { id: GENERAL, cabana: null },
        { id: CABANA_3, cabana: 3 },
      ]),
    );
    vi.mocked(leerCalendario).mockImplementation(async (id) =>
      id === GENERAL ? NO_RESPONDE : responde([]),
    );
    await expect(
      leerCalendarioParaEscribir("2026-10-16", "2026-10-18"),
    ).rejects.toBeInstanceOf(CalendarioSinRespuesta);
  });

  it("no usa la caché: una reserva apuntada en Google hace un minuto se ve", async () => {
    vi.mocked(leerCalendario).mockResolvedValueOnce(responde([]));
    const pintada = await ocupacionDelCalendario("2026-10-16", "2026-10-18");
    expect(pintada.ocupacion).toEqual([]);

    /* El equipo apunta por WhatsApp «Ana Pérez cabaña 3» en Google. */
    vi.mocked(leerCalendario).mockResolvedValue(
      responde([evento("g1", "Ana Pérez cabaña 3", "2026-10-16", "2026-10-18")]),
    );

    /* La pantalla sigue con su caché de cinco minutos… */
    expect((await ocupacionDelCalendario("2026-10-16", "2026-10-18")).deCache).toBe(true);
    /* …pero quien va a escribir pregunta de nuevo y ve el evento. */
    const choques = await choquesDelCalendarioParaEscribir(
      "Cabaña 03",
      "2026-10-16",
      "2026-10-18",
    );
    expect(leerCalendario).toHaveBeenCalledTimes(2);
    expect(choques.map((franja) => franja.titulo)).toEqual(["Ana Pérez cabaña 3"]);

    /* Y lo leído refresca la caché de las pantallas. */
    const despues = await ocupacionDelCalendario("2026-10-16", "2026-10-18");
    expect(despues.ocupacion).toHaveLength(1);
  });
});
