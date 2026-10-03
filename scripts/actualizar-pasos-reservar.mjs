#!/usr/bin/env node
/**
 * Lleva a la base real los pasos nuevos de `/reservar` (cabaña → fechas),
 * SIN pisar lo que el hotel haya escrito desde el panel.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE
 * ---------------------------------------------------------------------------
 * El 2026-10-03 el motor de reservas cambió de orden: primero la cabaña y
 * luego las fechas, porque el calendario ya tacha las noches ocupadas de la
 * cabaña elegida. Los pasos que explica la página (`contenido.reservar`) y su
 * frase de entrada decían lo contrario: «Empieza por tus fechas…».
 *
 * El código (`RESPALDO_RESERVAR` en `src/lib/contenido.ts`) y el seed ya están
 * al día, pero la página lee la BASE. Volver a correr el seed entero no sirve:
 * sobreescribiría TODO lo que el cliente haya editado desde el panel.
 *
 * ---------------------------------------------------------------------------
 * QUÉ HACE
 * ---------------------------------------------------------------------------
 * Mira dos campos de la clave `reservar` —`intro` y `pasos`— por separado:
 *
 *   · si el valor de la base es EXACTAMENTE el del seed anterior, el hotel no
 *     lo ha tocado: se reemplaza por el nuevo;
 *   · si ya es el nuevo, no hace nada (por eso se puede correr dos veces);
 *   · si es cualquier otra cosa, alguien lo editó desde el panel: NO se toca,
 *     y se dice en pantalla para que se revise a mano.
 *
 * `nota` y cualquier otro campo de la clave quedan como estén.
 *
 * El valor NUEVO se lee del seed generado (`supabase/seed/002_contenido.sql`),
 * que sale del código con `npm run seed:contenido`: así no hay una tercera
 * copia del texto que pueda quedarse vieja.
 *
 * USO
 * ---
 *   node scripts/actualizar-pasos-reservar.mjs             # solo mira (dry-run)
 *   node scripts/actualizar-pasos-reservar.mjs --ejecutar  # escribe
 *
 * La página `/reservar` se regenera cada hora (`revalidate = 3600`): el cambio
 * se ve, como mucho, una hora después de escribirlo.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const CLAVE = "reservar";
const ejecutar = process.argv.includes("--ejecutar");

/* ===========================================================================
 * El valor ANTERIOR (seed del 2026-09-15 al 2026-10-03): fechas → cabaña.
 * ======================================================================== */

const ANTERIOR = {
  intro:
    "Empieza por tus fechas: con ellas te mostramos las cabañas libres y el precio noche por noche. Te llevamos a WhatsApp con el mensaje ya escrito y confirmamos disponibilidad el mismo día.",
  pasos: [
    {
      titulo: "Tus fechas",
      texto:
        "Llegada y salida en el calendario. Ninguna combinación está prohibida: cada noche se cobra con la tarifa de su fecha.",
    },
    {
      titulo: "Tu cabaña",
      texto:
        "Te mostramos las que sirven para esas fechas, con su precio. Las cinco son independientes y para dos personas.",
    },
    {
      titulo: "Tu plan",
      texto:
        "Si tu estadía toca fin de semana o festivo, eliges entre Estándar y Premium. Entre semana el plan es automático.",
    },
    {
      titulo: "Tus experiencias",
      texto:
        "Torta, fondue o arreglo floral, la noche que tú digas. Puedes dejarlo en blanco: nada de esto es obligatorio.",
    },
    {
      titulo: "Cuánto pagas ahora",
      texto:
        "Eliges entre el 50 % —el mínimo que confirma— y el 100 %. El resto se paga por link antes de llegar.",
    },
  ],
};

const CAMPOS = ["intro", "pasos"];

/* ===========================================================================
 * Utilidades
 * ======================================================================== */

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

/**
 * Forma comparable de un campo. Los pasos se reducen a `titulo` y `texto` y
 * se recortan los espacios de los extremos: el panel puede guardar las claves
 * en otro orden o con un espacio de más al final, y eso no es una edición.
 */
function normalizar(campo, valor) {
  if (campo === "pasos") {
    if (!Array.isArray(valor)) return JSON.stringify(valor ?? null);
    return JSON.stringify(
      valor.map((paso) => ({
        titulo: String(paso?.titulo ?? "").trim(),
        texto: String(paso?.texto ?? "").trim(),
      })),
    );
  }
  return JSON.stringify(typeof valor === "string" ? valor.trim() : (valor ?? null));
}

/** Lee el valor nuevo de `reservar` del seed generado desde el código. */
async function leerNuevo() {
  const sql = await readFile(
    path.join(process.cwd(), "supabase", "seed", "002_contenido.sql"),
    "utf8",
  );
  const coincidencia = /\('reservar', \$json\$([\s\S]*?)\$json\$::jsonb\)/.exec(sql);
  if (!coincidencia) {
    console.error(
      "No encontré la clave `reservar` en supabase/seed/002_contenido.sql. ¿Corriste `npm run seed:contenido`?",
    );
    process.exit(1);
  }
  return JSON.parse(coincidencia[1]);
}

/* ===========================================================================
 * Programa
 * ======================================================================== */

const supabase = createClient(
  exigir("NEXT_PUBLIC_SUPABASE_URL"),
  exigir("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

const nuevo = await leerNuevo();

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
  console.error(
    `La clave «${CLAVE}» no existe en la base. El sitio está usando el respaldo del código, que ya trae los pasos nuevos: no hay nada que escribir.`,
  );
  process.exit(0);
}

const actual = fila.valor ?? {};
const cambios = {};
const editadosEnPanel = [];

console.log(
  `Clave «${CLAVE}» (última edición: ${fila.actualizado_at ?? "desconocida"})`,
);

for (const campo of CAMPOS) {
  const enBase = normalizar(campo, actual[campo]);
  if (enBase === normalizar(campo, nuevo[campo])) {
    console.log(`  · ${campo}: ya está al día.`);
  } else if (enBase === normalizar(campo, ANTERIOR[campo])) {
    console.log(`  · ${campo}: es el texto anterior → se actualiza.`);
    cambios[campo] = nuevo[campo];
  } else {
    console.log(
      `  · ${campo}: lo editaron desde el panel → NO se toca. Revísalo a mano.`,
    );
    editadosEnPanel.push(campo);
  }
}

if (Object.keys(cambios).length === 0) {
  console.log(
    editadosEnPanel.length
      ? "\nNada que escribir sin pisar ediciones del panel."
      : "\nNada que escribir: la base ya tiene los pasos nuevos.",
  );
  process.exit(0);
}

if (!ejecutar) {
  console.log(
    `\nSimulación: se actualizarían ${Object.keys(cambios).join(" y ")}. Para escribir: --ejecutar`,
  );
  process.exit(0);
}

const { error: errorEscritura } = await supabase
  .from("contenido")
  .update({
    valor: { ...actual, ...cambios },
    actualizado_at: new Date().toISOString(),
  })
  .eq("clave", CLAVE);

if (errorEscritura) {
  console.error(`No pude escribir: ${errorEscritura.message}`);
  process.exit(1);
}

console.log(
  `\n✓ Actualizado: ${Object.keys(cambios).join(" y ")}. /reservar lo mostrará en menos de una hora.`,
);
