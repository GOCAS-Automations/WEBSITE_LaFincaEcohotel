#!/usr/bin/env node
/**
 * Sube al bucket `videos` el clip de «Somos COP16» y genera su póster.
 *
 * ---------------------------------------------------------------------------
 * DE DÓNDE SALE EL VIDEO
 * ---------------------------------------------------------------------------
 * Es el mismo clip que acompañaba la sección de reconocimiento en el sitio
 * anterior (WordPress, lafincaecohotel.com). Título del archivo original:
 * «Somos Cop16 y con la @camaracali nos estamos preparando para este evento
 * donde mostraremos la mejor imagen de nuestra región al mundo entero».
 *
 * Lo que entregó el sitio viejo: H.264 848×480 a 30 fps, 2 min 49 s, 12,1 MB.
 * NO existe una versión en 1080p: el material de origen es vertical de
 * Instagram reescalado, y subirlo a 1080 solo añadiría peso sin añadir
 * detalle.
 *
 * ---------------------------------------------------------------------------
 * RECOMPRESIÓN
 * ---------------------------------------------------------------------------
 * ffmpeg en dos pasadas: 24 fps, 300 kb/s de video con techo de 420 kb/s, y
 * audio AAC mono a 64 kb/s. Queda en **7,5 MB** (por debajo del límite de 8 MB
 * que se fijó para no castigar al visitante de móvil) y se mantiene el audio
 * porque el clip TIENE LOCUCIÓN: es una persona hablando, no un plano de
 * ambiente. Se reproduce silenciado, pero quien quiera oírlo puede.
 *
 *   node scripts/subir-video-cop16.mjs --origen "<ruta.mp4>" [--subir]
 *
 * Si no se pasa `--origen` y el archivo ya recomprimido existe en la carpeta
 * de trabajo, se usa ese.
 */
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import process from "node:process";
import { config } from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const argumento = (nombre) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const subir = process.argv.includes("--subir");
const origenVideo = argumento("origen");
const origenPoster = argumento("poster");

if (!origenVideo) {
  console.error("Falta --origen <ruta al .mp4 ya recomprimido>");
  process.exit(1);
}

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) { console.error(`Falta ${nombre} en .env.local`); process.exit(1); }
  return valor;
}

const urlSupabase = exigir("NEXT_PUBLIC_SUPABASE_URL");
const publico = (bucket, ruta) =>
  `${urlSupabase}/storage/v1/object/public/${bucket}/${ruta}`;

const supabase = subir
  ? createClient(urlSupabase, exigir("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    })
  : null;

const RUTA_VIDEO = "sitio/cop16-la-finca.mp4";
const RUTA_POSTER = "sitio/video/cop16-poster.webp";

const video = await readFile(origenVideo);
console.log(`video  ${basename(origenVideo)}  ${(video.length / 1048576).toFixed(2)} MB`);
if (video.length > 8 * 1024 * 1024) {
  console.error("El video pasa de 8 MB. Recomprime antes de subir.");
  process.exit(1);
}

/* El póster es un fotograma del propio clip (el bebedero de colibríes entre la
   neblina, el plano más bonito del video), en WebP: es lo que se ve mientras el
   navegador todavía no ha decidido descargar el video, y con `preload="metadata"`
   en móvil puede ser lo único que se vea. */
let poster = null;
if (origenPoster) {
  /* 960 px y calidad 58: el póster solo se ve mientras el video no arranca, y
     a pantalla completa de un teléfono 960 px sobran. Pasó de 39 kB a 25 kB, que
     en el primer visor de la portada es lo que se estaba midiendo. */
  poster = await sharp(await readFile(origenPoster))
    .resize(960)
    .webp({ quality: 58 })
    .toBuffer();
  console.log(`poster ${(poster.length / 1024) | 0} kB`);
}

if (subir) {
  const r1 = await supabase.storage.from("videos").upload(RUTA_VIDEO, video, {
    contentType: "video/mp4", cacheControl: "31536000", upsert: true,
  });
  if (r1.error) { console.error(r1.error.message); process.exit(1); }
  console.log(`subido → ${publico("videos", RUTA_VIDEO)}`);

  if (poster) {
    const r2 = await supabase.storage.from("imagenes").upload(RUTA_POSTER, poster, {
      contentType: "image/webp", cacheControl: "31536000", upsert: true,
    });
    if (r2.error) { console.error(r2.error.message); process.exit(1); }
    console.log(`subido → ${publico("imagenes", RUTA_POSTER)}`);
  }
} else {
  console.log("SIMULACRO: no se subió nada. Repite con `--subir`.");
}

await writeFile(
  "supabase/seed/video-cop16.json",
  `${JSON.stringify(
    {
      video: { bucket: "videos", ruta: RUTA_VIDEO, url: publico("videos", RUTA_VIDEO), bytes: video.length },
      poster: poster
        ? { bucket: "imagenes", ruta: RUTA_POSTER, url: publico("imagenes", RUTA_POSTER), bytes: poster.length }
        : null,
      origen: "sitio anterior (WordPress) — sección de reconocimiento COP16",
      original: { codec: "h264", ancho: 848, alto: 480, fps: 30, duracion_s: 168.9, bytes: 12079493 },
    },
    null,
    2,
  )}\n`,
  "utf8",
);
