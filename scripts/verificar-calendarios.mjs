/**
 * Qué calendarios de Google ve el sitio, y cómo está entendida la variable.
 *
 *     npm run calendario:verificar
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ
 * ---------------------------------------------------------------------------
 * Es el script que se corre cuando hay que saber si la integración con el
 * calendario del hotel está viva. Imprime, en este orden:
 *
 *   1. si la credencial carga y con qué correo (el que hay que invitar),
 *   2. cómo quedó entendida `GOOGLE_CALENDAR_ID` —qué calendarios y a qué
 *      cabaña va cada uno— con los avisos de lo que no se entendió,
 *   3. **el calendario donde el sitio ESCRIBE**, comprobado: si la cuenta no
 *      tiene ahí permiso de escritura, las reservas del panel no se apuntan en
 *      ningún lado y el script termina con error,
 *   4. los calendarios que el sitio **solo LEE**, comprobados uno por uno,
 *   5. si la cuenta tiene algún calendario más en su propia lista, por si hay un
 *      identificador que copiar.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE COMPRUEBA, Y POR QUÉ NO CON `calendarList`
 * ---------------------------------------------------------------------------
 * Pidiéndole a Google **los eventos de cada calendario**, que es lo que hace el
 * sitio de verdad. La versión anterior preguntaba a `calendarList.list` y daba
 * por perdido lo que no saliera ahí; resultó que esa lista son las
 * *suscripciones* de la cuenta, no sus *permisos*, y se queda vacía aunque el
 * hotel haya compartido los siete calendarios. El script decía «ninguno
 * todavía» con todo funcionando. La historia está en
 * `src/lib/reserva/diagnostico-calendarios.ts`.
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
  comprobarCalendario,
  listarCalendarios,
} = await import("../src/lib/google/calendario.ts");

const { etiquetaDeCalendario } = await import(
  "../src/lib/reserva/calendarios-config.ts"
);

const { accesoEnEspanol, armarDiagnostico, calendariosAComprobar } = await import(
  "../src/lib/reserva/diagnostico-calendarios.ts"
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
  "  (Es el correo con el que el hotel comparte cada calendario. Para los que\n" +
    "   el sitio solo consulta basta «Ver todos los eventos»; el calendario donde\n" +
    "   se apuntan las reservas necesita «Hacer cambios en eventos».)",
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

/* ---------------------------------------------------------------------------
 * La comprobación de verdad: una lectura de eventos por calendario
 * ------------------------------------------------------------------------ */

const comprobaciones = {};
const aComprobar = calendariosAComprobar(config);

const [respuestas, lista] = await Promise.all([
  Promise.all(
    aComprobar.map(async (id) => ({ id, respuesta: await comprobarCalendario(id) })),
  ),
  listarCalendarios(),
]);

for (const { id, respuesta } of respuestas) {
  comprobaciones[id.toLowerCase()] = respuesta.ok
    ? {
        ok: true,
        nombre: respuesta.datos.nombre,
        acceso: respuesta.datos.acceso,
        puedeEscribir: respuesta.datos.puedeEscribir,
      }
    : { ok: false, mensaje: respuesta.mensaje };
}

const diagnostico = armarDiagnostico({
  credencial: true,
  correoCuenta: correoDeLaCuentaDeServicio(),
  config,
  comprobaciones,
  suscritos: lista.ok ? lista.datos : null,
  errorSuscritos: lista.ok ? null : lista.mensaje,
});

/** Una línea por calendario, con lo que Google contestó. */
function imprimir(calendario) {
  if (calendario.error) {
    console.log(`  ✗ ${calendario.id}`);
    console.log(`    No responde: ${calendario.error}`);
    return;
  }
  if (!calendario.responde) {
    console.log(`  · ${calendario.id}`);
    console.log("    Sin comprobar.");
    return;
  }
  console.log(`  ✓ ${calendario.nombre ?? "(sin nombre)"}`);
  console.log(`    ${calendario.id}`);
  console.log(
    `    Permiso: ${calendario.acceso} — ${accesoEnEspanol(calendario.acceso)}`,
  );
  console.log(
    `    Qué ocupa: ${
      calendario.cabana === null
        ? "lo que diga el título de cada evento (las cinco cabañas si no lo dice)"
        : `siempre la Cabaña ${calendario.cabana}`
    }`,
  );
}

titulo("Donde el sitio ESCRIBE las reservas del panel");

if (!diagnostico.escritura) {
  console.log(
    "  En ninguno: no hay calendarios configurados. Las reservas se quedan solo\n" +
      "  en el panel; están a salvo, pero no se ven desde el teléfono.",
  );
} else {
  imprimir(diagnostico.escritura);
  console.log(
    `    ${
      diagnostico.escrituraForzada
        ? "Lo fija GOOGLE_CALENDAR_ESCRIBIR_EN."
        : "Es el primero de GOOGLE_CALENDAR_ID."
    }`,
  );
  if (diagnostico.escrituraFueraDeLista) {
    console.log(
      "    ⚠ No está entre los que el sitio lee: lo que se apunte ahí no cuenta\n" +
        "      para la disponibilidad.",
    );
  }
  if (diagnostico.escrituraSinPermiso) {
    console.log(
      "\n  ✗✗ PROBLEMA GRAVE: la cuenta del sitio NO puede escribir ahí.\n" +
        "     Las reservas que se creen desde el panel no se apuntarán en ningún\n" +
        "     calendario del hotel, y nadie se dará cuenta hasta echarlas en falta.\n" +
        "     Arreglo: en Google Calendar, «Configuración y uso compartido» de ese\n" +
        `     calendario → ${correoDeLaCuentaDeServicio()} → «Hacer cambios en eventos».`,
    );
  }
}

titulo("Calendarios que el sitio solo LEE");

const soloLectura = diagnostico.configurados.filter(
  (calendario) => !calendario.deEscritura,
);

if (soloLectura.length === 0) {
  console.log(
    "  Ninguno. La disponibilidad se calcula solo con el calendario de arriba.",
  );
} else {
  console.log(
    `  ${soloLectura.length} calendario(s). De aquí sale la disponibilidad: lo que\n` +
      "  el hotel apunte en ellos bloquea fechas en el sitio.\n",
  );
  for (const calendario of soloLectura) {
    imprimir(calendario);
    console.log("");
  }
}

if (diagnostico.avisos.length > 0) {
  titulo("Avisos");
  for (const aviso of diagnostico.avisos) console.log(`  ⚠ ${aviso}`);
}

/* ---------------------------------------------------------------------------
 * Suscripciones: solo para descubrir identificadores
 * ------------------------------------------------------------------------ */

titulo("Otros calendarios en la lista de la cuenta");

if (diagnostico.errorSuscritos) {
  console.log(`  No se pudo preguntar: ${diagnostico.errorSuscritos}`);
} else if ((diagnostico.suscritosSinConfigurar ?? []).length === 0) {
  console.log(
    "  Ninguno, y eso NO quiere decir nada malo: lo que Google llama\n" +
      "  `calendarList` son las suscripciones de la cuenta, y una cuenta de\n" +
      "  servicio no «acepta» invitaciones, así que casi siempre está vacía. Lo\n" +
      "  que importa es la comprobación de arriba.",
  );
} else {
  console.log(
    "  La cuenta los tiene en su lista pero no están configurados. Para usar uno,\n" +
      "  copia su identificador a GOOGLE_CALENDAR_ID (con «=3» detrás si es el de\n" +
      "  la Cabaña 3), en .env.local y en Vercel.\n",
  );
  for (const suscrito of diagnostico.suscritosSinConfigurar) {
    console.log(`  · ${suscrito.nombre}  (${accesoEnEspanol(suscrito.acceso)})`);
    console.log(`    ${suscrito.id}`);
  }
}

/* ---------------------------------------------------------------------------
 * Veredicto
 * ------------------------------------------------------------------------ */

titulo("Resumen");

const caidos = diagnostico.configurados.filter((calendario) => calendario.error);
console.log(
  `  ${diagnostico.responden} de ${diagnostico.configurados.length} calendarios configurados responden.`,
);

if (caidos.length === 0 && !diagnostico.escrituraSinPermiso) {
  console.log("  ✓ La integración con el calendario del hotel está sana.\n");
  process.exit(0);
}

if (caidos.length > 0) {
  console.log(`  ✗ ${caidos.length} no responden (ver arriba).`);
}
if (diagnostico.escrituraSinPermiso) {
  console.log("  ✗ El calendario de escritura no tiene permiso de escritura.");
}
console.log("");
process.exit(1);
