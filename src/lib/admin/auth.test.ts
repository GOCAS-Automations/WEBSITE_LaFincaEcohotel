import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La puerta del panel (`requireAdmin()`), con Supabase y la navegación de Next
 * simulados. Lo que se vigila: una sesión válida NO basta, hace falta un rol
 * del panel en `app_metadata`. El hallazgo de la auditoría del 05/10/2026 fue
 * justo ese: una cuenta sin rol se trataba como «equipo», y con el registro
 * público encendido cualquiera podía crearse una.
 */

const supabase = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  crearClienteServidor: async () => ({
    auth: { getUser: supabase.getUser, signOut: supabase.signOut },
  }),
}));

/* `redirect()` de Next lanza para cortar el render; aquí lanza un error que
   lleva el destino, para poder comprobarlo. */
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw Object.assign(new Error(`redirect:${destino}`), { destino });
  },
}));

import { leerSesionDelPanel, requireAdmin, requirePropietario } from "./auth";
import { rolDeMetadatos } from "./roles";
import { ErrorDePermiso } from "./validacion";

function cuenta(
  appMetadata: Record<string, unknown>,
  userMetadata: Record<string, unknown> = {},
) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "prueba@ejemplo.com",
    aud: "authenticated",
    created_at: "2026-10-05T00:00:00Z",
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  };
}

function conSesion(usuario: ReturnType<typeof cuenta> | null, error: unknown = null) {
  supabase.getUser.mockResolvedValue({ data: { user: usuario }, error });
}

async function destinoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
  } catch (error) {
    const destino = (error as { destino?: string }).destino;
    if (destino) return destino;
    throw error;
  }
  throw new Error("Se esperaba una redirección y la puerta dejó pasar.");
}

beforeEach(() => {
  supabase.getUser.mockReset();
  supabase.signOut.mockReset();
  supabase.signOut.mockResolvedValue({ error: null });
});

describe("rolDeMetadatos", () => {
  it("devuelve el rol solo si es uno del panel", () => {
    expect(rolDeMetadatos({ rol: "propietario" })).toBe("propietario");
    expect(rolDeMetadatos({ rol: "equipo" })).toBe("equipo");
  });

  it("sin rol, con uno desconocido o sin metadatos: null, nunca «equipo»", () => {
    expect(rolDeMetadatos({})).toBeNull();
    expect(rolDeMetadatos({ rol: "admin" })).toBeNull();
    expect(rolDeMetadatos({ rol: "PROPIETARIO" })).toBeNull();
    expect(rolDeMetadatos({ rol: ["propietario"] })).toBeNull();
    expect(rolDeMetadatos(null)).toBeNull();
    expect(rolDeMetadatos(undefined)).toBeNull();
  });
});

describe("requireAdmin()", () => {
  it("sin sesión: al login, sin más", async () => {
    conSesion(null);
    expect(await destinoDe(requireAdmin())).toBe("/admin/login");
    expect(supabase.signOut).not.toHaveBeenCalled();
  });

  it("si Supabase no valida el JWT: al login", async () => {
    conSesion(null, { message: "invalid JWT" });
    expect(await destinoDe(requireAdmin())).toBe("/admin/login");
  });

  it("sesión válida sin rol: cierra la sesión y manda al login con el aviso", async () => {
    conSesion(cuenta({ provider: "email", providers: ["email"] }));
    expect(await destinoDe(requireAdmin())).toBe("/admin/login?motivo=sin-acceso");
    expect(supabase.signOut).toHaveBeenCalledTimes(1);
  });

  it("rol que no es del panel: igual que sin rol", async () => {
    conSesion(cuenta({ rol: "admin" }));
    expect(await destinoDe(requireAdmin())).toBe("/admin/login?motivo=sin-acceso");
    expect(supabase.signOut).toHaveBeenCalledTimes(1);
  });

  it("rol escrito en user_metadata (lo edita el propio usuario): se rechaza", async () => {
    conSesion(cuenta({}, { rol: "propietario" }));
    expect(await destinoDe(requireAdmin())).toBe("/admin/login?motivo=sin-acceso");
    expect(supabase.signOut).toHaveBeenCalledTimes(1);
  });

  it("aunque cerrar la sesión falle, no deja pasar", async () => {
    conSesion(cuenta({}));
    supabase.signOut.mockRejectedValue(new Error("sin red"));
    expect(await destinoDe(requireAdmin())).toBe("/admin/login?motivo=sin-acceso");
  });

  it("equipo: entra con su rol", async () => {
    conSesion(cuenta({ rol: "equipo" }));
    const sesion = await requireAdmin();
    expect(sesion.rol).toBe("equipo");
    expect(sesion.usuario.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(supabase.signOut).not.toHaveBeenCalled();
  });

  it("propietario: entra con su rol, aunque user_metadata diga otra cosa", async () => {
    conSesion(cuenta({ rol: "propietario" }, { rol: "equipo" }));
    const sesion = await requireAdmin();
    expect(sesion.rol).toBe("propietario");
  });
});

describe("requirePropietario()", () => {
  it("equipo: error de permiso, no redirección", async () => {
    conSesion(cuenta({ rol: "equipo" }));
    await expect(requirePropietario()).rejects.toBeInstanceOf(ErrorDePermiso);
  });

  it("propietario: pasa", async () => {
    conSesion(cuenta({ rol: "propietario" }));
    await expect(requirePropietario()).resolves.toMatchObject({ rol: "propietario" });
  });

  it("propietario solo en user_metadata: ni siquiera llega a la comprobación", async () => {
    conSesion(cuenta({}, { rol: "propietario" }));
    expect(await destinoDe(requirePropietario())).toBe("/admin/login?motivo=sin-acceso");
  });
});

describe("leerSesionDelPanel() (la usan los Route Handlers de /admin/api)", () => {
  it("distingue sin sesión, sin rol y ok sin redirigir", async () => {
    conSesion(null);
    expect((await leerSesionDelPanel()).estado).toBe("sin-sesion");

    conSesion(cuenta({}, { rol: "propietario" }));
    expect((await leerSesionDelPanel()).estado).toBe("sin-rol");

    conSesion(cuenta({ rol: "equipo" }));
    const ok = await leerSesionDelPanel();
    expect(ok).toMatchObject({ estado: "ok", rol: "equipo" });

    /* Leer la sesión no cierra nada: eso lo decide quien la lee. */
    expect(supabase.signOut).not.toHaveBeenCalled();
  });
});
