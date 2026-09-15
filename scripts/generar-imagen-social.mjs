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

/**
 * Ruta en el bucket.
 *
 * Cambió al llegar los logos oficiales del diseñador: la tarjeta anterior
 * componía el wordmark con una tipografía de sistema porque la de marca no
 * estaba disponible, y esta usa el archivo real. **El nombre nuevo es
 * deliberado**, no un descuido: en el bucket de La Finca ninguna imagen se
 * sobrescribe —una URL siempre devuelve el mismo archivo, y por eso se sirven
 * con un año de caché—, así que una tarjeta distinta es una ruta distinta.
 *
 * Se pudo hacer justo ahora porque el sitio todavía no está publicado
 * (): nadie ha compartido aún el enlace, así que no hay
 * ninguna previsualización cacheada en WhatsApp o Facebook que se vaya a
 * quedar mostrando la tarjeta vieja. De aquí en adelante, esta ruta se queda.
 */
const DESTINO = "sitio/social/tarjeta-og-marca-oficial-1200x630.webp";

/**
 * Foto de origen: el hero de escritorio de la portada.
 *
 * Es el corredor techado abierto al valle, y se elige por dos motivos.
 *
 * Uno: **ya viene sin el sello de marca**. Las 53 fotos del Drive llevan
 * pegada en la esquina superior derecha una pegatina circular con el isotipo y
 * el wordmark, y en una tarjeta social eso sale como una mancha al lado del
 * logotipo que la propia tarjeta compone. `npm run imagenes:hero` genera esta
 * variante recortando justo la franja donde vive el sello (ver
 * `scripts/generar-heros.mjs`), así que aquí no hay nada que esquivar. Con la
 * foto de `web/zonas-comunes/02.webp` que se usaba antes, el sello se colaba en
 * la esquina —se vio en la primera prueba— y no había desplazamiento vertical
 * que lo sacara sin perder el paisaje.
 *
 * Dos: mide 2400×1180, casi exactamente la proporción de la tarjeta (1200×630),
 * así que llega a su tamaño perdiendo solo unos píxeles de alto en vez de
 * recortar media foto.
 */
const ORIGEN = "web/heroes/portada-escritorio.webp";

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
  UN `cover` CENTRADO BASTA.

  La versión anterior partía de una foto con el sello de marca impreso y tenía
  que cortar una franja desplazada hacia abajo para esquivarlo. Con el hero de
  la portada no hay nada que evitar: la foto ya viene recortada sin sello y su
  proporción es casi la de la tarjeta, así que el recorte se lleva unos píxeles
  de arriba y de abajo y no toca el encuadre.
*/
const fondo = await sharp(original)
  .resize(ANCHO, ALTO, { fit: "cover", position: "center" })
  .toBuffer();

/* ---------------------------------------------------------------------------
 * 2. El velo y 3. la marca, en una sola capa SVG
 * ------------------------------------------------------------------------- */

/*
  EL LOGOTIPO OFICIAL, NO UNA RECONSTRUCCIÓN.

  Hasta que llegaron los archivos del diseñador, esta tarjeta componía el
  wordmark a mano en SVG —«LA FINCA» y «Eco · Hotel» con una tipografía de
  sistema muy espaciada—, porque la fuente de marca es de pago y no está
  instalada donde corre esto. Funcionaba de lejos y no era la marca.

  Ahora se usa `logo-vertical-petroleo.png`: el lockup completo dibujado por el
  diseñador, con el colibrí, el interletrado real y las proporciones que fija el
  manual. No se redibuja, no se deforma, no se rota: solo cambia de color.
*/
const logoOficial = await readFile(
  path.join("public", "marca", "oficial", "logo-vertical-petroleo.png"),
);

/*
  DE PETRÓLEO A CREMA, CON LA SILUETA INTACTA.

  El archivo oficial es petróleo sólido sobre transparente, y sobre la foto
  oscura de la tarjeta no se leería. Se pinta un rectángulo crema y se recorta
  con el PNG (`blend: "dest-in"`): sobrevive el crema solo donde el logotipo es
  opaco, así que la silueta y el suavizado de los bordes son EXACTAMENTE los del
  archivo del diseñador. Es teñir, no redibujar, que es lo que el manual permite.

  `trim()` antes de nada: el archivo es un cuadrado de 1080 px con mucho aire
  alrededor, y sin recortarlo el logotipo saldría diminuto en la tarjeta.
*/
const ANCHO_LOGO = 430;
const recortado = await sharp(logoOficial).trim({ threshold: 1 }).toBuffer();
const { width: anchoReal = 1, height: altoReal = 1 } =
  await sharp(recortado).metadata();
const ALTO_LOGO = Math.round((altoReal * ANCHO_LOGO) / anchoReal);

const logoCrema = await sharp({
  create: {
    width: ANCHO_LOGO,
    height: ALTO_LOGO,
    channels: 4,
    background: { r: 254, g: 251, b: 247, alpha: 1 },
  },
})
  .composite([
    {
      input: await sharp(recortado).resize(ANCHO_LOGO, ALTO_LOGO).toBuffer(),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

/*
  EL VELO Y LA LÍNEA DE UBICACIÓN.

  El velo es más denso abajo: es lo que mete la fotografía en la paleta de marca
  y lo que le da al logotipo un fondo con contraste suficiente. La línea de
  ubicación sí sigue siendo texto SVG con tipografía de sistema, y ahí no
  importa: no es marca, es un pie de foto.
*/
const LINEA_Y = Math.round(ALTO / 2 + ALTO_LOGO / 2 + 74);

const capa = Buffer.from(`
<svg width="${ANCHO}" height="${ALTO}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="velo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#02403e" stop-opacity="0.52"/>
      <stop offset="45%"  stop-color="#023b39" stop-opacity="0.66"/>
      <stop offset="100%" stop-color="#052524" stop-opacity="0.90"/>
    </linearGradient>
    <radialGradient id="luz" cx="0.86" cy="0.10" r="0.62">
      <stop offset="0%"   stop-color="#e8f4d9" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#e8f4d9" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#velo)"/>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#luz)"/>

  <line x1="${ANCHO / 2 - 130}" y1="${LINEA_Y - 36}" x2="${ANCHO / 2 + 130}" y2="${LINEA_Y - 36}"
        stroke="#e8f4d9" stroke-opacity="0.45" stroke-width="1.5"/>

  <text x="${ANCHO / 2}" y="${LINEA_Y}" text-anchor="middle"
        font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="28" font-weight="400" fill="#e8f4d9" fill-opacity="0.95">Km 18 vía Cali–Buenaventura · Bosque de niebla</text>
</svg>`);

const tarjeta = await sharp(fondo)
  .composite([
    { input: capa, top: 0, left: 0 },
    {
      input: logoCrema,
      /* Centrado y un poco por encima del centro óptico: debajo va la línea
         de ubicación, y un bloque perfectamente centrado con texto debajo se
         lee como si estuviera caído. */
      top: Math.round(ALTO / 2 - ALTO_LOGO / 2 - 26),
      left: Math.round(ANCHO / 2 - ANCHO_LOGO / 2),
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
