#!/usr/bin/env node
/**
 * Genera los mosaicos del patrón de colibríes de la marca.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN PNG Y NO UNA MÁSCARA CSS
 * ---------------------------------------------------------------------------
 * La primera versión del patrón se pintaba con `mask-image: url(icono.png)` por
 * duplicado —dos capas desplazadas para conseguir el tresbolillo del manual—
 * sobre un `background-color`. Funcionaba y era elegante de leer, pero salía
 * cara: Lighthouse medía **3,6 s de Style & Layout** en la portada, y enmascarar
 * superficies del tamaño de una sección completa, dos veces, era la mayor parte
 * de ese número. Una máscara hay que componerla en cada pintado; un mosaico de
 * fondo se copia y ya está.
 *
 * Así que el tresbolillo se hornea aquí, una sola vez, en un PNG con el color y
 * la opacidad ya aplicados. El CSS pasa a ser un `background-image` con
 * `repeat`, que es de lo más barato que sabe hacer un navegador.
 *
 * El logo NO se altera: se usa el archivo oficial `public/marca/icono.png` tal
 * cual, solo teñido y repetido, que es exactamente el uso que el propio manual
 * hace de él en su página 12.
 *
 * Se generan dos mosaicos porque el patrón vive sobre dos fondos:
 *   · `patron-claro.png`  — petróleo bajísimo, para crema y blanco.
 *   · `patron-oscuro.png` — verde claro de marca, para las secciones de bosque.
 *
 * USO
 * ---
 *   npm run marca:patron
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/** Lado del mosaico. Dos aves por baldosa, una arriba-izquierda y otra en el
 *  centro desplazado: repetido, da el tresbolillo del manual sin costura. */
const LADO = 460;
const AVE = 210;

const VARIANTES = [
  {
    archivo: "patron-claro.png",
    color: { r: 2, g: 117, b: 112 },
    alfa: 0.05,
  },
  {
    archivo: "patron-oscuro.png",
    color: { r: 232, g: 244, b: 217 },
    /* 0,055 y no 0,10. Al 10 % las aves se leían como un papel pintado detrás
       de las tarjetas de precio y competían con ellas; el manual lo usa a esa
       fuerza en una página que NO lleva contenido encima. Aquí tiene que
       notarse solo cuando uno se fija. */
    alfa: 0.055,
  },
];

const isotipo = await readFile(path.join("public", "marca", "icono.png"));

for (const variante of VARIANTES) {
  /* El isotipo teñido: se parte de un rectángulo del color y se recorta con la
     silueta del PNG (`dest-in` conserva el destino donde el origen es opaco). */
  const ave = await sharp({
    create: {
      width: AVE,
      height: AVE,
      channels: 4,
      background: { ...variante.color, alpha: variante.alfa },
    },
  })
    .composite([
      {
        input: await sharp(isotipo)
          .resize(AVE, AVE, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer(),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  /*
    Cuatro posiciones para que la baldosa sea CONTINUA: las dos aves del
    tresbolillo más las copias que cruzan el borde derecho e inferior. Sin ellas
    se ve la costura de la repetición, que es lo que delata un patrón mal hecho.
  */
  const mitad = Math.round(LADO / 2);
  const salida = path.join("public", "marca", variante.archivo);

  await sharp({
    create: {
      width: LADO,
      height: LADO,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: ave, top: 20, left: 10 },
      { input: ave, top: mitad + 20, left: mitad + 10 },
      /* Las que asoman por los bordes, para que al repetir encajen. */
      { input: ave, top: mitad + 20, left: mitad + 10 - LADO },
      { input: ave, top: mitad + 20 - LADO, left: mitad + 10 },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toFile(salida);

  const { size } = await sharp(salida).metadata();
  console.log(`${salida} · ${LADO}×${LADO} · ${Math.round((size ?? 0) / 1024)} kB`);
}
