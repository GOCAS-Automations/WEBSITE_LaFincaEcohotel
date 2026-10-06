import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signOut = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { signInWithPassword, signOut } }),
}));

import {
  leerCambioDeContrasena,
  traducirErrorDeCambio,
  verificarContrasenaActual,
} from "./mi-contrasena";
import { ErrorDeValidacion } from "./validacion";

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) form.set(clave, valor);
  return form;
}

function mensajeDe(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorDeValidacion);
    return (error as Error).message;
  }
  throw new Error("Se esperaba un ErrorDeValidacion.");
}

describe("leerCambioDeContrasena", () => {
  const BUENA = "cafe con neblina";

  it("acepta la actual y una nueva repetida igual", () => {
    expect(
      leerCambioDeContrasena(
        formulario({ actual: "temporal-123", nueva: BUENA, repetida: BUENA }),
      ),
    ).toEqual({ actual: "temporal-123", nueva: BUENA });
  });

  it("pide la actual", () => {
    expect(
      mensajeDe(() =>
        leerCambioDeContrasena(formulario({ actual: "", nueva: BUENA, repetida: BUENA })),
      ),
    ).toBe("Escribe tu contraseña actual.");
  });

  it("exige el mínimo de largo y dice cuántos caracteres tiene", () => {
    expect(
      mensajeDe(() =>
        leerCambioDeContrasena(
          formulario({ actual: "x", nueva: "corta", repetida: "corta" }),
        ),
      ),
    ).toBe(
      "La contraseña nueva debe tener al menos 10 caracteres. La que escribiste tiene 5.",
    );
  });

  it("la repetida tiene que ser igual", () => {
    expect(
      mensajeDe(() =>
        leerCambioDeContrasena(
          formulario({ actual: "x", nueva: BUENA, repetida: `${BUENA}!` }),
        ),
      ),
    ).toBe("La contraseña nueva y la repetida no son iguales. Escríbelas otra vez.");
  });

  it("la nueva no puede ser la misma de antes", () => {
    expect(
      mensajeDe(() =>
        leerCambioDeContrasena(formulario({ actual: BUENA, nueva: BUENA, repetida: BUENA })),
      ),
    ).toBe("La contraseña nueva tiene que ser distinta de la actual.");
  });

  it("no pasa de 72 caracteres (el límite de bcrypt)", () => {
    const larga = "a".repeat(73);
    expect(
      mensajeDe(() =>
        leerCambioDeContrasena(formulario({ actual: "x", nueva: larga, repetida: larga })),
      ),
    ).toBe("La contraseña nueva no puede pasar de 72 caracteres.");
  });
});

describe("verificarContrasenaActual", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "clave-anonima");
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInWithPassword.mockReset();
    signOut.mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("si es la correcta, cierra SOLO la sesión de prueba", async () => {
    signInWithPassword.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    await expect(verificarContrasenaActual("a@b.co", "buena")).resolves.toBeUndefined();
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "buena" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("si no lo es, lo dice en español", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials", status: 400, code: "invalid_credentials" },
    });
    await expect(verificarContrasenaActual("a@b.co", "mala")).rejects.toThrow(
      "La contraseña actual no es correcta. Escríbela otra vez.",
    );
  });

  it("demasiados intentos: espera unos minutos", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Request rate limit reached", status: 429 },
    });
    await expect(verificarContrasenaActual("a@b.co", "x")).rejects.toThrow(
      /demasiados intentos/,
    );
  });
});

describe("traducirErrorDeCambio", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("traduce los casos que la persona puede resolver", () => {
    expect(
      traducirErrorDeCambio({
        message: "New password should be different from the old password.",
        code: "same_password",
        status: 422,
      }).message,
    ).toBe("La contraseña nueva tiene que ser distinta de la actual.");
    expect(
      traducirErrorDeCambio({ message: "Password is known to be weak", code: "weak_password" }),
    ).toBeInstanceOf(ErrorDeValidacion);
  });

  it("lo desconocido no es un ErrorDeValidacion (sale el mensaje genérico)", () => {
    expect(traducirErrorDeCambio({ message: "boom" })).not.toBeInstanceOf(ErrorDeValidacion);
  });
});
