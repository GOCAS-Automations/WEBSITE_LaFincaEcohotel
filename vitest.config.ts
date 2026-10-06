import { fileURLToPath } from "node:url";

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
    alias: {
      /**
       * `server-only` es un paquete que EXISTE para romperse: su punto de
       * entrada lanza si alguien lo importa desde un bundle de cliente, y Next
       * lo resuelve a un módulo vacío en el servidor mediante la condición
       * `react-server`. Vitest no aplica esa condición, así que cualquier módulo
       * marcado como «solo servidor» —el freno de peticiones, por ejemplo— no se
       * podría probar.
       *
       * Aquí se apunta al mismo archivo vacío que usa Next en el servidor. Se
       * resuelve por ruta absoluta y no por nombre de paquete porque el
       * `exports` de `server-only` no publica ese archivo. No afecta al sitio
       * compilado: esto es solo la configuración de las pruebas.
       */
      "server-only": fileURLToPath(
        new URL("node_modules/server-only/empty.js", import.meta.url),
      ),
      /**
       * El mismo `@/` de `tsconfig.json`. Hace falta para probar un Route
       * Handler entero (`src/lib/pagos/respuesta-publica.test.ts`): la
       * respuesta pública es lo que hay que vigilar, no solo la función de
       * dentro. Solo casa `@` y `@/…`, no los paquetes `@supabase/…`.
       */
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
});
