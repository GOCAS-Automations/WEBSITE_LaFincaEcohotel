import { afterEach, describe, expect, it, vi } from "vitest";

import {
  contarPeticion,
  ipDeLaPeticion,
  olvidarPeticiones,
  reiniciarLimites,
  respuesta429,
} from "./limite-peticiones";

/**
 * El freno que protege el login del panel y los dos endpoints públicos.
 *
 * Se prueba aquí y no contra el servidor porque lo que importa son los números
 * exactos: cuántos intentos caben, cuándo se abre la ventana y qué pasa cuando
 * alguien acierta la contraseña. Un fallo en esto se ve como «el dueño no puede
 * entrar al panel» o como «se pueden probar mil contraseñas», y ninguna de las
 * dos aparece en una captura de pantalla.
 */

afterEach(() => {
  reiniciarLimites();
  vi.useRealTimers();
});

const LIMITE = { peticiones: 3, segundos: 60 };

describe("contarPeticion", () => {
  it("deja pasar hasta el tope y frena a partir de ahí", () => {
    expect(contarPeticion("a", LIMITE).permitido).toBe(true);
    expect(contarPeticion("a", LIMITE).permitido).toBe(true);
    expect(contarPeticion("a", LIMITE).permitido).toBe(true);
    expect(contarPeticion("a", LIMITE).permitido).toBe(false);
  });

  it("va descontando lo que queda", () => {
    expect(contarPeticion("a", LIMITE).restantes).toBe(2);
    expect(contarPeticion("a", LIMITE).restantes).toBe(1);
    expect(contarPeticion("a", LIMITE).restantes).toBe(0);
    expect(contarPeticion("a", LIMITE).restantes).toBe(0);
  });

  it("cuenta cada clave por separado", () => {
    for (let i = 0; i < 3; i++) contarPeticion("uno", LIMITE);
    expect(contarPeticion("uno", LIMITE).permitido).toBe(false);
    /* Otra IP, u otro recurso de la misma IP, empieza de cero. */
    expect(contarPeticion("dos", LIMITE).permitido).toBe(true);
  });

  it("la ventana se cura sola al pasar el tiempo", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 4; i++) contarPeticion("a", LIMITE);
    expect(contarPeticion("a", LIMITE).permitido).toBe(false);

    vi.advanceTimersByTime(59_000);
    expect(contarPeticion("a", LIMITE).permitido).toBe(false);

    /* Cumplidos los 60 s, la ventana se reinicia: nadie queda bloqueado para
       siempre. Es la propiedad que hace aceptable frenar por cuenta. */
    vi.advanceTimersByTime(2_000);
    expect(contarPeticion("a", LIMITE).permitido).toBe(true);
  });

  it("dice cuántos segundos hay que esperar, nunca cero", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 4; i++) contarPeticion("a", LIMITE);
    vi.advanceTimersByTime(59_500);
    const r = contarPeticion("a", LIMITE);
    expect(r.permitido).toBe(false);
    expect(r.esperaSegundos).toBeGreaterThanOrEqual(1);
    expect(r.esperaSegundos).toBeLessThanOrEqual(60);
  });

  it("olvidarPeticiones borra el conteo: quien acierta no arrastra sus fallos", () => {
    for (let i = 0; i < 3; i++) contarPeticion("login-cuenta:ana@x.co", LIMITE);
    expect(contarPeticion("login-cuenta:ana@x.co", LIMITE).permitido).toBe(false);

    olvidarPeticiones("login-cuenta:ana@x.co");

    expect(contarPeticion("login-cuenta:ana@x.co", LIMITE).permitido).toBe(true);
  });
});

describe("ipDeLaPeticion", () => {
  const con = (cabeceras: Record<string, string>) =>
    ipDeLaPeticion(new Request("https://x.co/", { headers: cabeceras }));

  it("toma la primera dirección de x-forwarded-for", () => {
    expect(con({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" })).toBe(
      "203.0.113.7",
    );
  });

  it("acepta x-real-ip como alternativa", () => {
    expect(con({ "x-real-ip": "203.0.113.9" })).toBe("203.0.113.9");
  });

  it("sin cabeceras devuelve `local`, para poder probarlo en desarrollo", () => {
    expect(con({})).toBe("local");
  });

  it("una cabecera vacía no produce una clave vacía", () => {
    /* Una clave vacía juntaría a todo el mundo en el mismo contador y el primer
       abusón dejaría el sitio frenado para los demás. */
    expect(con({ "x-forwarded-for": "   " })).toBe("local");
  });
});

describe("respuesta429", () => {
  it("responde 429 con Retry-After, sin caché y con el mensaje en español", async () => {
    const r = respuesta429(42);
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("42");
    expect(r.headers.get("cache-control")).toBe("no-store");
    const cuerpo = (await r.json()) as { error: string };
    expect(cuerpo.error).toMatch(/Demasiadas consultas/);
    /* Nada de jerga: este texto lo puede leer un huésped. */
    expect(cuerpo.error).not.toMatch(/rate limit/i);
  });
});
