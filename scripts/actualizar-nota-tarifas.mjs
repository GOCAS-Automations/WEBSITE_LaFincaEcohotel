#!/usr/bin/env node
/**
 * Lleva a la base real la nota nueva sobre las tarifas, SIN pisar lo que el
 * hotel haya escrito desde el panel.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE
 * ---------------------------------------------------------------------------
 * La nota de los precios (`contenido` → clave `home.planes`, campo `nota`)
 * sale en la portada, en las cabañas y en `/reservar`, en este último caso
 * justo debajo de un «Pagar $X» exacto. Decía:
 *
 *   «Tarifas referenciales de temporada baja. Pueden variar en festivos y
 *    alta demanda. IVA incluido.»
 *
 * y ya no es cierto: el motor cobra noche por noche, con festivos y tarifas
 * diferenciales incluidos, y el total del desglose ES el que se paga. El
 * código (`RESPALDO_PLANES` en `src/lib/contenido.ts`) y el seed ya tienen el
 * texto nuevo, pero el sitio lee la BASE. Volver a correr el seed entero no
 * sirve: sobreescribiría todo lo que el cliente haya editado.
 *
 * ---------------------------------------------------------------------------
 * QUÉ HACE
 * ---------------------------------------------------------------------------
 *   · si la nota de la base es EXACTAMENTE la anterior, el hotel no la ha
 *     tocado: se reemplaza por la nueva (solo ese campo);
 *   · si ya es la nueva, no hace nada (por eso se puede correr dos veces);
 *   · si es cualquier otra cosa, alguien la editó desde el panel: NO se toca,
 *     y se dice en pantalla para revisarla a mano.
 *
 * El valor NUEVO se lee del seed generado (`supabase/seed/002_contenido.sql`),
 * que sale del código con `npm run seed:contenido`: así no hay una tercera
 * copia del texto que pueda quedarse vieja.
 *
 * USO
 * ---
 *   node scripts/actualizar-nota-tarifas.mjs             # solo mira (dry-run)
 *   node scripts/actualizar-nota-tarifas.mjs --ejecutar  # escribe
 *
 * Las páginas públicas se regeneran cada hora (`revalidate = 3600`): el cambio
 * se ve, como mucho, una hora después de escribirlo.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const CLAVE = "home.planes";
const CAMPO = "nota";
const ejecutar = process.argv.includes("--ejecutar");

/** El texto ANTERIOR (seed del 2026-09-15 al 2026-10-05). */
const ANTERIOR =
  "Tarifas referenciales de temporada baja. Pueden variar en festivos y alta demanda. IVA incluido.";

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

/** Recorta los extremos: un espacio de más al guardar no es una edición. */
const normalizar = (valor) => (typeof valor === "string" ? valor.trim() : valor ?? null);

/** Lee el valor nuevo de la clave del seed generado desde el código. */
async function leerNuevo() {
  const sql = await readFile(
    path.join(process.cwd(), "supabase", "seed", "002_contenido.sql"),
    "utf8",
  );
  const patron = new RegExp(
    `\\('${CLAVE.replace(".", "\\.")}', \\$json\\$([\\s\\S]*?)\\$json\\$::jsonb\\)`,
  );
  const coincidencia = patron.exec(sql);
  if (!coincidencia) {
    console.error(
      `No encontré la clave «${CLAVE}» en supabase/seed/002_contenido.sql. ¿Corriste \`npm run seed:contenido\`?`,
    );
    process.exit(1);
  }
  const valor = JSON.parse(coincidencia[1]);
  if (typeof valor[CAMPO] !== "string" || normalizar(valor[CAMPO]) === ANTERIOR) {
    console.error(
      "El seed todavía trae la nota anterior. Corre `npm run seed:contenido` antes.",
    );
    process.exit(1);
  }
  return valor[CAMPO];
}

const supabase = createClient(
  exigir("NEXT_PUBLIC_SUPABASE_URL"),
  exigir("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

const nueva = await leerNuevo();

const { data: fila, error } = await supabase
  .from("contenido")
  .select("clave, valor, actualizado_at")
  .eq("clave", CLAVE)
  .maybeSingle();

if (error) {
  console.error(`No pude leer la clave «${CLAVE}»: ${error.message}`);
  process.exit(1);
}

if (!fila) {
  console.log(
    `La clave «${CLAVE}» no existe en la base. El sitio usa el respaldo del código, que ya trae la nota nueva: no hay nada que escribir.`,
  );
  process.exit(0);
}

const actual = fila.valor ?? {};
const enBase = normalizar(actual[CAMPO]);

console.log(`Clave «${CLAVE}» (última edición: ${fila.actualizado_at ?? "desconocida"})`);
console.log(`  · En la base: ${JSON.stringify(actual[CAMPO] ?? null)}`);

if (enBase === normalizar(nueva)) {
  console.log("  → Ya tiene la nota nueva. Nada que escribir.");
  process.exit(0);
}

if (enBase !== ANTERIOR) {
  console.log(
    "  → La editaron desde el panel (no es la nota anterior): NO se toca. Revísala a mano en Contenido → Portada → «Nota sobre las tarifas».",
  );
  process.exit(0);
}

if (!ejecutar) {
  console.log(`  → Es la nota anterior. Simulación: se cambiaría por:\n    ${JSON.stringify(nueva)}\n  Para escribir: --ejecutar`);
  process.exit(0);
}

/* Se escribe solo si la base sigue teniendo la nota anterior en el momento de
   escribir: si alguien la edita entre la lectura y la escritura, no se pisa. */
const { data: escritas, error: errorEscritura } = await supabase
  .from("contenido")
  .update({
    valor: { ...actual, [CAMPO]: nueva },
    actualizado_at: new Date().toISOString(),
  })
  .eq("clave", CLAVE)
  .eq("actualizado_at", fila.actualizado_at)
  .select("clave");

if (errorEscritura) {
  console.error(`No pude escribir: ${errorEscritura.message}`);
  process.exit(1);
}
if (!escritas || escritas.length === 0) {
  console.error(
    "No se escribió: la fila cambió mientras tanto. Vuelve a correr el script para mirarla de nuevo.",
  );
  process.exit(1);
}

console.log("  ✓ Nota actualizada. Portada, cabañas y /reservar la mostrarán en menos de una hora.");
