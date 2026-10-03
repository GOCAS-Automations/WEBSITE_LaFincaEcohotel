/**
 * Prueba de punta a punta de la integración con Google Calendar.
 *
 *     npm run calendario:probar
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ CREA SU PROPIO CALENDARIO
 * ---------------------------------------------------------------------------
 * El hotel todavía no ha compartido su calendario «la finca» con la cuenta de
 * servicio, así que `GOOGLE_CALENDAR_ID` está vacío y no hay contra qué
 * probar. Pero una cuenta de servicio puede tener calendarios PROPIOS: este
 * script crea uno (`calendars.insert`), mete eventos de ejemplo parecidos a
 * los que escribiría el hotel, comprueba la lectura, la escritura y el
 * borrado… y **borra el calendario al terminar**, pase lo que pase.
 *
 * Así se verifica toda la cadena —firma RS256, token, REST v3, reglas de
 * ocupación— sin tocar nada del hotel y sin esperar a nadie.
 *
 * ---------------------------------------------------------------------------
 * NECESITA NODE ≥ 22.18
 * ---------------------------------------------------------------------------
 * El script importa directamente los módulos TypeScript del proyecto para
 * probar EL CÓDIGO DE VERDAD y no una copia que se desincronice. Eso se apoya
 * en que Node ya sabe quitar los tipos él solo. `--conditions=react-server`
 * hace que `server-only` se resuelva a su versión vacía en vez de lanzar.
 */

import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as cargarEnv } from "dotenv";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

/*
  Dentro del proyecto los imports van sin extensión («../reserva/calendario-externo»),
  porque quien los resuelve es el empaquetador de Next. Node, en cambio, exige
  la extensión. Este gancho añade `.ts` cuando el archivo existe, y así el
  script puede cargar EL MISMO código que corre en producción en vez de una
  copia paralela que acabaría desincronizándose.
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
  crearCalendario,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  eliminarCalendario,
  listarCalendarios,
  listarEventos,
  credencialConfigurada,
  correoDeLaCuentaDeServicio,
  configuracionDeCalendarios,
} = await import("../src/lib/google/calendario.ts");

const { ocupacionDesdeEventos, cabanasAfectadas, diasDeLaFranja } = await import(
  "../src/lib/reserva/calendario-externo.ts"
);

/* --------------------------------------------------------------------------
 * Utilidades de la prueba
 * ----------------------------------------------------------------------- */

let pasadas = 0;
const fallos = [];

function comprobar(titulo, condicion, detalle = "") {
  if (condicion) {
    pasadas += 1;
    console.log(`  ✓ ${titulo}`);
  } else {
    fallos.push(titulo);
    console.log(`  ✗ ${titulo}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function sumarDias(iso, dias) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Un año adelante: así los eventos de prueba no se cruzan con nada real. */
const BASE = sumarDias(new Date().toISOString().slice(0, 10), 365);

/** Las cinco cabañas, como se llaman en la base. */
const CABANAS = [1, 2, 3, 4, 5].map((n) => ({
  id: `id-${n}`,
  nombre: `Cabaña 0${n}`,
}));

async function principal() {
  console.log("\n── Credencial ──────────────────────────────────────────────");

  if (!credencialConfigurada()) {
    console.error(
      "\nFalta GOOGLE_CALENDAR_CREDENCIALES en .env.local (el JSON de la cuenta\n" +
        "de servicio codificado en base64, en una sola línea).\n",
    );
    process.exit(1);
  }
  console.log(`  Cuenta de servicio: ${correoDeLaCuentaDeServicio()}`);
  const configurados = configuracionDeCalendarios().calendarios;
  console.log(
    `  GOOGLE_CALENDAR_ID: ${
      configurados.length === 0
        ? "(vacío — el hotel aún no ha compartido su calendario)"
        : configurados
            .map((c) => (c.cabana === null ? c.id : `${c.id} → Cabaña ${c.cabana}`))
            .join(", ")
    }`,
  );
  console.log(
    "  (Para ver la configuración en detalle y los calendarios que la cuenta ve:\n" +
      "   npm run calendario:verificar)",
  );

  console.log("\n── Calendario de prueba ────────────────────────────────────");
  const creado = await crearCalendario(
    `La Finca — prueba automática ${new Date().toISOString()}`,
  );
  if (!creado.ok) {
    console.error(`\n  No se pudo crear el calendario de prueba: ${creado.mensaje}\n`);
    process.exit(1);
  }
  const calendarioPrueba = creado.datos.id;
  console.log(`  Creado: ${calendarioPrueba}`);

  try {
    await pruebas(calendarioPrueba);
  } finally {
    /* El calendario de prueba se borra SIEMPRE: si una comprobación falla, lo
       último que queremos es dejar basura en la cuenta de Google del hotel. */
    const borrado = await eliminarCalendario(calendarioPrueba);
    console.log(
      `\n── Limpieza ────────────────────────────────────────────────\n  ${
        borrado.ok
          ? "Calendario de prueba borrado."
          : `⚠ NO se pudo borrar el calendario de prueba (${calendarioPrueba}): ${borrado.mensaje}`
      }`,
    );

    /* Comprobación explícita: que no quede NINGÚN calendario de prueba de
       ejecuciones anteriores. Si alguna vez el borrado falló, esta línea lo
       dice en vez de dejarlo acumularse en silencio.
       Ojo: la LISTA de calendarios de Google tarda un poco en enterarse de un
       borrado, así que el que se acaba de borrar en esta misma ejecución no
       cuenta como sobrante: se comprueba por su identificador. */
    const restantes = await listarCalendarios();
    if (restantes.ok) {
      const sobrantes = restantes.datos.filter(
        (c) =>
          c.nombre.startsWith("La Finca — prueba automática") &&
          c.id !== calendarioPrueba,
      );
      console.log(
        sobrantes.length === 0
          ? "  No queda ningún calendario de prueba en la cuenta de servicio."
          : `  ⚠ Quedan ${sobrantes.length} calendarios de prueba sin borrar: ${sobrantes
              .map((c) => c.id)
              .join(", ")}`,
      );
      const compartidos = restantes.datos.filter(
        (c) => !c.nombre.startsWith("La Finca — prueba automática"),
      );

      console.log(
        compartidos.length === 0
          ? "  El hotel todavía no ha compartido ningún calendario con la cuenta de servicio."
          : `  Calendarios visibles para la cuenta de servicio:\n${compartidos
              .map((c) => `    · ${c.nombre} — ${c.id} (${c.acceso})`)
              .join("\n")}`,
      );
    }
  }

  console.log(
    `\n${fallos.length === 0 ? "✅" : "❌"} ${pasadas} comprobaciones pasadas, ${
      fallos.length
    } fallidas.\n`,
  );
  if (fallos.length > 0) {
    for (const fallo of fallos) console.log(`   · ${fallo}`);
    process.exit(1);
  }
}

async function pruebas(calendario) {
  console.log("\n── Eventos de ejemplo ──────────────────────────────────────");

  /* Tres formas distintas de apuntar una reserva, para ver que las reglas de
     `calendario-externo.ts` aguantan las tres. */
  const conCabana = await crearEventoCrudo(calendario, {
    summary: "Cabaña 2 · Marta Ríos",
    start: { dateTime: `${BASE}T14:00:00-05:00` },
    end: { dateTime: `${sumarDias(BASE, 3)}T11:00:00-05:00` },
  });
  comprobar("Se crea un evento con hora y cabaña en el título", Boolean(conCabana));

  const sinCabana = await crearEventoCrudo(calendario, {
    summary: "Evento privado (sin decir cabaña)",
    start: { dateTime: `${sumarDias(BASE, 10)}T09:00:00-05:00` },
    end: { dateTime: `${sumarDias(BASE, 10)}T18:00:00-05:00` },
  });
  comprobar("Se crea un evento sin cabaña reconocible", Boolean(sinCabana));

  const todoElDia = await crearEventoCrudo(calendario, {
    summary: "Cabaña 05 — mantenimiento",
    start: { date: sumarDias(BASE, 20) },
    end: { date: sumarDias(BASE, 22) },
  });
  comprobar("Se crea un evento de todo el día", Boolean(todoElDia));

  console.log("\n── Escritura desde el sitio ────────────────────────────────");

  const nuestro = await crearEvento(calendario, {
    titulo: "Cabaña 03 · Juan Pérez · Plan Estándar",
    descripcion: "Reserva LF-0001\nTeléfono: 300 000 0000\nTotal: $ 450.000",
    inicio: sumarDias(BASE, 30),
    fin: sumarDias(BASE, 32),
    reservaId: "reserva-de-prueba",
  });
  comprobar(
    "crearEvento() apunta una reserva en el calendario",
    nuestro.ok,
    nuestro.ok ? "" : nuestro.mensaje,
  );
  const idNuestro = nuestro.ok ? nuestro.datos.id : null;

  if (idNuestro) {
    const actualizado = await actualizarEvento(calendario, idNuestro, {
      titulo: "Cabaña 03 · Juan Pérez · Plan Premium",
      descripcion: "Reserva LF-0001 (actualizada)",
      inicio: sumarDias(BASE, 30),
      fin: sumarDias(BASE, 33),
      reservaId: "reserva-de-prueba",
    });
    comprobar(
      "actualizarEvento() cambia título y fechas",
      actualizado.ok,
      actualizado.ok ? "" : actualizado.mensaje,
    );
  }

  console.log("\n── Lectura y ocupación ─────────────────────────────────────");

  const lectura = await listarEventos(calendario, BASE, sumarDias(BASE, 60));
  comprobar(
    "listarEventos() devuelve los cuatro eventos",
    lectura.ok && lectura.datos.length === 4,
    lectura.ok ? `vinieron ${lectura.datos.length}` : lectura.mensaje,
  );
  if (!lectura.ok) return;

  const franjas = ocupacionDesdeEventos(lectura.datos);

  comprobar(
    "El evento que creó el sitio NO cuenta como ocupación ajena",
    franjas.length === 3,
    `quedaron ${franjas.length} franjas`,
  );

  const deCabana2 = franjas.find((f) => f.cabana === 2);
  comprobar(
    "«Cabaña 2 · Marta Ríos» ocupa solo la cabaña 2",
    Boolean(deCabana2) && deCabana2.inicio === BASE && deCabana2.fin === sumarDias(BASE, 3),
    deCabana2 ? `${deCabana2.inicio} → ${deCabana2.fin}` : "no apareció",
  );

  const anonima = franjas.find((f) => f.motivo === "sin_cabana");
  comprobar(
    "El evento sin cabaña bloquea las cinco",
    Boolean(anonima) && cabanasAfectadas(anonima, CABANAS).length === 5,
  );
  comprobar(
    "Un evento de un solo día ocupa exactamente ese día",
    Boolean(anonima) && diasDeLaFranja(anonima).length === 1,
    anonima ? diasDeLaFranja(anonima).join(", ") : "",
  );

  const mantenimiento = franjas.find((f) => f.cabana === 5);
  comprobar(
    "El evento de todo el día respeta el fin exclusivo de Google",
    Boolean(mantenimiento) &&
      mantenimiento.inicio === sumarDias(BASE, 20) &&
      mantenimiento.fin === sumarDias(BASE, 22),
    mantenimiento ? `${mantenimiento.inicio} → ${mantenimiento.fin}` : "no apareció",
  );

  console.log("\n  Ocupación resultante:");
  for (const franja of franjas) {
    const destino =
      franja.cabana === null
        ? "TODAS las cabañas"
        : cabanasAfectadas(franja, CABANAS)
            .map((c) => c.nombre)
            .join(", ");
    console.log(
      `    · ${franja.inicio} → ${franja.fin}  ${destino.padEnd(22)}  «${franja.titulo}»`,
    );
  }

  console.log("\n── Borrado ─────────────────────────────────────────────────");

  if (idNuestro) {
    const borrado = await eliminarEvento(calendario, idNuestro);
    comprobar(
      "eliminarEvento() borra el evento del sitio",
      borrado.ok,
      borrado.ok ? "" : borrado.mensaje,
    );
    const reintento = await eliminarEvento(calendario, idNuestro);
    comprobar(
      "Borrar dos veces el mismo evento no es un error",
      reintento.ok,
      reintento.ok ? "" : reintento.mensaje,
    );
  }

  const despues = await listarEventos(calendario, BASE, sumarDias(BASE, 60));
  comprobar(
    "Tras el borrado quedan los tres eventos «del hotel»",
    despues.ok && despues.datos.length === 3,
    despues.ok ? `quedaron ${despues.datos.length}` : despues.mensaje,
  );
}

/**
 * Crea un evento CRUDO, sin la marca `origen=lafinca-web`.
 *
 * Es la forma de simular lo que escribe el hotel a mano: si se usara
 * `crearEvento()` del proyecto, el evento llevaría nuestra firma y la lectura
 * lo descartaría, que es justo lo contrario de lo que se quiere probar.
 */
async function crearEventoCrudo(calendario, cuerpo) {
  const token = await tokenDePrueba();
  const respuesta = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendario,
    )}/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(cuerpo),
    },
  );
  if (!respuesta.ok) {
    console.log(`    (Google respondió ${respuesta.status}: ${await respuesta.text()})`);
    return null;
  }
  const json = await respuesta.json();
  return json.id ?? null;
}

/**
 * Token propio del script, solo para los eventos crudos de arriba.
 * El resto de la prueba usa el del módulo del proyecto.
 */
let tokenGuardado = null;
async function tokenDePrueba() {
  if (tokenGuardado) return tokenGuardado;

  const { createSign } = await import("node:crypto");
  const crudo = process.env.GOOGLE_CALENDAR_CREDENCIALES.trim();
  const json = JSON.parse(
    crudo.startsWith("{") ? crudo : Buffer.from(crudo, "base64").toString("utf8"),
  );

  const b64 = (dato) =>
    Buffer.from(dato)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = b64(
    JSON.stringify({
      iss: json.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: ahora,
      exp: ahora + 3600,
    }),
  );
  const firmador = createSign("RSA-SHA256");
  firmador.update(`${cabecera}.${cuerpo}`);
  const firma = b64(firmador.sign(json.private_key.replace(/\\n/g, "\n")));

  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecera}.${cuerpo}.${firma}`,
    }),
  });
  const datos = await respuesta.json();
  tokenGuardado = datos.access_token;
  return tokenGuardado;
}

await principal();
