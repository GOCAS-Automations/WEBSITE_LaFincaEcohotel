/**
 * Renderiza los tres correos transaccionales a archivos HTML para revisarlos,
 * y los envía de verdad si hay clave de Resend.
 *
 *   npm run correos:probar
 *   npm run correos:probar -- --enviar a@ejemplo.com
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HACE FALTA ESTO
 * ---------------------------------------------------------------------------
 * Un correo no se puede revisar leyendo el código que lo genera: las tablas
 * anidadas y los estilos en línea son ilegibles a propósito, y el único modo de
 * saber si la cabecera cuadra, si el total se lee y si el botón se ve como un
 * botón es abrirlo. Este script deja los seis archivos (tres correos × HTML y
 * texto plano) en el directorio de trabajo y los abre quien los revise.
 *
 * **La versión en texto plano se escribe también, y hay que leerla.** Es la que
 * ven los clientes que bloquean HTML y la que miran los filtros antispam; un
 * correo cuya versión plana está vacía o ilegible se entrega peor.
 *
 * ---------------------------------------------------------------------------
 * CÓMO FUNCIONA SIN COMPILAR NADA (necesita Node ≥ 22.18)
 * ---------------------------------------------------------------------------
 * Se importa **el mismo `plantillas.ts` que corre en producción**, no una copia:
 * una copia paralela se desincroniza y entonces este script certifica un correo
 * que nadie envía. Node ya sabe quitar los tipos él solo; lo único que no sabe
 * es resolver un import sin extensión, y de eso se encarga el gancho de abajo
 * (el mismo patrón que `scripts/probar-calendario.mjs`).
 *
 * Que esto funcione depende de que las plantillas sigan siendo **puras**: si
 * algún día importaran algo de Next o de Supabase, este script se rompería. Es
 * exactamente la alarma que se quiere.
 *
 * Los datos de la reserva de ejemplo salen de `docs/DATOS_CLIENTE.md`: tarifas
 * reales, una estadía mixta (jueves→sábado, que es el caso que más se equivoca)
 * y una experiencia en una noche concreta.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { config as cargarEnv } from "dotenv";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

/*
  Dentro del proyecto los imports van sin extensión («../utils/formato»), porque
  quien los resuelve es el empaquetador de Next. Node exige la extensión: este
  gancho le añade `.ts` cuando el archivo existe.
*/
registerHooks({
  resolve(especificador, contexto, siguiente) {
    if (especificador.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(especificador)) {
      try {
        return siguiente(`${especificador}.ts`, contexto);
      } catch {
        // No era un .ts: que lo resuelva Node como siempre.
      }
    }
    return siguiente(especificador, contexto);
  },
});

const {
  renderAvisoAdministracion,
  renderReservaConfirmada,
  renderSolicitudRecibida,
} = await import(
  pathToFileURL(join(RAIZ, "src/lib/email/plantillas.ts")).href
);

/* ---------------------------------------------------------------------------
 * Dónde se escriben los archivos
 * ------------------------------------------------------------------------- */

/**
 * El directorio de salida.
 *
 * Por defecto, el temporal del sistema: estos archivos son basura de revisión y
 * no tienen por qué ensuciar el repositorio ni colarse en un commit. Con
 * `--salida <ruta>` se puede pedir otro.
 */
function directorioDeSalida() {
  const indice = process.argv.indexOf("--salida");
  if (indice !== -1 && process.argv[indice + 1]) {
    return process.argv[indice + 1];
  }
  const base = process.env.TEMP || process.env.TMPDIR || "/tmp";
  return join(base, "lafinca-correos");
}

/* ---------------------------------------------------------------------------
 * La reserva de ejemplo
 * ------------------------------------------------------------------------- */

const CONTACTO = {
  whatsapp: "573160476671",
  whatsappVisible: "+57 316 047 6671",
  correo: "",
  direccionCompleta:
    "Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca, Colombia",
  rnt: "114565",
  comoLlegar: "https://maps.google.com/?q=La+Finca+Eco+Hotel",
};

/**
 * Hospedaje de tres noches, **mixto**: una noche entre semana y dos de fin de
 * semana. Es el caso que más se equivoca al pintar, y el que el hotel cobra con
 * dos tarifas distintas.
 */
const HOSPEDAJE = {
  id: "11111111-2222-3333-4444-555555555555",
  codigo: "LF-2026-0042",
  tipo: "hospedaje",
  alojamiento: "Cabaña 03",
  plan: "Estándar",
  entrada: "2026-10-15",
  salida: "2026-10-18",
  numPersonas: 2,
  huespedNombre: "Ana María Restrepo",
  huespedEmail: "ana.ejemplo@correo.com",
  huespedTelefono: "+57 312 555 4433",
  notas:
    "Llegamos sobre las 5 de la tarde.\nAna es alérgica a los frutos secos, por favor sin nueces en el desayuno.",
  subtotalAlojamiento: 1_310_000,
  subtotalExtras: 175_000,
  total: 1_485_000,
  porcentajeAnticipo: 50,
  montoAnticipo: 742_500,
  experiencias: [
    {
      nombre: "Aniversario con Amor",
      cantidad: 1,
      precioUnitario: 150_000,
      noche: "2026-10-16",
    },
    { nombre: "Fondue", cantidad: 1, precioUnitario: 25_000, noche: "2026-10-17" },
  ],
  /* El desglose real por noche, como lo entrega `cotizar()`. */
  noches: [
    { fecha: "2026-10-15", plan: "Entre Semana", precio: 350_000, festivo: null },
    { fecha: "2026-10-16", plan: "Estándar", precio: 480_000, festivo: null },
    { fecha: "2026-10-17", plan: "Estándar", precio: 480_000, festivo: null },
  ],
  estado: "pendiente",
  origen: "web",
  expiraAt: new Date(Date.now() + 22 * 60_000).toISOString(),
  pago: null,
};

/** El mismo hospedaje, ya confirmado y con el pago aprobado por la pasarela. */
const HOSPEDAJE_CONFIRMADO = {
  ...HOSPEDAJE,
  estado: "confirmada",
  expiraAt: null,
  pago: {
    monto: 742_500,
    saldo: 742_500,
    metodo: "Tarjeta",
    transaccionId: "wompi_01JXYZABC123",
  },
};

/** Día de Calma: sin cabaña, sin noches, con su propia franja horaria. */
const DIA_DE_CALMA = {
  id: "66666666-7777-8888-9999-000000000000",
  codigo: "LF-2026-0043",
  tipo: "dia",
  alojamiento: null,
  plan: "Día de Calma",
  entrada: "2026-11-07",
  salida: "2026-11-08",
  numPersonas: 2,
  huespedNombre: "Julián Ospina",
  huespedEmail: "julian.ejemplo@correo.com",
  huespedTelefono: "+57 320 111 2233",
  notas: null,
  subtotalAlojamiento: 250_000,
  subtotalExtras: 0,
  total: 250_000,
  porcentajeAnticipo: 100,
  montoAnticipo: 250_000,
  experiencias: [],
  noches: undefined,
  estado: "confirmada",
  origen: "web",
  expiraAt: null,
  pago: null,
};

/* ---------------------------------------------------------------------------
 * Los casos que se renderizan
 * ------------------------------------------------------------------------- */

const BASE = {
  contacto: CONTACTO,
  urlSitio: process.env.NEXT_PUBLIC_SITE_URL || "https://www.lafincaecohotel.com",
  urlLogo: `${
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://yyfuhytmoiehqmnrekkq.supabase.co"
  }/storage/v1/object/public/imagenes/sitio/marca/icono-correo.png`,
};

const CASOS = [
  {
    archivo: "1-solicitud-recibida",
    titulo: "1. Solicitud recibida (hospedaje, estadía mixta de 3 noches)",
    render: () => renderSolicitudRecibida({ ...BASE, reserva: HOSPEDAJE }),
  },
  {
    archivo: "2-reserva-confirmada",
    titulo: "2. Reserva confirmada (hospedaje, con pago aprobado)",
    render: () =>
      renderReservaConfirmada({ ...BASE, reserva: HOSPEDAJE_CONFIRMADO }),
  },
  {
    archivo: "3-aviso-administracion",
    titulo: "3. Aviso a la administración (solicitud nueva, pendiente)",
    render: () => renderAvisoAdministracion({ ...BASE, reserva: HOSPEDAJE }),
  },
  /* Las variantes del Día de Calma: mismo correo, otro contenido. Se revisan
     aparte porque es donde se cuela una frase de hospedaje que no aplica. */
  {
    archivo: "4-dia-de-calma-solicitud",
    titulo: "4. Variante: solicitud de Día de Calma",
    render: () =>
      renderSolicitudRecibida({
        ...BASE,
        reserva: {
          ...DIA_DE_CALMA,
          estado: "pendiente",
          expiraAt: new Date(Date.now() + 8 * 60_000).toISOString(),
        },
      }),
  },
  {
    archivo: "5-dia-de-calma-confirmado",
    titulo: "5. Variante: Día de Calma confirmado (10 a. m. – 5 p. m.)",
    render: () => renderReservaConfirmada({ ...BASE, reserva: DIA_DE_CALMA }),
  },
  {
    archivo: "6-aviso-dia-de-calma",
    titulo: "6. Variante: aviso interno de un Día de Calma confirmado",
    render: () => renderAvisoAdministracion({ ...BASE, reserva: DIA_DE_CALMA }),
  },
];

/* ---------------------------------------------------------------------------
 * Renderizado
 * ------------------------------------------------------------------------- */

const salida = directorioDeSalida();
mkdirSync(salida, { recursive: true });

console.log(`\nCorreos de La Finca Eco Hotel → ${salida}\n`);

const indice = [];

for (const caso of CASOS) {
  const correo = caso.render();

  const rutaHtml = join(salida, `${caso.archivo}.html`);
  const rutaTexto = join(salida, `${caso.archivo}.txt`);

  writeFileSync(rutaHtml, correo.html, "utf8");
  writeFileSync(rutaTexto, correo.texto, "utf8");

  indice.push({ ...caso, asunto: correo.asunto, rutaHtml });

  console.log(`  ${caso.titulo}`);
  console.log(`    Asunto: ${correo.asunto}`);
  console.log(`    HTML:   ${rutaHtml}`);
  console.log(`    Texto:  ${rutaTexto}`);
  console.log(
    `    Peso:   ${(Buffer.byteLength(correo.html, "utf8") / 1024).toFixed(1)} kB` +
      /* Gmail RECORTA los correos de más de 102 kB y añade un «[Mensaje
         recortado]» con un enlace: el final del correo —el pie, el RNT— se
         pierde. Ninguno de estos se acerca, pero conviene verlo. */
      (Buffer.byteLength(correo.html, "utf8") > 102_000
        ? "  ⚠ Gmail recorta por encima de 102 kB"
        : ""),
  );
  console.log("");
}

/* Un índice para abrir los seis de una vez. */
const rutaIndice = join(salida, "index.html");
writeFileSync(
  rutaIndice,
  `<!doctype html><html lang="es"><head><meta charset="utf-8" />
<title>Correos de La Finca</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:46rem;margin:3rem auto;padding:0 1.5rem;color:#2b2a26;background:#fefbf7}
h1{font-size:1.3rem;color:#027570}li{margin:.8rem 0}code{background:#e8f4d9;padding:.1em .4em;border-radius:4px;font-size:.85em}</style>
</head><body><h1>Correos transaccionales de La Finca Eco Hotel</h1>
<p>Generados por <code>npm run correos:probar</code>. Revisa también el <code>.txt</code> de cada uno: es lo que ven los clientes que bloquean HTML.</p>
<ol>${indice
    .map(
      (caso) =>
        `<li><a href="${caso.archivo}.html">${caso.titulo}</a><br /><small>${caso.asunto}</small> · <a href="${caso.archivo}.txt">texto plano</a></li>`,
    )
    .join("")}</ol></body></html>`,
  "utf8",
);

console.log(`  Índice: ${rutaIndice}\n`);

/* ---------------------------------------------------------------------------
 * Envío de verdad, si hay clave
 * ------------------------------------------------------------------------- */

const indiceEnviar = process.argv.indexOf("--enviar");
const destinoManual =
  indiceEnviar !== -1 ? process.argv[indiceEnviar + 1] : null;
const clave = process.env.RESEND_API_KEY?.trim();

if (!clave) {
  console.log(
    "RESEND_API_KEY no está configurada: no se envía nada, que es el estado\n" +
      "esperado hoy. Los correos están «listos pero dormidos» (ver\n" +
      "`src/lib/email/send.ts` y `docs/DESPLIEGUE_VERCEL.md`).\n",
  );
  process.exit(0);
}

const destino = destinoManual || process.env.EMAIL_NOTIFY_TO?.split(",")[0]?.trim();

if (!destino) {
  console.log(
    "Hay clave de Resend, pero no hay a quién enviar. Pásale un destinatario:\n" +
      "  npm run correos:probar -- --enviar tu@correo.com\n",
  );
  process.exit(0);
}

console.log(`Enviando los ${CASOS.length} correos de prueba a ${destino}…\n`);

const { Resend } = await import("resend");
const resend = new Resend(clave);
const remitente =
  process.env.EMAIL_FROM?.trim() ||
  "La Finca Eco Hotel <reservas@lafincaecohotel.com>";

let fallos = 0;

for (const caso of indice) {
  const correo = caso.render();
  const { data, error } = await resend.emails.send({
    from: remitente,
    to: [destino],
    /* El prefijo evita que una prueba se confunda con un correo real en la
       bandeja de quien la reciba. */
    subject: `[PRUEBA] ${correo.asunto}`,
    html: correo.html,
    text: correo.texto,
  });

  if (error) {
    fallos += 1;
    console.log(`  ✗ ${caso.archivo}: ${error.message}`);
  } else {
    console.log(`  ✓ ${caso.archivo} (id ${data?.id ?? "?"})`);
  }
}

console.log("");
if (fallos > 0) {
  console.log(
    `${fallos} de ${indice.length} no se pudieron enviar. Lo más probable:\n` +
      "el dominio de EMAIL_FROM todavía no está verificado en Resend.\n",
  );
  process.exit(1);
}
console.log("Los correos salieron. Revísalos también en el teléfono.\n");
