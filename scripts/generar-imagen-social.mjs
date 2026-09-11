#!/usr/bin/env node
/**
 * Genera la tarjeta social (OpenGraph / Twitter) de 1200×630 y la sube al
 * bucket `imagenes`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HACE FALTA UNA IMAGEN DEDICADA
 * ---------------------------------------------------------------------------
 * Hasta ahora se compartía el banner del hero y se DECLARABA como 1200×630 sin
 * serlo. WhatsApp, Facebook y X recortan al centro la imagen que reciben: una
 * foto de otra proporción pierde justo los bordes, que es donde suele estar el
 * cielo, el valle o la cabaña. Una tarjeta hecha a medida es la diferencia
 * entre que el enlace del hotel se vea como un hotel o como un trozo de verde.
 *
 * QUÉ COMPONE
 * -----------
 * 1. Una foto oficial de zonas comunes, recortada a mano a 1200×630 para
 *    dejar fuera las marcas de agua que traen los archivos del Drive.
 * 2. Un velo de petróleo en degradado, más denso abajo: es lo que mete la foto
 *    en la paleta de marca y da contraste al texto.
 * 3. El isotipo del colibrí en blanco, el wordmark «LA FINCA / Eco · Hotel»
 *    espaciado como en el manual, y una línea con la ubicación.
 *
 * El texto va como SVG con tipografía genérica (`sans-serif`): la fuente de
 * marca es de pago y la sustituta es de Google Fonts, y ninguna de las dos está
 * instalada en el sistema donde corre esto. Con un wordmark de dos palabras
 * muy espaciadas la diferencia es imperceptible.
 *
 * USO
 * ---
 *   node scripts/generar-imagen-social.mjs            # genera y sube
 *   node scripts/generar-imagen-social.mjs --local    # solo deja el archivo
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { config } from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const ANCHO = 1200;
const ALTO = 630;

/** Ruta en el bucket. Es fija: las redes cachean la URL durante semanas. */
const DESTINO = "sitio/social/tarjeta-og-1200x630.webp";

/**
 * Foto de origen: el corredor techado abierto al bosque de niebla.
 *
 * Se eligió por dos motivos. Uno, es la única apaisada de verdad (2400×1800),
 * así que llega a 1200×630 perdiendo solo altura. Y dos —el importante—, todas
 * las fotos del Drive traen impreso abajo «Check-in: 3:00 pm | Check-out: 1:00
 * pm | www.lafincaecohotel.com». En la tarjeta social ese texto quedaría
 * pisando el wordmark. Recortando la FRANJA SUPERIOR de esta foto, la marca de
 * agua se queda fuera del encuadre.
 */
const ORIGEN = "web/zonas-comunes/02.webp";

const soloLocal = process.argv.includes("--local");

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

const urlSupabase = exigir("NEXT_PUBLIC_SUPABASE_URL");
const baseMedios = `${urlSupabase}/storage/v1/object/public/imagenes`;

/* ---------------------------------------------------------------------------
 * 1. La foto
 * ------------------------------------------------------------------------- */

const respuesta = await fetch(`${baseMedios}/${ORIGEN}`);
if (!respuesta.ok) {
  console.error(`No se pudo descargar ${ORIGEN}: HTTP ${respuesta.status}`);
  process.exit(1);
}
const original = Buffer.from(await respuesta.arrayBuffer());

/*
  RECORTE A MANO, NO AUTOMÁTICO.

  Las fotos del Drive traen DOS marcas encima, una en cada extremo: arriba a la
  derecha, la pegatina circular con el logo del hotel; abajo, la línea
  «Check-in: 3:00 pm | Check-out: 1:00 pm | www.lafincaecohotel.com». Las dos
  sobran en una tarjeta social —la primera repetiría el wordmark que la propia
  tarjeta ya compone, y la segunda es información que no pinta en un enlace
  compartido—.

  Un `fit: "cover"` centrado deja dentro las dos, y `attention` es peor todavía:
  elige por saliencia, y en estas fotos lo más "llamativo" acaba siendo la
  baranda o la escalera, no el paisaje. Así que se escala a lo ancho y se corta
  una franja desplazada hacia abajo, que esquiva ambas.
*/
const DESPLAZAMIENTO_Y = 120;

const escalada = await sharp(original).resize({ width: ANCHO }).toBuffer();
const { height: altoEscalado = ALTO } = await sharp(escalada).metadata();

const fondo = await sharp(escalada)
  .extract({
    left: 0,
    top: Math.max(0, Math.min(DESPLAZAMIENTO_Y, altoEscalado - ALTO)),
    width: ANCHO,
    height: Math.min(ALTO, altoEscalado),
  })
  .resize(ANCHO, ALTO, { fit: "cover" })
  .toBuffer();

/* ---------------------------------------------------------------------------
 * 2. El velo y 3. la marca, en una sola capa SVG
 * ------------------------------------------------------------------------- */

const isotipo = await readFile(path.join("public", "marca", "icono.png"));

/*
  El isotipo oficial es petróleo sólido sobre fondo transparente; sobre la foto
  oscura de la tarjeta no se vería. Hace falta en blanco.

  Se consigue con `blend: "dest-in"`: se parte de un cuadrado blanco y se le
  aplica el PNG como recorte, de modo que solo sobrevive el blanco donde el
  colibrí es opaco. Es la silueta EXACTA del archivo oficial —no se redibuja ni
  se deforma nada, que es lo que prohíbe el manual—, solo cambia el color.
*/
const LADO_ISOTIPO = 112;
const isotipoBlanco = await sharp({
  create: {
    width: LADO_ISOTIPO,
    height: LADO_ISOTIPO,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([
    {
      input: await sharp(isotipo)
        .resize(LADO_ISOTIPO, LADO_ISOTIPO, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer(),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

const capa = Buffer.from(`
<svg width="${ANCHO}" height="${ALTO}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="velo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#052524" stop-opacity="0.42"/>
      <stop offset="45%"  stop-color="#052524" stop-opacity="0.60"/>
      <stop offset="100%" stop-color="#052524" stop-opacity="0.90"/>
    </linearGradient>
    <radialGradient id="luz" cx="0.86" cy="0.10" r="0.62">
      <stop offset="0%"   stop-color="#e8f4d9" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#e8f4d9" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#velo)"/>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#luz)"/>

  <text x="${ANCHO / 2}" y="432" text-anchor="middle"
        font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="76" font-weight="300" letter-spacing="26" fill="#ffffff">LA FINCA</text>
  <text x="${ANCHO / 2}" y="482" text-anchor="middle"
        font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="24" font-weight="400" letter-spacing="16" fill="#e8f4d9">Eco - Hotel</text>

  <line x1="${ANCHO / 2 - 120}" y1="524" x2="${ANCHO / 2 + 120}" y2="524"
        stroke="#e8f4d9" stroke-opacity="0.45" stroke-width="1.5"/>

  <text x="${ANCHO / 2}" y="570" text-anchor="middle"
        font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="27" font-weight="400" fill="#e8f4d9" fill-opacity="0.95">Km 18 vía Cali–Buenaventura · Bosque de niebla</text>
</svg>`);

const tarjeta = await sharp(fondo)
  .composite([
    { input: capa, top: 0, left: 0 },
    {
      input: isotipoBlanco,
      top: 232,
      left: Math.round(ANCHO / 2 - LADO_ISOTIPO / 2),
    },
  ])
  .webp({ quality: 86 })
  .toBuffer();

/* El archivo local es solo para revisarlo a ojo antes de subirlo; no se
   versiona ni se sirve desde `public/`. */
const rutaLocal = path.join("public", "tarjeta-og.webp");
await writeFile(rutaLocal, tarjeta);
console.log(
  `Tarjeta generada: ${rutaLocal} (${(tarjeta.length / 1024).toFixed(0)} kB)`,
);

if (soloLocal) process.exit(0);

/* ---------------------------------------------------------------------------
 * Subida al bucket
 * ------------------------------------------------------------------------- */

const supabase = createClient(
  urlSupabase,
  exigir("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

const { error } = await supabase.storage
  .from("imagenes")
  .upload(DESTINO, tarjeta, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });

if (error) {
  console.error("Error al subir:", error.message);
  process.exit(1);
}

console.log(`Subida a: ${baseMedios}/${DESTINO}`);
