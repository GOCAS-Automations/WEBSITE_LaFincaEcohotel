#!/usr/bin/env node
/**
 * Quita de la base real la foto de la página 404, SIN tocar el resto del valor.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE
 * ---------------------------------------------------------------------------
 * La 404 se rediseñó sin foto (2026-10-06) y el campo «imagen» salió del panel,
 * del tipo, del respaldo y del seed. Pero la fila `no_encontrado` de la tabla
 * `contenido` sigue guardando `imagen` e `imagen_alt`: una referencia viva a un
 * archivo del bucket que nadie muestra y que, mientras exista, hace que
 * `npm run imagenes:limpiar` lo dé por «en uso». Quitarla es el paso previo a
 * poder retirar la foto del bucket (regla 11 de `CLAUDE.md`) si ya no la usa
 * nada más.
 *
 * ---------------------------------------------------------------------------
 * QUÉ HACE
 * ---------------------------------------------------------------------------
 *   · si la fila trae `imagen` o `imagen_alt`, los elimina y deja el resto
 *     (titular, mensaje, botón) tal cual;
 *   · si ya no los trae, no hace nada (por eso se puede correr dos veces);
 *   · si la clave no existe, tampoco: el sitio usa el respaldo del código.
 *
 * Además dice, a título informativo, si la foto que se desreferencia sigue en
 * uso en otra clave de `contenido`, en `imagenes` o en `extras`. No borra nada
 * del bucket: de eso se ocupa `npm run imagenes:limpiar`.
 *
 * USO
 * ---
 *   node scripts/quitar-imagen-404.mjs             # solo mira (simulacro)
 *   node scripts/quitar-imagen-404.mjs --ejecutar  # escribe
 *
 * La 404 se regenera con el sitio (`revalidate = 3600`): el cambio no se nota a
 * la vista, porque la página ya no pinta la foto.
 */
import process from "node:process";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const CLAVE = "no_encontrado";
const CAMPOS = ["imagen", "imagen_alt"];
const ejecutar = process.argv.includes("--ejecutar");

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

const supabase = createClient(
  exigir("NEXT_PUBLIC_SUPABASE_URL"),
  exigir("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

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
    `La clave «${CLAVE}» no existe en la base. El sitio usa el respaldo del código, que ya no trae foto: nada que escribir.`,
  );
  process.exit(0);
}

const actual = fila.valor ?? {};
const presentes = CAMPOS.filter((campo) => campo in actual);

console.log(`Clave «${CLAVE}» (última edición: ${fila.actualizado_at ?? "desconocida"})`);
for (const campo of CAMPOS) {
  console.log(`  · ${campo}: ${JSON.stringify(actual[campo] ?? null)}`);
}

if (presentes.length === 0) {
  console.log("  → Ya no tiene foto. Nada que escribir.");
  process.exit(0);
}

/* ¿Sigue en uso esa foto en otro sitio? Solo informa. */
const foto = typeof actual.imagen === "string" ? actual.imagen : null;
if (foto) {
  const sinConsulta = foto.split("?")[0];
  const [contenido, imagenes, extras] = await Promise.all([
    supabase.from("contenido").select("clave, valor"),
    supabase.from("imagenes").select("url"),
    supabase.from("extras").select("imagen_url"),
  ]);
  for (const resultado of [contenido, imagenes, extras]) {
    if (resultado.error) {
      console.error(`Error leyendo la base: ${resultado.error.message}`);
      process.exit(1);
    }
  }
  const usos = [];
  for (const otra of contenido.data ?? []) {
    if (otra.clave === CLAVE) continue;
    if (JSON.stringify(otra.valor).includes(sinConsulta)) {
      usos.push(`contenido «${otra.clave}»`);
    }
  }
  for (const f of imagenes.data ?? []) {
    if (typeof f.url === "string" && f.url.split("?")[0] === sinConsulta) {
      usos.push("tabla imagenes");
    }
  }
  for (const f of extras.data ?? []) {
    if (typeof f.imagen_url === "string" && f.imagen_url.split("?")[0] === sinConsulta) {
      usos.push("tabla extras");
    }
  }
  console.log(
    usos.length > 0
      ? `  · La misma foto sigue en uso en: ${[...new Set(usos)].join(", ")}. NO se borra del bucket.`
      : "  · Ninguna otra fila de la base usa esa foto (revisa también el código antes de borrarla).",
  );
}

const nuevo = { ...actual };
for (const campo of CAMPOS) delete nuevo[campo];

if (!ejecutar) {
  console.log(
    `  → Simulación: se quitarían ${presentes.map((c) => `«${c}»`).join(" y ")} y quedaría:\n    ${JSON.stringify(nuevo)}\n  Para escribir: --ejecutar`,
  );
  process.exit(0);
}

/* Se escribe solo si la fila sigue igual que cuando se leyó: si alguien la
   edita desde el panel entre la lectura y la escritura, no se pisa. */
const { data: escritas, error: errorEscritura } = await supabase
  .from("contenido")
  .update({ valor: nuevo, actualizado_at: new Date().toISOString() })
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

console.log("  ✓ Foto quitada de la página 404; titular, mensaje y botón quedaron igual.");
