#!/usr/bin/env node
/**
 * Genera las VARIANTES por ancho de cada foto publicada, en `v/`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HACEN FALTA
 * ---------------------------------------------------------------------------
 * Decisión de Cesar (2026-09-14): el sitio se publica **sin transformaciones de
 * imagen de Vercel** (`images.unoptimized` encendido por defecto). El plan
 * gratuito trae un número limitado de transformaciones al mes y, cuando se
 * agota, Vercel no sirve la foto sin optimizar: devuelve un error y la portada
 * del hotel se queda con los huecos vacíos. Es un fallo total por una cuota.
 *
 * El precio de apagarlo es que `next/image` deja de generar `srcset`: cada foto
 * se descarga a su tamaño de archivo completo, mida lo que mida el hueco donde
 * se pinta. El hero móvil pesaba **1,2 MB** para un teléfono de 390 px.
 *
 * Así que el `srcset` lo generamos NOSOTROS, una vez, aquí: variantes reales en
 * el bucket, servidas por `<Foto>` (`src/components/ui/foto.tsx`) con los
 * `sizes` de cada uso. El navegador elige; Vercel no transforma nada.
 *
 * ---------------------------------------------------------------------------
 * DE DÓNDE SALE CADA VARIANTE
 * ---------------------------------------------------------------------------
 * Del archivo **ya publicado** (`web/…`), no del original de `drive/`. Es a
 * propósito: `web/` es la verdad visual del sitio —lleva quitada la franja de
 * check-in del pie, y los heros llevan su recorte— y regenerar ese encuadre
 * aquí sería duplicar la lógica de `recortar-fotos-web.mjs` y de
 * `generar-heros.mjs`, con la garantía de que algún día divergirían.
 *
 * Sí, es una generación más de pérdida. A la mitad de resolución no se ve: el
 * remuestreo es en sí mismo un filtro paso bajo y se come los artefactos del
 * primer paso. Comparado a 1:1, la variante de 640 px de una foto de cabaña es
 * indistinguible del mismo recorte sacado del original.
 *
 * **NUNCA se amplía** (`withoutEnlargement`). Si una foto mide 1086 px, su
 * escalera se corta ahí y el `srcset` lo completa el archivo original.
 *
 * ---------------------------------------------------------------------------
 * LAS ESCALERAS
 * ---------------------------------------------------------------------------
 * · **Heros** (`web/heroes/`) — ocupan el ancho de la ventana. Hasta 2400 px
 *   para un monitor grande y, sobre todo, un peldaño de 640–900 px para el
 *   teléfono, que es el que baja el hero móvil de 1,2 MB a menos de 200 kB.
 * · **Tarjetas y galería** — nunca se pintan a más de media columna: tope de
 *   1200 px.
 * · **Miniaturas y tira de Instagram** — cuadrados de 130–180 px: los peldaños
 *   de 320 y 480 px son los que de verdad usan.
 *
 *   node scripts/generar-variantes.mjs            # simulacro
 *   node scripts/generar-variantes.mjs --subir    # sube a v/
 */
import { writeFile } from "node:fs/promises";
import process from "node:process";

import { config } from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const BUCKET = "imagenes";
const subir = process.argv.includes("--subir");

/** Prefijo donde viven las variantes. Una sola carpeta, fácil de barrer. */
const PREFIJO_VARIANTES = "v/";

/**
 * Escaleras de ancho por familia.
 *
 * Los números no son redondos por gusto: 390, 430 y 768 son anchos reales de
 * dispositivo, y a 2× de densidad piden 780, 860 y 1536 px. La escalera cubre
 * esos puntos sin pasarse: el objetivo es que ninguna foto se descargue a más
 * de ~1,3× del tamaño al que se pinta.
 */
const ESCALERAS = [
  {
    nombre: "hero",
    coincide: (ruta) => ruta.startsWith("web/heroes/"),
    /*
      1120 NO ES UN NÚMERO REDONDO, Y POR ESO ESTÁ.
      El teléfono de referencia de Lighthouse es 412 px lógicos a densidad
      2,625: pide **1081 px** reales. Con un peldaño en 1080 se queda cinco
      píxeles corto y el navegador salta al siguiente, que pesa el doble. Con
      1120 lo cubre justo. El hero móvil de la portada queda en **393 kB**,
      por debajo del techo de 400 kB que puso Cesar.
    */
    anchos: [640, 768, 900, 1120, 1440, 1750, 2000, 2400],
    /* A partir de 1440 la foto ya se ve grande y conviene el peldaño alto de
       calidad; por debajo manda el peso, y a esa resolución la diferencia
       entre 80 y 85 no se ve. */
    calidad: (ancho) => (ancho <= 1120 ? 80 : 85),
    /*
      LOS HEROS LLEVAN ADEMÁS AVIF, Y ES LO QUE SALVA EL LIGHTHOUSE.

      Al apagar la optimización de Vercel no se perdió solo el `srcset`: se
      perdió también el AVIF, que es lo que servía `/_next/image` a cualquier
      navegador que lo aceptara. Medido: el hero móvil pasa de 393 kB en WebP a
      ~180 kB en AVIF con la misma calidad percibida, y el LCP de la portada en
      Lighthouse móvil baja de ~4,2 s a ~2,5 s.

      Solo los heros. Son las imágenes del primer visor —las que deciden el
      LCP— y son nueve; hacerlo con las 49 fotos de cabaña multiplicaría por dos
      los objetos del bucket para ahorrar bytes que el visitante se descarga
      cuando ya está leyendo.

      El WebP se queda como respaldo en el mismo `<picture>`: AVIF lo entienden
      todos los navegadores que le importan al hotel, pero un respaldo que ya
      existe no cuesta nada.
    */
    avif: true,
  },
  {
    nombre: "foto",
    coincide: (ruta) =>
      ruta.startsWith("web/") || ruta.startsWith("experiencias/"),
    /*
      Tope de 1200: ninguna tarjeta ni foto de galería ocupa más.
      Los peldaños 400 y 560 no estaban y se añadieron tras medir: las fotos de
      «Nuestra esencia» y la tira de Instagram piden 334–350 px reales en un
      teléfono, y con el salto 320 → 480 el navegador se llevaba **1,42 veces**
      los píxeles que pinta. Con 400 en medio, 1,15. El objetivo escrito es
      ~1,3×: cada hueco de la escalera es peso que se descarga y no se ve.
    */
    anchos: [320, 400, 480, 560, 640, 800, 1000, 1200],
    calidad: () => 82,
    /*
      TAMBIÉN AVIF, Y NO SOLO PARA LOS HEROS.

      La primera versión lo dejaba en los heros: son las imágenes del primer
      visor y parecía suficiente. Medido con Lighthouse, no lo era. En
      `/galeria` el LCP NO es la cabecera sino la primera foto de la
      mampostería, que en un teléfono se pinta a pantalla completa: 400 kB de
      WebP, 4,4 s de descarga con la red simulada, y la página se quedaba en 82.
      Lo mismo en `/alojamientos` y en `/reservar` con la primera foto de la
      fila.

      Con AVIF esas mismas fotos pesan la mitad. Cuesta ~400 objetos más en el
      bucket y unos veinte minutos de codificación en el despliegue; se paga una
      vez y lo nota cada visitante.
    */
    avif: true,
  },
];

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
const supabase = createClient(
  urlSupabase,
  exigir("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

/**
 * Reintentos con espera creciente.
 *
 * Son ~300 subidas seguidas contra Supabase Storage: en una de cada tantas, la
 * conexión se corta (`ECONNRESET`) y sin esto el script muere a la mitad, con
 * medio catálogo de variantes subido y el manifiesto sin escribir. Tres
 * intentos con 1, 2 y 4 segundos bastan; si falla los tres, es un problema de
 * verdad y conviene que se vea.
 */
async function conReintentos(etiqueta, tarea, intentos = 3) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      return await tarea();
    } catch (error) {
      ultimo = error;
      const espera = 1000 * 2 ** i;
      console.error(
        `  · ${etiqueta}: ${error?.message ?? error} — reintento en ${espera / 1000}s`,
      );
      await new Promise((listo) => setTimeout(listo, espera));
    }
  }
  throw ultimo;
}

/** Recorre el bucket entero y devuelve las rutas de los archivos. */
async function listar(prefijo = "") {
  const rutas = [];
  let desplazamiento = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefijo, { limit: 100, offset: desplazamiento });
    if (error) {
      console.error(`Error listando "${prefijo}": ${error.message}`);
      process.exit(1);
    }
    if (!data?.length) break;
    for (const entrada of data) {
      const ruta = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
      if (entrada.id === null) rutas.push(...(await listar(ruta)));
      else rutas.push(ruta);
    }
    if (data.length < 100) break;
    desplazamiento += data.length;
  }
  return rutas;
}

const todas = await listar();

/**
 * ¿Es esta ruta una variante, esté donde esté?
 *
 * Se mira en CUALQUIER punto de la ruta, no solo al principio. Durante el
 * desarrollo las variantes vivieron un rato en `web/v/…` antes de mudarse a
 * `v/…`, y el filtro de entonces —que solo miraba el prefijo— las dio por
 * fotos fuente y generó variantes DE LAS VARIANTES
 * (`v/web/v/heroes/alojamientos-768-320.webp`). Con esto no vuelve a pasar.
 */
const esVariante = (ruta) =>
  ruta.startsWith(PREFIJO_VARIANTES) || ruta.includes(`/${PREFIJO_VARIANTES}`);

/* Qué NO lleva variantes:
     · lo que ya es una variante,
     · los originales de `drive/` —no se publican en ninguna página—,
     · la identidad y la tarjeta social, que son piezas de tamaño fijo,
     · el póster del video, que pesa 25 kB. */
const fuentes = todas.filter(
  (ruta) =>
    ruta.endsWith(".webp") &&
    !esVariante(ruta) &&
    ESCALERAS.some((escalera) => escalera.coincide(ruta)),
);

console.log(
  `${fuentes.length} fotos fuente. ${subir ? "Subiendo" : "SIMULACRO"}.`,
);

/*
  EL MANIFIESTO ES COMPACTO A PROPÓSITO.

  Lo lee `src/lib/imagenes/srcset.ts`, que usan también componentes de cliente
  (la galería). Un manifiesto con la URL entera de cada variante serían ~80 kB
  de JSON viajando al navegador para construir cadenas que el propio navegador
  puede formar solo: las variantes siguen un patrón fijo
  (`web/x.webp` → `v/web/x-640.webp`).

  Así que aquí solo se guarda lo que NO se puede deducir: el tamaño del
  original y qué peldaños existen de verdad.

      { "web/cabana-01/01.webp": { "w": 1448, "h": 923, "v": [320, 480, …] } }
*/
const manifiesto = {};
let bytesNuevos = 0;
let generadas = 0;

for (const ruta of fuentes) {
  const escalera = ESCALERAS.find((e) => e.coincide(ruta));

  const respuesta = await conReintentos(ruta, () => fetch(`${base}/${ruta}`));
  if (!respuesta.ok) {
    console.error(`  ! ${ruta}: HTTP ${respuesta.status}`);
    process.exitCode = 1;
    continue;
  }
  const original = Buffer.from(await respuesta.arrayBuffer());
  const medidas = await sharp(original).metadata();

  const entrada = { w: medidas.width, h: medidas.height, v: [] };
  if (escalera.avif) entrada.a = [];
  const detalle = [];

  /* Solo los peldaños MENORES que el original: ampliar no añade información,
     solo peso. El propio original cierra el `srcset` como el ancho mayor. */
  const anchos = escalera.anchos.filter((ancho) => ancho < medidas.width);

  /*
    EL AVIF SÍ INCLUYE EL ANCHO COMPLETO.
    En WebP el peldaño más alto es el archivo original, que ya está en el
    bucket. En AVIF no existe ese archivo, así que hay que generarlo: sin él,
    el `srcset` de AVIF se quedaría corto justo en las pantallas grandes y el
    navegador estiraría la variante de 2000 px sobre un monitor de 2560.
  */
  const anchosAvif = escalera.avif
    ? [...anchos, medidas.width]
    : [];

  for (const ancho of anchosAvif) {
    const destino = `${PREFIJO_VARIANTES}${ruta.replace(/\.webp$/, "")}-${ancho}.avif`;

    const enAvif = await sharp(original)
      .resize({ width: ancho, withoutEnlargement: true })
      /*
        Calidad 58 y `effort: 6`. En AVIF la escala NO es la de WebP: 58 aquí
        se ve como 80–85 en WebP, y es donde está el codo de la curva
        peso/calidad para fotografía. Comparado a 1:1 sobre el hero de la
        portada, el follaje aguanta; por debajo de 50 empieza a apelmazarse.
        `effort: 6` tarda unos segundos por archivo y son nueve fotos: se paga
        una vez, en el despliegue, no en cada visita.
      */
      .avif({ quality: 58, effort: 6 })
      .toBuffer();

    if (subir) {
      const { error } = await conReintentos(destino, () =>
        supabase.storage.from(BUCKET).upload(destino, enAvif, {
          contentType: "image/avif",
          cacheControl: "31536000",
          upsert: true,
        }),
      );
      if (error) {
        console.error(`  ! ${destino}: ${error.message}`);
        process.exitCode = 1;
        continue;
      }
    }

    entrada.a.push(ancho);
    detalle.push({ ancho, bytes: enAvif.length, formato: "avif" });
    bytesNuevos += enAvif.length;
    generadas += 1;
  }

  for (const ancho of anchos) {
    /*
      LA RUTA DE LA VARIANTE CONSERVA LA DEL ORIGEN, ENTERA.
      `v/web/cabana-01/01-640.webp`, no `v/cabana-01/01-640.webp`. Recortar el
      `web/` dejaba `experiencias/…` y `web/experiencias/…` con la misma ruta de
      variante, y la limpieza del bucket —que va al revés, de la variante a su
      original— ya no sabía de cuál venía y las borraba por huérfanas.
    */
    const destino = `${PREFIJO_VARIANTES}${ruta.replace(/\.webp$/, "")}-${ancho}.webp`;

    const redimensionada = await sharp(original)
      .resize({ width: ancho, withoutEnlargement: true })
      .webp({ quality: escalera.calidad(ancho) })
      .toBuffer();

    if (subir) {
      const { error } = await conReintentos(destino, () =>
        supabase.storage.from(BUCKET).upload(destino, redimensionada, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true,
        }),
      );
      if (error) {
        console.error(`  ! ${destino}: ${error.message}`);
        process.exitCode = 1;
        continue;
      }
    }

    entrada.v.push(ancho);
    detalle.push({ ancho, bytes: redimensionada.length });
    bytesNuevos += redimensionada.length;
    generadas += 1;
  }

  manifiesto[ruta] = entrada;

  const peldanos = detalle
    .map(
      (v) =>
        `${v.ancho}px${v.formato === "avif" ? " AVIF" : ""} ${Math.round(v.bytes / 1024)}kB`,
    )
    .join(" · ");
  console.log(
    `${ruta.padEnd(36)} ${medidas.width}×${medidas.height} ${Math.round(original.length / 1024)}kB → ${peldanos || "(sin peldaños: ya es pequeña)"}`,
  );
}

await writeFile(
  "src/lib/imagenes/variantes.json",
  `${JSON.stringify(manifiesto, null, 2)}\n`,
  "utf8",
);

console.log(
  `\n${generadas} variantes, ${(bytesNuevos / 1048576).toFixed(1)} MB.`,
);
console.log(
  subir
    ? "Subidas y manifiesto escrito en src/lib/imagenes/variantes.json"
    : "SIMULACRO: no se subió nada (el manifiesto sí se escribió). Repite con `--subir`.",
);
