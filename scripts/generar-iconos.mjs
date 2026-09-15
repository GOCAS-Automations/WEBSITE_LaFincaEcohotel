#!/usr/bin/env node
/**
 * Genera los iconos del sitio a partir del ISOTIPO OFICIAL del colibrí.
 *
 * ---------------------------------------------------------------------------
 * QUÉ GENERA Y POR QUÉ CADA UNO
 * ---------------------------------------------------------------------------
 * · `src/app/icon.png` (512×512) — el favicon moderno. Next lo detecta por el
 *   nombre del archivo y escribe solo el `<link rel="icon">` en la cabecera,
 *   con su hash de versión. No hay que declararlo en ningún metadata.
 * · `src/app/apple-icon.png` (180×180) — el icono de «Añadir a la pantalla de
 *   inicio» en iOS. Mismo mecanismo.
 * · `src/app/favicon.ico` (16, 32 y 48 px) — el respaldo para lo viejo:
 *   lectores RSS, algún navegador antiguo, y la pestaña mientras el navegador
 *   no ha leído todavía el `<link>`.
 *
 *   **Va en `src/app/`, no en `public/`.** Next sirve los dos en la misma
 *   dirección `/favicon.ico`, pero el de `app/` gana: tener uno en cada sitio
 *   es garantizar que un día alguien cambie el que no se usa y no entienda por
 *   qué la pestaña no cambia. Una sola fuente.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ SOBRE PETRÓLEO Y NO SOBRE TRANSPARENTE
 * ---------------------------------------------------------------------------
 * El isotipo oficial es petróleo sólido. A 16 px, sobre el fondo blanco de una
 * pestaña de Chrome, el ave se convierte en una mancha verde oscura ilegible; y
 * sobre el fondo oscuro de un navegador en modo noche, desaparece del todo.
 *
 * Invirtiéndolo —ave en verde claro `#E8F4D9` sobre un cuadrado de petróleo
 * `#027570` con las esquinas redondeadas— el icono es una FORMA reconocible a
 * cualquier tamaño y en cualquier tema, que es lo único que se le puede pedir
 * a 16 píxeles. Es además exactamente la combinación que el manual usa para el
 * isotipo sobre fondo oscuro.
 *
 * El ave ocupa el 66 % del lienzo: por debajo se pierde el detalle de las alas
 * y por encima toca los bordes al redondear las esquinas.
 *
 *   node scripts/generar-iconos.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/** El isotipo oficial: colibrí en petróleo, fondo transparente (variante 05). */
const ISOTIPO = path.join("public", "marca", "oficial", "isotipo-petroleo.png");

/** Los tres colores del manual (§1 de `docs/DATOS_CLIENTE.md`). */
const PETROLEO = { r: 2, g: 117, b: 112, alpha: 1 };
const VERDE_CLARO = "#e8f4d9";

/**
 * Cuánto del lienzo ocupa el ave, según el tamaño.
 *
 * No es una constante porque no puede serlo. El colibrí del manual está
 * dibujado con trazos muy finos: a 512 px el 66 % deja un margen elegante,
 * pero a 16 px ese mismo 66 % le da al ave diez píxeles de ancho y las alas
 * se deshacen en una mancha. En los tamaños pequeños el ave crece hasta casi
 * tocar los bordes —se pierde el aire, se gana la silueta— que es el único
 * canje que tiene sentido a esa escala.
 */
function proporcionAve(lado) {
  if (lado <= 20) return 0.92;
  if (lado <= 32) return 0.84;
  if (lado <= 64) return 0.74;
  return 0.66;
}

/**
 * Recorta el isotipo a su caja real.
 *
 * El archivo del diseñador es un cuadrado de 1080 px con el ave centrada y
 * mucho aire alrededor. Si se usara tal cual, a 16 px el ave ocuparía seis
 * píxeles. `trim()` deja la caja ajustada al dibujo.
 */
async function aveRecortada() {
  return sharp(ISOTIPO).trim({ threshold: 1 }).toBuffer();
}

/**
 * Un icono cuadrado: ave en verde claro sobre petróleo, esquinas redondeadas.
 *
 * El ave se tiñe con `tint()` sobre el canal alfa original: el dibujo es de un
 * solo color, así que teñirlo conserva exactamente la silueta y los
 * antialiasing de los bordes.
 */
async function iconoCuadrado(lado, radioRelativo = 0.22) {
  const ave = await aveRecortada();
  const ladoAve = Math.round(lado * proporcionAve(lado));

  const aveClara = await sharp(ave)
    .resize(ladoAve, ladoAve, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    /* `tint` multiplica sobre el color existente; en un dibujo de un solo tono
       oscuro eso no aclara. Se pinta el color plano y se usa el alfa del
       original como máscara, que sí conserva la silueta exacta. */
    .composite([
      {
        input: {
          create: {
            width: ladoAve,
            height: ladoAve,
            channels: 4,
            background: VERDE_CLARO,
          },
        },
        blend: "in",
      },
    ])
    .png()
    .toBuffer();

  const radio = Math.round(lado * radioRelativo);
  const mascara = Buffer.from(
    `<svg width="${lado}" height="${lado}"><rect width="${lado}" height="${lado}" rx="${radio}" ry="${radio}" fill="#fff"/></svg>`,
  );

  const fondo = await sharp({
    create: { width: lado, height: lado, channels: 4, background: PETROLEO },
  })
    .composite([{ input: mascara, blend: "dest-in" }])
    .png()
    .toBuffer();

  const desplazamiento = Math.round((lado - ladoAve) / 2);
  return sharp(fondo)
    .composite([{ input: aveClara, top: desplazamiento, left: desplazamiento }])
    .png()
    .toBuffer();
}

await mkdir(path.join("src", "app"), { recursive: true });

/* --- El favicon moderno y el de iOS -------------------------------------- */

const icono512 = await iconoCuadrado(512);
await writeFile(path.join("src", "app", "icon.png"), icono512);
console.log("src/app/icon.png            512×512");

/* iOS recorta las esquinas él mismo y añade su propio brillo: el archivo va
   con las esquinas CUADRADAS o se ve un marco redondeado dentro de otro. */
const apple = await iconoCuadrado(180, 0);
await writeFile(path.join("src", "app", "apple-icon.png"), apple);
console.log("src/app/apple-icon.png      180×180 (esquinas rectas: iOS las redondea)");

/* --- El `.ico` clásico, con sus tres tamaños ----------------------------- */

/**
 * Un `.ico` escrito a mano.
 *
 * El formato es un encabezado de 6 bytes, una entrada de 16 bytes por tamaño y
 * los PNG uno detrás de otro. Embeber PNG dentro de un `.ico` lo entiende todo
 * lo que hay desde Vista, y evita meter una dependencia entera para escribir
 * setenta bytes de cabecera.
 */
const tamanos = [16, 32, 48];
const imagenes = [];
for (const lado of tamanos) {
  /* A 16 px el redondeo se come el ave: el cuadrado va casi recto. */
  imagenes.push(await iconoCuadrado(lado, lado <= 16 ? 0.1 : 0.18));
}

const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0); // reservado
cabecera.writeUInt16LE(1, 2); // tipo: 1 = icono
cabecera.writeUInt16LE(tamanos.length, 4);

let desplazamiento = 6 + 16 * tamanos.length;
const entradas = [];
for (let i = 0; i < tamanos.length; i++) {
  const entrada = Buffer.alloc(16);
  entrada.writeUInt8(tamanos[i] === 256 ? 0 : tamanos[i], 0); // ancho
  entrada.writeUInt8(tamanos[i] === 256 ? 0 : tamanos[i], 1); // alto
  entrada.writeUInt8(0, 2); // colores de la paleta
  entrada.writeUInt8(0, 3); // reservado
  entrada.writeUInt16LE(1, 4); // planos
  entrada.writeUInt16LE(32, 6); // bits por píxel
  entrada.writeUInt32LE(imagenes[i].length, 8);
  entrada.writeUInt32LE(desplazamiento, 12);
  desplazamiento += imagenes[i].length;
  entradas.push(entrada);
}

await writeFile(
  path.join("src", "app", "favicon.ico"),
  Buffer.concat([cabecera, ...entradas, ...imagenes]),
);
console.log(`src/app/favicon.ico         ${tamanos.join(", ")} px`);
