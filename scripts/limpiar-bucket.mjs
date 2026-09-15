#!/usr/bin/env node
/**
 * Borra del bucket `imagenes` todo lo que ya no referencia el sitio.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE
 * ---------------------------------------------------------------------------
 * Regla del proyecto (punto 11 de `CLAUDE.md`): cuando una imagen se reemplaza
 * y deja de usarse, se ELIMINA del bucket. Un almacenamiento que solo crece
 * acaba costando dinero, hace lentas las copias de seguridad y —lo peor—
 * convierte el bucket en un cajón donde nadie sabe cuál es la foto buena. Tras
 * el rediseño con las fotos oficiales, casi cien archivos del WordPress viejo
 * se quedaron sin usar, incluidos algunos con toallas bordadas «Finca
 * Villarreal», que es el nombre anterior del hotel: dejarlos ahí es dejar una
 * URL pública viva con la marca equivocada.
 *
 * ---------------------------------------------------------------------------
 * CÓMO DECIDE QUÉ BORRAR
 * ---------------------------------------------------------------------------
 * Construye el conjunto de rutas REFERENCIADAS leyendo la base entera:
 *
 *   · `contenido.valor` — recorre el jsonb completo y recoge TODA cadena que
 *     apunte al bucket, esté donde esté y se llame como se llame la clave. Es a
 *     propósito: el día que alguien añada `imagen_fondo_movil` no hay que
 *     acordarse de tocar este script.
 *   · `imagenes.url`    — las galerías de las cabañas.
 *   · `extras.imagen_url` — las fotos de las experiencias.
 *
 * Y además conserva SIEMPRE, aunque no aparezcan en la base:
 *
 *   · `drive/`        — las fotos oficiales que entregó el cliente. Son el
 *                       original; si una no está publicada hoy, puede estarlo
 *                       mañana desde el panel.
 *   · `sitio/marca/`  — piezas de identidad.
 *   · `sitio/social/` — la tarjeta de OpenGraph. No la referencia ninguna fila
 *                       de la base: vive en `IMAGEN_SOCIAL`, en código.
 *
 * Todo lo demás que no esté referenciado se borra.
 *
 * ---------------------------------------------------------------------------
 * SEGURIDAD
 * ---------------------------------------------------------------------------
 * Por defecto es un SIMULACRO: lista lo que borraría y no toca nada. Hace falta
 * `--ejecutar` explícito. Un script que borra archivos por omisión es un
 * accidente esperando a ocurrir.
 *
 * USO
 * ---
 *   npm run imagenes:limpiar                # simulacro (no borra)
 *   npm run imagenes:limpiar -- --ejecutar  # borra de verdad
 */
import process from "node:process";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const BUCKET = "imagenes";

/** Prefijos que NUNCA se borran, estén referenciados o no. */
const PREFIJOS_PROTEGIDOS = ["drive/", "sitio/marca/", "sitio/social/"];

const ejecutar = process.argv.includes("--ejecutar");

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

const urlSupabase = exigir("NEXT_PUBLIC_SUPABASE_URL");
const supabase = createClient(urlSupabase, exigir("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const PREFIJO_PUBLICO = `${urlSupabase}/storage/v1/object/public/${BUCKET}/`;

/* ===========================================================================
 * 1. Qué está referenciado
 * ======================================================================== */

const referenciadas = new Set();

/** Convierte una URL pública del bucket en su ruta interna, o `null`. */
function rutaDeUrl(texto) {
  if (typeof texto !== "string") return null;
  if (!texto.startsWith(PREFIJO_PUBLICO)) return null;
  /* Se descarta la cadena de consulta: el panel a veces añade `?t=…` para
     saltarse la caché del navegador y esa no es parte del nombre del objeto. */
  return decodeURIComponent(texto.slice(PREFIJO_PUBLICO.length).split("?")[0]);
}

/** Recorre cualquier estructura y recoge las rutas del bucket que encuentre. */
function recolectar(valor) {
  if (typeof valor === "string") {
    const ruta = rutaDeUrl(valor);
    if (ruta) referenciadas.add(ruta);
    return;
  }
  if (Array.isArray(valor)) {
    for (const item of valor) recolectar(item);
    return;
  }
  if (valor && typeof valor === "object") {
    for (const item of Object.values(valor)) recolectar(item);
  }
}

const [contenido, imagenes, extras] = await Promise.all([
  supabase.from("contenido").select("clave, valor"),
  supabase.from("imagenes").select("url"),
  supabase.from("extras").select("imagen_url"),
]);

for (const [nombre, resultado] of [
  ["contenido", contenido],
  ["imagenes", imagenes],
  ["extras", extras],
]) {
  if (resultado.error) {
    console.error(`Error leyendo ${nombre}: ${resultado.error.message}`);
    process.exit(1);
  }
}

for (const fila of contenido.data ?? []) recolectar(fila.valor);
for (const fila of imagenes.data ?? []) recolectar(fila.url);
for (const fila of extras.data ?? []) recolectar(fila.imagen_url);

console.log(`Referenciadas en la base: ${referenciadas.size} rutas.`);

/* ===========================================================================
 * 2. Qué hay en el bucket
 * ======================================================================== */

/**
 * Listado recursivo.
 *
 * La API de Storage lista una carpeta a la vez y en páginas de 100; una entrada
 * sin `id` es una carpeta, no un archivo. Hay que recorrer el árbol a mano.
 */
async function listar(prefijo = "") {
  const encontrados = [];
  let desplazamiento = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefijo, { limit: 100, offset: desplazamiento });

    if (error) {
      console.error(`Error listando "${prefijo}": ${error.message}`);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const entrada of data) {
      const ruta = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
      if (entrada.id) {
        encontrados.push({ ruta, bytes: entrada.metadata?.size ?? 0 });
      } else {
        encontrados.push(...(await listar(ruta)));
      }
    }

    if (data.length < 100) break;
    desplazamiento += data.length;
  }

  return encontrados;
}

const objetos = await listar();
console.log(`Objetos en el bucket: ${objetos.length}.`);

/* ===========================================================================
 * 3. La diferencia
 * ======================================================================== */

const protegido = (ruta) =>
  PREFIJOS_PROTEGIDOS.some((prefijo) => ruta.startsWith(prefijo));

/**
 * Las VARIANTES por ancho (`v/…`) no aparecen en la base: las genera
 * `npm run imagenes:variantes` y las sirve `<Foto>` en el `srcset`. No se
 * protegen en bloque —eso dejaría huérfanas para siempre las de una foto que se
 * retire— sino que se consideran referenciadas **si lo está su original**:
 *
 *     v/web/cabana-01/01-640.webp   ←   web/cabana-01/01.webp
 *
 * Así una foto que sale del sitio se lleva sus seis peldaños con ella, que es
 * exactamente la regla 11 de `CLAUDE.md`.
 */
function originalDeVariante(ruta) {
  /* La extensión de la variante puede ser `.webp` o `.avif` —los heros llevan
     las dos—, pero el original SIEMPRE es el `.webp` del bucket. */
  const coincidencia = /^v\/(.+)-\d+\.(?:webp|avif)$/.exec(ruta);
  return coincidencia ? `${coincidencia[1]}.webp` : null;
}

const referenciada = (ruta) => {
  if (referenciadas.has(ruta)) return true;
  const original = originalDeVariante(ruta);
  return Boolean(original && referenciadas.has(original));
};

const sobrantes = objetos.filter(
  (objeto) => !protegido(objeto.ruta) && !referenciada(objeto.ruta),
);

const bytesSobrantes = sobrantes.reduce((suma, o) => suma + o.bytes, 0);

/* Referencias que apuntan a archivos que YA NO EXISTEN: no rompen la limpieza,
   pero son enlaces rotos en el sitio y conviene verlos. */
const rutasEnBucket = new Set(objetos.map((o) => o.ruta));
const rotas = [...referenciadas].filter((ruta) => !rutasEnBucket.has(ruta));

console.log("");
console.log(`Sin referencia y sin proteger: ${sobrantes.length} objetos`);
console.log(`Espacio a liberar: ${(bytesSobrantes / 1024 / 1024).toFixed(1)} MB`);
console.log("");

const porCarpeta = new Map();
for (const objeto of sobrantes) {
  const carpeta = objeto.ruta.split("/").slice(0, -1).join("/") || "(raíz)";
  porCarpeta.set(carpeta, (porCarpeta.get(carpeta) ?? 0) + 1);
}
for (const [carpeta, cuantos] of [...porCarpeta].sort()) {
  console.log(`  ${carpeta.padEnd(34)} ${String(cuantos).padStart(4)}`);
}

console.log("");
for (const objeto of sobrantes) console.log(`  - ${objeto.ruta}`);

if (rotas.length > 0) {
  console.log("");
  console.log(
    `⚠ ${rotas.length} referencia(s) de la base apuntan a archivos que no existen:`,
  );
  for (const ruta of rotas) console.log(`  ! ${ruta}`);
}

if (!ejecutar) {
  console.log("");
  console.log(
    "SIMULACRO: no se borró nada. Repite con `--ejecutar` cuando la lista sea correcta.",
  );
  process.exit(0);
}

/* ===========================================================================
 * 4. Borrar
 * ======================================================================== */

if (sobrantes.length === 0) {
  console.log("\nNada que borrar.");
  process.exit(0);
}

/* La API acepta hasta 1000 rutas por llamada; se va de 100 en 100 para que un
   fallo a mitad deje un mensaje útil en vez de un error opaco. */
const LOTE = 100;
let borrados = 0;

for (let i = 0; i < sobrantes.length; i += LOTE) {
  const lote = sobrantes.slice(i, i + LOTE).map((o) => o.ruta);
  const { data, error } = await supabase.storage.from(BUCKET).remove(lote);
  if (error) {
    console.error(`\nError borrando el lote ${i / LOTE + 1}: ${error.message}`);
    process.exit(1);
  }
  borrados += data?.length ?? 0;
  console.log(`Borrados ${borrados} / ${sobrantes.length}…`);
}

const quedan = await listar();
console.log("");
console.log(`Borrados: ${borrados} objetos.`);
console.log(`Quedan en el bucket: ${quedan.length} objetos.`);
