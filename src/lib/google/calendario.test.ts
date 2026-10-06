import { generateKeyPairSync } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { actualizarEvento, olvidarToken } from "./calendario";

/**
 * EL PATCH DEVUELVE AL CALENDARIO UN EVENTO QUE EL EQUIPO BORRÓ.
 *
 * Si el hotel borra en Google el evento de una reserva, Google lo deja como
 * `cancelled`. Un PATCH sin `status` lo ponía al día… y lo dejaba borrado: la
 * reserva desaparecía del calendario del hotel para siempre. Ahora el cuerpo
 * lleva `status: "confirmed"`.
 *
 * Y el fallo lleva el código HTTP: solo un 404/410 significa «ese evento ya no
 * existe»; un 429, un 5xx o un `timeout` no, y no deben crear un duplicado.
 *
 * Se prueba la función de verdad, con una clave RSA generada aquí y `fetch`
 * sustituido: ni una llamada sale a Google.
 */
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

type Peticion = { url: string; metodo: string; cuerpo: unknown };
let peticiones: Peticion[] = [];

function respuestaDe(estado: number, cuerpo: unknown): Response {
  return new Response(cuerpo === null ? null : JSON.stringify(cuerpo), { status: estado });
}

function simularGoogle(respuestaApi: () => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL | string, init?: RequestInit) => {
      const texto = String(url);
      if (texto.startsWith("https://oauth2.googleapis.com/token")) {
        return respuestaDe(200, { access_token: "token-de-prueba", expires_in: 3600 });
      }
      peticiones.push({
        url: texto,
        metodo: init?.method ?? "GET",
        cuerpo: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      });
      return respuestaApi();
    }),
  );
}

const EVENTO = {
  titulo: "Cabaña 03 · Ana Pérez · Estándar",
  inicio: "2026-12-15",
  fin: "2026-12-18",
  reservaId: "reserva-1",
};

beforeEach(() => {
  peticiones = [];
  olvidarToken();
  vi.stubEnv(
    "GOOGLE_CALENDAR_CREDENCIALES",
    JSON.stringify({ client_email: "sitio@prueba.iam.gserviceaccount.com", private_key: privateKey }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("actualizarEvento", () => {
  it("manda status «confirmed» en el PATCH: un evento borrado en Google vuelve a verse", async () => {
    simularGoogle(() => respuestaDe(200, { id: "ev-1", status: "confirmed" }));

    const resultado = await actualizarEvento("cal@group.calendar.google.com", "ev-1", EVENTO);

    expect(resultado).toEqual({ ok: true, datos: { id: "ev-1" } });
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].metodo).toBe("PATCH");
    expect(peticiones[0].cuerpo).toMatchObject({
      status: "confirmed",
      summary: EVENTO.titulo,
      start: { date: "2026-12-15" },
      end: { date: "2026-12-18" },
    });
  });

  it("un 404 o un 410 llevan su código: el evento ya no existe", async () => {
    simularGoogle(() => respuestaDe(404, { error: { message: "Not Found" } }));
    expect(await actualizarEvento("cal", "ev-1", EVENTO)).toMatchObject({ ok: false, http: 404 });

    simularGoogle(() => respuestaDe(410, { error: { message: "Resource has been deleted" } }));
    expect(await actualizarEvento("cal", "ev-1", EVENTO)).toMatchObject({ ok: false, http: 410 });
  });

  it("un 429 o un 5xx llevan su código, y no son «ya no existe»", async () => {
    simularGoogle(() => respuestaDe(429, { error: { message: "Rate Limit Exceeded" } }));
    expect(await actualizarEvento("cal", "ev-1", EVENTO)).toMatchObject({ ok: false, http: 429 });

    simularGoogle(() => respuestaDe(503, { error: { message: "Backend Error" } }));
    expect(await actualizarEvento("cal", "ev-1", EVENTO)).toMatchObject({ ok: false, http: 503 });
  });

  it("un timeout no trae código HTTP", async () => {
    simularGoogle(() => {
      const error = new Error("The operation was aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    });
    const resultado = await actualizarEvento("cal", "ev-1", EVENTO);
    expect(resultado.ok).toBe(false);
    expect(resultado).not.toHaveProperty("http");
  });
});
