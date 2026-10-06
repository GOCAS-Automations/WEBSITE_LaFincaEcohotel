import { describe, expect, it } from "vitest";

import { decidirAccesoCron } from "./secreto-cron";

describe("decidirAccesoCron (latido /api/salud)", () => {
  it("con secreto: solo pasa la cabecera exacta", () => {
    const base = { secreto: "abc123", entornoVercel: "production" };
    expect(decidirAccesoCron({ ...base, cabecera: "Bearer abc123" })).toBe("permitido");
    expect(decidirAccesoCron({ ...base, cabecera: "Bearer otro" })).toBe("rechazado");
    expect(decidirAccesoCron({ ...base, cabecera: "abc123" })).toBe("rechazado");
    expect(decidirAccesoCron({ ...base, cabecera: null })).toBe("rechazado");
  });

  it("sin secreto en producción: falla cerrado, traiga lo que traiga", () => {
    for (const cabecera of [null, "", "Bearer ", "Bearer undefined"]) {
      expect(
        decidirAccesoCron({ secreto: undefined, entornoVercel: "production", cabecera }),
      ).toBe("falta-secreto");
    }
    expect(
      decidirAccesoCron({ secreto: "", entornoVercel: "production", cabecera: "Bearer " }),
    ).toBe("falta-secreto");
  });

  it("sin secreto fuera de producción (local, previews): abierto para probarlo", () => {
    expect(decidirAccesoCron({ secreto: undefined, entornoVercel: undefined, cabecera: null })).toBe(
      "permitido",
    );
    expect(decidirAccesoCron({ secreto: undefined, entornoVercel: "preview", cabecera: null })).toBe(
      "permitido",
    );
    expect(
      decidirAccesoCron({ secreto: undefined, entornoVercel: "development", cabecera: null }),
    ).toBe("permitido");
  });
});
