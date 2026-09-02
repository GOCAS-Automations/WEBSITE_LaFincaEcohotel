/**
 * Sube imágenes al bucket `imagenes` de Supabase Storage, recursivamente,
 * conservando la estructura de subcarpetas del origen.
 *
 *   npm run imagenes:subir -- <carpeta-origen> <prefijo-en-el-bucket>
 *
 * Ejemplo:
 *   npm run imagenes:subir -- assets/imagenes/cabanas cabanas
 *
 * También acepta un archivo de mapeo JSON con varias carpetas de una vez:
 *   npm run imagenes:subir -- --mapa mapa-carpetas.json
 *
 * donde mapa-carpetas.json es: [{ "origen": "...", "prefijo": "..." }, ...]
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * Es re-ejecutable: usa upsert, así que volver a correrlo sobrescribe los
 * mismos archivos en vez de duplicarlos o fallar.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config as cargarEnv } from "dotenv";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

const BUCKET = "imagenes";
const CACHE_CONTROL = "31536000"; // 1 año

const TIPOS_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

function normalizarNombre(nombreOriginal) {
  const ext = extname(nombreOriginal).toLowerCase();
  const base = basename(nombreOriginal, extname(nombreOriginal));
  const normalizado = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // todo lo que no sea alfanumérico -> guion
    .replace(/^-+|-+$/g, "") // sin guiones al inicio/fin
    .replace(/-{2,}/g, "-"); // sin guiones repetidos
  return `${normalizado}${ext}`;
}

/** Recorre un directorio recursivamente y devuelve las rutas de archivo (no directorios). */
function listarArchivosRecursivo(dir) {
  const resultado = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    const info = statSync(ruta);
    if (info.isDirectory()) {
      resultado.push(...listarArchivosRecursivo(ruta));
    } else {
      resultado.push(ruta);
    }
  }
  return resultado;
}

/**
 * Sube una carpeta de origen al bucket bajo el prefijo indicado, conservando
 * la jerarquía de subcarpetas relativa a `origen`.
 * Devuelve un array de { rutaBucket, archivoOriginal, bytes, urlPublica }.
 */
async function subirCarpeta(supabase, origen, prefijo) {
  if (!existsSync(origen)) {
    console.warn(`  (omitido: no existe "${origen}")`);
    return [];
  }

  const archivos = listarArchivosRecursivo(origen).filter((ruta) =>
    Object.hasOwn(TIPOS_MIME, extname(ruta).toLowerCase()),
  );

  const subidos = [];

  for (const rutaLocal of archivos) {
    const relativo = rutaLocal
      .slice(origen.length)
      .split(/[/\\]/)
      .filter(Boolean);
    const carpetasIntermedias = relativo.slice(0, -1).map((segmento) =>
      segmento
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
    const nombreArchivo = normalizarNombre(relativo[relativo.length - 1]);
    const rutaBucket = [prefijo, ...carpetasIntermedias, nombreArchivo]
      .filter(Boolean)
      .join("/");

    const datos = readFileSync(rutaLocal);
    const ext = extname(rutaLocal).toLowerCase();
    const contentType = TIPOS_MIME[ext] ?? "application/octet-stream";

    process.stdout.write(`  · ${rutaBucket} … `);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(rutaBucket, datos, {
        cacheControl: CACHE_CONTROL,
        upsert: true,
        contentType,
      });

    if (error) {
      console.log(`ERROR: ${error.message}`);
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(rutaBucket);

    console.log("listo");
    subidos.push({
      rutaBucket,
      archivoOriginal: basename(rutaLocal),
      bytes: datos.length,
      urlPublica: publicUrl,
    });
  }

  return subidos;
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

  const argumentos = process.argv.slice(2);
  let tareas = [];

  if (argumentos[0] === "--mapa") {
    const rutaMapa = argumentos[1];
    if (!rutaMapa || !existsSync(rutaMapa)) {
      console.error("Uso: --mapa <archivo.json> con [{origen, prefijo}, ...]");
      process.exit(1);
    }
    tareas = JSON.parse(readFileSync(rutaMapa, "utf8"));
  } else {
    const [origen, prefijo] = argumentos;
    if (!origen || !prefijo) {
      console.error(
        "Uso: npm run imagenes:subir -- <carpeta-origen> <prefijo-en-el-bucket>",
      );
      process.exit(1);
    }
    tareas = [{ origen, prefijo }];
  }

  const todosSubidos = [];
  for (const { origen, prefijo } of tareas) {
    console.log(`\nCarpeta "${origen}" → bucket/${prefijo}`);
    const subidos = await subirCarpeta(supabase, origen, prefijo);
    todosSubidos.push(...subidos);
  }

  console.log(`\nTotal subido: ${todosSubidos.length} archivo(s).`);
  return todosSubidos;
}

principal().catch((error) => {
  console.error(`\nFalló: ${error.message}`);
  process.exit(1);
});
