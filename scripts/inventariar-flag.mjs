#!/usr/bin/env node
/**
 * Inventaría el SELLO DE MARCA («flag») que traen impresas las fotos del Drive.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES EL FLAG
 * ---------------------------------------------------------------------------
 * Los archivos que entregó el cliente vienen de un export de Instagram. Además
 * de la franja de check-in del pie —que `imagenes:recortar` ya elimina—, TODAS
 * llevan pegado en el BORDE SUPERIOR, hacia la derecha, un sello blanco con el
 * isotipo y el wordmark «LA FINCA · Eco-Hotel»: una pestaña de esquinas
 * redondeadas colgando del borde de arriba.
 *
 * Ese sello es marca del hotel y en un rectángulo queda bien. El problema es
 * otro: cuando la foto se mete en un contenedor con forma —un arco, un radio
 * muy grande, un recorte orgánico— la forma MUERDE justo esa esquina y el
 * sello aparece cortado por la mitad. Es lo que pasaba en la sección
 * «Bienvenidos» de la portada, cuyo contenedor es un arco de medio punto.
 *
 * ---------------------------------------------------------------------------
 * QUÉ HACE ESTE SCRIPT
 * ---------------------------------------------------------------------------
 * Mide el sello en cada foto y escribe en los dos manifiestos un campo `flag`:
 *
 *     "flag": {
 *       "presente": true,
 *       "posicion": "superior-derecha",
 *       "caja": { "x0": 0.785, "x1": 0.932, "y0": 0, "y1": 0.173 }
 *     }
 *
 * La caja va en FRACCIONES del ancho y del alto de esa versión del archivo
 * (por eso se recalcula para `web/`, que ya perdió el 15 % inferior y tiene por
 * tanto un `y1` proporcionalmente mayor).
 *
 * La medición aísla el sello como la componente conexa de blanco casi puro que
 * TOCA la fila 0. Con fotos que tienen cielo blanco o un techo muy claro
 * pegado al borde superior, la componente se derrama; por eso el resultado se
 * valida contra la caja de consenso del lote y, si se sale de rango, se usa
 * esa (queda anotado como `medida: "consenso"`).
 *
 *   node scripts/inventariar-flag.mjs
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

const CARPETA = join(tmpdir(), "lafinca-drive-webp");
const MANIFIESTOS = [
  { ruta: "supabase/seed/imagenes-manifest-v2.json", recortePie: 0 },
  { ruta: "supabase/seed/imagenes-manifest-web.json", recortePie: 0.15 },
];

/** Caja de consenso, medida sobre las 51 fotos que se aíslan sin ambigüedad. */
const CONSENSO = { x0: 0.74, x1: 0.95, y0: 0, y1: 0.15 };
const LIMITES = { x0: [0.66, 0.83], x1: [0.88, 1.0], y1: [0.1, 0.2] };

async function medir(ruta) {
  const meta = await sharp(ruta).metadata();
  const A = 400;
  const B = Math.max(1, Math.round((meta.height / meta.width) * A));
  const { data, info } = await sharp(ruta)
    .resize(A, B, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const blanco = (x, y) => {
    const o = (y * A + x) * ch;
    return data[o] > 246 && data[o + 1] > 246 && data[o + 2] > 242;
  };
  const visto = new Uint8Array(A * B);
  const pila = [];
  for (let x = 0; x < A; x++) if (blanco(x, 0)) { visto[x] = 1; pila.push(x); }
  let minX = Infinity, maxX = -1, maxY = -1;
  while (pila.length) {
    const i = pila.pop();
    const x = i % A, y = (i / A) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= A || ny >= B) continue;
      const j = ny * A + nx;
      if (!visto[j] && blanco(nx, ny)) { visto[j] = 1; pila.push(j); }
    }
  }
  if (maxX < 0) return null;
  return { x0: minX / A, x1: (maxX + 1) / A, y1: (maxY + 1) / B };
}

const enRango = (v, [a, b]) => v >= a && v <= b;

const medidas = new Map();
for (const carpeta of await readdir(CARPETA)) {
  for (const archivo of (await readdir(join(CARPETA, carpeta))).filter((f) =>
    f.endsWith(".webp"),
  )) {
    const nombre = archivo.replace(/\.webp$/, "");
    const cruda = await medir(join(CARPETA, carpeta, archivo));
    const valida =
      cruda &&
      enRango(cruda.x0, LIMITES.x0) &&
      enRango(cruda.x1, LIMITES.x1) &&
      enRango(cruda.y1, LIMITES.y1);
    medidas.set(`${carpeta}/${nombre}`, {
      caja: valida ? cruda : { ...CONSENSO },
      medida: valida ? "directa" : "consenso",
    });
  }
}

for (const { ruta, recortePie } of MANIFIESTOS) {
  const items = JSON.parse(await readFile(ruta, "utf8"));
  let n = 0;
  for (const item of items) {
    const clave = item.ruta_bucket
      .replace(/^(drive|web)\//, "")
      .replace(/\.webp$/, "")
      .replace(/\/0?(portada)$/i, "/portada");
    const m = medidas.get(clave);
    if (!m) {
      item.flag = { presente: null, nota: "sin original local para medir" };
      continue;
    }
    /* En `web/` el alto es el 85 % del original: la misma banda de sello ocupa
       una fracción mayor del archivo publicado. */
    const factor = 1 / (1 - recortePie);
    item.flag = {
      presente: true,
      posicion: "superior-derecha",
      medida: m.medida,
      caja: {
        x0: +m.caja.x0.toFixed(3),
        x1: +m.caja.x1.toFixed(3),
        y0: 0,
        y1: +Math.min(1, m.caja.y1 * factor).toFixed(3),
      },
    };
    n++;
  }
  await writeFile(ruta, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  console.log(`${ruta}: ${n}/${items.length} con flag anotado`);
}
