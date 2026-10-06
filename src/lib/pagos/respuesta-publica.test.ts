import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * La respuesta PÚBLICA de `/api/reservar` no lleva datos de otros huéspedes.
 *
 * Cuando alguien pedía unas noches ya ocupadas, el endpoint devolvía al
 * navegador el texto del choque: el nombre del otro huésped, el código de su
 * reserva o el título del evento del calendario del hotel. Con un POST a mano
 * cualquiera podía saber quién se aloja cuándo (Ley 1581 de 2012).
 *
 * Aquí se prueba el Route Handler entero —la respuesta HTTP es lo que hay que
 * vigilar— con la base, el precio y Google sustituidos por dobles. Si alguien
 * vuelve a pasar `describirChoques()` hacia fuera, esto falla.
 */
vi.mock("../supabase/admin", () => ({ crearClienteAdmin: vi.fn() }));
vi.mock("./cotizar-en-servidor", () => ({ cotizarEnServidor: vi.fn() }));
vi.mock("../reserva/liberar-vencidas", () => ({
  liberarReservasVencidas: vi.fn(async () => undefined),
}));
vi.mock("../reserva/ocupacion-externa", () => ({
  choquesDelCalendario: vi.fn(),
  choquesDelCalendarioParaEscribir: vi.fn(),
}));

import { POST } from "../../app/api/reservar/route";
import { mensajeNochesOcupadasParaHuesped } from "../admin/disponibilidad";
import { CalendarioSinRespuesta } from "../reserva/calendario-sin-respuesta";
import { choquesDelCalendarioParaEscribir } from "../reserva/ocupacion-externa";
import { crearClienteAdmin } from "../supabase/admin";
import { hoyEnBogota, sumarDias } from "../utils/formato";
import { cotizarEnServidor } from "./cotizar-en-servidor";

const ENTRADA = sumarDias(hoyEnBogota(), 20);
const SALIDA = sumarDias(ENTRADA, 2);

/* Los datos ajenos que NO pueden salir. */
const OTRO_HUESPED = "Ana Pérez Gómez";
const OTRO_CODIGO = "LF-2026-0042";
const TITULO_EVENTO = "Cristian Arcila cabaña 3";
const TITULO_SIN_CABANA = "Cumpleaños de Laura Restrepo";

/** Un cliente de Supabase de mentira: cada tabla devuelve sus filas. */
function clienteFalso(filas: Record<string, unknown>): SupabaseClient {
  const consulta = (tabla: string) => {
    const resultado = { data: filas[tabla] ?? [], error: null };
    const cadena: Record<string, unknown> = {
      select: () => cadena,
      eq: () => cadena,
      in: () => cadena,
      maybeSingle: () => Promise.resolve(resultado),
      then: (resolver: (valor: unknown) => unknown) =>
        Promise.resolve(resultado).then(resolver),
    };
    return cadena;
  };
  return { from: consulta } as unknown as SupabaseClient;
}

function peticion(ip: string): Request {
  return new Request("http://localhost:3000/api/reservar", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({
      tipo: "hospedaje",
      entrada: ENTRADA,
      salida: SALIDA,
      cabana: "cabana-03",
      personas: 2,
      porcentajeAnticipo: 50,
      extras: [],
      nombre: "Huésped Nuevo",
      correo: "nuevo@example.com",
      telefono: "+57 300 000 0000",
      autorizaDatos: true,
    }),
  });
}

let avisos: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("BOLD_IDENTITY_KEY", "llave-de-prueba");
  vi.stubEnv("BOLD_PRIVATE_KEY", "secreto-de-prueba");
  vi.stubEnv("PAGOS_ACTIVOS", "1");
  vi.mocked(cotizarEnServidor).mockResolvedValue({
    ok: true,
    cotizacion: {
      tipo: "hospedaje",
      alojamientoId: "c3",
      alojamientoNombre: "Cabaña 03",
      entrada: ENTRADA,
      salida: SALIDA,
      pago: { anticipo: 400_000, total: 800_000 },
    },
  } as unknown as Awaited<ReturnType<typeof cotizarEnServidor>>);
  vi.mocked(choquesDelCalendarioParaEscribir).mockResolvedValue([]);
  avisos = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  avisos.mockRestore();
});

describe("/api/reservar con noches ocupadas", () => {
  it("una reserva de otro huésped: 409 genérico, sin su nombre ni su código", async () => {
    vi.mocked(crearClienteAdmin).mockReturnValue(
      clienteFalso({
        reservas: [
          {
            id: "r1",
            codigo: OTRO_CODIGO,
            huesped_nombre: OTRO_HUESPED,
            estancia: `[${ENTRADA},${SALIDA})`,
            estado: "confirmada",
            expira_at: null,
          },
        ],
        bloqueos: [],
        alojamientos: { nombre: "Cabaña 03" },
      }),
    );

    const respuesta = await POST(peticion("203.0.113.10"));
    const crudo = await respuesta.text();

    expect(respuesta.status).toBe(409);
    expect(JSON.parse(crudo)).toEqual({
      error:
        "Esas noches ya no están disponibles en la Cabaña 03. Elige otras fechas o escríbenos por WhatsApp.",
    });
    for (const ajeno of [OTRO_HUESPED, "Ana", "Pérez", OTRO_CODIGO]) {
      expect(crudo).not.toContain(ajeno);
    }
    /* El detalle no se pierde: queda en el registro del servidor. */
    expect(String(avisos.mock.calls.flat().join(" "))).toContain(OTRO_HUESPED);
  });

  it("un evento del calendario del hotel: la respuesta no lleva su título", async () => {
    vi.mocked(crearClienteAdmin).mockReturnValue(
      clienteFalso({ reservas: [], bloqueos: [], alojamientos: { nombre: "Cabaña 03" } }),
    );
    vi.mocked(choquesDelCalendarioParaEscribir).mockResolvedValue([
      {
        eventoId: "g1",
        titulo: TITULO_EVENTO,
        inicio: ENTRADA,
        fin: SALIDA,
        cabana: 3,
        motivo: "cabana_reconocida",
      },
      {
        eventoId: "g2",
        titulo: TITULO_SIN_CABANA,
        inicio: ENTRADA,
        fin: SALIDA,
        cabana: null,
        motivo: "sin_cabana",
      },
    ]);

    const respuesta = await POST(peticion("203.0.113.11"));
    const crudo = await respuesta.text();

    expect(respuesta.status).toBe(409);
    for (const ajeno of [TITULO_EVENTO, "Cristian", "Arcila", TITULO_SIN_CABANA, "Laura"]) {
      expect(crudo).not.toContain(ajeno);
    }
    expect(crudo).toContain("Cabaña 03");
  });
});

describe("/api/reservar con el calendario de Google caído", () => {
  it("falla cerrado: 503 con el mensaje en español y sin escribir nada", async () => {
    const inserciones: string[] = [];
    const base = clienteFalso({ reservas: [], bloqueos: [], alojamientos: { nombre: "Cabaña 03" } });
    const desde = base.from.bind(base);
    (base as unknown as { from: (tabla: string) => unknown }).from = (tabla: string) => {
      const consulta = desde(tabla) as unknown as Record<string, unknown>;
      consulta.insert = () => {
        inserciones.push(tabla);
        return consulta;
      };
      return consulta;
    };
    vi.mocked(crearClienteAdmin).mockReturnValue(base);
    vi.mocked(choquesDelCalendarioParaEscribir).mockRejectedValue(
      new CalendarioSinRespuesta("Google rechazó la credencial del calendario (401)."),
    );
    const errores = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const respuesta = await POST(peticion("203.0.113.12"));

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({
      error:
        "No pudimos comprobar la disponibilidad en este momento. Intenta en unos minutos o escríbenos por WhatsApp.",
    });
    expect(inserciones).toEqual([]);
    errores.mockRestore();
  });
});

describe("mensajeNochesOcupadasParaHuesped", () => {
  it("sin cabaña conocida, no inventa una", () => {
    expect(mensajeNochesOcupadasParaHuesped(null)).toBe(
      "Esas noches ya no están disponibles en esa cabaña. Elige otras fechas o escríbenos por WhatsApp.",
    );
  });
});
