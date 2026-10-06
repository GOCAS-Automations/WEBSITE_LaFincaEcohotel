import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El middleware del panel con Supabase simulado. Lo que se vigila: una sesión
 * válida sin rol del panel (`app_metadata.rol`) se trata como si no hubiera
 * sesión, se cierra —las cookies salen vaciadas en la misma respuesta— y se
 * manda al login con el aviso. El rol jamás se lee de `user_metadata`.
 */

const COOKIE = "sb-prueba-auth-token";

const simulado = vi.hoisted(() => ({
  usuario: null as unknown,
  signOut: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _clave: string,
    opciones: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options: Record<string, unknown> }[],
        ) => void;
      };
    },
  ) => ({
    auth: {
      getUser: async () => ({ data: { user: simulado.usuario }, error: null }),
      /* Como la librería real: al cerrar sesión llama a `setAll` con la
         cookie vaciada y `maxAge: 0`. */
      signOut: async () => {
        simulado.signOut();
        opciones.cookies.setAll([
          { name: COOKIE, value: "", options: { path: "/", maxAge: 0 } },
        ]);
        return { error: null };
      },
    },
  }),
}));

import { actualizarSesion } from "./middleware";

function cuenta(
  appMetadata: Record<string, unknown>,
  userMetadata: Record<string, unknown> = {},
) {
  return {
    id: "00000000-0000-0000-0000-000000000002",
    aud: "authenticated",
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  };
}

function peticion(ruta: string) {
  return new NextRequest(`http://localhost${ruta}`, {
    headers: { cookie: `${COOKIE}=token-de-prueba` },
  });
}

function destino(respuesta: Response): string | null {
  const ubicacion = respuesta.headers.get("location");
  if (!ubicacion) return null;
  const url = new URL(ubicacion);
  return `${url.pathname}${url.search}`;
}

function cookieVaciada(respuesta: Response): boolean {
  const cabecera = respuesta.headers.get("set-cookie") ?? "";
  return cabecera.includes(`${COOKIE}=;`) && /max-age=0/i.test(cabecera);
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://prueba.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "clave-anonima-de-prueba");
  simulado.usuario = null;
  simulado.signOut.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware del panel", () => {
  it("sin sesión: al login, recordando a dónde iba", async () => {
    const respuesta = await actualizarSesion(peticion("/admin/reservas?mes=2026-10"));
    expect(destino(respuesta)).toBe(
      "/admin/login?next=%2Fadmin%2Freservas%3Fmes%3D2026-10",
    );
    expect(simulado.signOut).not.toHaveBeenCalled();
  });

  it("sesión sin rol: cierra la sesión, vacía la cookie y manda al login con el aviso", async () => {
    simulado.usuario = cuenta({ provider: "email", providers: ["email"] });
    const respuesta = await actualizarSesion(peticion("/admin/reservas"));
    expect(destino(respuesta)).toBe("/admin/login?motivo=sin-acceso");
    expect(simulado.signOut).toHaveBeenCalledTimes(1);
    expect(cookieVaciada(respuesta)).toBe(true);
    expect(respuesta.headers.get("cache-control")).toContain("no-store");
  });

  it("rol que no es del panel: igual que sin rol", async () => {
    simulado.usuario = cuenta({ rol: "superadmin" });
    const respuesta = await actualizarSesion(peticion("/admin"));
    expect(destino(respuesta)).toBe("/admin/login?motivo=sin-acceso");
    expect(cookieVaciada(respuesta)).toBe(true);
  });

  it("rol escrito en user_metadata: se rechaza", async () => {
    simulado.usuario = cuenta({}, { rol: "propietario" });
    const respuesta = await actualizarSesion(peticion("/admin/usuarios"));
    expect(destino(respuesta)).toBe("/admin/login?motivo=sin-acceso");
    expect(simulado.signOut).toHaveBeenCalledTimes(1);
  });

  it("las rutas de /admin/api también quedan cerradas a una cuenta sin rol", async () => {
    simulado.usuario = cuenta({});
    const respuesta = await actualizarSesion(peticion("/admin/api/ocupacion?desde=2026-10-01"));
    expect(destino(respuesta)).toBe("/admin/login?motivo=sin-acceso");
  });

  it("sesión sin rol en el propio login: la cierra pero no redirige (sin bucle)", async () => {
    simulado.usuario = cuenta({});
    const respuesta = await actualizarSesion(peticion("/admin/login?motivo=sin-acceso"));
    expect(destino(respuesta)).toBeNull();
    expect(simulado.signOut).toHaveBeenCalledTimes(1);
    expect(cookieVaciada(respuesta)).toBe(true);
  });

  it("equipo: pasa", async () => {
    simulado.usuario = cuenta({ rol: "equipo" });
    const respuesta = await actualizarSesion(peticion("/admin/reservas"));
    expect(destino(respuesta)).toBeNull();
    expect(respuesta.status).toBe(200);
    expect(simulado.signOut).not.toHaveBeenCalled();
  });

  it("propietario: pasa, y desde el login va al panel", async () => {
    simulado.usuario = cuenta({ rol: "propietario" });
    const panel = await actualizarSesion(peticion("/admin/usuarios"));
    expect(destino(panel)).toBeNull();

    const login = await actualizarSesion(peticion("/admin/login"));
    expect(destino(login)).toBe("/admin");
    expect(simulado.signOut).not.toHaveBeenCalled();
  });
});
