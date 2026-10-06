import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorDeValidacion,
  MENSAJE_ERROR_GENERICO,
  TEXTO_NO_VALIDO,
  VIOLACION_EXCLUSION,
  VIOLACION_LLAVE_FORANEA,
  VIOLACION_UNICA,
  ejecutarAccion,
  enteroOpcional,
  enteroRequerido,
  mensajeDeErrorDeBase,
  precioOpcional,
  precioRequerido,
  traducirErrorPostgres,
} from "./validacion";

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) form.set(clave, valor);
  return form;
}

/** El mensaje del `ErrorDeValidacion` que lanza `fn`, o falla el test. */
function mensajeDe(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorDeValidacion);
    return (error as Error).message;
  }
  throw new Error("Se esperaba un ErrorDeValidacion y no se lanzó nada.");
}

describe("precioRequerido — los precios del panel", () => {
  const precio = (valor: string, rango?: { min?: number; max?: number }) =>
    precioRequerido(formulario({ precio: valor }), "precio", "Precio por noche", rango);

  it("acepta pesos enteros con o sin separador de miles", () => {
    expect(precio("552000")).toBe(552000);
    expect(precio("552.000")).toBe(552000);
    expect(precio("552,000")).toBe(552000);
    expect(precio("$552.000")).toBe(552000);
    expect(precio("1.250.000")).toBe(1250000);
  });

  it("rechaza los centavos en vez de multiplicar el precio", () => {
    for (const valor of ["552.000,50", "552000,5", "552.000.50", "350000.00"]) {
      expect(mensajeDe(() => precio(valor))).toBe(
        "Escribe el precio sin centavos en «Precio por noche»: por ejemplo, 552.000.",
      );
    }
  });

  it("rechaza el cero y los negativos en un precio de noche", () => {
    expect(mensajeDe(() => precio("0"))).toBe(
      "El precio de «Precio por noche» tiene que ser mayor que $0.",
    );
    expect(mensajeDe(() => precio("-350.000"))).toBe(
      "El precio de «Precio por noche» tiene que ser mayor que $0.",
    );
  });

  it("con min 0 (adicional de cortesía) acepta el cero pero no los negativos", () => {
    expect(precio("0", { min: 0 })).toBe(0);
    expect(mensajeDe(() => precio("-1", { min: 0 }))).toBe(
      "El precio de «Precio por noche» no puede ser negativo.",
    );
  });

  it("rechaza lo que no es un número claro", () => {
    expect(mensajeDe(() => precio("552.0000"))).toMatch(/No se entiende el precio/);
    expect(mensajeDe(() => precio("1.234,567"))).toMatch(/No se entiende el precio/);
    expect(mensajeDe(() => precio("abc"))).toMatch(/No se entiende el precio/);
  });

  it("pone un tope y lo dice en pesos", () => {
    expect(mensajeDe(() => precio("100.000.001"))).toMatch(
      /^El precio de «Precio por noche» no puede pasar de \$\s?100\.000\.000\. Revisa que no le sobre un cero\.$/,
    );
  });

  it("vacío es obligatorio; en el opcional es null", () => {
    expect(mensajeDe(() => precio(""))).toBe(
      "El campo «Precio por noche» es obligatorio.",
    );
    expect(
      precioOpcional(formulario({ precio: "  " }), "precio", "Precio por noche"),
    ).toBeNull();
    expect(
      precioOpcional(formulario({ precio: "480.000" }), "precio", "Precio por noche"),
    ).toBe(480000);
  });
});

describe("enteroRequerido — también los importes de la reserva manual", () => {
  const entero = (valor: string) =>
    enteroRequerido(formulario({ campo: valor }), "campo", "Valor del alojamiento", {
      min: 0,
      max: 1_000_000_000,
    });

  it("lee el separador de miles", () => {
    expect(entero("552.000")).toBe(552000);
    expect(entero("552,000")).toBe(552000);
  });

  it("ya no convierte «552.000,50» en 55.200.050", () => {
    expect(mensajeDe(() => entero("552.000,50"))).toBe(
      "Escribe «Valor del alojamiento» sin centavos ni decimales: solo el número entero, por ejemplo 552.000.",
    );
  });

  it("dice el rango con separador de miles", () => {
    expect(mensajeDe(() => entero("-5"))).toBe(
      "El campo «Valor del alojamiento» debe estar entre 0 y 1.000.000.000.",
    );
  });

  it("enteroOpcional: vacío es null", () => {
    expect(enteroOpcional(formulario({}), "campo", "Abonado")).toBeNull();
  });
});

describe("errores de la base, en español", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const crudo = (code: string, message = "raw english message") => ({
    code,
    message,
    details: "Key (slug)=(cabana-01) already exists.",
  });

  it("traduce unicidad, llave foránea, exclusión y uuid inválido", () => {
    expect(mensajeDeErrorDeBase(crudo(VIOLACION_UNICA))).toBe(
      "Ya existe otro registro con ese mismo valor. Cámbialo por uno distinto.",
    );
    expect(mensajeDeErrorDeBase(crudo(VIOLACION_LLAVE_FORANEA))).toBe(
      "No se puede hacer: hay reservas u otros registros asociados.",
    );
    expect(mensajeDeErrorDeBase(crudo(VIOLACION_EXCLUSION))).toBe(
      "Esas fechas se cruzan con otra reserva activa de la misma cabaña.",
    );
    expect(
      mensajeDeErrorDeBase(
        crudo(TEXTO_NO_VALIDO, 'invalid input syntax for type uuid: "no-es-uuid"'),
      ),
    ).toMatch(/^No se encontró lo que intentabas cambiar/);
  });

  it("el contexto de cada pantalla manda sobre el texto general", () => {
    expect(
      mensajeDeErrorDeBase(crudo(VIOLACION_LLAVE_FORANEA), {
        foranea: "No se puede borrar: hay reservas asociadas a esta cabaña.",
      }),
    ).toBe("No se puede borrar: hay reservas asociadas a esta cabaña.");
  });

  it("lo desconocido nunca enseña el mensaje en inglés, pero lo registra", () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    const mensaje = mensajeDeErrorDeBase(crudo("XX000", "connection reset by peer"));
    expect(mensaje).toBe(MENSAJE_ERROR_GENERICO);
    expect(mensaje).not.toMatch(/connection/);
    expect(JSON.stringify(registro.mock.calls)).toMatch(/connection reset by peer/);
  });

  it("traducirErrorPostgres registra el detalle técnico de lo que traduce", () => {
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = traducirErrorPostgres(crudo(VIOLACION_UNICA));
    expect(error).toBeInstanceOf(ErrorDeValidacion);
    expect(JSON.stringify(registro.mock.calls)).toMatch(/already exists/);
  });

  it("ejecutarAccion traduce un error de la base lanzado tal cual", async () => {
    const estado = await ejecutarAccion(async () => {
      throw crudo(VIOLACION_LLAVE_FORANEA, "update or delete violates foreign key");
    });
    expect(estado).toMatchObject({
      mensaje: "No se puede hacer: hay reservas u otros registros asociados.",
    });
    expect(JSON.stringify(estado)).not.toMatch(/violates/);
  });

  it("ejecutarAccion no deja pasar un error desconocido en inglés", async () => {
    const estado = await ejecutarAccion(async () => {
      throw new Error("relation \"tarifas\" does not exist");
    });
    expect(JSON.stringify(estado)).not.toMatch(/relation/);
  });
});
