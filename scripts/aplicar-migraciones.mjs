/**
 * Aplica las migraciones y los datos iniciales a la base de datos de Supabase.
 *
 *   npm run db:aplicar        aplica supabase/migrations/*.sql y supabase/seed/*.sql
 *   npm run db:verificar      solo muestra el estado actual de la base
 *
 * Los archivos .sql están escritos para poder re-ejecutarse sin romper nada
 * (IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS).
 *
 * Lee `SUPABASE_DB_URL` de `.env.local`. Esa URL apunta al pooler de Supabase
 * en modo sesión (puerto 5432), que exige TLS.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config as cargarEnv } from "dotenv";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

const soloVerificar = process.argv.includes("--solo-verificar");

const urlBaseDatos = process.env.SUPABASE_DB_URL;
if (!urlBaseDatos) {
  console.error(
    "Falta la variable SUPABASE_DB_URL. Revisa el archivo .env.local.",
  );
  process.exit(1);
}

/** Devuelve los .sql de una carpeta, ordenados por nombre (001, 002, …). */
function archivosSql(carpeta) {
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort()
    .map((nombre) => ({ nombre, ruta: join(carpeta, nombre) }));
}

async function ejecutarArchivo(cliente, archivo, etiqueta) {
  const sql = readFileSync(archivo.ruta, "utf8");
  process.stdout.write(`  · ${etiqueta}/${archivo.nombre} … `);
  try {
    await cliente.query("begin");
    await cliente.query(sql);
    await cliente.query("commit");
    console.log("listo");
  } catch (error) {
    await cliente.query("rollback").catch(() => {});
    console.log("ERROR");
    throw new Error(`${etiqueta}/${archivo.nombre}: ${error.message}`);
  }
}

async function verificar(cliente) {
  const tablasEsperadas = [
    "alojamientos",
    "planes",
    "tarifas",
    "temporadas",
    "extras",
    "reservas",
    "reserva_extras",
    "bloqueos",
    "pagos",
    "contenido",
    "imagenes",
  ];

  const { rows: tablas } = await cliente.query(
    `select c.relname as tabla, c.relrowsecurity as rls,
            (select count(*) from pg_policies p
              where p.schemaname = 'public' and p.tablename = c.relname) as politicas
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname = any($1)
      order by c.relname`,
    [tablasEsperadas],
  );

  console.log("\nTablas en el esquema public:");
  for (const t of tablas) {
    console.log(
      `  · ${t.tabla.padEnd(16)} RLS: ${t.rls ? "activo" : "INACTIVO"}  políticas: ${t.politicas}`,
    );
  }
  const faltantes = tablasEsperadas.filter(
    (t) => !tablas.some((f) => f.tabla === t),
  );
  console.log(
    `  Total: ${tablas.length}/${tablasEsperadas.length}${faltantes.length ? ` — faltan: ${faltantes.join(", ")}` : ""}`,
  );

  const { rows: restricciones } = await cliente.query(
    `select conname from pg_constraint
      where conname in ('reservas_sin_solapamiento','bloqueos_sin_solapamiento')
      order by conname`,
  );
  console.log("\nConstraints anti-solapamiento:");
  for (const nombre of [
    "reservas_sin_solapamiento",
    "bloqueos_sin_solapamiento",
  ]) {
    const existe = restricciones.some((r) => r.conname === nombre);
    console.log(`  · ${nombre.padEnd(28)} ${existe ? "OK" : "FALTA"}`);
  }

  const { rows: conteos } = await cliente.query(
    `select
       (select count(*) from alojamientos) as alojamientos,
       (select count(*) from planes)       as planes,
       (select count(*) from tarifas)      as tarifas,
       (select count(*) from extras)       as extras,
       (select count(*) from reservas)     as reservas`,
  );
  console.log("\nDatos cargados:");
  for (const [clave, valor] of Object.entries(conteos[0])) {
    console.log(`  · ${clave.padEnd(14)} ${valor}`);
  }

  const { rows: buckets } = await cliente.query(
    `select id, public from storage.buckets where id = 'imagenes'`,
  );
  console.log("\nStorage:");
  console.log(
    buckets.length
      ? `  · bucket 'imagenes' existe — público: ${buckets[0].public ? "sí" : "no"}`
      : "  · bucket 'imagenes' NO existe",
  );

  const { rows: tarifas } = await cliente.query(
    `select a.nombre as cabana, p.nombre as plan, t.precio_noche, t.dias_semana
       from tarifas t
       join alojamientos a on a.id = t.alojamiento_id
       join planes p on p.id = t.plan_id
      order by a.orden, p.orden
      limit 6`,
  );
  if (tarifas.length) {
    console.log("\nMuestra de tarifas:");
    for (const t of tarifas) {
      const dias = t.dias_semana ? ` días ${t.dias_semana.join(",")}` : "";
      console.log(
        `  · ${t.cabana} · ${t.plan.padEnd(13)} $${Number(t.precio_noche).toLocaleString("es-CO")}${dias}`,
      );
    }
  }
}

async function principal() {
  const cliente = new pg.Client({
    connectionString: urlBaseDatos,
    // El pooler de Supabase usa un certificado que Node no valida por defecto.
    ssl: { rejectUnauthorized: false },
    application_name: "lafinca-migraciones",
  });

  await cliente.connect();
  console.log("Conectado a la base de datos de Supabase.\n");

  try {
    if (!soloVerificar) {
      const migraciones = archivosSql(join(RAIZ, "supabase", "migrations"));
      const semillas = archivosSql(join(RAIZ, "supabase", "seed"));

      console.log(`Aplicando ${migraciones.length} migración(es):`);
      for (const archivo of migraciones) {
        await ejecutarArchivo(cliente, archivo, "migrations");
      }

      console.log(`\nAplicando ${semillas.length} archivo(s) de datos:`);
      for (const archivo of semillas) {
        await ejecutarArchivo(cliente, archivo, "seed");
      }
    }

    await verificar(cliente);
    console.log("\nTerminado.");
  } finally {
    await cliente.end();
  }
}

principal().catch((error) => {
  console.error(`\nFalló: ${error.message}`);
  process.exit(1);
});
