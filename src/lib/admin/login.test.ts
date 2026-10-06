import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { reiniciarLimites } from "@/lib/api/limite-peticiones";
import {
  CORREO_SENUELO,
  LIMITE_POR_CUENTA,
  LIMITE_POR_IP,
  MENSAJE_CREDENCIALES,
  MENSAJE_ES_CORREO,
  MENSAJE_FALTAN_DATOS,
  TIEMPO_MINIMO_FALLO_MS,
  intentarEntrar,
  type PiezasDelLogin,
} from "./login";
import { MENSAJE_SIN_ACCESO } from "./roles";

const CORREO_ADMIN = "dueno@ejemplo.co";
const CLAVE_BUENA = "cafe-niebla-2026";

/**
 * Piezas falsas: una sola cuenta, `admin`, con su correo y su contraseña. El
 * reloj avanza solo lo que se le diga, así el «tiempo mínimo» se puede medir.
 */
function piezas(opciones: { rol?: string | null; latencia?: number } = {}) {
  let reloj = 0;
  const latencia = opciones.latencia ?? 300;
  const rol = opciones.rol === undefined ? "propietario" : opciones.rol;
  const p = {
    buscarCorreo: vi.fn(async (usuario: string) => {
      reloj += 50;
      return usuario === "admin" ? CORREO_ADMIN : null;
    }),
    iniciarSesion: vi.fn(async (correo: string, clave: string) => {
      reloj += latencia;
      if (correo === CORREO_ADMIN && clave === CLAVE_BUENA) {
        return {
          ok: true as const,
          appMetadata: rol ? { rol, usuario: "admin" } : { usuario: "admin" },
        };
      }
      return { ok: false as const };
    }),
    intentoSenuelo: vi.fn(async () => {
      reloj += latencia / 3;
    }),
    cerrarSesion: vi.fn(async () => undefined),
    esperar: vi.fn(async (ms: number) => {
      reloj += ms;
    }),
    ahora: () => reloj,
    azar: () => 0.5,
  } satisfies PiezasDelLogin;
  return { p, tiempo: () => reloj };
}

const entrar = (usuario: string, contrasena: string, p: PiezasDelLogin, ip = "1.1.1.1") =>
  intentarEntrar({ usuario, contrasena, ip }, p);

beforeEach(() => reiniciarLimites());

describe("intentarEntrar — bien", () => {
  it("entra con usuario y contraseña, sin esperas añadidas", async () => {
    const { p } = piezas();
    expect(await entrar("admin", CLAVE_BUENA, p)).toEqual({ ok: true });
    expect(p.buscarCorreo).toHaveBeenCalledWith("admin");
    expect(p.iniciarSesion).toHaveBeenCalledWith(CORREO_ADMIN, CLAVE_BUENA);
    expect(p.esperar).not.toHaveBeenCalled();
    expect(p.intentoSenuelo).not.toHaveBeenCalled();
  });

  it("normaliza: mayúsculas y espacios alrededor no importan", async () => {
    const { p } = piezas();
    expect(await entrar("  ADMIN ", CLAVE_BUENA, p)).toEqual({ ok: true });
    expect(p.buscarCorreo).toHaveBeenCalledWith("admin");
  });

  it("la contraseña no se recorta ni se cambia", async () => {
    const { p } = piezas();
    expect(await entrar("admin", ` ${CLAVE_BUENA}`, p)).toEqual({
      ok: false,
      mensaje: MENSAJE_CREDENCIALES,
    });
  });
});

describe("intentarEntrar — sin enumeración", () => {
  it("usuario inexistente y contraseña mala: mismo mensaje", async () => {
    const a = piezas();
    const b = piezas();
    const inexistente = await entrar("nadie", CLAVE_BUENA, a.p);
    const malaClave = await entrar("admin", "otra-cosa-123", b.p);
    expect(inexistente).toEqual({ ok: false, mensaje: MENSAJE_CREDENCIALES });
    expect(malaClave).toEqual(inexistente);
  });

  it("usuario inexistente: hace un intento señuelo, no un inicio de sesión de verdad", async () => {
    const { p } = piezas();
    await entrar("nadie", "lo-que-sea-123", p);
    expect(p.iniciarSesion).not.toHaveBeenCalled();
    expect(p.intentoSenuelo).toHaveBeenCalledWith(CORREO_SENUELO, "lo-que-sea-123");
  });

  it("los dos fallos tardan lo mismo (el suelo de tiempo tapa la diferencia)", async () => {
    const a = piezas({ latencia: 300 });
    const b = piezas({ latencia: 300 });
    await entrar("nadie", CLAVE_BUENA, a.p);
    await entrar("admin", "otra-cosa-123", b.p);
    expect(a.tiempo()).toBe(b.tiempo());
    expect(a.tiempo()).toBeGreaterThanOrEqual(TIEMPO_MINIMO_FALLO_MS);
  });

  it("si Supabase tarda más que el suelo, no se espera de más", async () => {
    const { p, tiempo } = piezas({ latencia: 2000 });
    await entrar("admin", "otra-cosa-123", p);
    expect(p.esperar).not.toHaveBeenCalled();
    expect(tiempo()).toBe(2050);
  });

  it("un usuario con formato imposible ni se consulta, y responde igual", async () => {
    const { p } = piezas();
    expect(await entrar("j mejia", CLAVE_BUENA, p)).toEqual({
      ok: false,
      mensaje: MENSAJE_CREDENCIALES,
    });
    expect(p.buscarCorreo).not.toHaveBeenCalled();
    expect(p.intentoSenuelo).toHaveBeenCalled();
  });

  it("si un error tumba el señuelo, el mensaje sigue siendo el mismo", async () => {
    const { p } = piezas();
    p.intentoSenuelo.mockRejectedValueOnce(new Error("red caída"));
    expect(await entrar("nadie", CLAVE_BUENA, p)).toEqual({
      ok: false,
      mensaje: MENSAJE_CREDENCIALES,
    });
  });
});

describe("intentarEntrar — se escribió el correo", () => {
  it("orienta a usar el usuario, sin consultar nada", async () => {
    const { p } = piezas();
    expect(await entrar(CORREO_ADMIN, CLAVE_BUENA, p)).toEqual({
      ok: false,
      mensaje: MENSAJE_ES_CORREO,
    });
    expect(MENSAJE_ES_CORREO).toMatch(/^Entra con tu usuario, no con tu correo\./);
    expect(p.buscarCorreo).not.toHaveBeenCalled();
    expect(p.iniciarSesion).not.toHaveBeenCalled();
  });

  it("el mismo mensaje para un correo que no tiene cuenta", async () => {
    const { p } = piezas();
    expect(await entrar("cualquiera@gmail.com", "x", p)).toEqual({
      ok: false,
      mensaje: MENSAJE_ES_CORREO,
    });
  });
});

describe("intentarEntrar — datos que faltan y cuentas sin rol", () => {
  it("pide usuario y contraseña", async () => {
    const { p } = piezas();
    expect(await entrar("  ", CLAVE_BUENA, p)).toEqual({ ok: false, mensaje: MENSAJE_FALTAN_DATOS });
    expect(await entrar("admin", "", p)).toEqual({ ok: false, mensaje: MENSAJE_FALTAN_DATOS });
  });

  it("contraseña buena pero cuenta sin rol: se cierra y no entra", async () => {
    const { p } = piezas({ rol: null });
    expect(await entrar("admin", CLAVE_BUENA, p)).toEqual({
      ok: false,
      mensaje: MENSAJE_SIN_ACCESO,
    });
    expect(p.cerrarSesion).toHaveBeenCalled();
  });

  it("un error de la base sube (la acción lo convierte en «vuelve a intentarlo»)", async () => {
    const { p } = piezas();
    p.buscarCorreo.mockRejectedValueOnce(new Error("sin conexión"));
    await expect(entrar("admin", CLAVE_BUENA, p)).rejects.toThrow("sin conexión");
  });
});

describe("intentarEntrar — límites de intentos", () => {
  it(`por usuario: ${LIMITE_POR_CUENTA.peticiones} intentos y luego espera, aunque la contraseña sea buena`, async () => {
    const { p } = piezas();
    for (let i = 0; i < LIMITE_POR_CUENTA.peticiones; i += 1) {
      expect(await entrar("admin", "mala-mala-1", p, `10.0.0.${i}`)).toEqual({
        ok: false,
        mensaje: MENSAJE_CREDENCIALES,
      });
    }
    const bloqueado = await entrar("admin", CLAVE_BUENA, p, "10.0.1.1");
    expect(bloqueado.ok).toBe(false);
    expect(!bloqueado.ok && bloqueado.mensaje).toBe(
      "Demasiados intentos seguidos. Espera 5 minutos y vuelve a intentarlo. Si no recuerdas tu contraseña, pídele al propietario que te la restablezca desde el panel.",
    );
    expect(p.iniciarSesion).toHaveBeenCalledTimes(LIMITE_POR_CUENTA.peticiones);
  });

  it("la clave por cuenta es el usuario normalizado: «ADMIN» y «admin» cuentan juntos", async () => {
    const { p } = piezas();
    for (let i = 0; i < LIMITE_POR_CUENTA.peticiones; i += 1) {
      await entrar(i % 2 ? "ADMIN" : " admin", "mala-mala-1", p, `10.0.0.${i}`);
    }
    const bloqueado = await entrar("Admin", CLAVE_BUENA, p, "10.0.9.9");
    expect(bloqueado.ok).toBe(false);
    expect(!bloqueado.ok && bloqueado.mensaje).toMatch(/^Demasiados intentos seguidos/);
  });

  it("un usuario inexistente se frena igual que uno real (no delata cuál existe)", async () => {
    const { p } = piezas();
    for (let i = 0; i < LIMITE_POR_CUENTA.peticiones; i += 1) {
      await entrar("nadie", "mala-mala-1", p, `10.0.0.${i}`);
    }
    const bloqueado = await entrar("nadie", "mala-mala-1", p, "10.0.9.9");
    expect(!bloqueado.ok && bloqueado.mensaje).toMatch(/^Demasiados intentos seguidos/);
  });

  it(`por IP: ${LIMITE_POR_IP.peticiones} intentos contra usuarios distintos y luego espera`, async () => {
    const { p } = piezas();
    for (let i = 0; i < LIMITE_POR_IP.peticiones; i += 1) {
      await entrar(`usuario-${i}`, "mala-mala-1", p, "9.9.9.9");
    }
    const bloqueado = await entrar("admin", CLAVE_BUENA, p, "9.9.9.9");
    expect(!bloqueado.ok && bloqueado.mensaje).toBe(
      "Demasiados intentos seguidos. Espera 15 minutos y vuelve a intentarlo. Si no recuerdas tu contraseña, pídele al propietario que te la restablezca desde el panel.",
    );
  });

  it("acertar borra los fallos anteriores", async () => {
    const { p } = piezas();
    for (let i = 0; i < LIMITE_POR_CUENTA.peticiones - 1; i += 1) {
      await entrar("admin", "mala-mala-1", p);
    }
    expect(await entrar("admin", CLAVE_BUENA, p)).toEqual({ ok: true });
    for (let i = 0; i < LIMITE_POR_CUENTA.peticiones - 1; i += 1) {
      await entrar("admin", "mala-mala-1", p);
    }
    expect(await entrar("admin", CLAVE_BUENA, p)).toEqual({ ok: true });
  });
});

/**
 * La búsqueda usuario → correo lee `auth.users` con `security definer`. Si
 * `anon` o `authenticated` pudieran ejecutarla, cualquiera preguntaría por
 * `/rest/v1/rpc/correo_de_usuario_panel` qué usuarios existen y su correo.
 * Comprobado también contra la base real al aplicar la migración (42501 para
 * los dos roles); aquí se protege el archivo de un cambio descuidado.
 */
describe("migración 025: la búsqueda solo la ejecuta service_role", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/025_usuario_del_panel.sql"),
    "utf8",
  )
    .split("\n")
    .filter((linea) => !linea.trimStart().startsWith("--"))
    .join("\n")
    .toLowerCase();

  it("quita EXECUTE a public, anon y authenticated", () => {
    for (const rol of ["public", "anon", "authenticated"]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.correo_de_usuario_panel\\(text\\) from ${rol};`,
        ),
      );
    }
  });

  it("solo service_role recibe EXECUTE", () => {
    const concesiones = sql.match(/grant [^;]+;/g) ?? [];
    expect(concesiones).toEqual([
      "grant execute on function public.correo_de_usuario_panel(text) to service_role;",
    ]);
  });

  it("es security definer con search_path vacío y falla cerrado ante duplicados", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("case when count(*) = 1");
  });
});
