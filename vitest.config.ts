import { defineConfig } from "vitest/config";

/**
 * Vitest para la lógica pura del proyecto.
 *
 * Solo entra `src/lib/**\/*.test.ts`: aquí no se prueban componentes de React
 * —eso pediría jsdom, testing-library y un contrato que el sitio no necesita—,
 * sino las reglas que no se pueden mirar en una captura de pantalla. La primera
 * es el calendario de festivos de Colombia: un error de un día en la Ley
 * Emiliani vende un lunes de puente a precio de martes, y no se nota hasta que
 * llega la factura.
 */
export default defineConfig({
  test: {
    include: ["src/lib/**/*.test.ts"],
    environment: "node",
  },
});
