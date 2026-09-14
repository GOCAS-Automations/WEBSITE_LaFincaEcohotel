#!/usr/bin/env node
/**
 * Genera las NUEVE variantes de hero del sitio, en `web/heroes/`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTEN VARIANTES DEDICADAS Y NO SE USA LA FOTO DE `web/`
 * ---------------------------------------------------------------------------
 * Cesar reportó que varios heros se veían BORROSOS. Medido, eran tres causas
 * sumadas, y ninguna se arregla sola:
 *
 *   1. **Material pequeño.** Las fotos del Drive son exportaciones de
 *      Instagram: la mayoría mide 1448 px de ancho y unas cuantas solo 1086 o
 *      941. Un hero ocupa el ancho de la ventana (1440 px o más en
 *      escritorio), así que una foto de 941 px se estira un 53 %.
 *      `next/image` NO amplía —su `sharp.resize()` lleva
 *      `withoutEnlargement: true`—, de modo que devuelve el archivo a su
 *      tamaño real y es el NAVEGADOR el que lo estira. Blando garantizado, y
 *      sin ninguna señal en el HTML de que algo va mal.
 *   2. **Doble compresión.** `web/` se genera de `drive/` con
 *      `webp({ quality: 82 })` y luego `next/image` vuelve a comprimir a 75
 *      (68 en el hero de la portada). Son TRES generaciones de pérdida sobre un
 *      WebP que ya venía comprimido de Instagram.
 *   3. **Recorte.** El hero es una banda de proporción ~3:1; con
 *      `object-cover` el navegador tira más de la mitad del alto de la foto.
 *      No resta nitidez por sí solo, pero sí explica por qué el hero se ve
 *      peor que la misma foto en la galería.
 *
 * Contra (1) no hay script que valga: se cambia de foto. Este archivo es la
 * lista de qué foto usa cada hero, y la regla que se aplicó al elegirlas es
 * dura: **ninguna foto de menos de 1440 px de ancho puede ser un hero**. Tres
 * páginas cambiaron de foto por eso (ver la tabla de abajo).
 *
 * Contra (2) sí: estas variantes se cortan del ORIGINAL de `drive/` y se
 * guardan con `webp({ quality: 90 })`. Se ahorra una generación de pérdida y
 * la que queda es mucho más suave. En el sitio van además con `quality={90}`.
 *
 * **No se amplía nada.** Ninguna variante lleva `resize()`: solo `extract()`.
 * Si un día hace falta un hero más grande que su origen, la respuesta es pedir
 * al cliente el archivo de cámara, no interpolar píxeles que no existen.
 *
 * ---------------------------------------------------------------------------
 * EL RECORTE DE `web/` SE APLICA AQUÍ TAMBIÉN
 * ---------------------------------------------------------------------------
 * Los archivos de `drive/` traen impresa en el pie la franja «Check-in: 3:00 pm
 * | Check-out: 1:00 pm | www.lafincaecohotel.com», que `npm run imagenes:recortar`
 * quita llevándose el 15 % inferior. Los recortes de esta lista ya lo tienen en
 * cuenta: ninguno llega más abajo del 85 % del alto original.
 *
 *   node scripts/generar-heros.mjs            # simulacro
 *   node scripts/generar-heros.mjs --subir    # sube a web/heroes/
 */
import { writeFile } from "node:fs/promises";
import process from "node:process";

import { config } from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const BUCKET = "imagenes";
/** Una sola generación de pérdida, y suave. Ver la cabecera. */
const CALIDAD = 90;
const subir = process.argv.includes("--subir");

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

const urlSupabase = exigir("NEXT_PUBLIC_SUPABASE_URL");
const base = `${urlSupabase}/storage/v1/object/public/${BUCKET}`;
const supabase = subir
  ? createClient(urlSupabase, exigir("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    })
  : null;

/**
 * Qué foto usa cada hero y por qué.
 *
 * `recorte` está medido sobre el ORIGINAL de `drive/`, mirando el resultado a
 * 1440 px. Donde el recorte es «todo menos el 15 % del pie» es porque el
 * encuadre de la foto ya funcionaba y lo único que hacía falta era subir la
 * calidad: cambiarlo habría movido el hero sin motivo.
 */
const VARIANTES = [
  /* ---------------------------------------------------------------- Portada
     LA FOTO DE LA PORTADA NO SE TOCA: le gusta a Cesar. Lo que cambia es de
     dónde sale (del original de 2400 px, no de la copia ya comprimida) y con
     qué calidad se guarda. El encuadre es el mismo que traía
     `generar-hero-sin-flag.mjs`, que este script sustituye: recortado para
     dejar fuera el sello de marca de la esquina superior derecha, porque a
     pantalla completa y a dos dedos del logotipo de la barra se leía como una
     marca de agua de banco de imágenes. */
  {
    nombre: "portada-escritorio",
    origen: "drive/zonas-comunes/02.webp",
    recorte: { left: 0, top: 350, width: 2400, height: 1180 },
    nota: "Corredor techado abierto al valle. Sin sello: se va la franja superior.",
  },
  {
    nombre: "portada-movil",
    origen: "drive/zonas-comunes/01.webp",
    recorte: { left: 0, top: 0, width: 1750, height: 2720 },
    nota: "Deck techado, vertical. Sin sello: aquí no se puede recortar por arriba (el techo de guadua ES la foto), así que se va la franja derecha.",
  },

  /* ------------------------------------------------- Las siete páginas
     Las que conservan foto (`alojamientos`, `galeria`, `reservar`) ya partían
     de 1448 px: solo suben de calidad. Las otras tres cambiaron de foto porque
     la suya no llegaba al ancho de un hero. */
  {
    nombre: "alojamientos",
    origen: "drive/cabana-03/02.webp",
    recorte: { left: 0, top: 0, width: 1448, height: 923 },
    nota: "Balcón techado de la Cabaña 03. Se mantiene: 1448 px bastan.",
  },
  {
    nombre: "experiencias",
    origen: "drive/cabana-02/05.webp",
    recorte: { left: 0, top: 0, width: 1448, height: 923 },
    nota: "CAMBIA: la chimenea de la 05 se muda al hero de Contacto y aquí entra el jacuzzi bajo el árbol, que es la imagen que mejor dice «experiencia».",
  },
  {
    nombre: "conocenos",
    origen: "drive/zonas-comunes/05.webp",
    /* La foto es muy vertical (1536×2048) y el hero es una banda: servirla
       entera sería descargar tres veces los píxeles que se ven. Se corta la
       franja que enseña las cabañas de techo azul sobre la ladera con los
       senderos y los jardines, que es exactamente lo que significa «Conócenos». */
    recorte: { left: 0, top: 371, width: 1536, height: 1000 },
    nota: "CAMBIA: la piscina medía 1086 px. Entra la panorámica de la reserva, 1536 px, recortada a la banda de las cabañas.",
  },
  {
    nombre: "galeria",
    origen: "drive/zonas-comunes/07.webp",
    recorte: { left: 0, top: 0, width: 1448, height: 923 },
    nota: "Mesa y sillas de piedra en la neblina del atardecer. Se mantiene.",
  },
  {
    nombre: "faq",
    origen: "drive/cabana-02/04.webp",
    recorte: { left: 0, top: 0, width: 1448, height: 923 },
    nota: "CAMBIA: el balcón de la Cabaña 01 medía 1086 px. Entra la terraza de la 02, la misma escena (hamaca y montañas) con 1448 px.",
  },
  {
    nombre: "contacto",
    origen: "drive/cabana-05/05.webp",
    recorte: { left: 0, top: 0, width: 1448, height: 923 },
    nota: "CAMBIA: la fogata medía 941 px, el peor material del sitio. Entra la chimenea de la Cabaña 05, que cuenta lo mismo —calor, noche, compañía— con 1448 px.",
  },
  {
    nombre: "reservar",
    origen: "drive/cabana-01/01.webp",
    recorte: { left: 0, top: 0, width: 1448, height: 923 },
    nota: "Habitación del nivel superior de la Cabaña 01. Se mantiene.",
  },
];

const resumen = [];

for (const v of VARIANTES) {
  const destino = `web/heroes/${v.nombre}.webp`;
  const respuesta = await fetch(`${base}/${v.origen}`);
  if (!respuesta.ok) {
    console.error(`  ! ${v.origen}: HTTP ${respuesta.status}`);
    process.exitCode = 1;
    continue;
  }
  const original = Buffer.from(await respuesta.arrayBuffer());
  const medidas = await sharp(original).metadata();

  /* Red de seguridad: si alguien mueve un recorte fuera del original, que
     falle aquí y no al mirar la foto publicada. */
  const { left, top, width, height } = v.recorte;
  if (left + width > medidas.width || top + height > medidas.height) {
    console.error(
      `  ! ${v.nombre}: el recorte se sale del original (${medidas.width}×${medidas.height})`,
    );
    process.exitCode = 1;
    continue;
  }
  if (top + height > Math.round(medidas.height * 0.85)) {
    console.error(
      `  ! ${v.nombre}: el recorte entra en la franja de check-in del pie`,
    );
    process.exitCode = 1;
    continue;
  }

  const recortada = await sharp(original)
    .extract(v.recorte)
    .webp({ quality: CALIDAD })
    .toBuffer();

  if (subir) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(destino, recortada, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) {
      console.error(`  ! ${destino}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
  }

  resumen.push({
    ruta_bucket: destino,
    url_publica: `${base}/${destino}`,
    origen: v.origen,
    origen_ancho: medidas.width,
    origen_alto: medidas.height,
    ancho: width,
    alto: height,
    bytes: recortada.length,
    calidad: CALIDAD,
    nota: v.nota,
  });
  console.log(
    `${destino.padEnd(34)} ${width}×${height}  ${(recortada.length / 1024) | 0} kB   ← ${v.origen} (${medidas.width}×${medidas.height})`,
  );
}

await writeFile(
  "supabase/seed/imagenes-manifest-hero.json",
  `${JSON.stringify(resumen, null, 2)}\n`,
  "utf8",
);
console.log(
  subir ? "Subidas." : "SIMULACRO: no se subió nada. Repite con `--subir`.",
);
