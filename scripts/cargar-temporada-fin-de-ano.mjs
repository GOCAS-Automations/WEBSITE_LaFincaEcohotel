#!/usr/bin/env node
/**
 * Carga en la base real la «Temporada de fin de año» que mandó el hotel,
 * SIN pisar lo que se haya editado después desde el panel.
 *
 * ---------------------------------------------------------------------------
 * LA TARIFA (docs/DATOS_CLIENTE.md §3)
 * ---------------------------------------------------------------------------
 * Todas las cabañas, primera noche 1 dic 2026, última noche 8 ene 2027 (las dos
 * incluidas), +15 % sobre la base:
 *
 *   Entre Semana  $402.500 (2 personas) · $230.000 (1 persona)
 *   Estándar      $552.000
 *   Premium       $782.000
 *
 * El rango vale para los tres planes: confirmado por el hotel el 2026-10-05
 * (antes solo se había dado explícitamente para Entre Semana). Si algún día
 * cambia, se edita desde el panel («Temporadas»), no volviendo a correr esto.
 *
 * ---------------------------------------------------------------------------
 * QUÉ HACE
 * ---------------------------------------------------------------------------
 *   · Si no existe una temporada de todas las cabañas con ese nombre, la crea
 *     con `guardar_temporada()` (migración 017): temporada y precios en una
 *     sola transacción.
 *   · Si ya existe y coincide en fechas y precios, dice que está al día (por
 *     eso se puede correr dos veces).
 *   · Si existe pero es distinta, alguien la editó desde el panel: NO se toca,
 *     y se dice qué difiere.
 *
 * USO
 * ---
 *   node scripts/cargar-temporada-fin-de-ano.mjs             # solo mira (dry-run)
 *   node scripts/cargar-temporada-fin-de-ano.mjs --ejecutar  # escribe
 *
 * El sitio público lo ve al regenerarse (`revalidate = 3600`): como mucho una
 * hora. El cobro (`/api/reservar`) lee la base sin caché y lo aplica en el acto.
 */
import process from "node:process";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const ejecutar = process.argv.includes("--ejecutar");

const TEMPORADA = {
  nombre: "Temporada de fin de año",
  primeraNoche: "2026-12-01",
  ultimaNoche: "2027-01-08",
  /** Como lo guarda Postgres: [primera noche, día siguiente a la última). */
  noches: "[2026-12-01,2027-01-09)",
  precios: [
    { plan: "Entre Semana", precio_noche: 402_500, precio_noche_1_persona: 230_000 },
    { plan: "Estándar", precio_noche: 552_000, precio_noche_1_persona: null },
    { plan: "Premium", precio_noche: 782_000, precio_noche_1_persona: null },
  ],
};

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

function fallar(mensaje, error) {
  console.error(`✗ ${mensaje}${error ? `: ${error.message}` : ""}`);
  process.exit(1);
}

const pesos = (valor) =>
  valor === null ? "—" : `$${Number(valor).toLocaleString("es-CO")}`;

function porcentaje(base, nuevo) {
  const valor = Math.round(((nuevo - base) / base) * 1000) / 10;
  return `${valor > 0 ? "+" : ""}${valor.toLocaleString("es-CO")} %`;
}

/* ===========================================================================
 * Programa
 * ======================================================================== */

const supabase = createClient(
  exigir("NEXT_PUBLIC_SUPABASE_URL"),
  exigir("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

console.log(
  ejecutar
    ? "Modo EJECUTAR: se escribirá en la base real.\n"
    : "Modo de prueba: no se escribe nada (añade --ejecutar para escribir).\n",
);

/* --- Los planes, por nombre, y su base ----------------------------------- */

const { data: planes, error: errorPlanes } = await supabase
  .from("planes")
  .select("id, nombre, tipo");
if (errorPlanes) fallar("No pude leer los planes", errorPlanes);

const { data: bases, error: errorBases } = await supabase
  .from("tarifas")
  .select("plan_id, precio_noche, precio_noche_1_persona")
  .is("vigencia", null);
if (errorBases) fallar("No pude leer las tarifas base", errorBases);

const deseados = TEMPORADA.precios.map((precio) => {
  const plan = (planes ?? []).find((fila) => fila.nombre === precio.plan);
  if (!plan) fallar(`No existe el plan «${precio.plan}»`);
  if (plan.tipo !== "hospedaje") fallar(`«${precio.plan}» no es un plan de hospedaje`);
  const susBases = (bases ?? []).filter((fila) => fila.plan_id === plan.id);
  if (susBases.length === 0) fallar(`«${precio.plan}» no tiene precio base en ninguna cabaña`);
  const tieneUnaPersona = susBases.some((fila) => fila.precio_noche_1_persona !== null);
  if (tieneUnaPersona !== (precio.precio_noche_1_persona !== null)) {
    fallar(
      `«${precio.plan}»: el precio de 1 persona de la temporada no encaja con su base (los dos o ninguno)`,
    );
  }
  return { ...precio, planId: plan.id, base: susBases[0] };
});

console.log(
  `${TEMPORADA.nombre} · todas las cabañas · primera noche ${TEMPORADA.primeraNoche}, última ${TEMPORADA.ultimaNoche}`,
);
for (const precio of deseados) {
  const uno =
    precio.precio_noche_1_persona === null
      ? ""
      : ` · 1 persona ${pesos(precio.precio_noche_1_persona)} (${porcentaje(precio.base.precio_noche_1_persona, precio.precio_noche_1_persona)})`;
  console.log(
    `  ${precio.plan.padEnd(13)} ${pesos(precio.precio_noche)} (${porcentaje(precio.base.precio_noche, precio.precio_noche)} sobre ${pesos(precio.base.precio_noche)})${uno}`,
  );
}
console.log("");

/* --- ¿Ya está? ------------------------------------------------------------ */

const { data: existentes, error: errorExistentes } = await supabase
  .from("temporadas")
  .select("id, nombre, alojamiento_id, noches")
  .is("alojamiento_id", null);
if (errorExistentes) fallar("No pude leer las temporadas (¿se aplicó la migración 017?)", errorExistentes);

const misma = (existentes ?? []).find((fila) => fila.nombre === TEMPORADA.nombre);

if (misma) {
  const { data: suyos, error } = await supabase
    .from("tarifas")
    .select("plan_id, precio_noche, precio_noche_1_persona")
    .eq("temporada_id", misma.id);
  if (error) fallar("No pude leer los precios de la temporada", error);

  const diferencias = [];
  if (misma.noches !== TEMPORADA.noches) {
    diferencias.push(`fechas: en la base ${misma.noches}, aquí ${TEMPORADA.noches}`);
  }
  for (const precio of deseados) {
    const fila = (suyos ?? []).find((item) => item.plan_id === precio.planId);
    if (!fila) {
      diferencias.push(`${precio.plan}: sin precio en la base`);
    } else if (
      Number(fila.precio_noche) !== precio.precio_noche ||
      (fila.precio_noche_1_persona ?? null) !== precio.precio_noche_1_persona
    ) {
      diferencias.push(
        `${precio.plan}: en la base ${pesos(fila.precio_noche)} / ${pesos(fila.precio_noche_1_persona)}`,
      );
    }
  }
  if ((suyos ?? []).length !== deseados.length) {
    diferencias.push(`la base tiene ${(suyos ?? []).length} planes con precio`);
  }

  if (diferencias.length === 0) {
    console.log("✓ Ya está al día: la temporada existe con esas fechas y esos precios. No hay nada que hacer.");
    process.exit(0);
  }

  console.log("! La temporada existe pero es distinta (¿se editó desde el panel?). NO se toca:");
  for (const diferencia of diferencias) console.log(`  · ${diferencia}`);
  console.log("\nSi hay que cambiarla, hazlo desde el panel → Temporadas.");
  process.exit(0);
}

/* --- ¿Chocaría con otra de todas las cabañas? ---------------------------- */

const idsDeseados = deseados.map((precio) => precio.planId);
for (const otra of existentes ?? []) {
  const [, desde, hasta] = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(otra.noches) ?? [];
  if (!desde || !(desde < "2027-01-09" && TEMPORADA.primeraNoche < hasta)) continue;
  const { data: suyos } = await supabase
    .from("tarifas")
    .select("plan_id")
    .eq("temporada_id", otra.id);
  if ((suyos ?? []).some((fila) => idsDeseados.includes(fila.plan_id))) {
    fallar(
      `Se cruza con «${otra.nombre}» (${otra.noches}), también de todas las cabañas y con alguno de estos planes. Revísalo en el panel`,
    );
  }
}

if (!ejecutar) {
  console.log("→ Se CREARÍA la temporada con esos precios. Vuelve a correrlo con --ejecutar para escribirla.");
  process.exit(0);
}

const { data: id, error: errorGuardar } = await supabase.rpc("guardar_temporada", {
  p_id: null,
  p_nombre: TEMPORADA.nombre,
  p_alojamiento_id: null,
  p_primera_noche: TEMPORADA.primeraNoche,
  p_ultima_noche: TEMPORADA.ultimaNoche,
  p_precios: deseados.map((precio) => ({
    plan_id: precio.planId,
    precio_noche: precio.precio_noche,
    precio_noche_1_persona: precio.precio_noche_1_persona,
  })),
});
if (errorGuardar) fallar("No se pudo guardar la temporada", errorGuardar);

console.log(`✓ Temporada creada (${id}). El cobro la aplica ya; el sitio público, al regenerarse (como mucho una hora).`);
