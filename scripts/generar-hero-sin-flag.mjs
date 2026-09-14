#!/usr/bin/env node
/**
 * Genera las dos variantes del HERO DE LA PORTADA sin el sello de marca.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ
 * ---------------------------------------------------------------------------
 * Las 53 fotos del Drive llevan impreso en el borde superior derecho el sello
 * blanco «LA FINCA · Eco-Hotel» (ver `scripts/inventariar-flag.mjs`). En una
 * tarjeta o en la galería queda bien: es la marca del hotel. A PANTALLA COMPLETA
 * en el hero, no: el sello queda flotando en una esquina, a 200 px del logotipo
 * real de la barra de navegación, y se lee como una marca de agua de banco de
 * imágenes sobre la primera pantalla del sitio.
 *
 * La foto gusta y no se cambia. Lo que se cambia es el ENCUADRE: se recorta de
 * modo que el sello quede fuera, conservando la composición.
 *
 *   · Escritorio (`zonas-comunes/02`, el corredor abierto al valle):
 *     se va la franja superior, donde vive el sello. Queda un panorámico 2:1
 *     que conserva el borde del techo, la hilera de jardineras, el bebedero de
 *     colibríes y el valle entero. Para un hero a lo ancho de la pantalla, la
 *     proporción panorámica es además la que menos recorta el navegador.
 *   · Móvil (`zonas-comunes/01`, el deck techado):
 *     aquí NO se puede recortar por arriba —el techo de guadua es la foto— así
 *     que se va la franja DERECHA. Queda un vertical 1750×2720 que sigue
 *     entrando entero en una pantalla de teléfono y conserva la mesa, el techo
 *     y la vista.
 *
 * Los archivos de origen son los de `drive/` (intactos), no los de `web/`: el
 * recorte del pie se aplica aquí también, para no encadenar dos compresiones.
 *
 *   node scripts/generar-hero-sin-flag.mjs            # simulacro
 *   node scripts/generar-hero-sin-flag.mjs --subir    # sube a web/
 */
import { writeFile } from "node:fs/promises";
import process from "node:process";
import { config } from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const BUCKET = "imagenes";
const subir = process.argv.includes("--subir");

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) { console.error(`Falta ${nombre} en .env.local`); process.exit(1); }
  return valor;
}
const urlSupabase = exigir("NEXT_PUBLIC_SUPABASE_URL");
const base = `${urlSupabase}/storage/v1/object/public/${BUCKET}`;
const supabase = subir
  ? createClient(urlSupabase, exigir("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } })
  : null;

/* Recortes medidos a mano sobre el ORIGINAL de `drive/`, mirando el resultado.
   `top`/`left` dejan el sello fuera; `height` respeta además el 15 % inferior
   de la franja de check-in. */
const VARIANTES = [
  {
    origen: "drive/zonas-comunes/02.webp",
    destino: "web/zonas-comunes/hero-escritorio.webp",
    recorte: { left: 0, top: 350, width: 2400, height: 1180 },
  },
  {
    origen: "drive/zonas-comunes/01.webp",
    destino: "web/zonas-comunes/hero-movil.webp",
    recorte: { left: 0, top: 0, width: 1750, height: 2720 },
  },
];

const resumen = [];
for (const v of VARIANTES) {
  const respuesta = await fetch(`${base}/${v.origen}`);
  if (!respuesta.ok) { console.error(`  ! ${v.origen}: HTTP ${respuesta.status}`); continue; }
  const original = Buffer.from(await respuesta.arrayBuffer());
  const recortada = await sharp(original).extract(v.recorte).webp({ quality: 82 }).toBuffer();

  if (subir) {
    const { error } = await supabase.storage.from(BUCKET).upload(v.destino, recortada, {
      contentType: "image/webp", cacheControl: "31536000", upsert: true,
    });
    if (error) { console.error(`  ! ${v.destino}: ${error.message}`); continue; }
  }
  resumen.push({
    ruta_bucket: v.destino,
    url_publica: `${base}/${v.destino}`,
    origen: v.origen,
    ancho: v.recorte.width,
    alto: v.recorte.height,
    bytes: recortada.length,
    flag: { presente: false, nota: "recortada para dejar el sello fuera" },
  });
  console.log(`${v.destino}  ${v.recorte.width}×${v.recorte.height}  ${(recortada.length / 1024) | 0} kB`);
}

await writeFile(
  "supabase/seed/imagenes-manifest-hero.json",
  `${JSON.stringify(resumen, null, 2)}\n`,
  "utf8",
);
console.log(subir ? "Subidas." : "SIMULACRO: no se subió nada. Repite con `--subir`.");
