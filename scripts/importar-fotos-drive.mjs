/**
 * Importa las fotos oficiales nuevas de La Finca desde Google Drive:
 * descarga, optimiza (WebP) y sube al bucket `imagenes` de Supabase bajo
 * el prefijo `drive/`. Genera además el manifiesto
 * `supabase/seed/imagenes-manifest-v2.json`.
 *
 *   npm run imagenes:importar-drive -- <fase>
 *
 * Fases (por defecto corre las cuatro en orden):
 *   descargar   → baja los originales a %TEMP%\lafinca-drive\<carpeta>\
 *   optimizar   → convierte a WebP calidad 82, máx. 2400px de ancho
 *   subir       → sube a Supabase Storage bajo drive/<carpeta>/
 *   manifiesto  → escribe supabase/seed/imagenes-manifest-v2.json
 *
 * Es re-ejecutable: si un original ya existe y es válido no se vuelve a
 * descargar; si ya existe el WebP no se vuelve a convertir; la subida usa
 * upsert.
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createClient } from "@supabase/supabase-js";
import { config as cargarEnv } from "dotenv";
import sharp from "sharp";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

const BUCKET = "imagenes";
const CACHE_CONTROL = "31536000"; // 1 año
const PREFIJO_BUCKET = "drive";
const CARPETA_TEMP = join(tmpdir(), "lafinca-drive");
const CARPETA_TEMP_WEBP = join(tmpdir(), "lafinca-drive-webp");
const ANCHO_MAXIMO = 2400;
const CALIDAD_WEBP = 82;
const LIMITE_BYTES_BUCKET = 10 * 1024 * 1024; // 10 MB
const PAUSA_MS = 700;

/**
 * Inventario provisto por el cliente. `tipo` es una clasificación inicial
 * ("portada" para las fichas de portada, "foto" para el resto) que se
 * corrige a mano tras revisar visualmente cada portada (ver §3 del README
 * del script / reporte de la tarea). `tipo: "ficha"` marca piezas gráficas
 * con texto/lista que no son fotografías.
 */
const INVENTARIO = [
  {
    seccion: "cabana-01",
    archivos: [
      { orden: 0, archivo: "0. PORTADA CABAÑA 1.jpeg", id: "1o6flgouww9cfYkLxG5fJOUxXbNSiAk85", tipo: "portada" },
      { orden: 1, archivo: "1.png", id: "1Y3p_UHxzFqxC_cFPXnmaChOB76a8bfnu", tipo: "foto" },
      { orden: 2, archivo: "2.png", id: "17h3_tPkQrS1hcb1jrkrbFxkYRTSBBjhF", tipo: "foto" },
      { orden: 3, archivo: "3.png", id: "1YQ-7wLK3YtDbFU9zLBeGEX2zuZr0c9Cj", tipo: "foto" },
      { orden: 4, archivo: "4.png", id: "1GeYaI7o0w-y1IqzvWMLdaX90YG1_2pgD", tipo: "foto" },
      { orden: 5, archivo: "5.png", id: "1Z8kyN17Tyya2iULTN8ZNXLE5jP1aW7Dj", tipo: "foto" },
      { orden: 6, archivo: "6.png", id: "1KOECYQt4LxgvutdpDejk4Z7wyO7HQQvO", tipo: "foto" },
    ],
  },
  {
    seccion: "cabana-02",
    archivos: [
      { orden: 0, archivo: "0. PORTADA CABAÑA 2.jpeg", id: "1nlFBs51JpN6i4t2T3XlNPRCIPk8vxslc", tipo: "portada" },
      { orden: 1, archivo: "1.png", id: "119lZQIm7iBlm2ipWTaNjiODc7dDARm-C", tipo: "foto" },
      { orden: 2, archivo: "2.png", id: "1HX3lvwytje3uczTYTDhaY9eFVyRn07Ri", tipo: "foto" },
      { orden: 3, archivo: "3.png", id: "1Xnwn4N_Lp5UndeOpMCIPbZJWTsXOCWGk", tipo: "foto" },
      { orden: 4, archivo: "4.png", id: "189xretBz3IyjMq3GH8bSPWURfiXubGLK", tipo: "foto" },
      { orden: 5, archivo: "5.png", id: "19zKItlUII5bk5tOixovlDUTTxiyKsrCu", tipo: "foto" },
    ],
  },
  {
    seccion: "cabana-03",
    archivos: [
      { orden: 0, archivo: "0. PORTADA CABAÑA 3.jpeg", id: "1ijJjFozgW26xhsLaekiN4ctw2wQ-vVHd", tipo: "portada" },
      { orden: 1, archivo: "1.png", id: "1jhy0s9xYdBedKpeHpGdBWANvHTVahjqg", tipo: "foto" },
      { orden: 2, archivo: "2.png", id: "1X6H69MpAxVJcvmp9myrKjmP4XPjYvcWD", tipo: "foto" },
      { orden: 3, archivo: "3.png", id: "1wDXrQrY0hSfm4guvcJ5wB8ajQqsvNoNI", tipo: "foto" },
      { orden: 4, archivo: "4.png", id: "18hYNE0SHO-jtRXkKSq3dlmqZradwX9X_", tipo: "foto" },
      { orden: 5, archivo: "5.png", id: "1ZsfosVt1UqWY_YRm70tQj25Dk-pXJoCi", tipo: "foto" },
      { orden: 6, archivo: "6.png", id: "1siUaYeTfS3erbiVMqOA78uFg33rnJIk-", tipo: "foto" },
      { orden: 7, archivo: "7.png", id: "1-QRuDKrRRu6mHjeNYIoWz7sqR8S1ROPS", tipo: "foto" },
      { orden: 8, archivo: "8.png", id: "16ojJ-wFNBKuMbNdbGG8x_-XzA1U87VKt", tipo: "foto" },
      { orden: 9, archivo: "9.png", id: "1FAKeCvUpFRgWy0JaFxSOl-tO97xkVFmV", tipo: "foto" },
      { orden: 10, archivo: "10.png", id: "1zCi5szLjj1iTpMKn01NYF9_LkCNB034E", tipo: "foto" },
      { orden: 11, archivo: "11.png", id: "1uwtVFmrNEFAfKnaHc5n35bA4eAM17dqq", tipo: "foto" },
    ],
  },
  {
    seccion: "cabana-04",
    archivos: [
      { orden: 0, archivo: "0. PORTADA CABAÑA 4.jpeg", id: "1X5wthWWA1vwo34N6nHcXDQcajc3tingP", tipo: "portada" },
      { orden: 1, archivo: "1.png", id: "1ihY9S16jeUS5aZb0Zowsr6_w8N22pUel", tipo: "foto" },
      { orden: 2, archivo: "2.png", id: "1RCCcmshSHsSx_CZz28FcF2wbQGXxnaiL", tipo: "foto" },
      { orden: 3, archivo: "3.png", id: "1KR2XtBgy0woKhhf6_TaDF6Hc-6woJWeE", tipo: "foto" },
      { orden: 4, archivo: "4.png", id: "1C3XqANQiIEX1eZnd3Tiw-xJ6qjgsC8BZ", tipo: "foto" },
      { orden: 5, archivo: "5.png", id: "1ymTAU2pXtiszVnqYl075l51sGkSm21PW", tipo: "foto" },
      { orden: 6, archivo: "6.png", id: "1-OErUm_-zpnCLYg33mDMhPUp8-YlVRpp", tipo: "foto" },
      { orden: 7, archivo: "7.png", id: "1MIKp7wKUVq-lBjQRqcl0Y3YKEpLinzPM", tipo: "foto" },
      { orden: 8, archivo: "8.png", id: "1xGiM9xOHYpcEdLKrVzHFrXag9ZwhrcN0", tipo: "foto" },
      { orden: 9, archivo: "9.png", id: "150E7rleq_-egX5ygMVCBtIJl_PwZYsz6", tipo: "foto" },
      { orden: 10, archivo: "10.png", id: "1osMyFI5NRvw2vWcNewN3GYWBxghXk0A8", tipo: "foto" },
      { orden: 11, archivo: "11.png", id: "1x8PEYXdKqBbKNvPMwMYczRvJvPEN87BF", tipo: "foto" },
    ],
  },
  {
    seccion: "cabana-05",
    archivos: [
      { orden: 0, archivo: "0. PORTADA CABAÑA 5.jpeg", id: "1KxMkkSOHdGZW0iO48V0pUaUKlhgPNxEq", tipo: "portada" },
      { orden: 1, archivo: "1.png", id: "1ehAS0nJp2c-OaKK0rwN2MHaMIbZt7HBC", tipo: "foto" },
      { orden: 2, archivo: "2.png", id: "1MMjVA4L_3Pa1jr_jwBCUoJN36xaRXd91", tipo: "foto" },
      { orden: 3, archivo: "3.png", id: "1zVksF1cazX9yM9zmOy3K0oEKHk1lJaqf", tipo: "foto" },
      { orden: 4, archivo: "4.png", id: "12Ms8EuEH_LSBS_WoZg18ZYezQw8o2MuT", tipo: "foto" },
      { orden: 5, archivo: "5.png", id: "1GRvrx13s7GoHlLitu-4n0zJ-EPTIoEH7", tipo: "foto" },
      { orden: 6, archivo: "6.png", id: "1GY3l0PD9LQuv_v4lWUhHAbDqdXeOiFpk", tipo: "foto" },
    ],
  },
  {
    seccion: "zonas-comunes",
    archivos: [
      { orden: 0, archivo: "0. PORTADA ZONAS COMUNES.png", id: "1uVjRoPZ00GOHeUhE7DjcxHQRARk9YZtX", tipo: "portada" },
      { orden: 1, archivo: "1.png", id: "1BmCVp_10TvjxGNe772vUv8uuhBUevRHR", tipo: "foto" },
      { orden: 2, archivo: "2.png", id: "1pibXMLlPypPTmBc2G7F5_AfJyBYBbNEO", tipo: "foto" },
      { orden: 3, archivo: "3.png", id: "1fCkL0z8jPpZKp6XJwKR-UVlhqYd0ZlA9", tipo: "foto" },
      { orden: 4, archivo: "4.png", id: "1FbQ4dRneOdiNUCIDXXEHUEPT5y1hw3DT", tipo: "foto" },
      { orden: 5, archivo: "5.png", id: "1jUWnqJ_NVt3EuSOGnTiCWE9c2NtVHb00", tipo: "foto" },
      { orden: 6, archivo: "6.png", id: "1qxkwctel-1TdQAPd8ps6MbuDxBFSbUDa", tipo: "foto" },
      { orden: 7, archivo: "7.png", id: "1UAOrgmucrVEvqo8T2itUXKhCIKtbuvT6", tipo: "foto" },
      { orden: 8, archivo: "8.png", id: "1XE3BQIQu8TWRnQsrw7zPRDlv8dNSocml", tipo: "foto" },
    ],
  },
];

/**
 * Correcciones de clasificación tras revisar visualmente las imágenes
 * (herramienta Read sobre los archivos descargados). Clave: "seccion/orden".
 *
 * Las 6 portadas ("0. PORTADA …") son piezas gráficas de marketing con
 * título, lista de "Cuenta con" e iconos — no fotografías — así que se
 * marcan como "ficha". El resto (1.png, 2.png, …) son fotografías reales
 * (confirmado visualmente en varias cabañas y en zonas comunes).
 */
const CORRECCIONES_TIPO = {
  "cabana-01/0": "ficha",
  "cabana-02/0": "ficha",
  "cabana-03/0": "ficha",
  "cabana-04/0": "ficha",
  "cabana-05/0": "ficha",
  "zonas-comunes/0": "ficha",
};

function nombreSalida(orden) {
  return orden === 0 ? "portada" : String(orden).padStart(2, "0");
}

function rutaBucket(seccion, orden) {
  return `${PREFIJO_BUCKET}/${seccion}/${nombreSalida(orden)}.webp`;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Detecta si un buffer es PNG o JPEG válido por firma de bytes. */
function firmaValida(buf) {
  if (buf.length < 12) return false;
  const esPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47;
  const esJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  return esPng || esJpeg;
}

function pareceHtml(buf) {
  const inicio = buf.subarray(0, 512).toString("utf8").toLowerCase();
  return inicio.includes("<!doctype html") || inicio.includes("<html");
}

async function descargarUrl(url) {
  const respuesta = await fetch(url, { redirect: "follow" });
  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}`);
  }
  const arrayBuffer = await respuesta.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function descargarDeDrive(id) {
  const urlDirecta = `https://drive.google.com/uc?export=download&id=${id}`;
  let buf = await descargarUrl(urlDirecta);

  if (pareceHtml(buf) || !firmaValida(buf)) {
    const urlConfirmada = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
    buf = await descargarUrl(urlConfirmada);
  }

  return buf;
}

// ---------------------------------------------------------------------------
// Fase 1: descargar
// ---------------------------------------------------------------------------

async function faseDescargar() {
  console.log(`\n=== Descarga desde Google Drive → ${CARPETA_TEMP} ===`);
  const fallidos = [];

  for (const { seccion, archivos } of INVENTARIO) {
    const carpetaDestino = join(CARPETA_TEMP, seccion);
    mkdirSync(carpetaDestino, { recursive: true });

    for (const item of archivos) {
      const destino = join(carpetaDestino, `${nombreSalida(item.orden)}${extensionOriginal(item.archivo)}`);

      if (existsSync(destino) && firmaValida(readFileSync(destino).subarray(0, 12))) {
        console.log(`  · ${seccion}/${nombreSalida(item.orden)} … ya existe, se omite`);
        continue;
      }

      process.stdout.write(`  · ${seccion}/${nombreSalida(item.orden)} (${item.archivo}) … `);
      try {
        const buf = await descargarDeDrive(item.id);
        if (!firmaValida(buf)) {
          throw new Error("el contenido descargado no es PNG/JPEG válido (¿HTML de confirmación?)");
        }
        writeFileSync(destino, buf);
        console.log(`ok (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
      } catch (error) {
        console.log(`FALLÓ: ${error.message}`);
        fallidos.push({ seccion, archivo: item.archivo, id: item.id, error: error.message });
      }

      await esperar(PAUSA_MS);
    }
  }

  if (fallidos.length > 0) {
    console.log("\nArchivos que fallaron al descargar:");
    for (const f of fallidos) {
      console.log(`  - ${f.seccion}/${f.archivo} (id ${f.id}): ${f.error}`);
    }
  } else {
    console.log("\nTodas las descargas fueron exitosas.");
  }

  return fallidos;
}

function extensionOriginal(nombreArchivo) {
  const m = nombreArchivo.toLowerCase().match(/\.(jpe?g|png)$/);
  return m ? `.${m[1] === "jpg" ? "jpeg" : m[1]}` : ".jpeg";
}

// ---------------------------------------------------------------------------
// Fase 2: optimizar
// ---------------------------------------------------------------------------

async function faseOptimizar() {
  console.log(`\n=== Optimización a WebP (calidad ${CALIDAD_WEBP}, máx. ${ANCHO_MAXIMO}px) ===`);
  const resultados = [];

  for (const { seccion, archivos } of INVENTARIO) {
    const carpetaOrigen = join(CARPETA_TEMP, seccion);
    const carpetaDestino = join(CARPETA_TEMP_WEBP, seccion);
    mkdirSync(carpetaDestino, { recursive: true });

    for (const item of archivos) {
      const origen = join(carpetaOrigen, `${nombreSalida(item.orden)}${extensionOriginal(item.archivo)}`);
      const destino = join(carpetaDestino, `${nombreSalida(item.orden)}.webp`);

      if (!existsSync(origen)) {
        console.log(`  · ${seccion}/${nombreSalida(item.orden)} … SIN ORIGINAL, se omite`);
        continue;
      }

      const bytesOriginal = statSync(origen).size;

      let metadata;
      if (!existsSync(destino)) {
        const imagen = sharp(readFileSync(origen));
        const meta = await imagen.metadata();
        const debeRedimensionar = (meta.width ?? 0) > ANCHO_MAXIMO;

        const buf = await imagen
          .resize({ width: debeRedimensionar ? ANCHO_MAXIMO : undefined, withoutEnlargement: true })
          .webp({ quality: CALIDAD_WEBP })
          .toBuffer();

        writeFileSync(destino, buf);
        metadata = await sharp(buf).metadata();
      } else {
        metadata = await sharp(readFileSync(destino)).metadata();
      }

      const bytesFinal = statSync(destino).size;
      const ancho = metadata.width;
      const alto = metadata.height;
      const relacion = ancho && alto ? Math.round((ancho / alto) * 1000) / 1000 : null;

      console.log(
        `  · ${seccion}/${nombreSalida(item.orden)} … ${(bytesOriginal / 1024).toFixed(0)} KB → ${(bytesFinal / 1024).toFixed(0)} KB (${ancho}×${alto})`,
      );

      resultados.push({
        seccion,
        orden: item.orden,
        tipoBase: item.tipo,
        archivo_original: item.archivo,
        id_drive: item.id,
        bytesOriginal,
        bytes: bytesFinal,
        ancho,
        alto,
        relacion,
      });
    }
  }

  return resultados;
}

// ---------------------------------------------------------------------------
// Fase 3: subir
// ---------------------------------------------------------------------------

function crearClienteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !claveServicio) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
    process.exit(1);
  }
  return createClient(url, claveServicio, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function faseSubir() {
  console.log(`\n=== Subida a Supabase Storage (bucket "${BUCKET}", prefijo "${PREFIJO_BUCKET}/") ===`);
  const supabase = crearClienteSupabase();
  const subidos = [];

  for (const { seccion, archivos } of INVENTARIO) {
    for (const item of archivos) {
      const local = join(CARPETA_TEMP_WEBP, seccion, `${nombreSalida(item.orden)}.webp`);
      if (!existsSync(local)) {
        console.log(`  · ${seccion}/${nombreSalida(item.orden)} … SIN WEBP, se omite (¿corriste la fase "optimizar"?)`);
        continue;
      }

      const datos = readFileSync(local);
      const ruta = rutaBucket(seccion, item.orden);

      process.stdout.write(`  · ${ruta} … `);
      const { error } = await supabase.storage.from(BUCKET).upload(ruta, datos, {
        cacheControl: CACHE_CONTROL,
        upsert: true,
        contentType: "image/webp",
      });

      if (error) {
        console.log(`ERROR: ${error.message}`);
        continue;
      }

      console.log(`ok (${(datos.length / 1024).toFixed(0)} KB)`);
      subidos.push(ruta);
    }
  }

  console.log(`\nTotal subido: ${subidos.length} archivo(s).`);
  return subidos;
}

// ---------------------------------------------------------------------------
// Fase 4: manifiesto
// ---------------------------------------------------------------------------

async function faseManifiesto() {
  console.log("\n=== Generación de supabase/seed/imagenes-manifest-v2.json ===");
  const supabase = crearClienteSupabase();
  const manifiesto = [];

  for (const { seccion, archivos } of INVENTARIO) {
    for (const item of archivos) {
      const localWebp = join(CARPETA_TEMP_WEBP, seccion, `${nombreSalida(item.orden)}.webp`);
      if (!existsSync(localWebp)) continue;

      const metadata = await sharp(readFileSync(localWebp)).metadata();
      const ancho = metadata.width ?? null;
      const alto = metadata.height ?? null;
      const relacion = ancho && alto ? Math.round((ancho / alto) * 1000) / 1000 : null;
      const bytes = statSync(localWebp).size;

      const clave = `${seccion}/${item.orden}`;
      const tipo = CORRECCIONES_TIPO[clave] ?? item.tipo;

      const ruta = rutaBucket(seccion, item.orden);
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(ruta);

      manifiesto.push({
        ruta_bucket: ruta,
        url_publica: publicUrl,
        seccion,
        tipo,
        orden: item.orden,
        ancho,
        alto,
        relacion,
        bytes,
        archivo_original: item.archivo,
        id_drive: item.id,
      });
    }
  }

  manifiesto.sort((a, b) =>
    a.seccion === b.seccion ? a.orden - b.orden : a.seccion.localeCompare(b.seccion),
  );

  const destino = join(RAIZ, "supabase", "seed", "imagenes-manifest-v2.json");
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(manifiesto, null, 2) + "\n", "utf8");

  console.log(`Escrito: ${destino} (${manifiesto.length} entradas)`);
  return manifiesto;
}

// ---------------------------------------------------------------------------

async function principal() {
  const fase = process.argv[2];
  mkdirSync(CARPETA_TEMP, { recursive: true });
  mkdirSync(CARPETA_TEMP_WEBP, { recursive: true });

  if (!fase || fase === "descargar") await faseDescargar();
  if (!fase || fase === "optimizar") await faseOptimizar();
  if (!fase || fase === "subir") await faseSubir();
  if (!fase || fase === "manifiesto") await faseManifiesto();

  if (fase && !["descargar", "optimizar", "subir", "manifiesto"].includes(fase)) {
    console.error(`Fase desconocida: "${fase}". Usa: descargar | optimizar | subir | manifiesto`);
    process.exit(1);
  }
}

principal().catch((error) => {
  console.error(`\nFalló: ${error.stack ?? error.message}`);
  process.exit(1);
});
