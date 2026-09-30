/**
 * Pruebas del HOLD contra la base de datos REAL.
 *
 *   npm run db:probar-holds
 *
 * ---------------------------------------------------------------------------
 * QUÉ SE PRUEBA AQUÍ Y POR QUÉ NO PUEDE SER UN TEST DE VITEST
 * ---------------------------------------------------------------------------
 * `src/lib/reserva/holds.test.ts` prueba las reglas puras. Lo que NO se puede
 * probar ahí es lo que vive en Postgres y es justo lo que puede provocar una
 * sobreventa:
 *
 *   1. Que la restricción EXCLUDE **no sepa la hora**: un hold vencido sigue
 *      bloqueando para ella, y por eso hay que barrer antes de escribir.
 *   2. Que `liberar_reservas_vencidas()` cancele solo lo que debe y **anexe** el
 *      motivo a `notas` sin borrar lo que escribió el huésped.
 *   3. Que **dos creaciones simultáneas** sobre las mismas fechas acaben con una
 *      ganadora y la otra con un 23P01 traducido al español — y eso exige dos
 *      conexiones de verdad, no dos llamadas seguidas.
 *
 * ---------------------------------------------------------------------------
 * LA BASE QUEDA COMO ESTABA
 * ---------------------------------------------------------------------------
 * El bloque 1 corre dentro de una transacción que termina en ROLLBACK. El bloque
 * de concurrencia **no puede** (necesita que una transacción confirme para que la
 * otra choque), así que borra sus dos filas en un `finally`, y al terminar el
 * script comprueba que no queda ninguna reserva de prueba. Todos los códigos
 * empiezan por `PRB-HOLD-`, y la fecha es 2098, así que no se cruzan con nada.
 */

import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { config as cargarEnv } from "dotenv";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

/* Para poder importar los módulos TypeScript del proyecto (ver
   `scripts/probar-calendario.mjs`): así se prueba EL código que corre, no una
   copia de sus reglas escrita aquí. */
registerHooks({
  resolve(especificador, contexto, siguiente) {
    /* El alias `@/…` del `tsconfig` apunta a `src/`. Node no lee el tsconfig,
       así que se traduce aquí a una URL de archivo. */
    let objetivo = especificador;
    if (objetivo.startsWith("@/")) {
      objetivo = pathToFileURL(join(RAIZ, "src", objetivo.slice(2))).href;
    }
    if (
      (objetivo.startsWith(".") || objetivo.startsWith("file:")) &&
      !/\.[cm]?[jt]sx?$/.test(objetivo)
    ) {
      try {
        return siguiente(`${objetivo}.ts`, contexto);
      } catch {
        /* No era un .ts. */
      }
    }
    return siguiente(objetivo, contexto);
  },
});

const { MOTIVO_VENCIDA, ocupaCalendario } = await import(
  pathToFileURL(join(RAIZ, "src/lib/reserva/holds.ts")).href
);
const { traducirErrorPostgres } = await import(
  pathToFileURL(join(RAIZ, "src/lib/admin/validacion.ts")).href
);

const urlBaseDatos = process.env.SUPABASE_DB_URL;
if (!urlBaseDatos) {
  console.error("Falta SUPABASE_DB_URL en .env.local.");
  process.exit(1);
}

/** Fechas de 2098: no se cruzan con ninguna reserva real. */
const LLEGADA = "2098-03-10";
const PREFIJO = "PRB-HOLD-";

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

/** Ejecuta algo que debe fallar y devuelve el error de Postgres. */
async function esperarError(cliente, fn) {
  await cliente.query("savepoint intento");
  try {
    await fn();
    await cliente.query("release savepoint intento");
    return null;
  } catch (error) {
    await cliente.query("rollback to savepoint intento");
    return error;
  }
}

function conectar(nombre) {
  return new pg.Client({
    connectionString: urlBaseDatos,
    ssl: { rejectUnauthorized: false },
    application_name: `lafinca-pruebas-holds-${nombre}`,
  });
}

/** El SQL de un alta de hospedaje, con el vencimiento y las notas como parámetros. */
const INSERTAR = `
  insert into reservas
    (codigo, tipo, alojamiento_id, plan_id, estancia, huesped_nombre,
     huesped_email, huesped_telefono, num_personas, notas,
     subtotal_alojamiento, subtotal_extras, total, estado, origen,
     porcentaje_anticipo, monto_anticipo, expira_at)
  values ($1,'hospedaje',$2,$3,
          daterange($4::date, ($4::date + $5::int), '[)'),
          'Prueba hold','prueba@lafinca.test','+57 300 000 0000',2,$6,
          480000,0,480000,$7,'web',50,240000,$8)
  returning id, estado, notas`;

async function principal() {
  const cliente = conectar("principal");
  await cliente.connect();

  const { rows: cabanas } = await cliente.query(
    "select id, nombre from alojamientos order by orden limit 1",
  );
  const { rows: planes } = await cliente.query(
    "select id from planes where tipo = 'hospedaje' order by orden limit 1",
  );
  if (cabanas.length === 0 || planes.length === 0) {
    throw new Error("La base no tiene cabañas o planes de hospedaje cargados.");
  }
  const cabana = cabanas[0];
  const plan = planes[0];

  /* =======================================================================
   * BLOQUE 1 — dentro de una transacción que se deshace
   * ==================================================================== */
  console.log(
    `\nConectado (${cabana.nombre}). El bloque 1 va en una transacción que se deshace.\n`,
  );
  await cliente.query("begin");

  try {
    console.log("Una reserva vencida libera la fecha:");

    const NOTA_DEL_HUESPED = "Llegamos tarde. Sin nueces en el desayuno.";
    const { rows: vencida } = await cliente.query(INSERTAR, [
      `${PREFIJO}VENCIDA`,
      cabana.id,
      plan.id,
      LLEGADA,
      2,
      NOTA_DEL_HUESPED,
      "pendiente",
      /* Venció hace una hora. */
      new Date(Date.now() - 3_600_000).toISOString(),
    ]);
    comprobar("se crea una pendiente con el vencimiento ya pasado", vencida.length === 1);

    /* La regla de la aplicación ya dice que NO ocupa… */
    const { rows: comoLaLee } = await cliente.query(
      "select estado, expira_at from reservas where codigo = $1",
      [`${PREFIJO}VENCIDA`],
    );
    comprobar(
      "`ocupaCalendario()` dice que esa reserva NO ocupa",
      ocupaCalendario(comoLaLee[0]) === false,
    );

    /* …pero la restricción EXCLUDE no sabe la hora y sigue bloqueando. Esta es
       LA razón de que haya que barrer antes de escribir, y por eso se prueba. */
    const choqueAntes = await esperarError(cliente, () =>
      cliente.query(INSERTAR, [
        `${PREFIJO}NUEVA`,
        cabana.id,
        plan.id,
        LLEGADA,
        2,
        null,
        "pendiente",
        null,
      ]),
    );
    comprobar(
      "sin barrer, la restricción EXCLUDE rechaza las mismas fechas (no sabe la hora)",
      choqueAntes !== null && choqueAntes.code === "23P01",
      choqueAntes ? `código ${choqueAntes.code}` : "no falló",
    );

    /* El barrido. */
    const { rows: barrido } = await cliente.query(
      "select liberar_reservas_vencidas($1) as liberadas",
      [MOTIVO_VENCIDA],
    );
    comprobar(
      "`liberar_reservas_vencidas` cancela exactamente una",
      barrido[0].liberadas === 1,
      `devolvió ${barrido[0].liberadas}`,
    );

    const { rows: despues } = await cliente.query(
      "select estado, notas from reservas where codigo = $1",
      [`${PREFIJO}VENCIDA`],
    );
    comprobar("queda como cancelada", despues[0].estado === "cancelada");
    comprobar(
      "el motivo se ANEXA y la nota del huésped se conserva",
      despues[0].notas.includes(NOTA_DEL_HUESPED) &&
        despues[0].notas.includes(MOTIVO_VENCIDA),
      JSON.stringify(despues[0].notas),
    );

    /* Re-ejecutar el barrido no puede duplicar la nota ni contar de nuevo. */
    const { rows: segundoBarrido } = await cliente.query(
      "select liberar_reservas_vencidas($1) as liberadas",
      [MOTIVO_VENCIDA],
    );
    comprobar(
      "barrer otra vez no encuentra nada (es idempotente)",
      segundoBarrido[0].liberadas === 0,
      `devolvió ${segundoBarrido[0].liberadas}`,
    );

    /* Y ahora las fechas SÍ están libres. */
    const { rows: nueva } = await cliente.query(INSERTAR, [
      `${PREFIJO}NUEVA`,
      cabana.id,
      plan.id,
      LLEGADA,
      2,
      null,
      "pendiente",
      null,
    ]);
    comprobar(
      "después del barrido, esas mismas fechas se pueden reservar",
      nueva.length === 1,
    );

    /* ------------------------------------------------------------------ */
    console.log("\nUna cancelada no bloquea:");

    await cliente.query("update reservas set estado = 'cancelada' where codigo = $1", [
      `${PREFIJO}NUEVA`,
    ]);
    const { rows: sobreCancelada } = await cliente.query(INSERTAR, [
      `${PREFIJO}SOBRE-CANCELADA`,
      cabana.id,
      plan.id,
      LLEGADA,
      2,
      null,
      "confirmada",
      null,
    ]);
    comprobar(
      "se puede reservar encima de una cancelada",
      sobreCancelada.length === 1,
    );
    comprobar(
      "`ocupaCalendario()` también dice que una cancelada no ocupa",
      ocupaCalendario({ estado: "cancelada", expira_at: null }) === false,
    );

    /* ------------------------------------------------------------------ */
    console.log("\nEl barrido no toca lo que no debe:");

    /* Una CONFIRMADA con el vencimiento pasado (heredado de cuando era
       pendiente) no se puede cancelar sola: es una reserva pagada. */
    await cliente.query(
      "update reservas set expira_at = $2 where codigo = $1",
      [`${PREFIJO}SOBRE-CANCELADA`, new Date(Date.now() - 7_200_000).toISOString()],
    );
    /* Y una PENDIENTE sin vencimiento —las que apunta el equipo a mano— tampoco. */
    await cliente.query(INSERTAR, [
      `${PREFIJO}PANEL`,
      cabana.id,
      plan.id,
      "2098-06-01",
      3,
      null,
      "pendiente",
      null,
    ]);

    const { rows: tercerBarrido } = await cliente.query(
      "select liberar_reservas_vencidas($1) as liberadas",
      [MOTIVO_VENCIDA],
    );
    comprobar(
      "no cancela una confirmada con expira_at pasado, ni una pendiente sin vencimiento",
      tercerBarrido[0].liberadas === 0,
      `canceló ${tercerBarrido[0].liberadas}`,
    );

    const { rows: intactas } = await cliente.query(
      "select codigo, estado from reservas where codigo in ($1,$2) order by codigo",
      [`${PREFIJO}PANEL`, `${PREFIJO}SOBRE-CANCELADA`],
    );
    comprobar(
      "las dos siguen con su estado",
      intactas.length === 2 &&
        intactas[0].estado === "pendiente" &&
        intactas[1].estado === "confirmada",
      JSON.stringify(intactas),
    );
  } finally {
    await cliente.query("rollback");
  }

  /* =======================================================================
   * BLOQUE 2 — creación concurrente (dos conexiones de verdad)
   * ==================================================================== */
  console.log("\nCreación concurrente sobre las mismas fechas:");

  const clienteA = conectar("carrera-a");
  const clienteB = conectar("carrera-b");
  await clienteA.connect();
  await clienteB.connect();

  let errorDeB = null;
  try {
    await clienteA.query("begin");
    await clienteB.query("begin");

    await clienteA.query(INSERTAR, [
      `${PREFIJO}CARRERA-A`,
      cabana.id,
      plan.id,
      "2098-09-20",
      2,
      null,
      "pendiente",
      new Date(Date.now() + 1_800_000).toISOString(),
    ]);

    /*
      B intenta las MISMAS fechas mientras A está sin confirmar. Postgres lo
      deja esperando en la restricción EXCLUDE: no se lanza el `await` todavía,
      porque se quedaría bloqueado aquí. Se arranca la promesa, se confirma A, y
      entonces B resuelve — fallando, que es lo correcto.
    */
    const intentoDeB = clienteB
      .query(INSERTAR, [
        `${PREFIJO}CARRERA-B`,
        cabana.id,
        plan.id,
        "2098-09-20",
        2,
        null,
        "pendiente",
        new Date(Date.now() + 1_800_000).toISOString(),
      ])
      .then(() => null)
      .catch((error) => error);

    /* Un instante para que B llegue de verdad al bloqueo antes de que A
       confirme: si A confirmara primero, B fallaría igual pero no se habría
       probado la espera. */
    await new Promise((listo) => setTimeout(listo, 300));
    await clienteA.query("commit");

    errorDeB = await intentoDeB;
    await clienteB.query("rollback");

    comprobar(
      "una de las dos gana y la otra recibe un 23P01",
      errorDeB !== null && errorDeB.code === "23P01",
      errorDeB ? `código ${errorDeB.code}` : "las dos pasaron (¡sobreventa!)",
    );

    if (errorDeB) {
      const traducido = traducirErrorPostgres(errorDeB, {});
      comprobar(
        "el 23P01 se traduce a un mensaje en español, sin jerga de Postgres",
        traducido.message ===
          "Esas fechas se cruzan con otra reserva activa de la misma cabaña." &&
          !traducido.message.includes("23P01") &&
          !traducido.message.toLowerCase().includes("conflicting"),
        traducido.message,
      );
    }

    const { rows: ganadoras } = await clienteA.query(
      "select codigo from reservas where codigo like $1 order by codigo",
      [`${PREFIJO}CARRERA-%`],
    );
    comprobar(
      "quedó UNA sola reserva de las dos que corrieron",
      ganadoras.length === 1 && ganadoras[0].codigo === `${PREFIJO}CARRERA-A`,
      JSON.stringify(ganadoras.map((f) => f.codigo)),
    );
  } finally {
    /* A confirmó, así que su fila hay que borrarla a mano. Se borra TODO lo que
       empiece por el prefijo de prueba, pase lo que pase. */
    await clienteA
      .query("delete from reservas where codigo like $1", [`${PREFIJO}%`])
      .catch(() => {});
    await clienteA.end().catch(() => {});
    await clienteB.end().catch(() => {});
  }

  /* =======================================================================
   * La base queda como estaba
   * ==================================================================== */
  const { rows: restos } = await cliente.query(
    "select count(*)::int as total from reservas where codigo like $1",
    [`${PREFIJO}%`],
  );
  comprobar(
    "no queda ni una reserva de prueba en la base",
    restos[0].total === 0,
    `quedan ${restos[0].total}`,
  );

  const { rows: totales } = await cliente.query(
    "select count(*)::int as total from reservas",
  );
  console.log(`\nReservas en la base al terminar: ${totales[0].total}`);

  await cliente.end();
}

principal()
  .then(() => {
    console.log(
      `\n${pasadas} comprobaciones pasaron${fallos.length ? `, ${fallos.length} fallaron` : ""}.`,
    );
    if (fallos.length > 0) {
      console.log("\nFallaron:");
      for (const fallo of fallos) console.log(`  · ${fallo}`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("\nError inesperado:", error.message);
    process.exit(1);
  });
