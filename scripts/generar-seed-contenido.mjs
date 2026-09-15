#!/usr/bin/env node
/**
 * Genera `supabase/seed/002_contenido.sql` a partir del código.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE SCRIPT
 * ---------------------------------------------------------------------------
 * Hasta ahora el contenido del sitio vivía dos veces: en los respaldos de
 * `src/lib/contenido.ts` y, transcrito a mano, en un SQL de seiscientas líneas.
 * Dos copias del mismo texto siempre acaban divergiendo: pasó con el horario
 * del restaurante, que se corrigió en el seed y se quedó viejo en el código.
 *
 * Ahora el código es la ÚNICA fuente. Este script lee `RESPALDOS` y
 * `GALERIAS_POR_CABANA` y escribe el SQL. El archivo generado se versiona
 * —hace falta para levantar la base desde cero y para revisar los cambios en
 * un diff— pero no se edita a mano: lleva un aviso en la cabecera.
 *
 * CÓMO LEE TYPESCRIPT SIN COMPILARLO
 * ----------------------------------
 * No lo compila: lo ANALIZA. Los respaldos son literales de objeto puros —sin
 * lógica, sin plantillas, sin condicionales—, así que basta con evaluar el
 * módulo en un contexto que resuelva sus dos únicas dependencias de valor
 * (`medio()` y las constantes de `sitio.ts`). Es más frágil que un compilador,
 * pero no añade una cadena de herramientas entera al proyecto para una tarea
 * que se ejecuta a mano tres veces al año, y falla RUIDOSAMENTE si el archivo
 * deja de ser un literal.
 *
 * USO
 * ---
 *   npm run seed:contenido
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

import { config } from "dotenv";
import ts from "typescript";

config({ path: ".env.local", quiet: true });

const RAIZ = process.cwd();
const DESTINO = path.join("supabase", "seed", "002_contenido.sql");

/* ---------------------------------------------------------------------------
 * Cargar los módulos de `src/lib` transpilando al vuelo
 * ------------------------------------------------------------------------- */

const require_ = createRequire(pathToFileURL(path.join(RAIZ, "package.json")));

/**
 * Transpila un `.ts` a CommonJS y lo evalúa.
 *
 * Se resuelve a mano la ruta de los `import` relativos —son tres— en vez de
 * instalar un cargador: `contenido.ts` importa `./fotos`, `./sitio`,
 * `./supabase/public` y sus tipos. Los tipos desaparecen al transpilar; de los
 * otros, `supabase/public` nunca se llega a ejecutar porque solo se leen las
 * constantes de arriba del archivo.
 */
const cacheModulos = new Map();

async function cargar(rutaRelativa) {
  const absoluta = path.join(RAIZ, "src", "lib", `${rutaRelativa}.ts`);
  if (cacheModulos.has(absoluta)) return cacheModulos.get(absoluta);

  const fuente = await readFile(absoluta, "utf8");
  const { outputText } = ts.transpileModule(fuente, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const modulo = { exports: {} };
  cacheModulos.set(absoluta, modulo.exports);

  const requerir = (especificador) => {
    if (especificador === "react") {
      /* `cache()` de React envuelve los getters. Aquí no se usa ninguno, pero
         el módulo lo importa en el nivel superior. */
      return { cache: (fn) => fn };
    }
    if (especificador.startsWith("./") || especificador.startsWith("../")) {
      const clave = path
        .relative(
          path.join(RAIZ, "src", "lib"),
          path.resolve(path.dirname(absoluta), especificador),
        )
        .split(path.sep)
        .join("/");
      return cargarSincrono(clave);
    }
    return require_(especificador);
  };

  const fabrica = new Function("exports", "require", "module", outputText);
  fabrica(modulo.exports, requerir, modulo);
  cacheModulos.set(absoluta, modulo.exports);
  return modulo.exports;
}

/** Versión síncrona para los `require` internos (todo es local y pequeño). */
function cargarSincrono(rutaRelativa) {
  const absoluta = path.join(RAIZ, "src", "lib", `${rutaRelativa}.ts`);
  if (cacheModulos.has(absoluta)) return cacheModulos.get(absoluta);

  const fuente = require_("node:fs").readFileSync(absoluta, "utf8");
  const { outputText } = ts.transpileModule(fuente, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const modulo = { exports: {} };
  cacheModulos.set(absoluta, modulo.exports);

  const requerir = (especificador) => {
    if (especificador === "react") return { cache: (fn) => fn };
    if (especificador === "server-only") return {};
    if (especificador.startsWith("./") || especificador.startsWith("../")) {
      const clave = path
        .relative(
          path.join(RAIZ, "src", "lib"),
          path.resolve(path.dirname(absoluta), especificador),
        )
        .split(path.sep)
        .join("/");
      return cargarSincrono(clave);
    }
    return require_(especificador);
  };

  const fabrica = new Function("exports", "require", "module", outputText);
  fabrica(modulo.exports, requerir, modulo);
  cacheModulos.set(absoluta, modulo.exports);
  return modulo.exports;
}

const contenido = await cargar("contenido");
const fotos = cargarSincrono("fotos");

const { RESPALDOS, CLAVES_CONTENIDO } = contenido;
const { GALERIAS_POR_CABANA } = fotos;

if (!RESPALDOS || !GALERIAS_POR_CABANA) {
  console.error(
    "No se pudieron leer RESPALDOS o GALERIAS_POR_CABANA. ¿Cambió la forma de src/lib/contenido.ts?",
  );
  process.exit(1);
}

/* ---------------------------------------------------------------------------
 * Escribir el SQL
 * ------------------------------------------------------------------------- */

/**
 * Delimitador de cadena de Postgres.
 *
 * Se usa `$json$…$json$` en vez de comillas simples porque los textos llevan
 * apóstrofos, comillas tipográficas y saltos de línea, y escaparlos a mano en
 * seiscientas líneas es una fuente garantizada de errores. Si algún día un
 * texto contuviera literalmente `$json$`, el script lo detecta y aborta en vez
 * de generar un SQL roto.
 */
function cuerpoJson(valor) {
  const texto = JSON.stringify(valor, null, 2);
  if (texto.includes("$json$")) {
    console.error("Un texto contiene la secuencia $json$; cambia el delimitador.");
    process.exit(1);
  }
  return texto;
}

const lineas = [];

lineas.push(`-- ============================================================================
-- SEED 002 — Contenido del sitio y galerías de las cabañas
--
-- ⚠ ARCHIVO GENERADO. NO EDITAR A MANO.
--    Se produce con \`npm run seed:contenido\` a partir de los respaldos de
--    \`src/lib/contenido.ts\` y del catálogo de fotos de \`src/lib/fotos.ts\`.
--    Si hay que cambiar un texto o una foto, se cambia ALLÍ y se regenera:
--    cualquier edición directa de este archivo se pierde en la siguiente
--    ejecución y, mientras tanto, hace que el código y la base digan cosas
--    distintas.
--
-- FUENTE DE VERDAD DEL CONTENIDO: \`docs/DATOS_CLIENTE.md\`.
-- CONTRATO DE LAS CLAVES: \`docs/CMS_CLAVES.md\`.
--
-- IDEMPOTENTE: \`on conflict … do update\` actualiza en vez de duplicar.
--
-- ⚠ OJO CUANDO EL PANEL ESTÉ EN LÍNEA: volver a correr este archivo SOBREESCRIBE
--   lo que el cliente haya editado desde el panel. A partir de ese momento es
--   solo para reconstruir la base desde cero, no para desplegar.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- CONTENIDO EDITABLE DEL SITIO
-- ----------------------------------------------------------------------------
insert into contenido (clave, valor) values`);

const filas = CLAVES_CONTENIDO.map(
  (clave) =>
    `('${clave}', $json$${cuerpoJson(RESPALDOS[clave])}$json$::jsonb)`,
);
lineas.push(filas.join(",\n\n"));
lineas.push(`on conflict (clave) do update set
  valor          = excluded.valor,
  actualizado_at = now();
`);

/* --- Claves retiradas ------------------------------------------------------
   Una clave que sale de `CLAVES_CONTENIDO` deja de leerse, pero su fila sigue
   viva en la base: el sitio la ignora y el panel ya no la muestra, así que se
   queda ahí para siempre sin que nadie pueda tocarla. Se borra aquí, con su
   motivo escrito, para que el seed deje la tabla exactamente como el código
   dice que debe estar.
   -------------------------------------------------------------------------- */

const CLAVES_RETIRADAS = [
  // «Nuestra esencia» salió de la portada el 2026-09-15 (Cesar pidió acortarla)
  // y no la usaba ninguna otra página.
  "home.esencia",
];

lineas.push(`
-- ----------------------------------------------------------------------------
-- CLAVES RETIRADAS DEL CMS
-- ----------------------------------------------------------------------------
delete from contenido where clave in (${CLAVES_RETIRADAS.map((c) => `'${c}'`).join(", ")});
`);

/* --- Fotos de las experiencias -------------------------------------------- */

lineas.push(`
-- ----------------------------------------------------------------------------
-- FOTOS DE LAS EXPERIENCIAS
--
-- Son las únicas imágenes del sitio anterior que se conservan: el Drive no trae
-- ninguna foto de la mesa de aniversario ni de la bandeja de cumpleaños, y
-- estas dos sí muestran lo que el hotel monta en la cabaña. Revisadas una por
-- una: no llevan el nombre antiguo del hotel.
-- ----------------------------------------------------------------------------`);

for (const [nombre, url] of Object.entries(fotos.FOTOS_EXPERIENCIAS ?? {})) {
  lineas.push(
    `update extras set imagen_url = '${url}'\n where nombre = '${nombre.replaceAll("'", "''")}';`,
  );
}

/* --- Galerías de las cabañas --------------------------------------------- */

lineas.push(`
-- ----------------------------------------------------------------------------
-- GALERÍAS DE LAS CABAÑAS
--
-- Las fotos oficiales que el cliente entregó en septiembre de 2026, ya subidas
-- al bucket bajo \`drive/\`. El orden es el de \`src/lib/fotos.ts\`: primero el
-- rasgo que hace única a esa cabaña (es la portada de las tarjetas y del
-- zigzag), después la habitación y las zonas de estar, y el baño al final.
--
-- Las fichas gráficas «0. PORTADA …» NO entran: son texto dentro de una imagen
-- y llevan impreso el nombre antiguo del hotel.
--
-- Se BORRA la galería entera antes de insertar. No basta con un
-- \`on conflict do update\`: eso actualiza las filas que vuelven a aparecer pero
-- deja vivas las que ya no están, y así es como acabaron mezcladas en la misma
-- galería las fotos del WordPress viejo, las de \`drive/\` y las de \`web/\`.
--
-- Consecuencia asumida: si el cliente añade fotos desde el panel, volver a
-- correr este seed se las lleva. Es el mismo aviso de la cabecera del archivo.
-- ----------------------------------------------------------------------------
delete from imagenes where alojamiento_id is not null;

insert into imagenes (alojamiento_id, url, alt, orden)
select a.id, f.url, f.alt, f.orden
from (values`);

const valoresGaleria = [];
for (const [slug, galeria] of Object.entries(GALERIAS_POR_CABANA)) {
  galeria.forEach((imagen, indice) => {
    const alt = imagen.alt.replaceAll("'", "''");
    valoresGaleria.push(
      `  ('${slug}', '${imagen.url}', '${alt}', ${indice + 1})`,
    );
  });
}
lineas.push(valoresGaleria.join(",\n"));
lineas.push(`) as f(slug, url, alt, orden)
join alojamientos a on a.slug = f.slug
on conflict (url) do update set
  alojamiento_id = excluded.alojamiento_id,
  alt            = excluded.alt,
  orden          = excluded.orden;
`);

await writeFile(DESTINO, `${lineas.join("\n")}\n`, "utf8");

console.log(
  `Generado ${DESTINO}: ${CLAVES_CONTENIDO.length} claves de contenido y ${valoresGaleria.length} fotos de cabaña.`,
);
