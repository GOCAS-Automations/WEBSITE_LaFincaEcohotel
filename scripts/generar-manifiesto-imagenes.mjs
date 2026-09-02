/**
 * Genera `supabase/seed/imagenes-manifest.json` a partir del contenido real
 * del bucket `imagenes` de Supabase Storage (fuente de verdad tras subir
 * archivos con `npm run imagenes:subir`).
 *
 *   npm run imagenes:manifiesto
 *
 * Cada entrada: { ruta_bucket, url_publica, seccion, archivo_original, bytes }
 * El array queda ordenado por sección y luego por archivo.
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config as cargarEnv } from "dotenv";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

const BUCKET = "imagenes";

// Prefijo del bucket -> sección lógica usada por el panel/CMS.
const SECCIONES = [
  { prefijo: "sitio/home", seccion: "home" },
  { prefijo: "sitio/iconos", seccion: "iconos" },
  { prefijo: "sitio/reconocimientos", seccion: "reconocimientos" },
  { prefijo: "sitio/testimonios", seccion: "testimonios" },
  { prefijo: "sitio/marca", seccion: "marca" },
  { prefijo: "lugar", seccion: "lugar" },
  { prefijo: "cabanas", seccion: "cabanas" },
  { prefijo: "galeria", seccion: "galeria" },
  { prefijo: "experiencias", seccion: "experiencias" },
];

function seccionDe(rutaBucket) {
  const coincidencia = SECCIONES.find((s) => rutaBucket.startsWith(`${s.prefijo}/`));
  return coincidencia ? coincidencia.seccion : "otros";
}

/** Lista recursivamente todos los objetos de una carpeta del bucket. */
async function listarRecursivo(supabase, carpeta) {
  const resultado = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(carpeta, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`list(${carpeta || "/"}): ${error.message}`);

  for (const item of data ?? []) {
    const ruta = carpeta ? `${carpeta}/${item.name}` : item.name;
    // Las "carpetas" en Supabase Storage son objetos sin metadata id/size.
    const esCarpeta = item.id === null;
    if (esCarpeta) {
      resultado.push(...(await listarRecursivo(supabase, ruta)));
    } else {
      resultado.push({ ruta, tamano: item.metadata?.size ?? 0 });
    }
  }
  return resultado;
}

async function principal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !claveServicio) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, claveServicio, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const objetos = await listarRecursivo(supabase, "");

  const manifiesto = objetos
    .map(({ ruta, tamano }) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
      return {
        ruta_bucket: ruta,
        url_publica: publicUrl,
        seccion: seccionDe(ruta),
        archivo_original: basename(ruta),
        bytes: tamano,
      };
    })
    .sort((a, b) =>
      a.seccion === b.seccion
        ? a.ruta_bucket.localeCompare(b.ruta_bucket)
        : a.seccion.localeCompare(b.seccion),
    );

  const rutaSalida = join(RAIZ, "supabase", "seed", "imagenes-manifest.json");
  mkdirSync(dirname(rutaSalida), { recursive: true });
  writeFileSync(rutaSalida, JSON.stringify(manifiesto, null, 2) + "\n", "utf8");

  console.log(`Manifiesto generado: ${manifiesto.length} objeto(s).`);
  const porSeccion = {};
  for (const item of manifiesto) {
    porSeccion[item.seccion] = (porSeccion[item.seccion] ?? 0) + 1;
  }
  for (const [seccion, cantidad] of Object.entries(porSeccion)) {
    console.log(`  · ${seccion.padEnd(16)} ${cantidad}`);
  }
}

principal().catch((error) => {
  console.error(`\nFalló: ${error.message}`);
  process.exit(1);
});
