/**
 * Qué calendarios de Google ve el sitio, y cómo está entendida la variable.
 *
 *     npm run calendario:verificar
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ
 * ---------------------------------------------------------------------------
 * Es el script que se corre **el día que el hotel comparta su calendario** con
 * la cuenta de servicio. Imprime, en este orden:
 *
 *   1. si la credencial carga y con qué correo (el que hay que invitar),
 *   2. cómo quedó entendida `GOOGLE_CALENDAR_ID` —qué calendarios y a qué
 *      cabaña va cada uno— con los avisos de lo que no se entendió,
 *   3. en qué calendario se van a apuntar las reservas del panel,
 *   4. los calendarios que la cuenta ve de verdad, con su identificador
 *      completo, marcando los que ya están configurados y los que no.
 *
 * Con el punto 4 no hay que pedirle el identificador a nadie: se copia de aquí a
 * `.env.local` y a Vercel.
 *
 * A diferencia de `probar-calendario.mjs`, este script **no escribe nada** en
 * Google: solo lee. Se puede correr cuando sea, también contra el calendario
 * real del hotel.
 *
 * ---------------------------------------------------------------------------
 * NO IMPRIME NINGÚN SECRETO
 * ---------------------------------------------------------------------------
 * De la credencial solo sale el `client_email`, que es público por definición
 * (hay que dárselo al hotel para que comparta). La clave privada no se toca.
 *
 * Necesita Node ≥ 22.18, igual que los demás: carga los módulos TypeScript del
 * proyecto para verificar EL CÓDIGO DE VERDAD y no una copia que se
 * desincronice.
 */

import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as cargarEnv } from "dotenv";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

/* Node exige la extensión en los imports relativos; dentro del proyecto van sin
   ella porque las resuelve el empaquetador de Next. Ver `probar-calendario.mjs`. */
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
  credencialConfigurada,
  correoDeLaCuentaDeServicio,
  configuracionDeCalendarios,
  listarCalendarios,
} = await import("../src/lib/google/calendario.ts");

const { etiquetaDeCalendario } = await import(
  "../src/lib/reserva/calendarios-config.ts"
);

function titulo(texto) {
  console.log(`\n── ${texto} ${"─".repeat(Math.max(0, 56 - texto.length))}`);
}

titulo("Credencial del sitio");

if (!credencialConfigurada()) {
  console.error(
    "\n  ✗ No carga GOOGLE_CALENDAR_CREDENCIALES.\n\n" +
      "    Tiene que ser el JSON de la cuenta de servicio en base64 y en una\n" +
      "    sola línea. Mientras falte, el sitio funciona igual pero sin la capa\n" +
      "    de Google: solo mira `reservas` y `bloqueos`.\n",
  );
  process.exit(1);
}

console.log("  ✓ La credencial carga.");
console.log(`  Cuenta del sitio: ${correoDeLaCuentaDeServicio()}`);
console.log(
  "  (Es el correo con el que el hotel tiene que compartir cada calendario,\n" +
    "   con permiso de «Hacer cambios en eventos».)",
);

titulo("GOOGLE_CALENDAR_ID, tal como se entiende");

const config = configuracionDeCalendarios();

if (config.calendarios.length === 0) {
  console.log(
    "  (vacía — el hotel todavía no ha compartido su calendario)\n\n" +
      "  Formato cuando lo haga:\n" +
      "    GOOGLE_CALENDAR_ID=general@group.calendar.google.com\n" +
      "    GOOGLE_CALENDAR_ID=general@…, cab1@…=1, cab2@…=2\n\n" +
      "  Sin «=n» el calendario se lee por el título de cada evento; con «=n»\n" +
      "  todos sus eventos ocupan esa cabaña.",
  );
} else {
  for (const [indice, calendario] of config.calendarios.entries()) {
    console.log(`  ${indice + 1}. ${calendario.id}`);
    console.log(`     ${etiquetaDeCalendario(calendario)}`);
  }
}

titulo("Dónde se apuntan las reservas del panel");
console.log(
  config.escribirEn
    ? `  ${config.escribirEn}\n  ${
        config.escrituraForzada
          ? "(fijado con GOOGLE_CALENDAR_ESCRIBIR_EN)"
          : "(el primero de la lista)"
      }`
    : "  En ninguno: no hay calendarios configurados.",
);

if (config.avisos.length > 0) {
  titulo("Avisos");
  for (const aviso of config.avisos) console.log(`  ⚠ ${aviso}`);
}

titulo("Calendarios que la cuenta del sitio ve de verdad");

const vistos = await listarCalendarios();

if (!vistos.ok) {
  console.error(`  ✗ No se pudo preguntar a Google: ${vistos.mensaje}\n`);
  process.exit(1);
}

if (vistos.datos.length === 0) {
  console.log(
    "  Ninguno todavía.\n\n" +
      "  En Google Calendar, junto al nombre del calendario: «Configuración y\n" +
      "  uso compartido» → «Compartir con determinadas personas o grupos» →\n" +
      `  añadir ${correoDeLaCuentaDeServicio()} con «Hacer cambios en eventos».`,
  );
} else {
  const configurados = new Set(
    config.calendarios.map((calendario) => calendario.id.toLowerCase()),
  );
  for (const visto of vistos.datos) {
    const estaConfigurado = configurados.has(visto.id.toLowerCase());
    console.log(`\n  ${estaConfigurado ? "✓ configurado" : "· sin configurar"}`);
    console.log(`    ${visto.nombre}  (${visto.acceso})`);
    console.log(`    ${visto.id}`);
  }

  const faltan = vistos.datos.filter(
    (visto) => !configurados.has(visto.id.toLowerCase()),
  );
  if (faltan.length > 0) {
    console.log(
      `\n  Para empezar a usar los ${faltan.length} «sin configurar», copia su\n` +
        "  identificador a GOOGLE_CALENDAR_ID (con «=3» detrás si es el de la\n" +
        "  Cabaña 3), en .env.local y en Vercel.",
    );
  }

}

/* Esto se comprueba SIEMPRE, también cuando la cuenta no ve ninguno: un
   calendario configurado que la cuenta no ve es la causa número uno de «el
   sitio no muestra lo que apuntamos». */
const invisibles = config.calendarios.filter(
  (calendario) =>
    !vistos.datos.some(
      (visto) => visto.id.toLowerCase() === calendario.id.toLowerCase(),
    ),
);
if (invisibles.length > 0) {
  console.log(
    `\n  ⚠ ${invisibles.length} calendario(s) están configurados pero la cuenta\n` +
      "    NO los ve. Revisa que sigan compartidos con el correo de arriba y que\n" +
      "    el identificador esté bien escrito:",
  );
  for (const calendario of invisibles) console.log(`      · ${calendario.id}`);
}

console.log("");
