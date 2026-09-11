#!/usr/bin/env node
/**
 * Genera las versiones WEB de las fotos oficiales, sin la franja de marca de
 * agua, y las sube al bucket bajo el prefijo `web/`.
 *
 * ---------------------------------------------------------------------------
 * EL PROBLEMA
 * ---------------------------------------------------------------------------
 * Los archivos que el cliente entregó por Drive vienen de un export de
 * Instagram: todos llevan impresa, en el pie, la línea
 *
 *     Check-in: 3:00 pm | Check-out: 1:00 pm
 *     w w w . l a f i n c a e c o h o t e l . c o m
 *
 * En un carrusel de Instagram eso tiene todo el sentido del mundo. En el sitio
 * web del propio hotel, no: la dirección es la página que el visitante ya está
 * mirando, los horarios están escritos como texto en las preguntas frecuentes y
 * en la política de estadía, y la franja aparece CINCUENTA veces —una por foto—
 * en la galería, en cada tarjeta de cabaña y a pantalla completa en el hero.
 *
 * Se intentó primero esquivarla con `object-position`, subiendo el encuadre de
 * cada recorte. No alcanza: la franja está a un 85–93 % de la altura, así que
 * dejarla fuera obliga a cortar más de un 15 % por abajo, y eso ya se come el
 * primer plano de las fotos (el borde del jacuzzi, el tapete, el piso de la
 * terraza).
 *
 * ---------------------------------------------------------------------------
 * LA SOLUCIÓN
 * ---------------------------------------------------------------------------
 * Recortar la franja de una vez, al subir, y publicar esas versiones.
 *
 *   · Los ORIGINALES intactos se quedan en `drive/`. No se tocan ni se borran
 *     (el script de limpieza los protege): son el material que entregó el
 *     cliente y el día que pida volver atrás, está ahí.
 *   · Las versiones publicadas viven en `web/`, con la misma estructura de
 *     carpetas y el mismo nombre de archivo, para que la equivalencia sea obvia
 *     mirando la URL.
 *
 * No se INVENTA nada ni se retoca la imagen: solo se corta el pie. El logo
 * circular de la esquina superior sí se conserva —es la marca del hotel, está
 * bien que aparezca y no estorba—.
 *
 * `RECORTE_PIE` es el porcentaje de alto que se va. Se midió sobre cuatro fotos
 * de proporciones distintas: el texto arranca al 84,5 % en las apaisadas y al
 * 86 % en las verticales, así que un 15 % lo cubre en ambas con margen.
 *
 * USO
 * ---
 *   npm run imagenes:recortar              # simulacro: mide y no sube
 *   npm run imagenes:recortar -- --subir   # recorta y sube a `web/`
 */
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import { config } from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const BUCKET = "imagenes";
const MANIFIESTO = "supabase/seed/imagenes-manifest-v2.json";
const RECORTE_PIE = 0.15;

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
const baseMedios = `${urlSupabase}/storage/v1/object/public/${BUCKET}`;

const supabase = subir
  ? createClient(urlSupabase, exigir("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    })
  : null;

const manifiesto = JSON.parse(await readFile(MANIFIESTO, "utf8"));

/* Las fichas gráficas («0. PORTADA …») no se publican en ninguna parte: son
   texto dentro de una imagen. No tiene sentido generar su versión web. */
const fotos = manifiesto.filter((item) => item.tipo === "foto");

console.log(
  `${fotos.length} fotos a procesar (recorte del ${RECORTE_PIE * 100} % inferior).`,
);

const salida = [];
let procesadas = 0;

for (const item of fotos) {
  const respuesta = await fetch(item.url_publica);
  if (!respuesta.ok) {
    console.error(`  ! ${item.ruta_bucket}: HTTP ${respuesta.status}`);
    continue;
  }

  const original = Buffer.from(await respuesta.arrayBuffer());
  const meta = await sharp(original).metadata();
  const altoNuevo = Math.round(meta.height * (1 - RECORTE_PIE));

  const recortada = await sharp(original)
    .extract({ left: 0, top: 0, width: meta.width, height: altoNuevo })
    .webp({ quality: 82 })
    .toBuffer();

  const rutaWeb = item.ruta_bucket.replace(/^drive\//, "web/");

  if (subir) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(rutaWeb, recortada, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) {
      console.error(`  ! ${rutaWeb}: ${error.message}`);
      continue;
    }
  }

  salida.push({
    ...item,
    ruta_bucket: rutaWeb,
    url_publica: `${baseMedios}/${rutaWeb}`,
    ancho: meta.width,
    alto: altoNuevo,
    relacion: Number((meta.width / altoNuevo).toFixed(3)),
    bytes: recortada.length,
    origen: item.ruta_bucket,
  });

  procesadas++;
  if (procesadas % 10 === 0) console.log(`  ${procesadas} / ${fotos.length}…`);
}

/* El manifiesto de las versiones web se versiona igual que el original: es lo
   que `src/lib/fotos.ts` usa para declarar `ancho`/`alto` y reservar el hueco
   exacto de cada foto antes de descargarla. */
const destinoManifiesto = "supabase/seed/imagenes-manifest-web.json";
await writeFile(destinoManifiesto, `${JSON.stringify(salida, null, 2)}\n`, "utf8");

console.log("");
console.log(`Procesadas: ${procesadas}`);
console.log(`Manifiesto: ${destinoManifiesto}`);
console.log(
  subir
    ? `Subidas a ${baseMedios}/web/`
    : "SIMULACRO: no se subió nada. Repite con `--subir`.",
);
