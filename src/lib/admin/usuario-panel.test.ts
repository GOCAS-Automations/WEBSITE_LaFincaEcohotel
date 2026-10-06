import { describe, expect, it } from "vitest";

import {
  correoInternoDe,
  esCorreoInterno,
  esUsuarioValido,
  normalizarUsuario,
  pareceCorreo,
  usuarioDeFormulario,
  usuarioDeMetadatos,
  validarUsuario,
} from "./usuario-panel";
import { comprobarUsuarioLibre, ordenarPorUsuario } from "./usuarios";
import type { UsuarioPanel } from "./tipos";
import { ErrorDeValidacion } from "./validacion";

function mensajeDe(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorDeValidacion);
    return (error as Error).message;
  }
  throw new Error("Se esperaba un ErrorDeValidacion.");
}

describe("normalizarUsuario", () => {
  it("quita espacios alrededor y pasa a minúsculas", () => {
    expect(normalizarUsuario("  J-Mejia ")).toBe("j-mejia");
    expect(normalizarUsuario("ADMIN")).toBe("admin");
  });

  it("no toca lo de dentro", () => {
    expect(normalizarUsuario("a ospina")).toBe("a ospina");
  });
});

describe("esUsuarioValido (ya normalizado)", () => {
  it.each(["admin", "j-mejia", "a-ospina", "pruebas-gocas", "ab", "x1", "9-a", "a".repeat(30)])(
    "acepta «%s»",
    (valor) => expect(esUsuarioValido(valor)).toBe(true),
  );

  it.each([
    "",
    "a",
    "-admin",
    "Admin",
    "j mejia",
    "j_mejia",
    "j.mejia",
    "josé",
    "peña",
    "a@b.co",
    "a".repeat(31),
  ])("rechaza «%s»", (valor) => expect(esUsuarioValido(valor)).toBe(false));
});

describe("validarUsuario", () => {
  it("devuelve el usuario normalizado", () => {
    expect(validarUsuario("  A-Ospina ")).toBe("a-ospina");
  });

  it("pide un usuario si está vacío", () => {
    expect(mensajeDe(() => validarUsuario("   "))).toBe("Escribe un usuario.");
  });

  it("explica que no es un correo", () => {
    expect(mensajeDe(() => validarUsuario("dueno@gmail.com"))).toMatch(
      /^El usuario no es un correo/,
    );
  });

  it("no admite espacios y sugiere el guion", () => {
    expect(mensajeDe(() => validarUsuario("j mejia"))).toMatch(/espacios.*guion/);
  });

  it("exige al menos 2 caracteres", () => {
    expect(mensajeDe(() => validarUsuario("a"))).toBe(
      "El usuario debe tener al menos 2 caracteres.",
    );
  });

  it("no pasa de 30 caracteres y dice cuántos tiene", () => {
    expect(mensajeDe(() => validarUsuario("a".repeat(31)))).toBe(
      "El usuario no puede pasar de 30 caracteres. El que escribiste tiene 31.",
    );
  });

  it("no puede empezar por guion", () => {
    expect(mensajeDe(() => validarUsuario("-admin"))).toMatch(/empezar por una letra/);
  });

  it("rechaza tildes, eñes y otros signos", () => {
    for (const valor of ["josé", "peña", "j.mejia", "j_mejia"]) {
      expect(mensajeDe(() => validarUsuario(valor))).toMatch(
        /solo puede llevar letras sin tilde, números y guiones/,
      );
    }
  });

  it("lee el campo de un formulario", () => {
    const form = new FormData();
    form.set("usuario", " J-Mejia");
    expect(usuarioDeFormulario(form, "usuario")).toBe("j-mejia");
  });
});

describe("pareceCorreo", () => {
  it("detecta la arroba", () => {
    expect(pareceCorreo("fincavillarrealcali@gmail.com")).toBe(true);
    expect(pareceCorreo("admin")).toBe(false);
  });
});

describe("usuarioDeMetadatos", () => {
  it("lee app_metadata.usuario si es válido", () => {
    expect(usuarioDeMetadatos({ rol: "propietario", usuario: "admin" })).toBe("admin");
  });

  it("ignora lo que no cumple el formato o no existe", () => {
    expect(usuarioDeMetadatos({ usuario: "Admin" })).toBeNull();
    expect(usuarioDeMetadatos({ usuario: 42 })).toBeNull();
    expect(usuarioDeMetadatos({})).toBeNull();
    expect(usuarioDeMetadatos(undefined)).toBeNull();
  });
});

describe("correo interno", () => {
  it("se arma con el usuario y el dominio interno", () => {
    expect(correoInternoDe("j-mejia")).toBe("j-mejia@usuarios.lafincaecohotel.com");
  });

  it("se reconoce, sin importar mayúsculas", () => {
    expect(esCorreoInterno("J-MEJIA@usuarios.lafincaecohotel.com")).toBe(true);
    expect(esCorreoInterno("panel@lafincaecohotel.com")).toBe(false);
    expect(esCorreoInterno(null)).toBe(false);
  });
});

function cuenta(id: string, usuario: string | null, correo = `${id}@x.co`): UsuarioPanel {
  return {
    id,
    usuario,
    correo,
    correoInterno: false,
    rol: "equipo",
    ultimoAcceso: null,
    creada: "2026-10-06T00:00:00Z",
  };
}

describe("comprobarUsuarioLibre", () => {
  const cuentas = [cuenta("1", "admin"), cuenta("2", "j-mejia"), cuenta("3", null)];

  it("deja pasar un usuario libre", () => {
    expect(() => comprobarUsuarioLibre(cuentas, "a-ospina")).not.toThrow();
  });

  it("rechaza uno ocupado con un mensaje en español", () => {
    expect(mensajeDe(() => comprobarUsuarioLibre(cuentas, "j-mejia"))).toBe(
      "Ya hay una cuenta con el usuario «j-mejia». Elige otro, por ejemplo añadiendo la inicial del segundo apellido.",
    );
  });

  it("deja a una cuenta «cambiar» a su propio usuario", () => {
    expect(() => comprobarUsuarioLibre(cuentas, "j-mejia", "2")).not.toThrow();
  });
});

describe("ordenarPorUsuario", () => {
  it("ordena por usuario y deja al final las cuentas sin usuario", () => {
    const orden = [cuenta("3", null, "z@x.co"), cuenta("2", "j-mejia"), cuenta("1", "admin")]
      .sort(ordenarPorUsuario)
      .map((fila) => fila.usuario ?? fila.correo);
    expect(orden).toEqual(["admin", "j-mejia", "z@x.co"]);
  });
});
